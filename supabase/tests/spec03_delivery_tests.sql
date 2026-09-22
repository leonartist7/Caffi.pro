-- SPEC-03-AC-01..09: actual isolated PostgreSQL assertions, never provider evidence.
-- The enclosing transaction rolls back all scenario mutations.
BEGIN;
CREATE FUNCTION pg_temp.expect_error(statement text, expected text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 BEGIN EXECUTE statement;
 EXCEPTION WHEN OTHERS THEN
  IF position(expected IN SQLERRM)>0 THEN RETURN; END IF;
  RAISE EXCEPTION 'Expected %, got %',expected,SQLERRM;
 END;
 RAISE EXCEPTION 'Expected error %, but statement succeeded',expected;
END $$;

DO $$
#variable_conflict use_variable
DECLARE
 venue uuid:='13000000-0000-4000-8000-000000000001'; owner_id uuid:='11000000-0000-4000-8000-000000000001';
 driver_id uuid:='11000000-0000-4000-8000-000000000005'; revoked_id uuid:='11000000-0000-4000-8000-000000000006';
 zone uuid:='1a000000-0000-4000-8000-000000000001'; simulator uuid:='1b000000-0000-4000-8000-000000000001';
 own_driver uuid:='1b000000-0000-4000-8000-000000000002';
 items jsonb:='[{"item_id":"16000000-0000-4000-8000-000000000002","quantity":2,"modifier_ids":[]}]';
 address jsonb:='{"countryCode":"CA","postalCode":"TST 123","city":"Synthetic City","line1":"1 Fixture Street"}';
 q jsonb; q2 jsonb; result jsonb; j jsonb; work jsonb; effect jsonb; event_result jsonb; client_key uuid:=gen_random_uuid();
 order_id uuid; job_id uuid; op uuid:=gen_random_uuid(); box uuid; token uuid; old_token uuid; oldbox uuid; oid2 uuid; qid uuid;
 n integer; f record;
BEGIN
 -- AC-01: deny every new function and operational table to public clients.
 FOR f IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace
 WHERE ns.nspname='public' AND (p.proname LIKE 'delivery_%' OR p.proname='create_delivery_order_checked') LOOP
  IF has_function_privilege('anon',f.oid,'EXECUTE') OR has_function_privilege('authenticated',f.oid,'EXECUTE') THEN RAISE EXCEPTION 'Public delivery RPC %',f.proname; END IF;
 END LOOP;
 IF has_table_privilege('authenticated','public.delivery_jobs','SELECT') THEN RAISE EXCEPTION 'Public delivery table'; END IF;
 IF NOT public.delivery_driver(venue,driver_id) OR public.delivery_driver(venue,revoked_id) THEN RAISE EXCEPTION 'Driver revocation ignored'; END IF;
 PERFORM pg_temp.expect_error(format('SELECT public.delivery_authorize(%L,%L,true)',venue,driver_id),'DELIVERY_FORBIDDEN');
 PERFORM pg_temp.expect_error(format('SELECT public.delivery_authorize(%L,%L,true)','13000000-0000-4000-8000-000000000003',owner_id),'DELIVERY_FORBIDDEN');

 -- AC-03: address, serviceability, unavailable and cross-tenant items.
 PERFORM pg_temp.expect_error(format('SELECT public.delivery_create_quote(%L,%L,%L,%L,%L)','spec01-north-one',items,zone,'{}','own_driver'),'INVALID_ADDRESS');
 PERFORM pg_temp.expect_error(format('SELECT public.delivery_create_quote(%L,%L,%L,%L,%L)','spec01-north-one',items,zone,address||'{"postalCode":"OUT123"}','own_driver'),'OUTSIDE_DELIVERY_ZONE');
 PERFORM pg_temp.expect_error(format('SELECT public.delivery_create_quote(%L,%L,%L,%L,%L)','spec01-north-one','[{"item_id":"16000000-0000-4000-8000-000000000004","quantity":2}]',zone,address,'own_driver'),'ITEM_UNAVAILABLE');
 UPDATE public.delivery_connections SET capabilities='{"scenario":"unavailable"}' WHERE id=simulator;
 PERFORM pg_temp.expect_error(format('SELECT public.delivery_create_quote(%L,%L,%L,%L,%L)','spec01-north-one',items,zone,address,'simulator'),'COURIER_UNAVAILABLE');
 UPDATE public.delivery_connections SET capabilities='{"scenario":"success"}' WHERE id=simulator;
 q:=public.delivery_create_quote('spec01-north-one',items,zone,address,'own_driver'); qid:=(q->>'id')::uuid;
 UPDATE public.menu_items SET price_cents=price_cents+1 WHERE item_id='16000000-0000-4000-8000-000000000002';
 PERFORM pg_temp.expect_error(format('SELECT public.create_delivery_order_checked(%L,%L,%L,%L,%L,NULL,%L,NULL,NULL,NULL,NULL,0,%L,%L,%L)',
 'spec01-north-one',client_key,'delivery',items,'{"name":"Synthetic Guest"}',zone,'fixture-fingerprint',qid,address),'QUOTE_CHANGED');
 UPDATE public.menu_items SET price_cents=price_cents-1 WHERE item_id='16000000-0000-4000-8000-000000000002';
 UPDATE public.delivery_quotes SET expires_at=now()-interval '1 second' WHERE id=qid;
 PERFORM pg_temp.expect_error(format('SELECT public.create_delivery_order_checked(%L,%L,%L,%L,%L,NULL,%L,NULL,NULL,NULL,NULL,0,%L,%L,%L)',
 'spec01-north-one',client_key,'delivery',items,'{"name":"Synthetic Guest"}',zone,'fixture-fingerprint',qid,address),'QUOTE_EXPIRED');
 UPDATE public.delivery_quotes SET expires_at=now()+interval '15 minutes' WHERE id=qid;
 result:=public.create_delivery_order_checked('spec01-north-one',client_key,'delivery',items,'{"name":"Synthetic Guest"}',NULL,zone,NULL,NULL,NULL,NULL,0,'fixture-fingerprint',qid,address);
 order_id:=(result->>'order_id')::uuid;
 -- Immutable replay wins over mutable prices/currency/expiry.
 UPDATE public.venues SET currency='USD' WHERE venue_id=venue;
 UPDATE public.menu_items SET price_cents=999 WHERE item_id='16000000-0000-4000-8000-000000000002';
 UPDATE public.delivery_quotes SET expires_at=now()-interval '1 second' WHERE id=qid;
 result:=public.create_delivery_order_checked('spec01-north-one',client_key,'delivery',items,'{"name":"Synthetic Guest"}',NULL,zone,NULL,NULL,NULL,NULL,0,'fixture-fingerprint',qid,address);
 IF result->>'currency'<>'CAD' OR (result->>'order_id')::uuid<>order_id THEN RAISE EXCEPTION 'Mutable checkout replay'; END IF;
 PERFORM pg_temp.expect_error(format('SELECT public.create_delivery_order_checked(%L,%L,%L,%L,%L,NULL,%L,NULL,NULL,NULL,NULL,0,%L,%L,%L)',
 'spec01-north-one',client_key,'delivery',items,'{"name":"Synthetic Guest"}',zone,'fixture-fingerprint',qid,address||'{"line1":"Changed"}'),'CHECKOUT_CART_CHANGED');
 UPDATE public.venues SET currency='CAD' WHERE venue_id=venue;
 UPDATE public.menu_items SET price_cents=425 WHERE item_id='16000000-0000-4000-8000-000000000002';
 PERFORM pg_temp.expect_error(format('UPDATE public.delivery_order_context SET currency=%L WHERE order_id=%L','USD',order_id),'DELIVERY_CONTEXT_IMMUTABLE');

 -- AC-04: payment and restaurant acceptance are separate dispatch gates.
 PERFORM pg_temp.expect_error(format('SELECT public.delivery_dispatch(%L,%L,%L,%L,0)',order_id,owner_id,qid,op),'DISPATCH_PREREQUISITES');
 INSERT INTO public.payments(venue_id,order_id,provider,provider_ref,amount_cents,currency,status,idempotency_key)
 SELECT venue,order_id,'synthetic','spec03_'||order_id::text,o.total_cents,'CAD','succeeded',gen_random_uuid() FROM public.orders o WHERE o.order_id=order_id;
 UPDATE public.orders SET status='ready',accepted_at=now(),ready_at=now() WHERE orders.order_id=order_id;
 PERFORM pg_temp.expect_error(format('SELECT public.delivery_dispatch(%L,%L,%L,%L,0)',order_id,owner_id,qid,op),'QUOTE_EXPIRED');
 q2:=public.delivery_refresh_quote(order_id,owner_id);
 j:=public.delivery_dispatch(order_id,owner_id,(q2->>'id')::uuid,op,0); job_id:=(j->>'id')::uuid;
 result:=public.delivery_dispatch(order_id,owner_id,(q2->>'id')::uuid,op,0);
 IF result->>'id'<>j->>'id' THEN RAISE EXCEPTION 'Duplicate dispatch'; END IF;
 result:=public.delivery_dispatch(order_id,owner_id,(q2->>'id')::uuid,gen_random_uuid(),0);
 IF result->>'operation_key'<>op::text OR result->>'id'<>j->>'id' THEN RAISE EXCEPTION 'New-tab replay replaced booking key'; END IF;
 SELECT count(*) INTO n FROM public.delivery_outbox WHERE delivery_outbox.job_id=job_id AND action='create';
 IF n<>1 THEN RAISE EXCEPTION 'Duplicate create effect'; END IF;
 -- Refresh requires expected version, even before any possible send.
 UPDATE public.delivery_quotes SET expires_at=now()-interval '1 second' WHERE id=(j->>'quote_id')::uuid;
 IF jsonb_array_length(public.delivery_claim_work(1))<>0 THEN RAISE EXCEPTION 'Expired unsent quote was claimed'; END IF;
 PERFORM pg_temp.expect_error(format('SELECT public.delivery_action(%L,%L,%L,%L)',job_id,owner_id,'reconcile','{"reason":"Attempt recovery of expired unsent quote"}'),'QUOTE_REFRESH_REQUIRED');
 IF (SELECT state FROM public.delivery_jobs WHERE id=job_id)<>'dispatch_pending'
 OR EXISTS(SELECT 1 FROM public.delivery_attempts WHERE delivery_attempts.job_id=job_id)
 OR EXISTS(SELECT 1 FROM public.delivery_outbox WHERE delivery_outbox.job_id=job_id AND action='lookup') THEN RAISE EXCEPTION 'Unsent reconcile poisoned refresh'; END IF;
 SELECT to_jsonb(jb) INTO j FROM public.delivery_jobs jb WHERE id=job_id;
 q:=public.delivery_refresh_quote(order_id,owner_id);
 PERFORM pg_temp.expect_error(format('SELECT public.delivery_dispatch(%L,%L,%L,%L,0,999)',order_id,owner_id,q->>'id',op),'VERSION_CONFLICT');
 j:=public.delivery_dispatch(order_id,owner_id,(q->>'id')::uuid,gen_random_uuid(),0,(j->>'version')::integer);
 IF j->>'operation_key'<>op::text THEN RAISE EXCEPTION 'Refreshed quote replaced booking key'; END IF;
 work:=public.delivery_claim_work(1)->0; box:=(work->'outbox'->>'id')::uuid; token:=(work->>'lease_token')::uuid;
 IF work->'outbox'->>'action'<>'create' THEN RAISE EXCEPTION 'Expected create claim'; END IF;
 effect:=public.delivery_simulator_effect(own_driver,op,'create');
 PERFORM public.delivery_finish_work(box,token,effect);
 PERFORM pg_temp.expect_error(format('SELECT public.delivery_refresh_quote(%L,%L)',order_id,owner_id),'QUOTE_ALREADY_SENT');

 -- AC-08: own driver needs both assignment and active capability; courier does not complete preparation/order state.
 PERFORM pg_temp.expect_error(format('SELECT public.delivery_action(%L,%L,%L,%L)',job_id,owner_id,'assignment',jsonb_build_object('driver_user_id',revoked_id)),'DRIVER_UNAVAILABLE');
 PERFORM public.delivery_action(job_id,owner_id,'assignment',jsonb_build_object('driver_user_id',driver_id));
 PERFORM pg_temp.expect_error(format('SELECT public.delivery_action(%L,%L,%L)',job_id,owner_id,'pickup'),'DELIVERY_FORBIDDEN');
 UPDATE public.delivery_driver_access SET enabled=false WHERE venue_id=venue AND user_id=driver_id;
 PERFORM pg_temp.expect_error(format('SELECT public.delivery_action(%L,%L,%L)',job_id,driver_id,'pickup'),'DELIVERY_FORBIDDEN');
 UPDATE public.delivery_driver_access SET enabled=true WHERE venue_id=venue AND user_id=driver_id;
 PERFORM public.delivery_action(job_id,driver_id,'pickup');
 PERFORM public.delivery_action(job_id,driver_id,'delivered');
 effect:=public.delivery_simulator_effect(own_driver,op,'lookup');
 IF effect->>'state'<>'delivered' THEN RAISE EXCEPTION 'Own-driver lookup regressed milestones'; END IF;
 IF (SELECT status FROM public.orders WHERE orders.order_id=order_id)<>'ready' THEN RAISE EXCEPTION 'Courier changed preparation'; END IF;
 PERFORM pg_temp.expect_error(format('SELECT public.delivery_action(%L,%L,%L)',job_id,owner_id,'refund'),'POLICY_NOT_APPROVED');
 PERFORM pg_temp.expect_error(format('SELECT public.delivery_action(%L,%L,%L)',job_id,owner_id,'redispatch'),'POLICY_NOT_APPROVED');

 -- AC-05/06: timeout after effect, expired worker lease, no second create, stale evidence.
 q:=public.delivery_create_quote('spec01-north-one',items,zone,address,'simulator'); qid:=(q->>'id')::uuid;
 result:=public.create_delivery_order_checked('spec01-north-one',gen_random_uuid(),'delivery',items,'{"name":"Timeout Guest"}',NULL,zone,NULL,NULL,NULL,NULL,0,'timeout',qid,address);
 oid2:=(result->>'order_id')::uuid; op:=gen_random_uuid();
 INSERT INTO public.payments(venue_id,order_id,provider,provider_ref,amount_cents,currency,status,idempotency_key)
 SELECT venue,oid2,'synthetic','spec03_'||oid2::text,o.total_cents,'CAD','succeeded',gen_random_uuid() FROM public.orders o WHERE o.order_id=oid2;
 UPDATE public.orders SET status='ready',accepted_at=now(),ready_at=now() WHERE orders.order_id=oid2;
 j:=public.delivery_dispatch(oid2,owner_id,qid,op,500); job_id:=(j->>'id')::uuid;
 work:=public.delivery_claim_work(1)->0; oldbox:=(work->'outbox'->>'id')::uuid; old_token:=(work->>'lease_token')::uuid;
 UPDATE public.delivery_connections SET capabilities='{"scenario":"timeout_after_create"}' WHERE id=simulator;
 effect:=public.delivery_simulator_effect(simulator,op,'create');
 IF effect->>'kind'<>'unknown' THEN RAISE EXCEPTION 'Timeout fixture missing'; END IF;
 UPDATE public.delivery_outbox SET lease_until=now()-interval '1 second' WHERE id=oldbox;
 work:=public.delivery_claim_work(1)->0;
 IF work->'outbox'->>'action'<>'lookup' THEN RAISE EXCEPTION 'Expired create was retried'; END IF;
 effect:=public.delivery_simulator_effect(simulator,op,'lookup','{"elapsed_seconds":0}');
 PERFORM public.delivery_finish_work(oldbox,old_token,effect);
 IF (SELECT state FROM public.delivery_jobs WHERE id=job_id)<>'reconciliation_required' THEN RAISE EXCEPTION 'Stale completion changed state'; END IF;
 PERFORM public.delivery_finish_work((work->'outbox'->>'id')::uuid,(work->>'lease_token')::uuid,effect);
 SELECT count(*) INTO n FROM public.delivery_simulator_bookings WHERE operation_key=op;
 IF n<>1 THEN RAISE EXCEPTION 'Duplicate simulator booking'; END IF;
 SELECT count(*) INTO n FROM public.delivery_attempts WHERE delivery_attempts.job_id=job_id AND action='create' AND outcome='authorized';
 IF n<>1 THEN RAISE EXCEPTION 'Second create authorized'; END IF;
 PERFORM pg_temp.expect_error(format('UPDATE public.delivery_attempts SET outcome=%L WHERE job_id=%L','rewritten',job_id),'DELIVERY_ATTEMPTS_APPEND_ONLY');

 -- AC-01/05: durable replay/out-of-order/conflicting terminal inbox.
 event_result:=public.delivery_receive_event(simulator,jsonb_build_object('provider_event_id','delivered-1','external_ref',effect->>'external_ref','state','delivered','occurred_at',now()));
 event_result:=public.delivery_receive_event(simulator,jsonb_build_object('provider_event_id','delivered-1','external_ref',effect->>'external_ref','state','delivered','occurred_at',now()));
 IF event_result->>'outcome'<>'duplicate' THEN RAISE EXCEPTION 'Event not deduplicated'; END IF;
 PERFORM public.delivery_receive_event(simulator,jsonb_build_object('provider_event_id','late-booked','external_ref',effect->>'external_ref','state','booked','occurred_at',now()-interval '1 hour'));
 PERFORM public.delivery_receive_event(simulator,jsonb_build_object('provider_event_id','terminal-conflict','external_ref',effect->>'external_ref','state','cancelled','occurred_at',now()));
 IF (SELECT state FROM public.delivery_jobs WHERE id=job_id)<>'delivered' THEN RAISE EXCEPTION 'Delivered regressed'; END IF;
 event_result:=public.delivery_receive_event(simulator,jsonb_build_object('provider_event_id','early-1','external_ref','unknown-before-attachment','state','booked','occurred_at',now()));
 IF event_result->>'outcome'<>'quarantined' OR NOT EXISTS(SELECT 1 FROM public.delivery_events WHERE provider_event_id='early-1' AND processed_at IS NULL AND delivery_events.job_id IS NULL) THEN RAISE EXCEPTION 'Early event lost'; END IF;

 -- Early confirmed delivery survives attachment of the older create snapshot.
 UPDATE public.delivery_outbox SET done=true;
 UPDATE public.delivery_connections SET capabilities='{"scenario":"success"}' WHERE id=simulator;
 q:=public.delivery_create_quote('spec01-north-one',items,zone,address,'simulator');
 result:=public.create_delivery_order_checked('spec01-north-one',gen_random_uuid(),'delivery',items,'{"name":"Early Event Guest"}',NULL,zone,NULL,NULL,NULL,NULL,0,'early', (q->>'id')::uuid,address);
 oid2:=(result->>'order_id')::uuid; op:=gen_random_uuid();
 INSERT INTO public.payments(venue_id,order_id,provider,provider_ref,amount_cents,currency,status,idempotency_key)
 SELECT venue,oid2,'synthetic','spec03_'||oid2::text,o.total_cents,'CAD','succeeded',gen_random_uuid() FROM public.orders o WHERE o.order_id=oid2;
 UPDATE public.orders SET status='ready',accepted_at=now(),ready_at=now() WHERE orders.order_id=oid2;
 j:=public.delivery_dispatch(oid2,owner_id,(q->>'id')::uuid,op,500); job_id:=(j->>'id')::uuid;
 work:=public.delivery_claim_work(1)->0;
 effect:=public.delivery_simulator_effect(simulator,op,'create');
 event_result:=public.delivery_receive_event(simulator,jsonb_build_object('provider_event_id','early-delivered','external_ref',effect->>'external_ref','state','delivered','occurred_at',now()));
 IF event_result->>'outcome'<>'quarantined' THEN RAISE EXCEPTION 'Pre-attachment event not quarantined'; END IF;
 PERFORM public.delivery_finish_work((work->'outbox'->>'id')::uuid,(work->>'lease_token')::uuid,effect);
 IF (SELECT state FROM public.delivery_jobs WHERE id=job_id)<>'delivered' OR EXISTS(SELECT 1 FROM public.delivery_events WHERE provider_event_id='early-delivered' AND processed_at IS NULL) THEN RAISE EXCEPTION 'Early delivery not attached'; END IF;

 -- Unsent cancellation has no courier booking or refund side effect.
 UPDATE public.delivery_outbox SET done=true;
 q:=public.delivery_create_quote('spec01-north-one',items,zone,address,'own_driver');
 result:=public.create_delivery_order_checked('spec01-north-one',gen_random_uuid(),'delivery',items,'{"name":"Cancel Guest"}',NULL,zone,NULL,NULL,NULL,NULL,0,'cancel',(q->>'id')::uuid,address);
 oid2:=(result->>'order_id')::uuid; op:=gen_random_uuid();
 INSERT INTO public.payments(venue_id,order_id,provider,provider_ref,amount_cents,currency,status,idempotency_key)
 SELECT venue,oid2,'synthetic','spec03_'||oid2::text,o.total_cents,'CAD','succeeded',gen_random_uuid() FROM public.orders o WHERE o.order_id=oid2;
 UPDATE public.orders SET status='ready',accepted_at=now(),ready_at=now() WHERE orders.order_id=oid2;
 j:=public.delivery_dispatch(oid2,owner_id,(q->>'id')::uuid,op,0); job_id:=(j->>'id')::uuid;
 PERFORM public.delivery_action(job_id,owner_id,'cancel','{"reason":"Synthetic cancellation before send"}');
 IF (SELECT state FROM public.delivery_jobs WHERE id=job_id)<>'cancelled' OR jsonb_array_length(public.delivery_claim_work(10))<>0 THEN RAISE EXCEPTION 'Unsent cancellation still dispatched'; END IF;
 IF EXISTS(SELECT 1 FROM public.payments p WHERE p.order_id=oid2 AND p.status<>'succeeded') THEN RAISE EXCEPTION 'Cancellation changed payment'; END IF;

 -- Unknown idempotent cancel is reconciled, then revived with bounded attempts.
 UPDATE public.delivery_outbox SET done=true;
 q:=public.delivery_create_quote('spec01-north-one',items,zone,address,'simulator');
 result:=public.create_delivery_order_checked('spec01-north-one',gen_random_uuid(),'delivery',items,'{"name":"Cancel Retry Guest"}',NULL,zone,NULL,NULL,NULL,NULL,0,'cancel-retry',(q->>'id')::uuid,address);
 oid2:=(result->>'order_id')::uuid; op:=gen_random_uuid();
 INSERT INTO public.payments(venue_id,order_id,provider,provider_ref,amount_cents,currency,status,idempotency_key)
 SELECT venue,oid2,'synthetic','spec03_'||oid2::text,o.total_cents,'CAD','succeeded',gen_random_uuid() FROM public.orders o WHERE o.order_id=oid2;
 UPDATE public.orders SET status='ready',accepted_at=now(),ready_at=now() WHERE orders.order_id=oid2;
 j:=public.delivery_dispatch(oid2,owner_id,(q->>'id')::uuid,op,500); job_id:=(j->>'id')::uuid;
 work:=public.delivery_claim_work(1)->0;
 effect:=public.delivery_simulator_effect(simulator,op,'create');
 PERFORM public.delivery_finish_work((work->'outbox'->>'id')::uuid,(work->>'lease_token')::uuid,effect);
 PERFORM public.delivery_action(job_id,owner_id,'cancel','{"reason":"Synthetic ambiguous cancellation"}');
 work:=public.delivery_claim_work(1)->0;
 IF work->'outbox'->>'action'<>'cancel' THEN RAISE EXCEPTION 'Cancellation not claimed'; END IF;
 PERFORM public.delivery_finish_work((work->'outbox'->>'id')::uuid,(work->>'lease_token')::uuid,'{"kind":"unknown","code":"CANCEL_TIMEOUT"}');
 UPDATE public.delivery_outbox SET available_at=now() WHERE delivery_outbox.job_id=job_id AND action='lookup';
 work:=public.delivery_claim_work(1)->0;
 effect:=public.delivery_simulator_effect(simulator,op,'lookup','{"elapsed_seconds":0}');
 PERFORM public.delivery_finish_work((work->'outbox'->>'id')::uuid,(work->>'lease_token')::uuid,effect);
 IF NOT EXISTS(SELECT 1 FROM public.delivery_outbox WHERE delivery_outbox.job_id=job_id AND action='cancel' AND NOT done AND attempts=1) THEN RAISE EXCEPTION 'Ambiguous cancellation not revived'; END IF;
 UPDATE public.delivery_outbox SET available_at=now() WHERE delivery_outbox.job_id=job_id AND action='cancel';
 work:=public.delivery_claim_work(1)->0;
 effect:=public.delivery_simulator_effect(simulator,op,'cancel');
 PERFORM public.delivery_finish_work((work->'outbox'->>'id')::uuid,(work->>'lease_token')::uuid,effect);
 IF (SELECT state FROM public.delivery_jobs WHERE id=job_id)<>'cancelled' THEN RAISE EXCEPTION 'Retried cancellation unresolved'; END IF;

 -- Composite foreign keys reject cross-tenant connection/quote references.
 PERFORM pg_temp.expect_error(format('UPDATE public.delivery_quotes SET venue_id=%L WHERE id=%L','13000000-0000-4000-8000-000000000003',q->>'id'),'foreign key');
 -- Every connection-selected failure fixture has an observable deterministic effect.
 UPDATE public.delivery_connections SET capabilities='{"scenario":"lookup_unavailable"}' WHERE id=simulator;
 op:=gen_random_uuid(); effect:=public.delivery_simulator_effect(simulator,op,'create');
 IF effect->>'kind'<>'unknown' OR public.delivery_simulator_effect(simulator,op,'lookup')->>'kind'<>'unknown' THEN RAISE EXCEPTION 'Unavailable lookup scenario missing'; END IF;
 UPDATE public.delivery_connections SET capabilities='{"scenario":"cancellation_rejected"}' WHERE id=simulator;
 op:=gen_random_uuid(); PERFORM public.delivery_simulator_effect(simulator,op,'create');
 effect:=public.delivery_simulator_effect(simulator,op,'cancel');
 IF effect->>'kind'<>'rejected' OR public.delivery_simulator_effect(simulator,op,'lookup','{"elapsed_seconds":0}')->>'state'<>'picked_up' THEN RAISE EXCEPTION 'Rejected cancellation scenario missing'; END IF;
 UPDATE public.delivery_connections SET capabilities='{"scenario":"cancellation_unknown"}' WHERE id=simulator;
 op:=gen_random_uuid(); PERFORM public.delivery_simulator_effect(simulator,op,'create');
 effect:=public.delivery_simulator_effect(simulator,op,'cancel');
 IF effect->>'kind'<>'unknown' OR public.delivery_simulator_effect(simulator,op,'lookup')->>'state'<>'cancelled' THEN RAISE EXCEPTION 'Unknown cancellation scenario missing'; END IF;
 UPDATE public.delivery_connections SET capabilities='{"scenario":"failed_delivery"}' WHERE id=simulator;
 op:=gen_random_uuid(); PERFORM public.delivery_simulator_effect(simulator,op,'create');
 effect:=public.delivery_simulator_effect(simulator,op,'lookup','{"elapsed_seconds":90}');
 IF effect->>'state'<>'failed' THEN RAISE EXCEPTION 'Failed delivery scenario missing'; END IF;
 RAISE NOTICE 'SPEC-03 SQL guardrails passed (isolated PostgreSQL only, not provider sandbox/live).';
END $$;
ROLLBACK;
