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
 WHERE venue_id=NEW.venue_id AND enabled
 ORDER BY created_at LIMIT 1;
 IF NOT FOUND THEN RETURN NEW; END IF;
 INSERT INTO public.pos_submissions(venue_id,connection_id,order_id)
 VALUES(NEW.venue_id,c.id,NEW.order_id)
 ON CONFLICT(venue_id,order_id) DO NOTHING
 RETURNING id INTO s;
 IF s IS NOT NULL THEN
  INSERT INTO public.pos_outbox(venue_id,submission_id) VALUES(NEW.venue_id,s);
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
 AND EXISTS(SELECT 1 FROM public.pos_connections c WHERE c.venue_id=NEW.venue_id AND c.enabled)
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
       WHERE pc.venue_id=o.venue_id AND pc.enabled)
     OR EXISTS(SELECT 1 FROM public.pos_submissions ps
       WHERE ps.venue_id=o.venue_id AND ps.order_id=o.order_id
       AND ps.state='acknowledged')
   ))
$$;
REVOKE ALL ON FUNCTION public.delivery_payment_ready(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.delivery_payment_ready(uuid) TO service_role;
CREATE UNIQUE INDEX pos_one_enabled_connection ON public.pos_connections(venue_id) WHERE enabled;
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
CREATE TRIGGER pos_menu_ownership BEFORE UPDATE ON public.menu_items
 FOR EACH ROW EXECUTE FUNCTION public.pos_lock_imported_item();

-- Snapshot is complete, validated and committed atomically. Never call this
-- with paginated/partial upstream results.
CREATE FUNCTION public.pos_apply_menu(p_connection_id uuid,p_snapshot jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.pos_connections%ROWTYPE; v_currency text; version text;
 cats jsonb; items jsonb; cat jsonb; item jsonb; mod jsonb;
 cat_id uuid; item_id uuid; group_id uuid; mod_id uuid;
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
    OR jsonb_typeof(cats)<>'array' OR jsonb_typeof(items)<>'array'
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
     OR (item->>'priceMinor') !~ '^[0-9]{1,9}$'
     OR jsonb_typeof(item->'available')<>'boolean'
     OR jsonb_typeof(item->'modifiers')<>'array'
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
  SELECT m.item_id,m.modifier_group_id INTO item_id,group_id
   FROM public.pos_item_mappings m
   WHERE m.connection_id=c.id AND m.external_item_id=ext;
  IF item_id IS NULL THEN
   INSERT INTO public.menu_items(venue_id,category_id,name,price_cents,is_active)
   VALUES(c.venue_id,cat_id,item->>'name',(item->>'priceMinor')::integer,
          (item->>'available')::boolean)
   RETURNING menu_items.item_id INTO item_id;
   INSERT INTO public.modifier_groups(venue_id,item_id,name,min_select,max_select)
   VALUES(c.venue_id,item_id,'POS modifiers',0,50) RETURNING modifier_groups.group_id INTO group_id;
   INSERT INTO public.pos_item_mappings
    (venue_id,connection_id,external_item_id,item_id,external_category_id,modifier_group_id,imported_version)
   VALUES(c.venue_id,c.id,ext,item_id,cat_ext,group_id,version);
  ELSE
   UPDATE public.menu_items SET category_id=cat_id,name=item->>'name',
    price_cents=(item->>'priceMinor')::integer,is_active=(item->>'available')::boolean,
    updated_at=now()
   WHERE menu_items.item_id=item_id AND venue_id=c.venue_id;
   UPDATE public.pos_item_mappings SET external_category_id=cat_ext,imported_version=version
   WHERE connection_id=c.id AND external_item_id=ext;
  END IF;
  seen_modifiers:='{}';
  FOR mod IN SELECT value FROM jsonb_array_elements(item->'modifiers') LOOP
   mod_ext:=nullif(trim(mod->>'externalId'),'');
   IF mod_ext IS NULL OR length(mod_ext)>200 OR mod_ext=ANY(seen_modifiers)
      OR nullif(trim(mod->>'name'),'') IS NULL
      OR (mod->>'priceMinor') !~ '^-?[0-9]{1,9}$' THEN
    RAISE EXCEPTION 'POS_INVALID_MODIFIER';
   END IF;
   seen_modifiers:=array_append(seen_modifiers,mod_ext);
   SELECT modifier_id INTO mod_id FROM public.pos_modifier_mappings
    WHERE connection_id=c.id AND pos_modifier_mappings.item_id=item_id
      AND external_modifier_id=mod_ext;
   IF mod_id IS NULL THEN
    INSERT INTO public.modifiers(venue_id,group_id,name,price_delta_cents)
    VALUES(c.venue_id,group_id,mod->>'name',(mod->>'priceMinor')::integer)
    RETURNING modifier_id INTO mod_id;
    INSERT INTO public.pos_modifier_mappings
     (venue_id,connection_id,item_id,external_modifier_id,modifier_id,imported_version)
    VALUES(c.venue_id,c.id,item_id,mod_ext,mod_id,version);
   ELSE
    UPDATE public.modifiers SET name=mod->>'name',
     price_delta_cents=(mod->>'priceMinor')::integer,is_active=true
    WHERE modifier_id=mod_id AND venue_id=c.venue_id;
    UPDATE public.pos_modifier_mappings SET imported_version=version
    WHERE connection_id=c.id AND pos_modifier_mappings.item_id=item_id
      AND external_modifier_id=mod_ext;
   END IF;
  END LOOP;
 END LOOP;
 UPDATE public.menu_items SET is_active=false,updated_at=now()
 WHERE item_id IN (SELECT m.item_id FROM public.pos_item_mappings m
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
 IF NOT c.enabled OR o.status IN ('canceled','refunded') THEN
  UPDATE public.pos_submissions SET state='attention',safe_error='CONNECTION_OR_ORDER_UNAVAILABLE',
   updated_at=now() WHERE id=s.id;
  UPDATE public.pos_outbox SET done=true WHERE id=w.id;
  RETURN NULL;
 END IF;
 SELECT count(*) INTO missing_count FROM public.order_items oi
 LEFT JOIN public.pos_item_mappings m
 ON m.venue_id=oi.venue_id AND m.item_id=oi.item_id AND m.connection_id=c.id
 WHERE oi.order_id=o.order_id AND m.item_id IS NULL;
 SELECT count(*) INTO modifier_count FROM public.order_item_modifiers mo
 JOIN public.order_items oi ON oi.order_item_id=mo.order_item_id
 WHERE oi.order_id=o.order_id;
 IF missing_count>0 OR modifier_count>0 THEN
  UPDATE public.pos_submissions SET state='attention',
   safe_error=CASE WHEN missing_count>0 THEN 'MISSING_ITEM_MAPPING'
                   ELSE 'MODIFIER_ID_NOT_RECORDED' END,updated_at=now()
  WHERE id=s.id;
  UPDATE public.pos_outbox SET done=true WHERE id=w.id;
  RETURN NULL;
 END IF;
 SELECT jsonb_agg(jsonb_build_object('externalItemId',m.external_item_id,
   'quantity',oi.quantity,'modifiers','[]'::jsonb) ORDER BY oi.order_item_id)
 INTO lines FROM public.order_items oi JOIN public.pos_item_mappings m
 ON m.venue_id=oi.venue_id AND m.item_id=oi.item_id AND m.connection_id=c.id
 WHERE oi.order_id=o.order_id;
 IF lines IS NULL THEN
  UPDATE public.pos_submissions SET state='attention',safe_error='EMPTY_ORDER',
    updated_at=now() WHERE id=s.id;
  UPDATE public.pos_outbox SET done=true WHERE id=w.id;
  RETURN NULL;
 END IF;
 intended_action:=CASE WHEN w.possible_send THEN 'lookup' ELSE w.action END;
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
 IF NOT FOUND OR NOT c.enabled OR c.provider<>'simulator'
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
DECLARE s public.pos_submissions%ROWTYPE; w public.pos_outbox%ROWTYPE;
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
               WHERE id=s.connection_id AND enabled) THEN RAISE EXCEPTION 'POS_DISCONNECTED'; END IF;
 SELECT * INTO w FROM public.pos_outbox WHERE submission_id=s.id FOR UPDATE;
 IF FOUND AND w.lease_until>now() THEN RAISE EXCEPTION 'POS_WORK_IN_PROGRESS'; END IF;
 INSERT INTO public.pos_outbox(venue_id,submission_id,action,possible_send)
 VALUES(s.venue_id,s.id,'lookup',true)
 ON CONFLICT(venue_id,submission_id) DO UPDATE
 SET action='lookup',possible_send=true,done=false,available_at=now(),
     lease_token=NULL,lease_until=NULL;
 INSERT INTO public.pos_attempts(venue_id,submission_id,action,outcome,safe_error)
 VALUES(s.venue_id,s.id,'manual_lookup','requested',trim(p_reason));
 RETURN jsonb_build_object('submission_id',s.id,'state',s.state,'action','lookup');
END $$;
REVOKE ALL ON FUNCTION public.pos_manager(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.pos_request_lookup(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pos_manager(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pos_request_lookup(uuid,uuid,text) TO service_role;
