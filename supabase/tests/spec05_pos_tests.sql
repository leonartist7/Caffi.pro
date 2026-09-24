-- SPEC-05 AC-01..04 disposable synthetic contract checks.
BEGIN;
INSERT INTO public.pos_connections(id,venue_id,provider,environment,enabled,capabilities)
VALUES('19000000-0000-4000-8000-000000000001',
       '13000000-0000-4000-8000-000000000001',
       'simulator','simulation',true,'{"scenario":"timeout_after_accept"}');
SELECT public.pos_apply_menu('19000000-0000-4000-8000-000000000001',
 '{"currency":"CAD","version":"v1","complete":true,
   "categories":[{"externalId":"cat-1","name":"Lunch"}],
   "items":[{"externalId":"sandwich","externalCategoryId":"cat-1","name":"Sandwich",
     "priceMinor":900,"available":true,
     "modifiers":[{"externalId":"cheese","name":"Cheese","priceMinor":100}]}]}'::jsonb);
SELECT public.pos_apply_menu('19000000-0000-4000-8000-000000000001',
 '{"currency":"CAD","version":"v1","complete":true,
   "categories":[{"externalId":"cat-1","name":"Lunch"}],
   "items":[{"externalId":"sandwich","externalCategoryId":"cat-1","name":"Sandwich",
     "priceMinor":900,"available":true,
     "modifiers":[{"externalId":"cheese","name":"Cheese","priceMinor":100}]}]}'::jsonb);
DO $$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.pos_item_mappings
 WHERE connection_id='19000000-0000-4000-8000-000000000001';
 IF n<>1 THEN RAISE EXCEPTION 'Expected one item mapping'; END IF;
 SELECT count(*) INTO n FROM public.pos_modifier_mappings
 WHERE connection_id='19000000-0000-4000-8000-000000000001';
 IF n<>1 THEN RAISE EXCEPTION 'Expected one modifier mapping'; END IF;
 BEGIN
  PERFORM public.pos_apply_menu('19000000-0000-4000-8000-000000000001',
   '{"currency":"USD","version":"v2","complete":true,"categories":[],"items":[]}'::jsonb);
  RAISE EXCEPTION 'Invalid currency imported';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM<>'POS_INVALID_SNAPSHOT' THEN RAISE; END IF;
 END;
 SELECT count(*) INTO n FROM public.pos_item_mappings
 WHERE connection_id='19000000-0000-4000-8000-000000000001'
 AND imported_version='v1';
 IF n<>1 THEN RAISE EXCEPTION 'Failed import changed committed mapping'; END IF;
 BEGIN
  UPDATE public.menu_items SET price_cents=1
  WHERE item_id=(SELECT item_id FROM public.pos_item_mappings
   WHERE connection_id='19000000-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'POS-owned price was editable';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM<>'POS_MENU_OWNED' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM public.pos_apply_menu('19000000-0000-4000-8000-000000000001',
   '{"currency":"CAD","version":"bad","complete":true,"categories":[]}'::jsonb);
  RAISE EXCEPTION 'Missing items accepted';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM<>'POS_INVALID_SNAPSHOT' THEN RAISE; END IF;
 END;
 BEGIN
  UPDATE public.modifiers SET price_delta_cents=1
  WHERE modifier_id=(SELECT modifier_id FROM public.pos_modifier_mappings
   WHERE connection_id='19000000-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'POS-owned modifier was editable';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM<>'POS_MENU_OWNED' THEN RAISE; END IF;
 END; IF public.pos_manager('13000000-0000-4000-8000-000000000001',
 '11000000-0000-4000-8000-000000000003') THEN
  RAISE EXCEPTION 'Revoked owner retained POS access';
 END IF;
 IF public.pos_manager('13000000-0000-4000-8000-000000000003',
 '11000000-0000-4000-8000-000000000001') THEN
  RAISE EXCEPTION 'Cross-tenant POS access';
 END IF;
 IF has_table_privilege('authenticated','public.pos_submissions','SELECT')
 OR has_function_privilege('authenticated','public.pos_claim_work()','EXECUTE')
 THEN RAISE EXCEPTION 'POS operational data exposed'; END IF;
END $$;
INSERT INTO public.orders(order_id,venue_id,client_uuid,order_type,status,subtotal_cents,total_cents)
VALUES('19000000-0000-4000-8000-000000000002',
'13000000-0000-4000-8000-000000000001',
'19000000-0000-4000-8000-000000000003','pickup','pending',1000,1000);
INSERT INTO public.order_items(order_id,venue_id,item_id,name_snapshot,unit_price_cents,quantity)
SELECT '19000000-0000-4000-8000-000000000002',venue_id,item_id,'Sandwich',900,1
FROM public.pos_item_mappings WHERE connection_id='19000000-0000-4000-8000-000000000001';
INSERT INTO public.order_item_modifiers(order_item_id,modifier_id,name_snapshot,price_delta_cents)
SELECT oi.order_item_id,pm.modifier_id,'Cheese',100
FROM public.order_items oi JOIN public.pos_modifier_mappings pm
ON pm.item_id=oi.item_id AND pm.venue_id=oi.venue_id
WHERE oi.order_id='19000000-0000-4000-8000-000000000002';
UPDATE public.orders SET status='paid'
WHERE order_id='19000000-0000-4000-8000-000000000002';
DO $$
DECLARE w jsonb; effect jsonb; n integer;
BEGIN
 BEGIN
  UPDATE public.orders SET status='accepted'
  WHERE order_id='19000000-0000-4000-8000-000000000002';
  RAISE EXCEPTION 'Order accepted without POS acknowledgement';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM<>'POS_ACK_REQUIRED' THEN RAISE; END IF;
 END;
 w:=public.pos_claim_work();
 IF w->>'action'<>'create' THEN RAISE EXCEPTION 'Expected first create'; END IF;
 IF w->'lines'->0->'modifiers'->>0 <> 'cheese' THEN
  RAISE EXCEPTION 'POS modifier mapping missing from submission';
 END IF;
 effect:=public.pos_simulator_effect((w->>'connection_id')::uuid,
   (w->>'operation_key')::uuid,'create');
 IF effect->>'kind'<>'unknown' THEN RAISE EXCEPTION 'Expected ambiguous timeout'; END IF;
 PERFORM public.pos_finish_work((w->>'outbox_id')::uuid,
   (w->>'lease_token')::uuid,effect);
 UPDATE public.pos_outbox SET available_at=now()-interval '1 second';
 w:=public.pos_claim_work();
 IF w->>'action'<>'lookup' THEN RAISE EXCEPTION 'Retry attempted duplicate create'; END IF;
 effect:=public.pos_simulator_effect((w->>'connection_id')::uuid,
   (w->>'operation_key')::uuid,'lookup');
 IF effect->>'kind'<>'acknowledged' THEN RAISE EXCEPTION 'Lookup failed to recover ticket'; END IF;
 PERFORM public.pos_finish_work((w->>'outbox_id')::uuid,
   (w->>'lease_token')::uuid,effect);
 SELECT count(*) INTO n FROM public.pos_simulator_tickets
 WHERE connection_id='19000000-0000-4000-8000-000000000001';
 IF n<>1 THEN RAISE EXCEPTION 'Duplicate POS ticket'; END IF;
 UPDATE public.orders SET status='accepted'
 WHERE order_id='19000000-0000-4000-8000-000000000002';
END $$;
-- A disconnected payment is durable and cannot be accepted. Once the
-- connection returns, a reasoned manager action resumes a never-sent create.
UPDATE public.pos_connections SET enabled=false
 WHERE id='19000000-0000-4000-8000-000000000001';
INSERT INTO public.orders(order_id,venue_id,client_uuid,order_type,status,subtotal_cents,total_cents)
VALUES('19000000-0000-4000-8000-000000000004',
'13000000-0000-4000-8000-000000000001',
'19000000-0000-4000-8000-000000000005','pickup','pending',900,900);
INSERT INTO public.order_items(order_id,venue_id,item_id,name_snapshot,unit_price_cents,quantity)
SELECT '19000000-0000-4000-8000-000000000004',venue_id,item_id,'Sandwich',900,1
FROM public.pos_item_mappings WHERE connection_id='19000000-0000-4000-8000-000000000001';
UPDATE public.orders SET status='paid'
 WHERE order_id='19000000-0000-4000-8000-000000000004';
DO $$
DECLARE sid uuid; recovery jsonb; claimed jsonb;
BEGIN
 SELECT id INTO sid FROM public.pos_submissions
 WHERE order_id='19000000-0000-4000-8000-000000000004'
 AND state='attention' AND safe_error='POS_DISCONNECTED';
 IF sid IS NULL THEN RAISE EXCEPTION 'Disconnected paid order was lost'; END IF;
 BEGIN
  UPDATE public.orders SET status='accepted'
  WHERE order_id='19000000-0000-4000-8000-000000000004';
  RAISE EXCEPTION 'Disconnected order accepted';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM<>'POS_ACK_REQUIRED' THEN RAISE; END IF;
 END;
 UPDATE public.pos_connections SET enabled=true
 WHERE id='19000000-0000-4000-8000-000000000001';
 recovery:=public.pos_request_lookup(sid,
  '11000000-0000-4000-8000-000000000001','reconnected');
 IF recovery->>'action'<>'create' THEN RAISE EXCEPTION 'Never-sent order did not resume create'; END IF;
 claimed:=public.pos_claim_work();
 IF claimed->>'action'<>'create' THEN RAISE EXCEPTION 'Recovered job not create'; END IF;
END $$;
ROLLBACK;
