-- First-visit referral effects must survive a stopped request worker.
-- Additive; disable the trigger/worker to roll back, retaining work/history.
CREATE TABLE public.growth_referral_outbox (
 referred_member_id uuid PRIMARY KEY,
 venue_id uuid NOT NULL,
 visit_id uuid NOT NULL UNIQUE REFERENCES public.visits(visit_id) ON DELETE RESTRICT,
 referrer_member_id uuid NOT NULL,
 program_id uuid NOT NULL,
 program_config jsonb NOT NULL,
 staff_membership_id uuid REFERENCES public.memberships(membership_id) ON DELETE SET NULL,
 done boolean NOT NULL DEFAULT false,
 attempts integer NOT NULL DEFAULT 0,
 available_at timestamptz NOT NULL DEFAULT now(),
 lease_token uuid,
 lease_until timestamptz,
 safe_error text,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(venue_id,referred_member_id) REFERENCES public.members(tenant_id,member_id),
 FOREIGN KEY(venue_id,referrer_member_id) REFERENCES public.members(tenant_id,member_id),
 FOREIGN KEY(venue_id,program_id) REFERENCES public.loyalty_programs(venue_id,program_id)
);
CREATE INDEX growth_referral_outbox_due ON public.growth_referral_outbox(available_at)
 WHERE NOT done;
ALTER TABLE public.growth_referral_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.growth_referral_outbox FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.growth_referral_outbox TO service_role;

CREATE FUNCTION public.enqueue_first_visit_referral() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE referrer uuid; program record;
BEGIN
 -- A second simultaneous first visit can race this predicate, but the
 -- referred-member primary key serializes both enqueues to one work item.
 IF EXISTS(SELECT 1 FROM public.visits v
   WHERE v.member_id=NEW.member_id AND v.visit_id<>NEW.visit_id) THEN RETURN NEW; END IF;
 SELECT m.referred_by_member_id INTO referrer FROM public.members m
 WHERE m.member_id=NEW.member_id AND m.tenant_id=NEW.venue_id;
 IF referrer IS NULL OR referrer=NEW.member_id OR NOT EXISTS(
   SELECT 1 FROM public.members m
   WHERE m.member_id=referrer AND m.tenant_id=NEW.venue_id)
 THEN RETURN NEW; END IF;
 SELECT p.program_id,p.config INTO program FROM public.loyalty_programs p
 WHERE p.venue_id=NEW.venue_id AND p.type='referral' AND p.status='active'
 ORDER BY p.created_at,p.program_id LIMIT 1;
 IF NOT FOUND THEN RETURN NEW; END IF;
 INSERT INTO public.growth_referral_outbox(
  referred_member_id,venue_id,visit_id,referrer_member_id,program_id,
  program_config,staff_membership_id)
 VALUES(NEW.member_id,NEW.venue_id,NEW.visit_id,referrer,program.program_id,
        program.config,NEW.staff_membership_id)
 ON CONFLICT(referred_member_id) DO NOTHING;
 RETURN NEW;
END $$;
CREATE TRIGGER growth_first_visit_referral AFTER INSERT ON public.visits
 FOR EACH ROW EXECUTE FUNCTION public.enqueue_first_visit_referral();

CREATE FUNCTION public.claim_referral_followup() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE work public.growth_referral_outbox%ROWTYPE; token uuid:=gen_random_uuid();
BEGIN
 SELECT * INTO work FROM public.growth_referral_outbox
 WHERE NOT done AND available_at<=now()
 AND (lease_until IS NULL OR lease_until<now())
 ORDER BY available_at,referred_member_id FOR UPDATE SKIP LOCKED LIMIT 1;
 IF NOT FOUND THEN RETURN NULL; END IF;
 UPDATE public.growth_referral_outbox
 SET lease_token=token,lease_until=now()+interval '2 minutes',attempts=attempts+1
 WHERE referred_member_id=work.referred_member_id;
 RETURN jsonb_build_object('referred_member_id',work.referred_member_id,
   'venue_id',work.venue_id,'referrer_member_id',work.referrer_member_id,
   'program_id',work.program_id,'program_config',work.program_config,
   'staff_membership_id',work.staff_membership_id,'lease_token',token);
END $$;
CREATE FUNCTION public.finish_referral_followup(
 p_referred_member_id uuid,p_lease_token uuid,p_success boolean,
 p_safe_error text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE work public.growth_referral_outbox%ROWTYPE;
BEGIN
 SELECT * INTO work FROM public.growth_referral_outbox
 WHERE referred_member_id=p_referred_member_id FOR UPDATE;
 IF NOT FOUND OR work.done OR work.lease_token IS DISTINCT FROM p_lease_token
 OR work.lease_until<=now() THEN RAISE EXCEPTION 'STALE_REFERRAL_LEASE'; END IF;
 UPDATE public.growth_referral_outbox
 SET done=p_success,lease_token=NULL,lease_until=NULL,
 safe_error=CASE WHEN p_success THEN NULL ELSE left(coalesce(p_safe_error,'REFERRAL_FAILED'),80) END,
 available_at=CASE WHEN p_success THEN available_at ELSE now()+interval '5 minutes' END
 WHERE referred_member_id=p_referred_member_id;
END $$;
REVOKE ALL ON FUNCTION public.enqueue_first_visit_referral() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.claim_referral_followup() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finish_referral_followup(uuid,uuid,boolean,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_referral_followup() TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_referral_followup(uuid,uuid,boolean,text)
 TO service_role;
