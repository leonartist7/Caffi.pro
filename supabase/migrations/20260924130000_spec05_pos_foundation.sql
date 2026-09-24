-- SPEC-05 POS operational spine. Additive and service-only.
-- Rollback: disable connections and worker; retain submissions/events for reconciliation.
CREATE TABLE public.pos_connections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 venue_id uuid NOT NULL REFERENCES public.venues(venue_id) ON DELETE RESTRICT,
 provider text NOT NULL CHECK(provider IN ('simulator','square','clover','other')),
 environment text NOT NULL CHECK(environment IN ('simulation','sandbox','live')),
 enabled boolean NOT NULL DEFAULT false,
 health text NOT NULL DEFAULT 'unknown'
   CHECK(health IN ('unknown','healthy','attention','disconnected')),
 capabilities jsonb NOT NULL DEFAULT '{}',
 credential_ref text,
 menu_version text,
 last_sync_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(venue_id,id), UNIQUE(venue_id,provider,environment)
);
CREATE TABLE public.pos_item_mappings (
 venue_id uuid NOT NULL,
 connection_id uuid NOT NULL,
 external_item_id text NOT NULL,
 item_id uuid NOT NULL,
 external_category_id text,
 imported_version text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(connection_id,external_item_id),
 UNIQUE(connection_id,item_id),
 FOREIGN KEY(venue_id,connection_id) REFERENCES public.pos_connections(venue_id,id),
 FOREIGN KEY(venue_id,item_id) REFERENCES public.menu_items(venue_id,item_id)
);
CREATE TABLE public.pos_submissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 venue_id uuid NOT NULL,
 connection_id uuid NOT NULL,
 order_id uuid NOT NULL,
 operation_key uuid NOT NULL DEFAULT gen_random_uuid(),
 state text NOT NULL DEFAULT 'queued'
   CHECK(state IN ('queued','acknowledged','rejected','unknown','attention')),
 external_ref text,
 safe_error text,
 acknowledged_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(venue_id,id), UNIQUE(venue_id,order_id), UNIQUE(operation_key),
 UNIQUE(connection_id,external_ref),
 FOREIGN KEY(venue_id,connection_id) REFERENCES public.pos_connections(venue_id,id),
 FOREIGN KEY(venue_id,order_id) REFERENCES public.orders(venue_id,order_id)
);
CREATE TABLE public.pos_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 venue_id uuid NOT NULL,
 submission_id uuid NOT NULL,
 action text NOT NULL DEFAULT 'create' CHECK(action IN ('create','lookup')),
 lease_token uuid,
 lease_until timestamptz,
 possible_send boolean NOT NULL DEFAULT false,
 available_at timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL DEFAULT 0,
 done boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(venue_id,submission_id),
 FOREIGN KEY(venue_id,submission_id) REFERENCES public.pos_submissions(venue_id,id)
);
CREATE INDEX pos_outbox_due ON public.pos_outbox(available_at,lease_until) WHERE NOT done;
CREATE TABLE public.pos_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 venue_id uuid NOT NULL,
 submission_id uuid NOT NULL,
 action text NOT NULL,
 outcome text NOT NULL,
 safe_error text,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(venue_id,submission_id) REFERENCES public.pos_submissions(venue_id,id)
);
CREATE TABLE public.pos_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 venue_id uuid NOT NULL,
 connection_id uuid NOT NULL,
 external_event_id text NOT NULL,
 external_ref text NOT NULL,
 state text NOT NULL CHECK(state IN ('acknowledged','rejected','cancelled')),
 occurred_at timestamptz NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(),
 processed_at timestamptz,
 outcome text NOT NULL DEFAULT 'quarantined',
 UNIQUE(connection_id,external_event_id),
 FOREIGN KEY(venue_id,connection_id) REFERENCES public.pos_connections(venue_id,id)
);
CREATE TABLE public.pos_simulator_tickets (
 venue_id uuid NOT NULL,
 connection_id uuid NOT NULL,
 operation_key uuid NOT NULL,
 external_ref text NOT NULL,
 outcome text NOT NULL CHECK(outcome IN ('acknowledged','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(connection_id,operation_key),
 UNIQUE(connection_id,external_ref),
 FOREIGN KEY(venue_id,connection_id) REFERENCES public.pos_connections(venue_id,id)
);
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['pos_connections','pos_item_mappings','pos_submissions',
 'pos_outbox','pos_attempts','pos_events','pos_simulator_tickets'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
 END LOOP;
END $$;

-- Payment-to-POS intent is atomic with the paid transition. A missing
-- mapping is a visible exception, never a second payment or silent drop.
CREATE FUNCTION public.pos_enqueue_paid_order() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE c public.pos_connections%ROWTYPE; s uuid;
BEGIN
 IF NEW.status<>'paid' OR OLD.status='paid' THEN RETURN NEW; END IF;
 SELECT * INTO c FROM public.pos_connections
 WHERE venue_id=NEW.venue_id
 ORDER BY created_at LIMIT 1;
 IF NOT FOUND THEN RETURN NEW; END IF;
 INSERT INTO public.pos_submissions(venue_id,connection_id,order_id)
 VALUES(NEW.venue_id,c.id,NEW.order_id)
 ON CONFLICT(venue_id,order_id) DO NOTHING
 RETURNING id INTO s;
 IF s IS NOT NULL THEN
  IF c.enabled THEN
   INSERT INTO public.pos_outbox(venue_id,submission_id) VALUES(NEW.venue_id,s);
  ELSE
   UPDATE public.pos_submissions SET state='attention',safe_error='POS_DISCONNECTED' WHERE id=s;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pos_enqueue_on_payment
 AFTER UPDATE OF status ON public.orders
 FOR EACH ROW EXECUTE FUNCTION public.pos_enqueue_paid_order();

-- Acceptance and preparation are invalid until the connected POS has
-- acknowledged the same order. Orders without enabled POS retain behavior.
CREATE FUNCTION public.pos_require_acknowledgement() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.status IN ('accepted','preparing','ready') AND NEW.status IS DISTINCT FROM OLD.status
 AND EXISTS(SELECT 1 FROM public.pos_connections c WHERE c.venue_id=NEW.venue_id)
 AND NOT EXISTS(SELECT 1 FROM public.pos_submissions s
                WHERE s.venue_id=NEW.venue_id AND s.order_id=NEW.order_id
                AND s.state='acknowledged') THEN
  RAISE EXCEPTION 'POS_ACK_REQUIRED';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pos_guard_order_acceptance
 BEFORE UPDATE OF status ON public.orders
 FOR EACH ROW EXECUTE FUNCTION public.pos_require_acknowledgement();

CREATE OR REPLACE FUNCTION public.delivery_payment_ready(p_order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT EXISTS(
 SELECT 1 FROM public.orders o JOIN public.delivery_order_context c
   ON c.order_id=o.order_id AND c.venue_id=o.venue_id
 WHERE o.order_id=p_order_id AND o.order_type='delivery'
   AND o.accepted_at IS NOT NULL AND o.status IN ('accepted','preparing','ready')
   AND EXISTS(SELECT 1 FROM public.payments p WHERE p.order_id=o.order_id
     AND p.venue_id=o.venue_id AND p.status='succeeded'
     AND p.amount_cents=o.total_cents AND upper(p.currency)=c.currency)
   AND NOT EXISTS(SELECT 1 FROM public.payments p WHERE p.order_id=o.order_id
     AND p.status IN ('pending','reconciliation_required','refunded'))
   AND NOT EXISTS(SELECT 1 FROM public.payment_provider_events e
     WHERE e.order_id=o.order_id AND e.outcome IN
       ('received','reconciliation_required','refund_reconciliation_pending'))
   AND (
     NOT EXISTS(SELECT 1 FROM public.pos_connections pc
       WHERE pc.venue_id=o.venue_id)
     OR EXISTS(SELECT 1 FROM public.pos_submissions ps
       WHERE ps.venue_id=o.venue_id AND ps.order_id=o.order_id
       AND ps.state='acknowledged')
   ))
$$;
REVOKE ALL ON FUNCTION public.delivery_payment_ready(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.delivery_payment_ready(uuid) TO service_role;
CREATE UNIQUE INDEX pos_one_connection_per_venue ON public.pos_connections(venue_id);
CREATE UNIQUE INDEX menu_categories_venue_category ON public.menu_categories(venue_id,category_id);
CREATE UNIQUE INDEX modifier_groups_venue_group ON public.modifier_groups(venue_id,group_id);
CREATE UNIQUE INDEX modifiers_venue_modifier ON public.modifiers(venue_id,modifier_id);
ALTER TABLE public.pos_item_mappings ADD COLUMN modifier_group_id uuid;
ALTER TABLE public.pos_item_mappings ADD CONSTRAINT pos_item_group_fk
 FOREIGN KEY(venue_id,modifier_group_id) REFERENCES public.modifier_groups(venue_id,group_id);
CREATE TABLE public.pos_category_mappings (
 venue_id uuid NOT NULL, connection_id uuid NOT NULL,
 external_category_id text NOT NULL, category_id uuid NOT NULL,
 imported_version text NOT NULL,
 PRIMARY KEY(connection_id,external_category_id), UNIQUE(connection_id,category_id),
 FOREIGN KEY(venue_id,connection_id) REFERENCES public.pos_connections(venue_id,id),
 FOREIGN KEY(venue_id,category_id) REFERENCES public.menu_categories(venue_id,category_id)
);
CREATE TABLE public.pos_modifier_mappings (
 venue_id uuid NOT NULL, connection_id uuid NOT NULL,
 item_id uuid NOT NULL, external_modifier_id text NOT NULL,
 modifier_id uuid NOT NULL, imported_version text NOT NULL,
 PRIMARY KEY(connection_id,item_id,external_modifier_id),
 UNIQUE(connection_id,modifier_id),
 FOREIGN KEY(venue_id,connection_id) REFERENCES public.pos_connections(venue_id,id),
 FOREIGN KEY(venue_id,item_id) REFERENCES public.menu_items(venue_id,item_id),
 FOREIGN KEY(venue_id,modifier_id) REFERENCES public.modifiers(venue_id,modifier_id)
);
ALTER TABLE public.pos_category_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_modifier_mappings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pos_category_mappings,public.pos_modifier_mappings FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.pos_category_mappings,public.pos_modifier_mappings TO service_role;

CREATE FUNCTION public.pos_lock_imported_item() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF (NEW.name,NEW.price_cents,NEW.category_id,NEW.is_active)
 IS DISTINCT FROM (OLD.name,OLD.price_cents,OLD.category_id,OLD.is_active)
 AND EXISTS(SELECT 1 FROM public.pos_item_mappings m WHERE m.item_id=OLD.item_id)
 AND current_setting('app.pos_import',true) IS DISTINCT FROM 'on' THEN
  RAISE EXCEPTION 'POS_MENU_OWNED';
 END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION public.pos_lock_imported_category() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.pos_category_mappings m WHERE m.category_id=OLD.category_id)
 AND current_setting('app.pos_import',true) IS DISTINCT FROM 'on' THEN
  RAISE EXCEPTION 'POS_MENU_OWNED';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pos_category_ownership BEFORE UPDATE OR DELETE ON public.menu_categories
 FOR EACH ROW EXECUTE FUNCTION public.pos_lock_imported_category();
CREATE FUNCTION public.pos_lock_imported_modifier() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.pos_modifier_mappings m WHERE m.modifier_id=OLD.modifier_id)
 AND current_setting('app.pos_import',true) IS DISTINCT FROM 'on' THEN
  RAISE EXCEPTION 'POS_MENU_OWNED';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pos_modifier_ownership BEFORE UPDATE OR DELETE ON public.modifiers
 FOR EACH ROW EXECUTE FUNCTION public.pos_lock_imported_modifier();CREATE TRIGGER pos_menu_ownership BEFORE UPDATE ON public.menu_items
 FOR EACH ROW EXECUTE FUNCTION public.pos_lock_imported_item();

-- Snapshot is complete, validated and committed atomically. Never call this
-- with paginated/partial upstream results.
CREATE FUNCTION public.pos_apply_menu(p_connection_id uuid,p_snapshot jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.pos_connections%ROWTYPE; v_currency text; version text;
 cats jsonb; items jsonb; cat jsonb; item jsonb; mod jsonb;
 cat_id uuid; v_item_id uuid; group_id uuid; mod_id uuid;
 ext text; cat_ext text; mod_ext text;
 seen_categories text[]:='{}'; seen_items text[]:='{}'; seen_modifiers text[];
BEGIN
 SELECT * INTO c FROM public.pos_connections WHERE id=p_connection_id FOR UPDATE;
 IF NOT FOUND OR NOT c.enabled THEN RAISE EXCEPTION 'POS_DISCONNECTED'; END IF;
 SELECT upper(currency) INTO v_currency FROM public.venues WHERE venue_id=c.venue_id;
 version:=nullif(trim(p_snapshot->>'version'),'');
 cats:=p_snapshot->'categories'; items:=p_snapshot->'items';
 IF version IS NULL OR p_snapshot->>'currency' IS DISTINCT FROM v_currency
    OR p_snapshot->>'complete' IS DISTINCT FROM 'true'
    OR jsonb_typeof(cats) IS DISTINCT FROM 'array' OR jsonb_typeof(items) IS DISTINCT FROM 'array'
    OR jsonb_array_length(cats)>100 OR jsonb_array_length(items)>500 THEN
  RAISE EXCEPTION 'POS_INVALID_SNAPSHOT';
 END IF;
 PERFORM set_config('app.pos_import','on',true);
 FOR cat IN SELECT value FROM jsonb_array_elements(cats) LOOP
  ext:=nullif(trim(cat->>'externalId'),'');
  IF ext IS NULL OR ext=ANY(seen_categories) OR nullif(trim(cat->>'name'),'') IS NULL
     OR length(ext)>200 THEN RAISE EXCEPTION 'POS_INVALID_CATEGORY'; END IF;
  seen_categories:=array_append(seen_categories,ext);
  SELECT category_id INTO cat_id FROM public.pos_category_mappings
   WHERE connection_id=c.id AND external_category_id=ext;
  IF cat_id IS NULL THEN
   INSERT INTO public.menu_categories(venue_id,name) VALUES(c.venue_id,cat->>'name')
   RETURNING category_id INTO cat_id;
   INSERT INTO public.pos_category_mappings
    (venue_id,connection_id,external_category_id,category_id,imported_version)
   VALUES(c.venue_id,c.id,ext,cat_id,version);
  ELSE
   UPDATE public.menu_categories SET name=cat->>'name',is_active=true,updated_at=now()
   WHERE category_id=cat_id AND venue_id=c.venue_id;
   UPDATE public.pos_category_mappings SET imported_version=version
   WHERE connection_id=c.id AND external_category_id=ext;
  END IF;
 END LOOP;
 FOR item IN SELECT value FROM jsonb_array_elements(items) LOOP
  ext:=nullif(trim(item->>'externalId'),'');
  cat_ext:=nullif(trim(item->>'externalCategoryId'),'');
  IF ext IS NULL OR length(ext)>200 OR ext=ANY(seen_items)
     OR nullif(trim(item->>'name'),'') IS NULL
     OR COALESCE((item->>'priceMinor') !~ '^[0-9]{1,9}$',true)
     OR jsonb_typeof(item->'available') IS DISTINCT FROM 'boolean'
     OR jsonb_typeof(item->'modifiers') IS DISTINCT FROM 'array'
     OR jsonb_array_length(item->'modifiers')>50 THEN
   RAISE EXCEPTION 'POS_INVALID_ITEM';
  END IF;
  seen_items:=array_append(seen_items,ext);
  cat_id:=NULL;
  IF cat_ext IS NOT NULL THEN
   SELECT category_id INTO cat_id FROM public.pos_category_mappings
    WHERE connection_id=c.id AND external_category_id=cat_ext
      AND imported_version=version;
   IF cat_id IS NULL THEN RAISE EXCEPTION 'POS_MISSING_CATEGORY'; END IF;
  END IF;
  SELECT m.item_id,m.modifier_group_id INTO v_item_id,group_id
   FROM public.pos_item_mappings m
   WHERE m.connection_id=c.id AND m.external_item_id=ext;
  IF v_item_id IS NULL THEN
   INSERT INTO public.menu_items(venue_id,category_id,name,price_cents,is_active)
   VALUES(c.venue_id,cat_id,item->>'name',(item->>'priceMinor')::integer,
          (item->>'available')::boolean)
   RETURNING menu_items.item_id INTO v_item_id;
   INSERT INTO public.modifier_groups(venue_id,item_id,name,min_select,max_select)
   VALUES(c.venue_id,v_item_id,'POS modifiers',0,50) RETURNING modifier_groups.group_id INTO group_id;
   INSERT INTO public.pos_item_mappings
    (venue_id,connection_id,external_item_id,item_id,external_category_id,modifier_group_id,imported_version)
   VALUES(c.venue_id,c.id,ext,v_item_id,cat_ext,group_id,version);
  ELSE
   UPDATE public.menu_items SET category_id=cat_id,name=item->>'name',
    price_cents=(item->>'priceMinor')::integer,is_active=(item->>'available')::boolean,
    updated_at=now()
   WHERE menu_items.item_id=v_item_id AND venue_id=c.venue_id;
   UPDATE public.pos_item_mappings SET external_category_id=cat_ext,imported_version=version
   WHERE connection_id=c.id AND external_item_id=ext;
  END IF;
  seen_modifiers:='{}';
  FOR mod IN SELECT value FROM jsonb_array_elements(item->'modifiers') LOOP
   mod_ext:=nullif(trim(mod->>'externalId'),'');
   IF mod_ext IS NULL OR length(mod_ext)>200 OR mod_ext=ANY(seen_modifiers)
      OR nullif(trim(mod->>'name'),'') IS NULL
      OR COALESCE((mod->>'priceMinor') !~ '^-?[0-9]{1,9}$',true) THEN
    RAISE EXCEPTION 'POS_INVALID_MODIFIER';
   END IF;
   seen_modifiers:=array_append(seen_modifiers,mod_ext);
   SELECT modifier_id INTO mod_id FROM public.pos_modifier_mappings
    WHERE connection_id=c.id AND pos_modifier_mappings.item_id=v_item_id
      AND external_modifier_id=mod_ext;
   IF mod_id IS NULL THEN
    INSERT INTO public.modifiers(venue_id,group_id,name,price_delta_cents)
    VALUES(c.venue_id,group_id,mod->>'name',(mod->>'priceMinor')::integer)
    RETURNING modifier_id INTO mod_id;
    INSERT INTO public.pos_modifier_mappings
     (venue_id,connection_id,item_id,external_modifier_id,modifier_id,imported_version)
    VALUES(c.venue_id,c.id,v_item_id,mod_ext,mod_id,version);
   ELSE
    UPDATE public.modifiers SET name=mod->>'name',
     price_delta_cents=(mod->>'priceMinor')::integer,is_active=true
    WHERE modifier_id=mod_id AND venue_id=c.venue_id;
    UPDATE public.pos_modifier_mappings SET imported_version=version
    WHERE connection_id=c.id AND pos_modifier_mappings.item_id=v_item_id
      AND external_modifier_id=mod_ext;
   END IF;
  END LOOP;
 END LOOP;
 UPDATE public.menu_items SET is_active=false,updated_at=now()
 WHERE menu_items.item_id IN (SELECT m.item_id FROM public.pos_item_mappings m
                  WHERE m.connection_id=c.id AND m.imported_version<>version);
 UPDATE public.modifiers SET is_active=false
 WHERE modifier_id IN (SELECT m.modifier_id FROM public.pos_modifier_mappings m
                       WHERE m.connection_id=c.id AND m.imported_version<>version);
 UPDATE public.menu_categories SET is_active=false
 WHERE category_id IN (SELECT m.category_id FROM public.pos_category_mappings m
                       WHERE m.connection_id=c.id AND m.imported_version<>version);
 PERFORM set_config('app.pos_import','off',true);
 UPDATE public.pos_connections SET menu_version=version,last_sync_at=now(),health='healthy'
 WHERE id=c.id;
 RETURN jsonb_build_object('version',version,'items',jsonb_array_length(items));
END $$;
REVOKE ALL ON FUNCTION public.pos_apply_menu(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pos_apply_menu(uuid,jsonb) TO service_role;
CREATE FUNCTION public.pos_claim_work() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE w public.pos_outbox%ROWTYPE; s public.pos_submissions%ROWTYPE;
 c public.pos_connections%ROWTYPE; o public.orders%ROWTYPE;
 lines jsonb; missing_count integer; modifier_count integer;
 token uuid:=gen_random_uuid(); intended_action text;
BEGIN
 SELECT * INTO w FROM public.pos_outbox
 WHERE NOT done AND available_at<=now()
   AND (lease_until IS NULL OR lease_until<now())
 ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT 1;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO s FROM public.pos_submissions WHERE id=w.submission_id FOR UPDATE;
 SELECT * INTO c FROM public.pos_connections WHERE id=s.connection_id;
 SELECT * INTO o FROM public.orders WHERE order_id=s.order_id;
 intended_action:=CASE WHEN w.possible_send THEN 'lookup' ELSE w.action END;
 IF intended_action='create' AND (NOT c.enabled OR o.status IN ('canceled','refunded')) THEN
  UPDATE public.pos_submissions SET state='attention',safe_error='CONNECTION_OR_ORDER_UNAVAILABLE',
   updated_at=now() WHERE id=s.id;
  UPDATE public.pos_outbox SET done=true WHERE id=w.id;
  RETURN NULL;
 END IF;
 IF intended_action='create' THEN
 SELECT count(*) INTO missing_count FROM public.order_items oi
 LEFT JOIN public.pos_item_mappings m
 ON m.venue_id=oi.venue_id AND m.item_id=oi.item_id AND m.connection_id=c.id
 WHERE oi.order_id=o.order_id AND m.item_id IS NULL;
 SELECT count(*) INTO modifier_count FROM public.order_item_modifiers mo
 JOIN public.order_items oi ON oi.order_item_id=mo.order_item_id
 LEFT JOIN public.pos_modifier_mappings pm
 ON pm.venue_id=oi.venue_id AND pm.item_id=oi.item_id
 AND pm.modifier_id=mo.modifier_id AND pm.connection_id=c.id
 WHERE oi.order_id=o.order_id AND pm.modifier_id IS NULL;
 IF missing_count>0 OR modifier_count>0 THEN
  UPDATE public.pos_submissions SET state='attention',
   safe_error=CASE WHEN missing_count>0 THEN 'MISSING_ITEM_MAPPING'
                   ELSE 'MISSING_MODIFIER_MAPPING' END,updated_at=now()
  WHERE id=s.id;
  UPDATE public.pos_outbox SET done=true WHERE id=w.id;
  RETURN NULL;
 END IF;
 SELECT jsonb_agg(jsonb_build_object('externalItemId',m.external_item_id,
   'quantity',oi.quantity,'modifiers',
   COALESCE((SELECT jsonb_agg(pm.external_modifier_id ORDER BY mo.id)
     FROM public.order_item_modifiers mo
     JOIN public.pos_modifier_mappings pm ON pm.venue_id=oi.venue_id
      AND pm.item_id=oi.item_id AND pm.connection_id=c.id
      AND pm.modifier_id=mo.modifier_id
     WHERE mo.order_item_id=oi.order_item_id),'[]'::jsonb)
   ) ORDER BY oi.order_item_id)
 INTO lines FROM public.order_items oi JOIN public.pos_item_mappings m
 ON m.venue_id=oi.venue_id AND m.item_id=oi.item_id AND m.connection_id=c.id
 WHERE oi.order_id=o.order_id;
 IF lines IS NULL THEN
  UPDATE public.pos_submissions SET state='attention',safe_error='EMPTY_ORDER',
    updated_at=now() WHERE id=s.id;
  UPDATE public.pos_outbox SET done=true WHERE id=w.id;
  RETURN NULL;
 END IF;
 END IF;
 UPDATE public.pos_outbox SET lease_token=token,lease_until=now()+interval '2 minutes',
  attempts=attempts+1,possible_send=true,action='lookup' WHERE id=w.id;
 RETURN jsonb_build_object(
  'outbox_id',w.id,'lease_token',token,'action',intended_action,
  'submission_id',s.id,'operation_key',s.operation_key,
  'connection_id',c.id,'venue_id',s.venue_id,'provider',c.provider,
  'environment',c.environment,'order_id',o.order_id,
  'currency',(SELECT upper(currency) FROM public.venues WHERE venue_id=o.venue_id),
  'total_minor',o.total_cents,'lines',lines);
END $$;
CREATE FUNCTION public.pos_finish_work(
 p_outbox_id uuid,p_lease_token uuid,p_result jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE w public.pos_outbox%ROWTYPE; s public.pos_submissions%ROWTYPE;
 kind text; ref text; code text;
BEGIN
 SELECT * INTO w FROM public.pos_outbox WHERE id=p_outbox_id FOR UPDATE;
 IF NOT FOUND OR w.done OR w.lease_token IS DISTINCT FROM p_lease_token
    OR w.lease_until<=now() THEN RAISE EXCEPTION 'POS_STALE_LEASE'; END IF;
 SELECT * INTO s FROM public.pos_submissions WHERE id=w.submission_id FOR UPDATE;
 kind:=p_result->>'kind'; ref:=nullif(p_result->>'externalOrderId','');
 code:=nullif(p_result->>'code','');
 IF kind NOT IN ('acknowledged','rejected','unknown','absent') THEN
  RAISE EXCEPTION 'POS_INVALID_RESULT';
 END IF;
 IF kind='acknowledged' AND ref IS NULL THEN RAISE EXCEPTION 'POS_INVALID_REFERENCE'; END IF;
 INSERT INTO public.pos_attempts(venue_id,submission_id,action,outcome,safe_error)
 VALUES(s.venue_id,s.id,CASE WHEN w.attempts=1 THEN 'create' ELSE 'lookup' END,kind,code);
 IF kind='acknowledged' THEN
  UPDATE public.pos_submissions SET state='acknowledged',external_ref=ref,
   acknowledged_at=now(),safe_error=NULL,updated_at=now() WHERE id=s.id;
  UPDATE public.pos_outbox SET done=true,lease_token=NULL,lease_until=NULL WHERE id=w.id;
 ELSIF kind='rejected' THEN
  UPDATE public.pos_submissions SET state='rejected',safe_error=COALESCE(code,'POS_REJECTED'),
   updated_at=now() WHERE id=s.id;
  UPDATE public.pos_outbox SET done=true,lease_token=NULL,lease_until=NULL WHERE id=w.id;
 ELSIF kind='absent' THEN
  UPDATE public.pos_submissions SET state='attention',safe_error='LOOKUP_ABSENT_REVIEW_REQUIRED',
   updated_at=now() WHERE id=s.id;
  UPDATE public.pos_outbox SET done=true,lease_token=NULL,lease_until=NULL WHERE id=w.id;
 ELSE
  UPDATE public.pos_submissions SET state='unknown',safe_error=COALESCE(code,'POS_UNKNOWN'),
   updated_at=now() WHERE id=s.id;
  UPDATE public.pos_outbox SET action='lookup',available_at=now()+interval '30 seconds',
   lease_token=NULL,lease_until=NULL WHERE id=w.id;
 END IF;
 RETURN jsonb_build_object('state',(SELECT state FROM public.pos_submissions WHERE id=s.id));
END $$;
CREATE FUNCTION public.pos_simulator_effect(
 p_connection_id uuid,p_operation_key uuid,p_action text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.pos_connections%ROWTYPE; ticket public.pos_simulator_tickets%ROWTYPE;
 scenario text; ref text;
BEGIN
 SELECT * INTO c FROM public.pos_connections WHERE id=p_connection_id;
 IF NOT FOUND OR (p_action='create' AND NOT c.enabled) OR c.provider<>'simulator'
    OR c.environment<>'simulation' THEN RAISE EXCEPTION 'POS_SIMULATOR_DISABLED'; END IF;
 scenario:=COALESCE(c.capabilities->>'scenario','acknowledge');
 SELECT * INTO ticket FROM public.pos_simulator_tickets
 WHERE connection_id=c.id AND operation_key=p_operation_key;
 IF p_action='lookup' THEN
  IF NOT FOUND THEN RETURN jsonb_build_object('kind','absent','checkedAt',now()); END IF;
  IF ticket.outcome='rejected' THEN
   RETURN jsonb_build_object('kind','rejected','code','POS_REJECTED','occurredAt',ticket.created_at);
  END IF;
  RETURN jsonb_build_object('kind','acknowledged','externalOrderId',ticket.external_ref,'occurredAt',ticket.created_at);
 END IF;
 IF p_action<>'create' THEN RAISE EXCEPTION 'POS_INVALID_ACTION'; END IF;
 IF NOT FOUND THEN
  ref:='sim-pos-'||substr(replace(p_operation_key::text,'-',''),1,20);
  INSERT INTO public.pos_simulator_tickets
    (venue_id,connection_id,operation_key,external_ref,outcome)
  VALUES(c.venue_id,c.id,p_operation_key,ref,
    CASE WHEN scenario='reject' THEN 'rejected' ELSE 'acknowledged' END)
  ON CONFLICT(connection_id,operation_key) DO NOTHING;
  SELECT * INTO ticket FROM public.pos_simulator_tickets
  WHERE connection_id=c.id AND operation_key=p_operation_key;
 END IF;
 IF scenario='timeout_after_accept' THEN
  RETURN jsonb_build_object('kind','unknown','code','TIMEOUT_AFTER_SEND');
 END IF;
 IF ticket.outcome='rejected' THEN
  RETURN jsonb_build_object('kind','rejected','code','POS_REJECTED','occurredAt',ticket.created_at);
 END IF;
 RETURN jsonb_build_object('kind','acknowledged','externalOrderId',ticket.external_ref,'occurredAt',ticket.created_at);
END $$;
REVOKE ALL ON FUNCTION public.pos_claim_work() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.pos_finish_work(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.pos_simulator_effect(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pos_claim_work() TO service_role;
GRANT EXECUTE ON FUNCTION public.pos_finish_work(uuid,uuid,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.pos_simulator_effect(uuid,uuid,text) TO service_role;
CREATE FUNCTION public.pos_manager(p_venue_id uuid,p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.memberships m
 JOIN public.venues v ON v.venue_id=p_venue_id
 WHERE m.user_id=p_user_id AND m.is_active AND m.role IN ('owner','manager')
 AND (m.venue_id=p_venue_id OR (m.venue_id IS NULL AND m.org_id=v.org_id)))
$$;
CREATE FUNCTION public.pos_request_lookup(
 p_submission_id uuid,p_user_id uuid,p_reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.pos_submissions%ROWTYPE; w public.pos_outbox%ROWTYPE; next_action text;
BEGIN
 SELECT * INTO s FROM public.pos_submissions WHERE id=p_submission_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'POS_NOT_FOUND'; END IF;
 IF NOT public.pos_manager(s.venue_id,p_user_id) THEN RAISE EXCEPTION 'POS_FORBIDDEN'; END IF;
 IF nullif(trim(p_reason),'') IS NULL OR length(trim(p_reason))>120 THEN
  RAISE EXCEPTION 'POS_REASON_REQUIRED';
 END IF;
 IF s.state NOT IN ('unknown','attention','rejected') THEN
  RAISE EXCEPTION 'POS_RECONCILIATION_NOT_ALLOWED';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.pos_connections
               WHERE id=s.connection_id) THEN RAISE EXCEPTION 'POS_CONNECTION_MISSING'; END IF;
 SELECT * INTO w FROM public.pos_outbox WHERE submission_id=s.id FOR UPDATE;
 IF FOUND AND w.lease_until>now() THEN RAISE EXCEPTION 'POS_WORK_IN_PROGRESS'; END IF;
 next_action:=CASE WHEN w.possible_send THEN 'lookup' ELSE 'create' END;
 IF next_action='create' AND NOT EXISTS(
  SELECT 1 FROM public.pos_connections WHERE id=s.connection_id AND enabled
 ) THEN RAISE EXCEPTION 'POS_DISCONNECTED'; END IF;
 INSERT INTO public.pos_outbox(venue_id,submission_id,action,possible_send)
 VALUES(s.venue_id,s.id,next_action,COALESCE(w.possible_send,false))
 ON CONFLICT(venue_id,submission_id) DO UPDATE
 SET action=next_action,possible_send=COALESCE(w.possible_send,false),
     done=false,available_at=now(),lease_token=NULL,lease_until=NULL;
 INSERT INTO public.pos_attempts(venue_id,submission_id,action,outcome,safe_error)
 VALUES(s.venue_id,s.id,'manual_'||next_action,'requested',trim(p_reason));
 RETURN jsonb_build_object('submission_id',s.id,'state',s.state,'action',next_action);
END $$;
REVOKE ALL ON FUNCTION public.pos_manager(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.pos_request_lookup(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pos_manager(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pos_request_lookup(uuid,uuid,text) TO service_role;
-- Preserve modifier identity at checkout; name/price snapshots alone cannot
-- safely address a vendor modifier after a menu sync.
ALTER TABLE public.order_item_modifiers ADD COLUMN modifier_id uuid;
ALTER TABLE public.order_item_modifiers ADD CONSTRAINT pos_order_modifier_id_fk
 FOREIGN KEY(modifier_id) REFERENCES public.modifiers(modifier_id) ON DELETE RESTRICT;
CREATE FUNCTION public.pos_check_order_item_mapping() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.pos_connections c WHERE c.venue_id=NEW.venue_id)
 AND NOT EXISTS(SELECT 1 FROM public.pos_item_mappings m
   WHERE m.venue_id=NEW.venue_id AND m.item_id=NEW.item_id) THEN
  RAISE EXCEPTION 'POS_ITEM_MAPPING_REQUIRED';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pos_check_order_item
 BEFORE INSERT ON public.order_items
 FOR EACH ROW EXECUTE FUNCTION public.pos_check_order_item_mapping();
CREATE FUNCTION public.pos_capture_order_modifier() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE order_venue uuid; menu_item uuid;
BEGIN
 SELECT oi.venue_id,oi.item_id INTO order_venue,menu_item
 FROM public.order_items oi WHERE oi.order_item_id=NEW.order_item_id;
 IF NOT EXISTS(SELECT 1 FROM public.pos_connections c WHERE c.venue_id=order_venue)
 THEN RETURN NEW; END IF;
 IF NEW.modifier_id IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.modifiers m
  JOIN public.modifier_groups g ON g.group_id=m.group_id
  JOIN public.pos_modifier_mappings pm ON pm.modifier_id=m.modifier_id
   AND pm.venue_id=order_venue AND pm.item_id=menu_item
  JOIN public.pos_connections c ON c.id=pm.connection_id AND c.venue_id=order_venue
  WHERE m.modifier_id=NEW.modifier_id AND m.venue_id=order_venue
   AND g.venue_id=order_venue AND g.item_id=menu_item
   AND m.name=NEW.name_snapshot AND m.price_delta_cents=NEW.price_delta_cents
   AND m.is_active
 ) THEN RAISE EXCEPTION 'POS_MODIFIER_MAPPING_REQUIRED'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pos_capture_order_modifier
 BEFORE INSERT ON public.order_item_modifiers
 FOR EACH ROW EXECUTE FUNCTION public.pos_capture_order_modifier();

-- Preserve the exact validated checkout modifier ID in the order snapshot.
CREATE OR REPLACE FUNCTION public.create_storefront_order(p_venue_slug text, p_client_uuid uuid, p_order_type text, p_items jsonb, p_guest jsonb, p_table_token uuid, p_zone_id uuid, p_delivery_address text, p_delivery_postal_code text, p_notes text, p_member_pass_serial uuid, p_tip_cents integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_venue RECORD;
    v_existing public.orders%ROWTYPE;
    v_order_id UUID := extensions.uuid_generate_v4();
    v_member_id UUID;
    v_table_id UUID;
    v_zone RECORD;
    v_item JSONB;
    v_priced_item JSONB;
    v_catalog RECORD;
    v_group RECORD;
    v_modifier_ids UUID[];
    v_selected_count INTEGER;
    v_modifier_count INTEGER;
    v_modifier_total INTEGER;
    v_unit_price INTEGER;
    v_quantity INTEGER;
    v_subtotal INTEGER := 0;
    v_delivery_fee INTEGER := 0;
    v_tax INTEGER;
    v_tip INTEGER;
    v_total INTEGER;
    v_priced_items JSONB := '[]'::JSONB;
    v_order_item_id UUID;
    v_modifier JSONB;
    v_postal_prefix TEXT;
BEGIN
    SELECT venue_id, business_name, currency, tax_rate_bp
    INTO v_venue
    FROM public.venues
    WHERE slug = p_venue_slug AND COALESCE(kill_switch, false) = false;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'VENUE_NOT_FOUND';
    END IF;

    SELECT * INTO v_existing FROM public.orders
    WHERE venue_id = v_venue.venue_id AND client_uuid = p_client_uuid;
    IF FOUND THEN
        RETURN jsonb_build_object(
            'order_id', v_existing.order_id, 'venue_id', v_existing.venue_id,
            'status', v_existing.status, 'subtotal_cents', v_existing.subtotal_cents,
            'delivery_fee_cents', v_existing.delivery_fee_cents,
            'tax_cents', v_existing.tax_cents, 'tip_cents', v_existing.tip_cents,
            'total_cents', v_existing.total_cents,
            'currency', COALESCE(v_venue.currency, 'CAD'), 'replayed', true
        );
    END IF;

    IF p_order_type NOT IN ('dine_in', 'pickup', 'delivery') THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_ORDER_TYPE';
    END IF;
    IF NULLIF(BTRIM(COALESCE(p_guest->>'name', '')), '') IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'GUEST_NAME_REQUIRED';
    END IF;
    IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) < 1
       OR jsonb_array_length(p_items) > 50 THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_CART';
    END IF;

    IF p_order_type = 'dine_in' THEN
        SELECT table_id INTO v_table_id FROM public.venue_tables
        WHERE venue_id = v_venue.venue_id AND qr_token = p_table_token AND is_active = true;
        IF NOT FOUND THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_TABLE';
        END IF;
    END IF;

    IF p_member_pass_serial IS NOT NULL THEN
        SELECT member_id INTO v_member_id FROM public.members
        WHERE tenant_id = v_venue.venue_id AND pass_serial = p_member_pass_serial;
    END IF;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
        BEGIN
            v_quantity := (v_item->>'quantity')::INTEGER;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_QUANTITY';
        END;
        IF v_quantity < 1 OR v_quantity > 99 THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_QUANTITY';
        END IF;

        SELECT item_id, name, price_cents, is_86ed INTO v_catalog FROM public.menu_items
        WHERE item_id = (v_item->>'item_id')::UUID
          AND venue_id = v_venue.venue_id AND is_active = true;
        IF NOT FOUND THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ITEM_UNAVAILABLE';
        END IF;
        IF v_catalog.is_86ed THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ITEM_86ED:' || v_catalog.name;
        END IF;

        SELECT COALESCE(array_agg(DISTINCT value::UUID), ARRAY[]::UUID[])
        INTO v_modifier_ids
        FROM jsonb_array_elements_text(COALESCE(v_item->'modifier_ids', '[]'::JSONB));

        SELECT COUNT(*) INTO v_modifier_count FROM public.modifiers m
        JOIN public.modifier_groups g ON g.group_id = m.group_id
        WHERE m.modifier_id = ANY(v_modifier_ids) AND m.venue_id = v_venue.venue_id
          AND m.is_active = true AND g.item_id = v_catalog.item_id;
        IF v_modifier_count <> cardinality(v_modifier_ids) THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_MODIFIERS';
        END IF;

        FOR v_group IN SELECT group_id, name, min_select, max_select
            FROM public.modifier_groups
            WHERE item_id = v_catalog.item_id AND venue_id = v_venue.venue_id
        LOOP
            SELECT COUNT(*) INTO v_selected_count FROM public.modifiers
            WHERE group_id = v_group.group_id AND modifier_id = ANY(v_modifier_ids);
            IF v_selected_count < v_group.min_select OR v_selected_count > v_group.max_select THEN
                RAISE EXCEPTION USING ERRCODE = 'P0001',
                    MESSAGE = 'MODIFIER_SELECTION_INVALID:' || v_group.name;
            END IF;
        END LOOP;

        SELECT COALESCE(SUM(price_delta_cents), 0) INTO v_modifier_total
        FROM public.modifiers WHERE modifier_id = ANY(v_modifier_ids);
        v_unit_price := v_catalog.price_cents + v_modifier_total;
        IF v_unit_price < 0 THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_ITEM_PRICE';
        END IF;
        v_subtotal := v_subtotal + (v_unit_price * v_quantity);
        v_priced_items := v_priced_items || jsonb_build_array(jsonb_build_object(
            'item_id', v_catalog.item_id, 'name', v_catalog.name,
            'unit_price_cents', v_unit_price, 'quantity', v_quantity,
            'notes', NULLIF(BTRIM(COALESCE(v_item->>'notes', '')), ''),
            'modifiers', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'modifier_id', m.modifier_id, 'name', m.name, 'price_delta_cents', m.price_delta_cents
            ) ORDER BY m.sort_order, m.name) FROM public.modifiers m
            WHERE m.modifier_id = ANY(v_modifier_ids)), '[]'::JSONB)
        ));
    END LOOP;

    IF p_order_type = 'delivery' THEN
        SELECT zone_id, fee_cents, min_order_cents, postal_prefixes INTO v_zone
        FROM public.delivery_zones WHERE zone_id = p_zone_id
          AND venue_id = v_venue.venue_id AND is_active = true;
        IF NOT FOUND THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'DELIVERY_ZONE_REQUIRED';
        END IF;
        IF NULLIF(BTRIM(COALESCE(p_delivery_address, '')), '') IS NULL THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'DELIVERY_ADDRESS_REQUIRED';
        END IF;
        v_postal_prefix := LEFT(UPPER(REPLACE(COALESCE(p_delivery_postal_code, ''), ' ', '')), 3);
        IF cardinality(v_zone.postal_prefixes) > 0 AND NOT (v_postal_prefix = ANY(ARRAY(
            SELECT UPPER(REPLACE(prefix, ' ', '')) FROM unnest(v_zone.postal_prefixes) prefix
        ))) THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'OUTSIDE_DELIVERY_ZONE';
        END IF;
        IF v_subtotal < v_zone.min_order_cents THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'DELIVERY_MINIMUM_NOT_MET';
        END IF;
        v_delivery_fee := v_zone.fee_cents;
    END IF;

    v_tip := COALESCE(p_tip_cents, 0);
    IF v_tip < 0 OR v_tip > GREATEST(v_subtotal * 3, 5000) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_TIP';
    END IF;

    v_tax := ROUND((v_subtotal + v_delivery_fee) * v_venue.tax_rate_bp / 10000.0);
    v_total := v_subtotal + v_delivery_fee + v_tax + v_tip;
    INSERT INTO public.orders (
        order_id, venue_id, member_id, client_uuid, order_type, table_id, zone_id,
        guest_name, guest_phone, guest_email, delivery_address, notes,
        subtotal_cents, delivery_fee_cents, tax_cents, tip_cents, total_cents
    ) VALUES (
        v_order_id, v_venue.venue_id, v_member_id, p_client_uuid, p_order_type,
        v_table_id, CASE WHEN p_order_type = 'delivery' THEN p_zone_id ELSE NULL END,
        BTRIM(p_guest->>'name'), NULLIF(BTRIM(COALESCE(p_guest->>'phone', '')), ''),
        NULLIF(BTRIM(COALESCE(p_guest->>'email', '')), ''),
        CASE WHEN p_order_type = 'delivery' THEN BTRIM(p_delivery_address) ELSE NULL END,
        NULLIF(BTRIM(COALESCE(p_notes, '')), ''),
        v_subtotal, v_delivery_fee, v_tax, v_tip, v_total
    );

    FOR v_priced_item IN SELECT value FROM jsonb_array_elements(v_priced_items)
    LOOP
        INSERT INTO public.order_items (
            order_id, venue_id, item_id, name_snapshot, unit_price_cents, quantity, notes
        ) VALUES (
            v_order_id, v_venue.venue_id, (v_priced_item->>'item_id')::UUID,
            v_priced_item->>'name', (v_priced_item->>'unit_price_cents')::INTEGER,
            (v_priced_item->>'quantity')::INTEGER, v_priced_item->>'notes'
        ) RETURNING order_item_id INTO v_order_item_id;
        FOR v_modifier IN SELECT value FROM jsonb_array_elements(v_priced_item->'modifiers')
        LOOP
            INSERT INTO public.order_item_modifiers (order_item_id, modifier_id, name_snapshot, price_delta_cents)
            VALUES (v_order_item_id, (v_modifier->>'modifier_id')::UUID, v_modifier->>'name',
                (v_modifier->>'price_delta_cents')::INTEGER);
        END LOOP;
    END LOOP;

    INSERT INTO public.events (actor, venue_id, type, payload) VALUES (
        CASE WHEN v_member_id IS NULL THEN 'guest' ELSE 'member:' || v_member_id::TEXT END,
        v_venue.venue_id, 'order.placed', jsonb_build_object(
            'order_id', v_order_id, 'order_type', p_order_type, 'total_cents', v_total,
            'tip_cents', v_tip
        )
    );
    RETURN jsonb_build_object(
        'order_id', v_order_id, 'venue_id', v_venue.venue_id, 'status', 'pending',
        'subtotal_cents', v_subtotal, 'delivery_fee_cents', v_delivery_fee,
        'tax_cents', v_tax, 'tip_cents', v_tip, 'total_cents', v_total,
        'currency', COALESCE(v_venue.currency, 'CAD'), 'replayed', false
    );
END;
$function$;
