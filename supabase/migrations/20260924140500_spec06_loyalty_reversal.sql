-- SPEC-06: append-only reversal for a completed order that subsequently reaches
-- the verified refunded state. Existing refund API remains gated by SPEC-02.
-- Historical refunded rows need a separate audited backfill, never guessed.
CREATE UNIQUE INDEX uq_points_ledger_order_refund
 ON public.points_ledger(order_id)
 WHERE order_id IS NOT NULL AND reason='order_refund';

CREATE FUNCTION public.reverse_refunded_order_points() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE earned integer; earned_member uuid; member_count integer;
BEGIN
 IF OLD.status='refunded' OR NEW.status<>'refunded' THEN RETURN NEW; END IF;
 SELECT COALESCE(sum(points_change),0)::integer, (array_agg(member_id))[1], count(DISTINCT member_id)
 INTO earned, earned_member, member_count
 FROM public.points_ledger
 WHERE tenant_id=NEW.venue_id AND order_id=NEW.order_id AND reason='order'
   AND points_change>0;
 IF member_count>1 THEN RAISE EXCEPTION 'LOYALTY_MEMBER_CONFLICT'; END IF;
 IF earned>0 AND earned_member IS NOT NULL THEN
   INSERT INTO public.points_ledger
     (tenant_id,member_id,order_id,points_change,reason,description)
   VALUES (NEW.venue_id,earned_member,NEW.order_id,-earned,'order_refund',
           'Order refund reversal')
   ON CONFLICT (order_id) WHERE order_id IS NOT NULL AND reason='order_refund'
   DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER spec06_refund_points
 AFTER UPDATE OF status ON public.orders
 FOR EACH ROW EXECUTE FUNCTION public.reverse_refunded_order_points();
REVOKE ALL ON FUNCTION public.reverse_refunded_order_points() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_refunded_order_points() TO service_role;

-- Historical four-argument redemption is intentionally inaccessible to the
-- service role; every new operation must carry an idempotency key.
REVOKE ALL ON FUNCTION public.redeem_reward(uuid,uuid,uuid,uuid) FROM service_role;
ALTER TABLE public.redemptions ADD COLUMN operation_key uuid;
ALTER TABLE public.redemptions ADD COLUMN balance_after integer;
CREATE UNIQUE INDEX redemptions_venue_operation
 ON public.redemptions(venue_id,operation_key) WHERE operation_key IS NOT NULL;

CREATE FUNCTION public.redeem_reward(
 p_member_id uuid,p_reward_id uuid,p_venue_id uuid,
 p_staff_membership_id uuid,p_operation_key uuid
) RETURNS TABLE(new_balance integer,redemption_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE member_row public.members%ROWTYPE; reward_row public.rewards%ROWTYPE;
 existing public.redemptions%ROWTYPE; balance integer; tx uuid; redeemed uuid;
BEGIN
 IF p_operation_key IS NULL THEN RAISE EXCEPTION 'OPERATION_KEY_REQUIRED'; END IF;
 SELECT * INTO member_row FROM public.members
 WHERE member_id=p_member_id AND tenant_id=p_venue_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'MEMBER_NOT_FOUND'; END IF;
 IF NOT EXISTS(
  SELECT 1 FROM public.memberships m JOIN public.venues v ON v.venue_id=p_venue_id
  WHERE m.membership_id=p_staff_membership_id AND m.is_active
   AND m.role IN ('owner','manager','staff')
   AND m.org_id=v.org_id AND (m.venue_id=p_venue_id OR m.venue_id IS NULL)
 ) THEN RAISE EXCEPTION 'STAFF_ACCESS_REVOKED'; END IF;
 SELECT * INTO existing FROM public.redemptions
 WHERE venue_id=p_venue_id AND operation_key=p_operation_key;
 IF FOUND THEN
  IF existing.member_id<>p_member_id OR existing.reward_id<>p_reward_id
  THEN RAISE EXCEPTION 'OPERATION_KEY_CONFLICT'; END IF;
  RETURN QUERY SELECT existing.balance_after,existing.redemption_id;
  RETURN;
 END IF;
 SELECT * INTO reward_row FROM public.rewards
 WHERE reward_id=p_reward_id AND tenant_id=p_venue_id AND is_active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'REWARD_NOT_FOUND'; END IF;
 SELECT COALESCE(sum(points_change),0)::integer INTO balance
 FROM public.points_ledger
 WHERE member_id=p_member_id AND tenant_id=p_venue_id;
 IF balance<reward_row.points_required THEN RAISE EXCEPTION 'INSUFFICIENT_BALANCE'; END IF;
 tx:=gen_random_uuid();
 INSERT INTO public.points_ledger(
  transaction_id,tenant_id,member_id,points_change,reason,description,staff_membership_id
 ) VALUES(tx,p_venue_id,p_member_id,-reward_row.points_required,'redemption',
          'Redeemed: '||reward_row.name,p_staff_membership_id);
 INSERT INTO public.redemptions(
  member_id,reward_id,venue_id,staff_membership_id,ledger_transaction_id,
  operation_key,balance_after
 ) VALUES(p_member_id,p_reward_id,p_venue_id,p_staff_membership_id,tx,
          p_operation_key,balance-reward_row.points_required)
 RETURNING redemptions.redemption_id INTO redeemed;
 RETURN QUERY SELECT balance-reward_row.points_required,redeemed;
END $$;
REVOKE ALL ON FUNCTION public.redeem_reward(uuid,uuid,uuid,uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_reward(uuid,uuid,uuid,uuid,uuid)
 TO service_role;

-- Paid-event follow-up survives a webhook process crash. The existing
-- per-program period key makes retrying this outbox safe after partial issue.
CREATE TABLE public.growth_offer_outbox (
 order_id uuid PRIMARY KEY,
 venue_id uuid NOT NULL,
 done boolean NOT NULL DEFAULT false,
 attempts integer NOT NULL DEFAULT 0,
 available_at timestamptz NOT NULL DEFAULT now(),
 lease_token uuid,
 lease_until timestamptz,
 safe_error text,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(venue_id,order_id) REFERENCES public.orders(venue_id,order_id)
);
CREATE INDEX growth_offer_outbox_due ON public.growth_offer_outbox(available_at)
 WHERE NOT done;
ALTER TABLE public.growth_offer_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.growth_offer_outbox FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.growth_offer_outbox TO service_role;
CREATE FUNCTION public.enqueue_paid_offer_followup() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.status='paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
  INSERT INTO public.growth_offer_outbox(venue_id,order_id)
  VALUES(NEW.venue_id,NEW.order_id) ON CONFLICT(order_id) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER growth_offer_paid AFTER UPDATE OF status ON public.orders
 FOR EACH ROW EXECUTE FUNCTION public.enqueue_paid_offer_followup();
CREATE FUNCTION public.claim_paid_offer_followup() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE work public.growth_offer_outbox%ROWTYPE; token uuid:=gen_random_uuid();
BEGIN
 SELECT * INTO work FROM public.growth_offer_outbox
 WHERE NOT done AND available_at<=now()
 AND (lease_until IS NULL OR lease_until<now())
 ORDER BY available_at,order_id FOR UPDATE SKIP LOCKED LIMIT 1;
 IF NOT FOUND THEN RETURN NULL; END IF;
 UPDATE public.growth_offer_outbox SET lease_token=token,
  lease_until=now()+interval '2 minutes',attempts=attempts+1
 WHERE order_id=work.order_id;
 RETURN jsonb_build_object('order_id',work.order_id,
   'venue_id',work.venue_id,'lease_token',token);
END $$;
CREATE FUNCTION public.finish_paid_offer_followup(
 p_order_id uuid,p_lease_token uuid,p_success boolean,p_safe_error text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE work public.growth_offer_outbox%ROWTYPE;
BEGIN
 SELECT * INTO work FROM public.growth_offer_outbox
 WHERE order_id=p_order_id FOR UPDATE;
 IF NOT FOUND OR work.done OR work.lease_token IS DISTINCT FROM p_lease_token
 OR work.lease_until<=now() THEN RAISE EXCEPTION 'STALE_OFFER_LEASE'; END IF;
 UPDATE public.growth_offer_outbox
 SET done=p_success,lease_token=NULL,lease_until=NULL,
  safe_error=CASE WHEN p_success THEN NULL ELSE left(coalesce(p_safe_error,'ISSUANCE_FAILED'),80) END,
  available_at=CASE WHEN p_success THEN available_at
                    ELSE now()+interval '5 minutes' END
 WHERE order_id=p_order_id;
END $$;
REVOKE ALL ON FUNCTION public.enqueue_paid_offer_followup() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.claim_paid_offer_followup() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finish_paid_offer_followup(uuid,uuid,boolean,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_paid_offer_followup() TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_paid_offer_followup(uuid,uuid,boolean,text)
 TO service_role;
