-- SPEC-03 revision 2; additive, service-only delivery operational records.
-- Rollback: disable connections/worker; retain bookings, attempts and financial context.
ALTER TABLE public.orders ADD CONSTRAINT orders_venue_order_unique UNIQUE (venue_id, order_id);
ALTER TABLE public.delivery_zones ADD CONSTRAINT delivery_zones_venue_zone_unique UNIQUE (venue_id, zone_id);
CREATE TABLE public.delivery_connections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), venue_id uuid NOT NULL REFERENCES public.venues(venue_id),
 provider text NOT NULL CHECK(provider IN ('simulator','own_driver','uber_direct')),
 environment text NOT NULL CHECK(environment IN ('simulation','sandbox','live')), enabled boolean NOT NULL DEFAULT false,
 credential_ref text, capabilities jsonb NOT NULL DEFAULT '{}', health text NOT NULL DEFAULT 'unknown',
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(venue_id,id), UNIQUE(venue_id,provider,environment)
);
CREATE TABLE public.delivery_quotes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), venue_id uuid NOT NULL REFERENCES public.venues(venue_id), connection_id uuid NOT NULL,
 input_digest text NOT NULL, input_items jsonb NOT NULL, priced_cart jsonb NOT NULL, address jsonb NOT NULL,
 zone_id uuid NOT NULL, currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
 guest_charge_minor integer NOT NULL CHECK(guest_charge_minor >= 0), provider_cost_minor integer NOT NULL CHECK(provider_cost_minor >= 0),
 subtotal_minor integer NOT NULL, tax_minor integer NOT NULL, provider_quote_ref text, expires_at timestamptz NOT NULL,
 consumed_order_id uuid, bound_order_id uuid, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(venue_id,id),
 FOREIGN KEY(venue_id,zone_id) REFERENCES public.delivery_zones(venue_id,zone_id),
 FOREIGN KEY(venue_id,connection_id) REFERENCES public.delivery_connections(venue_id,id),
 FOREIGN KEY(venue_id,consumed_order_id) REFERENCES public.orders(venue_id,order_id),
 FOREIGN KEY(venue_id,bound_order_id) REFERENCES public.orders(venue_id,order_id)
);
CREATE TABLE public.delivery_order_context (
 venue_id uuid NOT NULL, order_id uuid NOT NULL, connection_id uuid NOT NULL, original_quote_id uuid NOT NULL, current_quote_id uuid NOT NULL,
 input_items jsonb NOT NULL, priced_cart jsonb NOT NULL, address jsonb NOT NULL, currency text NOT NULL,
 guest_charge_minor integer NOT NULL, subtotal_minor integer NOT NULL, tax_minor integer NOT NULL, tip_minor integer NOT NULL, total_minor integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(venue_id,order_id),
 FOREIGN KEY(venue_id,order_id) REFERENCES public.orders(venue_id,order_id),
 FOREIGN KEY(venue_id,connection_id) REFERENCES public.delivery_connections(venue_id,id),
 FOREIGN KEY(venue_id,original_quote_id) REFERENCES public.delivery_quotes(venue_id,id),
 FOREIGN KEY(venue_id,current_quote_id) REFERENCES public.delivery_quotes(venue_id,id)
);
CREATE TABLE public.delivery_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), venue_id uuid NOT NULL, order_id uuid NOT NULL, connection_id uuid NOT NULL, quote_id uuid NOT NULL,
 operation_key uuid NOT NULL UNIQUE, external_ref text, state text NOT NULL DEFAULT 'dispatch_pending'
 CHECK(state IN ('dispatch_pending','booked','assigned','picked_up','delivered','reconciliation_required','cancellation_pending','cancelled','failed','returned')),
 version integer NOT NULL DEFAULT 1, approved_cost_minor integer NOT NULL CHECK(approved_cost_minor >= 0), actual_cost_minor integer CHECK(actual_cost_minor >= 0),
 currency text NOT NULL, driver_user_id uuid REFERENCES auth.users(id), last_event_at timestamptz, exception text,
 cancellation_requested boolean NOT NULL DEFAULT false, safe_tracking jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(venue_id,id), UNIQUE(venue_id,order_id), UNIQUE(connection_id,external_ref),
 FOREIGN KEY(venue_id,order_id) REFERENCES public.orders(venue_id,order_id),
 FOREIGN KEY(venue_id,connection_id) REFERENCES public.delivery_connections(venue_id,id),
 FOREIGN KEY(venue_id,quote_id) REFERENCES public.delivery_quotes(venue_id,id)
);
CREATE TABLE public.delivery_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), venue_id uuid NOT NULL, job_id uuid NOT NULL, effect_key text NOT NULL,
 lease_token uuid, action text NOT NULL, request_digest text, outcome text NOT NULL, safe_error text, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(venue_id,job_id) REFERENCES public.delivery_jobs(venue_id,id)
);
CREATE TABLE public.delivery_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), venue_id uuid NOT NULL, connection_id uuid NOT NULL, job_id uuid,
 external_ref text NOT NULL, provider_event_id text NOT NULL, provider_time timestamptz NOT NULL, received_at timestamptz NOT NULL DEFAULT now(),
 state text NOT NULL CHECK(state IN ('booked','assigned','picked_up','delivered','cancelled','failed','returned')),
 processed_at timestamptz, outcome text NOT NULL DEFAULT 'quarantined', created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(connection_id,provider_event_id), FOREIGN KEY(venue_id,connection_id) REFERENCES public.delivery_connections(venue_id,id),
 FOREIGN KEY(venue_id,job_id) REFERENCES public.delivery_jobs(venue_id,id)
);
CREATE INDEX delivery_events_unmatched ON public.delivery_events(connection_id,external_ref) WHERE processed_at IS NULL;
CREATE TABLE public.delivery_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), venue_id uuid NOT NULL, job_id uuid NOT NULL,
 action text NOT NULL CHECK(action IN ('create','lookup','cancel')), effect_key text NOT NULL UNIQUE,
 available_at timestamptz NOT NULL DEFAULT now(), lease_token uuid, lease_until timestamptz, attempts integer NOT NULL DEFAULT 0,
 possible_send boolean NOT NULL DEFAULT false, done boolean NOT NULL DEFAULT false, safe_error text, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(venue_id,job_id) REFERENCES public.delivery_jobs(venue_id,id)
);
CREATE INDEX delivery_outbox_runnable ON public.delivery_outbox(available_at,lease_until) WHERE NOT done;
CREATE TABLE public.delivery_driver_access (
 venue_id uuid NOT NULL REFERENCES public.venues(venue_id), user_id uuid NOT NULL REFERENCES auth.users(id), enabled boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(venue_id,user_id)
);
CREATE TABLE public.delivery_simulator_bookings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), venue_id uuid NOT NULL, connection_id uuid NOT NULL, operation_key uuid NOT NULL,
 external_ref text NOT NULL, state text NOT NULL, scenario text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(venue_id,connection_id,operation_key), UNIQUE(connection_id,external_ref),
 FOREIGN KEY(venue_id,connection_id) REFERENCES public.delivery_connections(venue_id,id)
);
CREATE TABLE public.delivery_quote_limits (
 venue_id uuid NOT NULL REFERENCES public.venues(venue_id), window_start timestamptz NOT NULL, count integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(venue_id,window_start)
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['delivery_connections','delivery_quotes','delivery_order_context','delivery_jobs','delivery_attempts','delivery_events','delivery_outbox','delivery_driver_access','delivery_simulator_bookings','delivery_quote_limits'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
 END LOOP;
END $$;

CREATE FUNCTION public.delivery_manager(p_venue_id uuid,p_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.memberships m JOIN public.venues v ON v.venue_id=p_venue_id
 WHERE m.user_id=p_user_id AND m.is_active AND m.role IN ('owner','manager')
 AND (m.venue_id=p_venue_id OR (m.venue_id IS NULL AND m.org_id=v.org_id)))
$$;
CREATE FUNCTION public.delivery_driver(p_venue_id uuid,p_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.delivery_driver_access a JOIN public.memberships m ON m.user_id=a.user_id
 JOIN public.venues v ON v.venue_id=a.venue_id WHERE a.venue_id=p_venue_id AND a.user_id=p_user_id AND a.enabled AND m.is_active
 AND m.role IN ('staff','owner','manager') AND (m.venue_id=p_venue_id OR (m.venue_id IS NULL AND m.org_id=v.org_id)))
$$;
CREATE FUNCTION public.delivery_normalize_address(p_address jsonb) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
BEGIN
 IF jsonb_typeof(p_address) IS DISTINCT FROM 'object' OR length(p_address::text)>4096
 OR coalesce(p_address->>'countryCode','') !~ '^[A-Za-z]{2}$'
 OR nullif(btrim(p_address->>'postalCode'),'') IS NULL OR nullif(btrim(p_address->>'city'),'') IS NULL
 OR nullif(btrim(p_address->>'line1'),'') IS NULL THEN RAISE EXCEPTION 'INVALID_ADDRESS'; END IF;
 RETURN jsonb_build_object('countryCode',upper(p_address->>'countryCode'),'postalCode',upper(replace(btrim(p_address->>'postalCode'),' ','')),
 'city',btrim(p_address->>'city'),'line1',btrim(p_address->>'line1'),'line2',nullif(btrim(p_address->>'line2'),''));
END $$;

CREATE FUNCTION public.delivery_price_cart(p_venue_id uuid,p_items jsonb,p_zone_id uuid,p_address jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE v public.venues%rowtype; z public.delivery_zones%rowtype; i jsonb; cat public.menu_items%rowtype; g record;
 mids uuid[]; mods jsonb; n integer; qty integer; unit integer; subtotal integer:=0; tax integer; lines jsonb:='[]'; addr jsonb;
BEGIN
 SELECT * INTO v FROM public.venues WHERE venue_id=p_venue_id AND NOT coalesce(kill_switch,false);
 IF NOT FOUND THEN RAISE EXCEPTION 'VENUE_NOT_FOUND'; END IF;
 IF v.currency IS NULL OR v.currency !~ '^[A-Z]{3}$' THEN RAISE EXCEPTION 'CURRENCY_REQUIRED'; END IF;
 addr:=public.delivery_normalize_address(p_address);
 IF p_items IS NULL OR jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 50 OR length(p_items::text)>28000 THEN RAISE EXCEPTION 'INVALID_CART'; END IF;
 FOR i IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  IF coalesce(i->>'quantity','') !~ '^[0-9]{1,2}$' THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
  qty:=(i->>'quantity')::integer;
  IF qty NOT BETWEEN 1 AND 99 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
  SELECT * INTO cat FROM public.menu_items WHERE item_id=(i->>'item_id')::uuid AND venue_id=p_venue_id AND is_active AND NOT coalesce(is_86ed,false);
  IF NOT FOUND THEN RAISE EXCEPTION 'ITEM_UNAVAILABLE'; END IF;
  SELECT coalesce(array_agg(DISTINCT value::uuid ORDER BY value::uuid),'{}') INTO mids FROM jsonb_array_elements_text(coalesce(i->'modifier_ids','[]'));
  SELECT count(*) INTO n FROM public.modifiers m JOIN public.modifier_groups g ON g.group_id=m.group_id
   WHERE m.modifier_id=ANY(mids) AND m.venue_id=p_venue_id AND g.venue_id=p_venue_id AND g.item_id=cat.item_id AND m.is_active;
  IF n<>cardinality(mids) THEN RAISE EXCEPTION 'INVALID_MODIFIERS'; END IF;
  FOR g IN SELECT * FROM public.modifier_groups WHERE item_id=cat.item_id AND venue_id=p_venue_id LOOP
   SELECT count(*) INTO n FROM public.modifiers WHERE group_id=g.group_id AND modifier_id=ANY(mids);
   IF n<g.min_select OR n>g.max_select THEN RAISE EXCEPTION 'MODIFIER_SELECTION_INVALID'; END IF;
  END LOOP;
  SELECT cat.price_cents+coalesce(sum(price_delta_cents),0),coalesce(jsonb_agg(jsonb_build_object('name',name,'price_delta_cents',price_delta_cents) ORDER BY sort_order,name),'[]')
   INTO unit,mods FROM public.modifiers WHERE modifier_id=ANY(mids);
  IF unit<0 THEN RAISE EXCEPTION 'INVALID_ITEM_PRICE'; END IF;
  subtotal:=subtotal+unit*qty;
  lines:=lines||jsonb_build_array(jsonb_build_object('item_id',cat.item_id,'name',cat.name,'unit_price_cents',unit,'quantity',qty,
    'modifier_ids',to_jsonb(mids),'modifiers',mods,'notes',nullif(btrim(i->>'notes'),'')));
 END LOOP;
 SELECT * INTO z FROM public.delivery_zones WHERE zone_id=p_zone_id AND venue_id=p_venue_id AND is_active;
 IF NOT FOUND THEN RAISE EXCEPTION 'DELIVERY_ZONE_REQUIRED'; END IF;
 IF cardinality(z.postal_prefixes)>0 AND NOT EXISTS(SELECT 1 FROM unnest(z.postal_prefixes) prefix WHERE left(addr->>'postalCode',3)=upper(replace(prefix,' ',''))) THEN RAISE EXCEPTION 'OUTSIDE_DELIVERY_ZONE'; END IF;
 IF subtotal<z.min_order_cents THEN RAISE EXCEPTION 'DELIVERY_MINIMUM_NOT_MET'; END IF;
 tax:=round((subtotal+z.fee_cents)*v.tax_rate_bp/10000.0);
 RETURN jsonb_build_object('priced_cart',lines,'address',addr,'currency',v.currency,'guest_charge_minor',z.fee_cents,'subtotal_minor',subtotal,'tax_minor',tax);
END $$;

CREATE FUNCTION public.delivery_create_quote(p_venue_slug text,p_items jsonb,p_zone_id uuid,p_address jsonb,p_mode text) RETURNS jsonb
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE v_id uuid; c public.delivery_connections%rowtype; q public.delivery_quotes%rowtype; priced jsonb; n integer;
BEGIN
 SELECT venue_id INTO v_id FROM public.venues WHERE slug=p_venue_slug;
 IF v_id IS NULL THEN RAISE EXCEPTION 'VENUE_NOT_FOUND'; END IF;
 INSERT INTO public.delivery_quote_limits(venue_id,window_start,count) VALUES(v_id,date_trunc('minute',now()),1)
 ON CONFLICT(venue_id,window_start) DO UPDATE SET count=delivery_quote_limits.count+1 RETURNING count INTO n;
 IF n>30 THEN RAISE EXCEPTION 'QUOTE_RATE_LIMIT'; END IF;
 DELETE FROM public.delivery_quote_limits WHERE venue_id=v_id AND window_start<now()-interval '1 day';
 SELECT * INTO c FROM public.delivery_connections WHERE venue_id=v_id AND provider=p_mode AND enabled
 AND environment='simulation' AND provider IN ('simulator','own_driver');
 IF NOT FOUND THEN RAISE EXCEPTION 'CONNECTION_UNAVAILABLE'; END IF;
 priced:=public.delivery_price_cart(v_id,p_items,p_zone_id,p_address);
 IF c.capabilities->>'scenario'='unavailable' THEN RAISE EXCEPTION 'COURIER_UNAVAILABLE'; END IF;
 INSERT INTO public.delivery_quotes(venue_id,connection_id,input_digest,input_items,priced_cart,address,zone_id,currency,guest_charge_minor,provider_cost_minor,subtotal_minor,tax_minor,expires_at)
 VALUES(v_id,c.id,md5(jsonb_build_array(v_id,c.id,p_zone_id,priced)::text),p_items,priced->'priced_cart',priced->'address',p_zone_id,priced->>'currency',
 (priced->>'guest_charge_minor')::integer,CASE WHEN c.provider='own_driver' THEN 0 ELSE 500 END,(priced->>'subtotal_minor')::integer,(priced->>'tax_minor')::integer,now()+interval '15 minutes') RETURNING * INTO q;
 RETURN to_jsonb(q);
END $$;

CREATE FUNCTION public.delivery_authorize(p_venue_id uuid,p_user_id uuid,p_manager boolean DEFAULT false) RETURNS text LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r text;
BEGIN
 SELECT m.role INTO r FROM public.memberships m JOIN public.venues v ON v.venue_id=p_venue_id
 WHERE m.user_id=p_user_id AND m.is_active AND m.role IN ('owner','manager')
 AND (m.venue_id=p_venue_id OR (m.venue_id IS NULL AND m.org_id=v.org_id)) ORDER BY CASE m.role WHEN 'owner' THEN 0 ELSE 1 END LIMIT 1;
 IF r IS NOT NULL THEN RETURN r; END IF;
 IF NOT p_manager AND public.delivery_driver(p_venue_id,p_user_id) THEN RETURN 'staff'; END IF;
 RAISE EXCEPTION 'DELIVERY_FORBIDDEN';
END $$;
CREATE FUNCTION public.delivery_set_driver_access(p_venue_id uuid,p_user_id uuid,p_driver_user_id uuid,p_enabled boolean) RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 PERFORM public.delivery_authorize(p_venue_id,p_user_id,true);
 IF NOT EXISTS(SELECT 1 FROM public.memberships m JOIN public.venues v ON v.venue_id=p_venue_id WHERE m.user_id=p_driver_user_id AND m.is_active
 AND m.role IN ('staff','owner','manager') AND (m.venue_id=p_venue_id OR (m.venue_id IS NULL AND m.org_id=v.org_id))) THEN RAISE EXCEPTION 'DRIVER_UNAVAILABLE'; END IF;
 INSERT INTO public.delivery_driver_access(venue_id,user_id,enabled) VALUES(p_venue_id,p_driver_user_id,p_enabled)
 ON CONFLICT(venue_id,user_id) DO UPDATE SET enabled=excluded.enabled;
 INSERT INTO public.events(actor,venue_id,type,payload) VALUES(p_user_id::text,p_venue_id,'delivery.driver_access',jsonb_build_object('user_id',p_driver_user_id,'enabled',p_enabled));
 RETURN jsonb_build_object('enabled',p_enabled);
END $$;

CREATE FUNCTION public.delivery_payment_ready(p_order_id uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.orders o JOIN public.delivery_order_context c ON c.order_id=o.order_id AND c.venue_id=o.venue_id
 WHERE o.order_id=p_order_id AND o.order_type='delivery' AND o.accepted_at IS NOT NULL AND o.status IN ('accepted','preparing','ready')
 AND EXISTS(SELECT 1 FROM public.payments p WHERE p.order_id=o.order_id AND p.venue_id=o.venue_id AND p.status='succeeded' AND p.amount_cents=o.total_cents AND upper(p.currency)=c.currency)
 AND NOT EXISTS(SELECT 1 FROM public.payments p WHERE p.order_id=o.order_id AND p.status IN ('pending','reconciliation_required','refunded'))
 AND NOT EXISTS(SELECT 1 FROM public.payment_provider_events e WHERE e.order_id=o.order_id AND e.outcome IN ('received','reconciliation_required','refund_reconciliation_pending')))
$$;

CREATE FUNCTION public.delivery_refresh_quote(p_order_id uuid,p_user_id uuid) RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE o public.orders%rowtype; c public.delivery_order_context%rowtype; q public.delivery_quotes%rowtype; j public.delivery_jobs%rowtype; newq public.delivery_quotes%rowtype;
BEGIN
 SELECT * INTO o FROM public.orders WHERE order_id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
 PERFORM public.delivery_authorize(o.venue_id,p_user_id,true);
 SELECT * INTO c FROM public.delivery_order_context WHERE order_id=o.order_id AND venue_id=o.venue_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'DELIVERY_CONTEXT_REQUIRED'; END IF;
 SELECT * INTO j FROM public.delivery_jobs WHERE order_id=o.order_id AND venue_id=o.venue_id FOR UPDATE;
 IF FOUND AND (j.state<>'dispatch_pending' OR EXISTS(SELECT 1 FROM public.delivery_outbox WHERE job_id=j.id AND possible_send)
 OR EXISTS(SELECT 1 FROM public.delivery_attempts WHERE job_id=j.id)) THEN RAISE EXCEPTION 'QUOTE_ALREADY_SENT'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.delivery_connections WHERE id=c.connection_id AND enabled AND environment='simulation' AND provider IN ('simulator','own_driver')) THEN RAISE EXCEPTION 'CONNECTION_UNAVAILABLE'; END IF;
 SELECT * INTO q FROM public.delivery_quotes WHERE id=c.original_quote_id;
 INSERT INTO public.delivery_quotes(venue_id,connection_id,input_digest,input_items,priced_cart,address,zone_id,currency,guest_charge_minor,provider_cost_minor,subtotal_minor,tax_minor,expires_at,bound_order_id)
 VALUES(c.venue_id,c.connection_id,q.input_digest,c.input_items,c.priced_cart,c.address,q.zone_id,c.currency,c.guest_charge_minor,q.provider_cost_minor,c.subtotal_minor,c.tax_minor,now()+interval '15 minutes',o.order_id) RETURNING * INTO newq;
 RETURN to_jsonb(newq);
END $$;

CREATE FUNCTION public.delivery_dispatch(p_order_id uuid,p_user_id uuid,p_quote_id uuid,p_operation_key uuid,p_approved_cost integer,p_expected_version integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE o public.orders%rowtype; c public.delivery_order_context%rowtype; q public.delivery_quotes%rowtype; j public.delivery_jobs%rowtype; oldq uuid;
BEGIN
 SELECT * INTO o FROM public.orders WHERE order_id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
 PERFORM public.delivery_authorize(o.venue_id,p_user_id,true);
 SELECT * INTO c FROM public.delivery_order_context WHERE order_id=o.order_id AND venue_id=o.venue_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'DELIVERY_CONTEXT_REQUIRED'; END IF;
 SELECT * INTO j FROM public.delivery_jobs WHERE order_id=o.order_id AND venue_id=o.venue_id FOR UPDATE;
 IF FOUND AND j.quote_id=p_quote_id THEN
  IF j.approved_cost_minor<>p_approved_cost THEN RAISE EXCEPTION 'DISPATCH_CONFLICT'; END IF;
  RETURN to_jsonb(j);
 END IF;
 IF NOT public.delivery_payment_ready(o.order_id) THEN RAISE EXCEPTION 'DISPATCH_PREREQUISITES'; END IF;
 SELECT * INTO q FROM public.delivery_quotes WHERE id=p_quote_id AND venue_id=o.venue_id FOR UPDATE;
 IF NOT FOUND OR q.connection_id<>c.connection_id OR (q.consumed_order_id IS DISTINCT FROM o.order_id AND q.bound_order_id IS DISTINCT FROM o.order_id)
 OR q.address<>c.address OR q.priced_cart<>c.priced_cart OR q.currency<>c.currency OR q.guest_charge_minor<>c.guest_charge_minor THEN RAISE EXCEPTION 'QUOTE_INVALID'; END IF;
 IF q.expires_at<=now() THEN RAISE EXCEPTION 'QUOTE_EXPIRED'; END IF;
 IF p_approved_cost IS DISTINCT FROM q.provider_cost_minor THEN RAISE EXCEPTION 'COST_APPROVAL_REQUIRED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.delivery_connections WHERE id=c.connection_id AND enabled AND environment='simulation' AND provider IN ('simulator','own_driver')) THEN RAISE EXCEPTION 'CONNECTION_UNAVAILABLE'; END IF;
 IF j.id IS NOT NULL THEN
  IF j.version IS DISTINCT FROM p_expected_version THEN RAISE EXCEPTION 'VERSION_CONFLICT'; END IF;
  PERFORM 1 FROM public.delivery_outbox WHERE job_id=j.id FOR UPDATE;
  IF j.state<>'dispatch_pending' OR EXISTS(SELECT 1 FROM public.delivery_outbox WHERE job_id=j.id AND possible_send)
   OR EXISTS(SELECT 1 FROM public.delivery_attempts WHERE job_id=j.id) THEN RAISE EXCEPTION 'QUOTE_ALREADY_SENT'; END IF;
  oldq:=j.quote_id;
  UPDATE public.delivery_jobs SET quote_id=q.id,approved_cost_minor=q.provider_cost_minor,version=version+1,exception=NULL WHERE id=j.id RETURNING * INTO j;
  UPDATE public.delivery_outbox SET available_at=now(),safe_error=NULL WHERE job_id=j.id AND NOT done;
  INSERT INTO public.events(actor,venue_id,type,payload) VALUES(p_user_id::text,o.venue_id,'delivery.quote_approved',jsonb_build_object('job_id',j.id,'old_quote_id',oldq,'new_quote_id',q.id,'reason','explicit_cost_approval'));
 ELSE
  INSERT INTO public.delivery_jobs(venue_id,order_id,connection_id,quote_id,operation_key,approved_cost_minor,currency)
  VALUES(o.venue_id,o.order_id,c.connection_id,q.id,p_operation_key,p_approved_cost,c.currency) RETURNING * INTO j;
  INSERT INTO public.delivery_outbox(venue_id,job_id,action,effect_key) VALUES(o.venue_id,j.id,'create',p_operation_key::text||':create');
 END IF;
 UPDATE public.delivery_order_context SET current_quote_id=q.id WHERE order_id=o.order_id AND venue_id=o.venue_id;
 RETURN to_jsonb(j);
END $$;

CREATE FUNCTION public.delivery_queue_lookup(p_job_id uuid,p_delay integer DEFAULT 0) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE j public.delivery_jobs%rowtype;
BEGIN
 SELECT * INTO j FROM public.delivery_jobs WHERE id=p_job_id;
 INSERT INTO public.delivery_outbox(venue_id,job_id,action,effect_key,available_at)
 VALUES(j.venue_id,j.id,'lookup',j.operation_key::text||':lookup',now()+make_interval(secs=>p_delay))
 ON CONFLICT(effect_key) DO UPDATE SET done=false,available_at=CASE WHEN delivery_outbox.done THEN excluded.available_at ELSE least(delivery_outbox.available_at,excluded.available_at) END
 WHERE delivery_outbox.lease_until IS NULL OR delivery_outbox.lease_until<now();
END $$;

CREATE FUNCTION public.delivery_apply_state(p_job_id uuid,p_state text,p_occurred_at timestamptz,p_cost integer DEFAULT NULL) RETURNS text LANGUAGE plpgsql SET search_path='' AS $$
DECLARE j public.delivery_jobs%rowtype; previous text; rank_old integer; rank_new integer;
BEGIN
 SELECT * INTO j FROM public.delivery_jobs WHERE id=p_job_id FOR UPDATE;
 IF p_state NOT IN ('booked','assigned','picked_up','delivered','cancelled','failed','returned') OR p_state IS NULL THEN RAISE EXCEPTION 'INVALID_PROVIDER_STATE'; END IF;
 previous:=coalesce(j.safe_tracking->>'confirmed_state',CASE WHEN j.state IN ('booked','assigned','picked_up','delivered','cancelled','failed','returned') THEN j.state END);
 IF previous=p_state AND previous IN ('delivered','cancelled','failed','returned') THEN RETURN 'duplicate'; END IF;
 IF (j.last_event_at IS NOT NULL AND p_occurred_at<j.last_event_at) OR (previous IN ('delivered','cancelled','failed','returned') AND previous<>p_state) THEN
  UPDATE public.delivery_jobs SET exception='EVENT_CONFLICT',version=version+1 WHERE id=j.id;
  PERFORM public.delivery_queue_lookup(j.id); RETURN 'conflict';
 END IF;
 rank_old:=array_position(ARRAY['dispatch_pending','booked','assigned','picked_up','delivered'],previous);
 rank_new:=array_position(ARRAY['dispatch_pending','booked','assigned','picked_up','delivered'],p_state);
 IF rank_new<rank_old THEN
  UPDATE public.delivery_jobs SET exception='EVENT_REGRESSION',version=version+1 WHERE id=j.id;
  PERFORM public.delivery_queue_lookup(j.id); RETURN 'conflict';
 END IF;
 UPDATE public.delivery_jobs SET state=p_state,last_event_at=greatest(last_event_at,p_occurred_at),version=version+1,
 actual_cost_minor=coalesce(p_cost,actual_cost_minor),safe_tracking=safe_tracking||jsonb_build_object('confirmed_state',p_state,'updated_at',p_occurred_at),
 exception=CASE WHEN cancellation_requested AND p_state NOT IN ('cancelled','failed','returned') THEN 'CANCELLATION_RECONCILIATION'
 WHEN p_cost>approved_cost_minor THEN 'COURIER_COST_VARIANCE' ELSE NULL END WHERE id=j.id;
 RETURN 'applied';
END $$;

CREATE FUNCTION public.delivery_queue_cancel(p_job_id uuid,p_manual boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE j public.delivery_jobs%rowtype;
BEGIN
 SELECT * INTO j FROM public.delivery_jobs WHERE id=p_job_id;
 -- Only these local adapters implement idempotent cancellation. External adapters
 -- must supply an independently reviewed retry policy before they can be enabled.
 IF NOT EXISTS(SELECT 1 FROM public.delivery_connections WHERE id=j.connection_id AND environment='simulation' AND provider IN ('simulator','own_driver')) THEN
  PERFORM public.delivery_queue_lookup(j.id); RETURN;
 END IF;
 INSERT INTO public.delivery_outbox(venue_id,job_id,action,effect_key) VALUES(j.venue_id,j.id,'cancel',j.operation_key::text||':cancel')
 ON CONFLICT(effect_key) DO UPDATE SET done=false,
  attempts=CASE WHEN p_manual THEN 0 ELSE delivery_outbox.attempts END,
  available_at=now()+make_interval(secs=>CASE WHEN p_manual THEN 0 ELSE least(300,power(2,delivery_outbox.attempts)::integer) END),
  lease_token=NULL,lease_until=NULL,safe_error=NULL
 WHERE (delivery_outbox.lease_until IS NULL OR delivery_outbox.lease_until<now()) AND (p_manual OR delivery_outbox.attempts<5);
 IF NOT FOUND THEN
  UPDATE public.delivery_jobs SET exception='CANCELLATION_RECONCILIATION',version=version+1 WHERE id=j.id;
 END IF;
END $$;

CREATE FUNCTION public.delivery_receive_event(p_connection_id uuid,p_event jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE c public.delivery_connections%rowtype; j public.delivery_jobs%rowtype; e public.delivery_events%rowtype; result text;
BEGIN
 SELECT * INTO c FROM public.delivery_connections WHERE id=p_connection_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'CONNECTION_NOT_FOUND'; END IF;
 IF nullif(p_event->>'provider_event_id','') IS NULL OR nullif(p_event->>'external_ref','') IS NULL OR length(p_event::text)>8192 THEN RAISE EXCEPTION 'INVALID_EVENT'; END IF;
 -- Serialize early-event arrival against external-reference attachment without
 -- taking job/outbox locks ahead of the canonical order -> job -> outbox order.
 PERFORM pg_advisory_xact_lock(hashtext('delivery-ref:'||c.id::text||':'||(p_event->>'external_ref')));
 SELECT * INTO j FROM public.delivery_jobs WHERE connection_id=c.id AND external_ref=p_event->>'external_ref';
 IF j.id IS NOT NULL THEN
  PERFORM 1 FROM public.orders WHERE order_id=j.order_id FOR UPDATE;
  SELECT * INTO j FROM public.delivery_jobs WHERE id=j.id FOR UPDATE;
 END IF;
 INSERT INTO public.delivery_events(venue_id,connection_id,job_id,external_ref,provider_event_id,provider_time,state)
 VALUES(c.venue_id,c.id,j.id,p_event->>'external_ref',p_event->>'provider_event_id',(p_event->>'occurred_at')::timestamptz,p_event->>'state')
 ON CONFLICT(connection_id,provider_event_id) DO NOTHING RETURNING * INTO e;
 IF NOT FOUND THEN RETURN jsonb_build_object('outcome','duplicate'); END IF;
 IF j.id IS NULL THEN RETURN jsonb_build_object('outcome','quarantined','event_id',e.id); END IF;
 result:=public.delivery_apply_state(j.id,e.state,e.provider_time);
 UPDATE public.delivery_events SET processed_at=now(),outcome=result WHERE id=e.id;
 IF j.cancellation_requested THEN PERFORM public.delivery_queue_lookup(j.id); END IF;
 RETURN jsonb_build_object('outcome',result,'event_id',e.id);
END $$;

CREATE FUNCTION public.delivery_finish_work(p_outbox_id uuid,p_lease_token uuid,p_result jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE b public.delivery_outbox%rowtype; j public.delivery_jobs%rowtype; c public.delivery_connections%rowtype; e public.delivery_events%rowtype; v_outcome text; kind text:=p_result->>'kind';
BEGIN
 SELECT jb.* INTO j FROM public.delivery_jobs jb JOIN public.delivery_outbox ob ON ob.job_id=jb.id WHERE ob.id=p_outbox_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'WORK_NOT_FOUND'; END IF;
 IF nullif(p_result->>'external_ref','') IS NOT NULL THEN
  PERFORM pg_advisory_xact_lock(hashtext('delivery-ref:'||j.connection_id::text||':'||(p_result->>'external_ref')));
 END IF;
 PERFORM 1 FROM public.orders WHERE order_id=j.order_id FOR UPDATE;
 SELECT * INTO j FROM public.delivery_jobs WHERE id=j.id FOR UPDATE;
 SELECT * INTO b FROM public.delivery_outbox WHERE id=p_outbox_id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.delivery_attempts WHERE job_id=j.id AND lease_token=p_lease_token AND outcome='authorized') THEN RAISE EXCEPTION 'LEASE_INVALID'; END IF;
 INSERT INTO public.delivery_attempts(venue_id,job_id,effect_key,lease_token,action,outcome,safe_error)
 VALUES(j.venue_id,j.id,b.effect_key,p_lease_token,b.action,CASE WHEN b.lease_token IS DISTINCT FROM p_lease_token OR b.lease_until<now() OR b.done THEN 'stale_completion' ELSE coalesce(kind,'invalid') END,
 CASE WHEN p_result->>'code' ~ '^[A-Z_]{1,80}$' THEN p_result->>'code' ELSE NULL END);
 IF b.lease_token IS DISTINCT FROM p_lease_token OR b.lease_until<now() OR b.done THEN
  PERFORM public.delivery_queue_lookup(j.id);
  RETURN jsonb_build_object('outcome','stale_completion');
 END IF;
 IF kind NOT IN ('confirmed','rejected','unknown','authoritative_absent') OR kind IS NULL THEN RAISE EXCEPTION 'INVALID_PROVIDER_RESULT'; END IF;
 SELECT * INTO c FROM public.delivery_connections WHERE id=j.connection_id;
 UPDATE public.delivery_outbox SET done=true,lease_token=NULL,lease_until=NULL WHERE id=b.id;
 IF kind='confirmed' THEN
  IF nullif(p_result->>'external_ref','') IS NULL THEN RAISE EXCEPTION 'EXTERNAL_REFERENCE_REQUIRED'; END IF;
  IF j.external_ref IS NOT NULL AND j.external_ref<>p_result->>'external_ref' THEN
   UPDATE public.delivery_jobs SET exception='REFERENCE_CONFLICT',version=version+1 WHERE id=j.id;
   PERFORM public.delivery_queue_lookup(j.id); RETURN jsonb_build_object('outcome','reference_conflict');
  END IF;
  UPDATE public.delivery_jobs SET external_ref=p_result->>'external_ref' WHERE id=j.id;
  FOR e IN SELECT * FROM public.delivery_events WHERE connection_id=j.connection_id AND external_ref=p_result->>'external_ref' AND processed_at IS NULL ORDER BY provider_time,received_at FOR UPDATE LOOP
   v_outcome:=public.delivery_apply_state(j.id,e.state,e.provider_time);
   UPDATE public.delivery_events SET job_id=j.id,processed_at=now(),outcome=v_outcome WHERE id=e.id;
  END LOOP;
  v_outcome:=public.delivery_apply_state(j.id,p_result->>'state',coalesce((p_result->>'occurred_at')::timestamptz,now()),(p_result->>'cost_minor')::integer);
  SELECT * INTO j FROM public.delivery_jobs WHERE id=j.id;
  IF j.cancellation_requested AND j.state IN ('booked','assigned','cancellation_pending','reconciliation_required') THEN
   PERFORM public.delivery_queue_cancel(j.id);
  ELSIF j.cancellation_requested AND j.state IN ('picked_up','delivered') THEN
   UPDATE public.delivery_jobs SET exception='CANCELLATION_RECONCILIATION' WHERE id=j.id;
  END IF;
  IF j.state NOT IN ('delivered','cancelled','failed','returned') AND c.provider='simulator' THEN
   UPDATE public.delivery_outbox SET attempts=0 WHERE job_id=j.id AND action='lookup' AND done;
   PERFORM public.delivery_queue_lookup(j.id,30);
  END IF;
 ELSIF kind='rejected' AND b.action='create' THEN
  PERFORM public.delivery_apply_state(j.id,'failed',now());
  UPDATE public.delivery_jobs SET exception='CREATE_REJECTED' WHERE id=j.id;
 ELSE
  UPDATE public.delivery_jobs SET state=CASE WHEN state IN ('delivered','cancelled','failed','returned') THEN state ELSE 'reconciliation_required' END,
    exception=CASE WHEN kind='authoritative_absent' THEN 'ABSENCE_REQUIRES_MANUAL_RECONCILIATION' ELSE 'PROVIDER_OUTCOME_UNKNOWN' END,version=version+1 WHERE id=j.id;
  IF kind<>'authoritative_absent' THEN
   IF b.action='lookup' AND b.attempts<5 THEN
    UPDATE public.delivery_outbox SET done=false,available_at=now()+make_interval(secs=>least(300,power(2,b.attempts)::integer)) WHERE id=b.id;
   ELSIF b.action<>'lookup' THEN PERFORM public.delivery_queue_lookup(j.id,2);
   ELSE UPDATE public.delivery_jobs SET exception='MANUAL_RECONCILIATION_REQUIRED' WHERE id=j.id;
   END IF;
  END IF;
 END IF;
 RETURN (SELECT to_jsonb(jb) FROM public.delivery_jobs jb WHERE jb.id=j.id);
END $$;

CREATE FUNCTION public.delivery_action(p_job_id uuid,p_user_id uuid,p_action text,p_input jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE j public.delivery_jobs%rowtype; c public.delivery_connections%rowtype; role_name text; driver uuid; sent boolean; prep text;
BEGIN
 SELECT * INTO j FROM public.delivery_jobs WHERE id=p_job_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'DELIVERY_NOT_FOUND'; END IF;
 PERFORM 1 FROM public.orders WHERE order_id=j.order_id FOR UPDATE;
 SELECT * INTO j FROM public.delivery_jobs WHERE id=p_job_id FOR UPDATE;
 IF p_action IN ('pickup','delivered') THEN
  IF j.driver_user_id IS DISTINCT FROM p_user_id OR NOT public.delivery_driver(j.venue_id,p_user_id) THEN RAISE EXCEPTION 'DELIVERY_FORBIDDEN'; END IF;
 ELSE PERFORM public.delivery_authorize(j.venue_id,p_user_id,true); END IF;
 SELECT * INTO c FROM public.delivery_connections WHERE id=j.connection_id;
 IF p_action IN ('refund','redispatch') THEN RAISE EXCEPTION 'POLICY_NOT_APPROVED'; END IF;
 IF p_input ? 'expected_version' AND (p_input->>'expected_version')::integer<>j.version THEN RAISE EXCEPTION 'VERSION_CONFLICT'; END IF;
 IF p_action='assignment' THEN
  driver:=(p_input->>'driver_user_id')::uuid;
  IF c.provider<>'own_driver' OR j.state NOT IN ('booked','assigned') OR NOT c.enabled OR NOT public.delivery_driver(j.venue_id,driver) THEN RAISE EXCEPTION 'DRIVER_UNAVAILABLE'; END IF;
  UPDATE public.delivery_jobs SET driver_user_id=driver WHERE id=j.id;
  PERFORM public.delivery_apply_state(j.id,'assigned',now());
 ELSIF p_action IN ('pickup','delivered') THEN
  IF c.provider<>'own_driver' OR NOT c.enabled OR j.cancellation_requested THEN RAISE EXCEPTION 'MILESTONE_FORBIDDEN'; END IF;
  SELECT status INTO prep FROM public.orders WHERE order_id=j.order_id;
  IF p_action='pickup' AND (j.state<>'assigned' OR prep<>'ready') THEN RAISE EXCEPTION 'PICKUP_NOT_READY'; END IF;
  IF p_action='delivered' AND j.state<>'picked_up' THEN RAISE EXCEPTION 'DELIVERY_NOT_PICKED_UP'; END IF;
  PERFORM public.delivery_apply_state(j.id,CASE p_action WHEN 'pickup' THEN 'picked_up' ELSE 'delivered' END,now());
 ELSIF p_action='cancel' THEN
  IF nullif(btrim(p_input->>'reason'),'') IS NULL THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
  IF j.state IN ('picked_up','delivered','cancelled','failed','returned') THEN RAISE EXCEPTION 'CANCELLATION_NOT_ALLOWED'; END IF;
  PERFORM 1 FROM public.delivery_outbox WHERE job_id=j.id FOR UPDATE;
  SELECT EXISTS(SELECT 1 FROM public.delivery_outbox WHERE job_id=j.id AND possible_send) INTO sent;
  UPDATE public.delivery_jobs SET cancellation_requested=true,state='cancellation_pending',version=version+1 WHERE id=j.id;
  IF NOT sent THEN
   UPDATE public.delivery_outbox SET done=true WHERE job_id=j.id;
   PERFORM public.delivery_apply_state(j.id,'cancelled',now());
  ELSIF j.external_ref IS NULL THEN PERFORM public.delivery_queue_lookup(j.id);
  ELSE PERFORM public.delivery_queue_cancel(j.id,true);
  END IF;
 ELSIF p_action='reconcile' THEN
  IF nullif(btrim(p_input->>'reason'),'') IS NULL THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
  UPDATE public.delivery_outbox SET attempts=0 WHERE job_id=j.id AND action='lookup' AND (lease_until IS NULL OR lease_until<now());
  PERFORM public.delivery_queue_lookup(j.id);
 ELSE RAISE EXCEPTION 'INVALID_DELIVERY_ACTION'; END IF;
 IF c.provider='own_driver' AND p_action IN ('assignment','pickup','delivered') THEN
  UPDATE public.delivery_simulator_bookings b SET state=jb.safe_tracking->>'confirmed_state'
  FROM public.delivery_jobs jb WHERE jb.id=j.id AND b.connection_id=jb.connection_id AND b.operation_key=jb.operation_key;
 END IF;
 INSERT INTO public.events(actor,venue_id,type,payload) VALUES(p_user_id::text,j.venue_id,'delivery.'||p_action,jsonb_build_object('job_id',j.id,'reason',left(p_input->>'reason',500),'driver_user_id',driver));
 RETURN (SELECT to_jsonb(jb) FROM public.delivery_jobs jb WHERE jb.id=j.id);
END $$;

CREATE FUNCTION public.delivery_simulator_effect(p_connection_id uuid,p_operation_key uuid,p_action text,p_input jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE c public.delivery_connections%rowtype; b public.delivery_simulator_bookings%rowtype; scenario text; elapsed numeric; state_now text;
BEGIN
 SELECT * INTO c FROM public.delivery_connections WHERE id=p_connection_id;
 IF NOT FOUND OR c.environment<>'simulation' OR c.provider NOT IN ('simulator','own_driver') OR c.venue_id<>'13000000-0000-4000-8000-000000000001'::uuid THEN RAISE EXCEPTION 'SIMULATOR_FORBIDDEN'; END IF;
 scenario:=coalesce(c.capabilities->>'scenario','success');
 PERFORM pg_advisory_xact_lock(hashtext(c.id::text||':'||p_operation_key::text));
 SELECT * INTO b FROM public.delivery_simulator_bookings WHERE connection_id=c.id AND operation_key=p_operation_key FOR UPDATE;
 IF p_action='create' THEN
  IF NOT c.enabled THEN RETURN jsonb_build_object('kind','rejected','code','CONNECTION_DISABLED'); END IF;
  IF scenario IN ('unavailable','rejected') THEN RETURN jsonb_build_object('kind','rejected','code','COURIER_UNAVAILABLE'); END IF;
  IF b.id IS NULL THEN
   INSERT INTO public.delivery_simulator_bookings(venue_id,connection_id,operation_key,external_ref,state,scenario)
   VALUES(c.venue_id,c.id,p_operation_key,'sim_'||p_operation_key::text,'booked',scenario) RETURNING * INTO b;
  END IF;
  IF scenario IN ('timeout_after_create','lookup_unavailable') THEN RETURN jsonb_build_object('kind','unknown','code','BOOKING_TIMEOUT'); END IF;
 ELSIF p_action IN ('lookup','cancel') THEN
  IF b.id IS NULL THEN RETURN jsonb_build_object('kind','authoritative_absent','code','NOT_FOUND'); END IF;
 ELSE RAISE EXCEPTION 'INVALID_SIMULATOR_ACTION'; END IF;
 scenario:=b.scenario;
 IF p_action='lookup' AND scenario='lookup_unavailable' THEN RETURN jsonb_build_object('kind','unknown','code','LOOKUP_UNAVAILABLE'); END IF;
 IF p_action='cancel' AND scenario='cancellation_rejected' THEN
  UPDATE public.delivery_simulator_bookings SET state='picked_up' WHERE id=b.id AND state IN ('booked','assigned');
  RETURN jsonb_build_object('kind','rejected','code','CANCELLATION_REJECTED');
 END IF;
 IF p_action='cancel' AND b.state IN ('booked','assigned') THEN
  UPDATE public.delivery_simulator_bookings SET state='cancelled' WHERE id=b.id RETURNING * INTO b;
  IF scenario='cancellation_unknown' THEN RETURN jsonb_build_object('kind','unknown','code','CANCELLATION_TIMEOUT'); END IF;
 ELSIF p_action='lookup' AND c.provider='simulator' AND b.state NOT IN ('delivered','cancelled','failed','returned') THEN
  elapsed:=coalesce((p_input->>'elapsed_seconds')::numeric,extract(epoch FROM now()-b.created_at));
  state_now:=CASE WHEN scenario='failed_delivery' AND elapsed>=90 THEN 'failed' WHEN elapsed>=90 THEN 'delivered' WHEN elapsed>=60 THEN 'picked_up' WHEN elapsed>=30 THEN 'assigned' ELSE 'booked' END;
  IF array_position(ARRAY['booked','assigned','picked_up','delivered'],state_now)<array_position(ARRAY['booked','assigned','picked_up','delivered'],b.state) THEN state_now:=b.state; END IF;
  UPDATE public.delivery_simulator_bookings SET state=state_now WHERE id=b.id RETURNING * INTO b;
 ELSIF p_action='lookup' AND c.provider='own_driver' THEN
  SELECT safe_tracking->>'confirmed_state' INTO state_now FROM public.delivery_jobs WHERE connection_id=c.id AND operation_key=p_operation_key;
  IF state_now IN ('booked','assigned','picked_up','delivered','cancelled','failed','returned') AND b.state NOT IN ('cancelled','failed','returned') THEN
   UPDATE public.delivery_simulator_bookings SET state=state_now WHERE id=b.id RETURNING * INTO b;
  END IF;
 END IF;
 RETURN jsonb_build_object('kind','confirmed','external_ref',b.external_ref,'state',b.state,'cost_minor',CASE WHEN c.provider='own_driver' THEN 0 ELSE 500 END,'occurred_at',now());
END $$;

CREATE FUNCTION public.delivery_context_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF (to_jsonb(NEW)-'current_quote_id') IS DISTINCT FROM (to_jsonb(OLD)-'current_quote_id') THEN RAISE EXCEPTION 'DELIVERY_CONTEXT_IMMUTABLE'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER delivery_context_immutable BEFORE UPDATE ON public.delivery_order_context FOR EACH ROW EXECUTE FUNCTION public.delivery_context_immutable();
CREATE FUNCTION public.delivery_attempts_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'DELIVERY_ATTEMPTS_APPEND_ONLY'; END $$;
CREATE TRIGGER delivery_attempts_immutable BEFORE UPDATE OR DELETE ON public.delivery_attempts FOR EACH ROW EXECUTE FUNCTION public.delivery_attempts_immutable();

CREATE FUNCTION public.delivery_claim_work(p_limit integer DEFAULT 10) RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE candidate record; b public.delivery_outbox%rowtype; j public.delivery_jobs%rowtype; c public.delivery_connections%rowtype; q public.delivery_quotes%rowtype; result jsonb:='[]'; token uuid;
BEGIN
 FOR candidate IN SELECT ob.id,jb.order_id FROM public.delivery_outbox ob JOIN public.delivery_jobs jb ON jb.id=ob.job_id
 WHERE NOT ob.done AND ob.available_at<=now() AND (ob.lease_until IS NULL OR ob.lease_until<=now()) ORDER BY ob.available_at LIMIT least(greatest(p_limit,1),25) LOOP
  PERFORM 1 FROM public.orders WHERE order_id=candidate.order_id FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN CONTINUE; END IF;
  SELECT jb.* INTO j FROM public.delivery_jobs jb JOIN public.delivery_outbox ob ON ob.job_id=jb.id WHERE ob.id=candidate.id FOR UPDATE OF jb;
  SELECT * INTO b FROM public.delivery_outbox WHERE id=candidate.id FOR UPDATE;
  IF b.done OR b.available_at>now() OR b.lease_until>now() THEN CONTINUE; END IF;
  SELECT * INTO c FROM public.delivery_connections WHERE id=j.connection_id;
  IF b.action='create' AND b.possible_send THEN
   UPDATE public.delivery_outbox SET action='lookup',attempts=0,lease_token=NULL,lease_until=NULL WHERE id=b.id;
   b.action:='lookup'; b.attempts:=0;
   UPDATE public.delivery_jobs SET state=CASE WHEN state IN ('delivered','cancelled','failed','returned') THEN state ELSE 'reconciliation_required' END,exception='WORKER_INTERRUPTED',version=version+1 WHERE id=j.id;
  END IF;
  IF b.action='create' THEN
   IF j.cancellation_requested THEN
    UPDATE public.delivery_outbox SET done=true WHERE id=b.id;
    PERFORM public.delivery_apply_state(j.id,'cancelled',now()); CONTINUE;
   END IF;
   SELECT * INTO q FROM public.delivery_quotes WHERE id=j.quote_id;
   IF q.expires_at<=now() OR NOT c.enabled OR NOT public.delivery_payment_ready(j.order_id) THEN
    UPDATE public.delivery_jobs SET exception=CASE WHEN q.expires_at<=now() THEN 'QUOTE_EXPIRED' ELSE 'DISPATCH_PREREQUISITES' END,version=version+1 WHERE id=j.id;
    UPDATE public.delivery_outbox SET available_at=now()+interval '5 minutes',safe_error='UNSENT_BLOCKED' WHERE id=b.id;
    CONTINUE;
   END IF;
  END IF;
  IF b.action='cancel' AND (j.state IN ('picked_up','delivered','cancelled','failed','returned') OR j.safe_tracking->>'confirmed_state' IN ('picked_up','delivered','cancelled','failed','returned')) THEN
   UPDATE public.delivery_outbox SET done=true,safe_error='CANCELLATION_RACE' WHERE id=b.id;
   UPDATE public.delivery_jobs SET exception='CANCELLATION_RECONCILIATION',version=version+1 WHERE id=j.id;
   PERFORM public.delivery_queue_lookup(j.id); CONTINUE;
  END IF;
  IF c.environment<>'simulation' OR c.provider NOT IN ('simulator','own_driver') OR c.health='revoked' THEN
   UPDATE public.delivery_jobs SET exception='PROVIDER_ACCESS_UNAVAILABLE',version=version+1 WHERE id=j.id;
   UPDATE public.delivery_outbox SET done=true,safe_error='PROVIDER_ACCESS_UNAVAILABLE' WHERE id=b.id; CONTINUE;
  END IF;
  IF b.attempts>=5 THEN
   UPDATE public.delivery_outbox SET done=true,safe_error='RETRY_EXHAUSTED' WHERE id=b.id;
   UPDATE public.delivery_jobs SET exception='MANUAL_RECONCILIATION_REQUIRED',version=version+1 WHERE id=j.id; CONTINUE;
  END IF;
  token:=gen_random_uuid();
  UPDATE public.delivery_outbox SET lease_token=token,lease_until=now()+interval '60 seconds',attempts=attempts+1,possible_send=true WHERE id=b.id RETURNING * INTO b;
  INSERT INTO public.delivery_attempts(venue_id,job_id,effect_key,lease_token,action,request_digest,outcome)
  VALUES(j.venue_id,j.id,b.effect_key,token,b.action,md5(jsonb_build_array(j.operation_key,j.quote_id,j.approved_cost_minor)::text),'authorized');
  SELECT * INTO j FROM public.delivery_jobs WHERE id=j.id;
  result:=result||jsonb_build_array(jsonb_build_object('outbox',to_jsonb(b),'job',to_jsonb(j),'connection',to_jsonb(c),'lease_token',token,
   'context',(SELECT to_jsonb(ctx) FROM public.delivery_order_context ctx WHERE ctx.order_id=j.order_id AND ctx.venue_id=j.venue_id)));
 END LOOP;
 RETURN result;
END $$;

CREATE FUNCTION public.create_delivery_order_checked(p_venue_slug text,p_client_uuid uuid,p_order_type text,p_items jsonb,p_guest jsonb,p_table_token uuid,p_zone_id uuid,
 p_delivery_address text,p_delivery_postal_code text,p_notes text,p_member_pass_serial uuid,p_tip_cents integer,p_request_fingerprint text,p_quote_id uuid,p_address jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE v_id uuid; existing record; q public.delivery_quotes%rowtype; ctx public.delivery_order_context%rowtype;
 result jsonb; priced jsonb; o public.orders%rowtype; actual jsonb; expected jsonb; fp text;
BEGIN
 SELECT venue_id INTO v_id FROM public.venues WHERE slug=p_venue_slug;
 IF v_id IS NULL OR p_order_type IS DISTINCT FROM 'delivery' THEN RAISE EXCEPTION 'INVALID_DELIVERY_ORDER'; END IF;
 fp:=md5(jsonb_build_array(p_request_fingerprint,p_quote_id,public.delivery_normalize_address(p_address),p_items,p_guest,p_zone_id,p_notes,p_tip_cents)::text);
 PERFORM pg_advisory_xact_lock(hashtext('checkout:'||v_id::text||':'||p_client_uuid::text));
 SELECT * INTO existing FROM public.order_checkout_operations WHERE venue_id=v_id AND client_uuid=p_client_uuid;
 IF FOUND THEN
  IF existing.request_fingerprint<>fp THEN RAISE EXCEPTION 'CHECKOUT_CART_CHANGED'; END IF;
  SELECT * INTO ctx FROM public.delivery_order_context WHERE venue_id=v_id AND order_id=existing.order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'DELIVERY_CONTEXT_REQUIRED'; END IF;
  result:=public.create_storefront_order_checked(p_venue_slug,p_client_uuid,p_order_type,p_items,p_guest,p_table_token,p_zone_id,p_delivery_address,p_delivery_postal_code,p_notes,p_member_pass_serial,p_tip_cents,fp);
  RETURN result||jsonb_build_object('currency',ctx.currency);
 END IF;
 SELECT * INTO q FROM public.delivery_quotes WHERE id=p_quote_id AND venue_id=v_id FOR UPDATE;
 IF NOT FOUND OR q.consumed_order_id IS NOT NULL OR q.bound_order_id IS NOT NULL THEN RAISE EXCEPTION 'QUOTE_INVALID'; END IF;
 IF q.expires_at<=now() THEN RAISE EXCEPTION 'QUOTE_EXPIRED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.delivery_connections WHERE id=q.connection_id AND enabled AND environment='simulation' AND provider IN ('simulator','own_driver')) THEN RAISE EXCEPTION 'CONNECTION_UNAVAILABLE'; END IF;
 priced:=public.delivery_price_cart(v_id,p_items,p_zone_id,p_address);
 IF q.zone_id<>p_zone_id OR q.input_digest<>md5(jsonb_build_array(v_id,q.connection_id,p_zone_id,priced)::text) THEN RAISE EXCEPTION 'QUOTE_CHANGED'; END IF;
 result:=public.create_storefront_order_checked(p_venue_slug,p_client_uuid,p_order_type,p_items,p_guest,p_table_token,p_zone_id,
 q.address->>'line1',q.address->>'postalCode',p_notes,p_member_pass_serial,p_tip_cents,fp);
 SELECT * INTO o FROM public.orders WHERE order_id=(result->>'order_id')::uuid AND venue_id=v_id FOR UPDATE;
 IF o.subtotal_cents<>q.subtotal_minor OR o.delivery_fee_cents<>q.guest_charge_minor OR o.tax_cents<>q.tax_minor OR o.tip_cents<>coalesce(p_tip_cents,0)
 OR o.total_cents<>q.subtotal_minor+q.guest_charge_minor+q.tax_minor+coalesce(p_tip_cents,0) THEN RAISE EXCEPTION 'QUOTE_MONEY_MISMATCH'; END IF;
 SELECT jsonb_agg(x ORDER BY x::text) INTO actual FROM(SELECT jsonb_build_object('item_id',oi.item_id,'name',oi.name_snapshot,'unit_price_cents',oi.unit_price_cents,
 'quantity',oi.quantity,'notes',oi.notes,'modifiers',coalesce((SELECT jsonb_agg(jsonb_build_object('name',m.name_snapshot,'price_delta_cents',m.price_delta_cents) ORDER BY m.name_snapshot,m.price_delta_cents)
 FROM public.order_item_modifiers m WHERE m.order_item_id=oi.order_item_id),'[]')) x FROM public.order_items oi WHERE oi.order_id=o.order_id) s;
 SELECT jsonb_agg(x ORDER BY x::text) INTO expected FROM(SELECT (value-'modifier_ids'-'modifiers')||jsonb_build_object('modifiers',coalesce((SELECT jsonb_agg(m ORDER BY m->>'name',(m->>'price_delta_cents')::integer) FROM jsonb_array_elements(value->'modifiers') m),'[]')) x FROM jsonb_array_elements(q.priced_cart)) s;
 IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'QUOTE_CART_MISMATCH'; END IF;
 INSERT INTO public.delivery_order_context(venue_id,order_id,connection_id,original_quote_id,current_quote_id,input_items,priced_cart,address,currency,guest_charge_minor,subtotal_minor,tax_minor,tip_minor,total_minor)
 VALUES(v_id,o.order_id,q.connection_id,q.id,q.id,p_items,q.priced_cart,q.address,q.currency,q.guest_charge_minor,q.subtotal_minor,q.tax_minor,coalesce(p_tip_cents,0),o.total_cents);
 UPDATE public.delivery_quotes SET consumed_order_id=o.order_id WHERE id=q.id;
 RETURN result||jsonb_build_object('currency',q.currency);
END $$;

-- Every overload introduced here is service-only, including internal helpers.
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND (p.proname LIKE 'delivery_%' OR p.proname='create_delivery_order_checked') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
 END LOOP;
END $$;
