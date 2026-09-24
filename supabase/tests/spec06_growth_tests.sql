-- SPEC-06 AC-02/05: disposable local-only AI accounting and reversal.
BEGIN;
INSERT INTO public.ai_venue_budgets(venue_id,monthly_token_cap,enabled)
VALUES('13000000-0000-4000-8000-000000000001',300,true);
DO $$
DECLARE a uuid; b uuid; n integer;
BEGIN
 a:=public.ai_reserve_generation(
  '13000000-0000-4000-8000-000000000001','digest','gateway','openai/fixture',200);
 BEGIN
  PERFORM public.ai_reserve_generation(
   '13000000-0000-4000-8000-000000000001','digest','gateway','openai/fixture',200);
  RAISE EXCEPTION 'Over-budget request passed';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'AI_BUDGET_EXHAUSTED' THEN RAISE; END IF;
 END;
 PERFORM public.ai_settle_generation('13000000-0000-4000-8000-000000000001',a,'succeeded',100);
 b:=public.ai_reserve_generation(
  '13000000-0000-4000-8000-000000000001','social_caption','gateway','openai/fixture',200);
 BEGIN
  PERFORM public.ai_settle_generation('13000000-0000-4000-8000-000000000003',b,'succeeded',100);
  RAISE EXCEPTION 'Foreign venue settled reservation';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'AI_RESERVATION_NOT_FOUND' THEN RAISE; END IF;
 END;
 PERFORM public.ai_settle_generation('13000000-0000-4000-8000-000000000001',b,'unknown');
 SELECT count(*) INTO n FROM public.ai_generation_usage
  WHERE venue_id='13000000-0000-4000-8000-000000000001';
 IF n<>2 THEN RAISE EXCEPTION 'Unexpected usage rows %',n; END IF;
END $$;
DO $$
BEGIN
 IF has_function_privilege('authenticated','public.ai_reserve_generation(uuid,text,text,text,integer)','EXECUTE')
 OR has_table_privilege('authenticated','public.ai_generation_usage','SELECT')
 THEN RAISE EXCEPTION 'AI budget exposed to client roles'; END IF;
END $$;
INSERT INTO public.members(member_id,tenant_id,full_name)
VALUES('18000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-000000000001','SPEC-06 synthetic');
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.member_status
   WHERE member_id='18000000-0000-4000-8000-000000000001'
     AND venue_id='13000000-0000-4000-8000-000000000001'
     AND full_name='SPEC-06 synthetic')
 THEN RAISE EXCEPTION 'Scoped member display name absent'; END IF;
 IF EXISTS(SELECT 1 FROM public.member_status
   WHERE member_id='18000000-0000-4000-8000-000000000001'
     AND venue_id='13000000-0000-4000-8000-000000000003')
 THEN RAISE EXCEPTION 'Foreign venue can address member'; END IF;
END $$;
DO $$
DECLARE own_count integer; foreign_count integer; denied boolean := false;
BEGIN
 PERFORM set_config('role','authenticated',true);
 PERFORM set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000001',true);
 PERFORM set_config('request.jwt.claims',
   '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
 SELECT count(*) INTO own_count FROM public.member_status
  WHERE member_id='18000000-0000-4000-8000-000000000001'
    AND venue_id='13000000-0000-4000-8000-000000000001'
    AND full_name='SPEC-06 synthetic';
 SELECT count(*) INTO foreign_count FROM public.member_status
  WHERE venue_id='13000000-0000-4000-8000-000000000003';
 IF own_count<>1 OR foreign_count<>0 THEN
  RAISE EXCEPTION 'Member status RLS mismatch: %, %',own_count,foreign_count;
 END IF;
 PERFORM set_config('role','anon',true);
 BEGIN
  PERFORM full_name FROM public.member_status LIMIT 1;
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Anonymous member name access'; END IF;
 PERFORM set_config('role','postgres',true);
 PERFORM set_config('request.jwt.claim.sub','',true);
 PERFORM set_config('request.jwt.claims','',true);
END $$;
INSERT INTO public.orders(order_id,venue_id,member_id,client_uuid,order_type,status,subtotal_cents,total_cents)
VALUES('18000000-0000-4000-8000-000000000002','13000000-0000-4000-8000-000000000001',
'18000000-0000-4000-8000-000000000001','18000000-0000-4000-8000-000000000003',
'pickup','completed',1000,1000);
INSERT INTO public.points_ledger(tenant_id,member_id,order_id,points_change,reason)
VALUES('13000000-0000-4000-8000-000000000001','18000000-0000-4000-8000-000000000001',
'18000000-0000-4000-8000-000000000002',10,'order');
UPDATE public.orders SET status='refunded'
WHERE order_id='18000000-0000-4000-8000-000000000002';
UPDATE public.orders SET status='refunded'
WHERE order_id='18000000-0000-4000-8000-000000000002';
DO $$
DECLARE total integer; reversals integer;
BEGIN
 SELECT sum(points_change), count(*) FILTER (WHERE reason='order_refund')
 INTO total,reversals FROM public.points_ledger
 WHERE order_id='18000000-0000-4000-8000-000000000002';
 IF total<>0 OR reversals<>1 THEN RAISE EXCEPTION 'Refund reversal incorrect: %, %',total,reversals; END IF;
END $$;
INSERT INTO public.rewards(reward_id,tenant_id,name,points_required,reward_type)
VALUES('18000000-0000-4000-8000-000000000010',
 '13000000-0000-4000-8000-000000000001','Synthetic reward',15,'free_item');
INSERT INTO public.points_ledger(tenant_id,member_id,points_change,reason)
VALUES('13000000-0000-4000-8000-000000000001',
 '18000000-0000-4000-8000-000000000001',20,'signup_bonus');
DO $$
DECLARE first_result record; replay_result record; n integer;
BEGIN
 SELECT * INTO first_result FROM public.redeem_reward(
  '18000000-0000-4000-8000-000000000001',
  '18000000-0000-4000-8000-000000000010',
  '13000000-0000-4000-8000-000000000001',
  '14000000-0000-4000-8000-000000000005',
  '18000000-0000-4000-8000-000000000011');
 SELECT * INTO replay_result FROM public.redeem_reward(
  '18000000-0000-4000-8000-000000000001',
  '18000000-0000-4000-8000-000000000010',
  '13000000-0000-4000-8000-000000000001',
  '14000000-0000-4000-8000-000000000005',
  '18000000-0000-4000-8000-000000000011');
 IF first_result.redemption_id IS DISTINCT FROM replay_result.redemption_id
 OR replay_result.new_balance<>5 THEN RAISE EXCEPTION 'Redemption replay spent again'; END IF;
 BEGIN
  PERFORM public.redeem_reward(
   '18000000-0000-4000-8000-000000000001',
   '18000000-0000-4000-8000-000000000010',
   '13000000-0000-4000-8000-000000000001',
   '14000000-0000-4000-8000-000000000005',
   '18000000-0000-4000-8000-000000000012');
  RAISE EXCEPTION 'Distinct key overspent';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM<>'INSUFFICIENT_BALANCE' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM public.redeem_reward(
   '18000000-0000-4000-8000-000000000001',
   '18000000-0000-4000-8000-000000000010',
   '13000000-0000-4000-8000-000000000001',
   '14000000-0000-4000-8000-000000000006',
   '18000000-0000-4000-8000-000000000011');
  RAISE EXCEPTION 'Revoked counter replay succeeded';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM<>'STAFF_ACCESS_REVOKED' THEN RAISE; END IF;
 END;
 SELECT count(*) INTO n FROM public.redemptions
 WHERE operation_key='18000000-0000-4000-8000-000000000011';
 IF n<>1 THEN RAISE EXCEPTION 'Duplicate redemption row'; END IF;
END $$;
INSERT INTO public.orders(order_id,venue_id,client_uuid,order_type,status,subtotal_cents,total_cents)
VALUES('18000000-0000-4000-8000-000000000020',
 '13000000-0000-4000-8000-000000000001',
 '18000000-0000-4000-8000-000000000021','pickup','pending',100,100);
UPDATE public.orders SET status='paid'
 WHERE order_id='18000000-0000-4000-8000-000000000020';
DO $$
DECLARE work jsonb; n integer;
BEGIN
 work:=public.claim_paid_offer_followup();
 IF work->>'order_id'<>'18000000-0000-4000-8000-000000000020'
 THEN RAISE EXCEPTION 'Paid offer follow-up missing'; END IF;
 PERFORM public.finish_paid_offer_followup(
  (work->>'order_id')::uuid,(work->>'lease_token')::uuid,true,NULL);
 SELECT count(*) INTO n FROM public.growth_offer_outbox
 WHERE order_id='18000000-0000-4000-8000-000000000020' AND done;
 IF n<>1 THEN RAISE EXCEPTION 'Paid offer follow-up not settled'; END IF;
END $$;
ROLLBACK;
