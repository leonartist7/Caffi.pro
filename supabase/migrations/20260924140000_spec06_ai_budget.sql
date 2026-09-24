-- SPEC-06 AI usage reservation. Additive; no budget is enabled by default.
-- Rollback disables generation; preserve settled/reserved audit for reconciliation.
CREATE TABLE public.ai_venue_budgets (
 venue_id uuid PRIMARY KEY REFERENCES public.venues(venue_id) ON DELETE RESTRICT,
 monthly_token_cap bigint NOT NULL DEFAULT 0 CHECK (monthly_token_cap >= 0),
 enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ai_generation_usage (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 venue_id uuid NOT NULL REFERENCES public.venues(venue_id) ON DELETE RESTRICT,
 period_start date NOT NULL,
 kind text NOT NULL CHECK (kind IN ('social_caption','digest')),
 provider text NOT NULL CHECK (provider IN ('gateway','openai')),
 model text NOT NULL,
 reserved_tokens integer NOT NULL CHECK (reserved_tokens > 0),
 used_tokens integer CHECK (used_tokens >= 0),
 outcome text NOT NULL DEFAULT 'reserved'
   CHECK (outcome IN ('reserved','succeeded','failed','unknown')),
 created_at timestamptz NOT NULL DEFAULT now(),
 settled_at timestamptz,
 UNIQUE (venue_id,id)
);
CREATE INDEX ai_generation_usage_period ON public.ai_generation_usage(venue_id,period_start);
ALTER TABLE public.ai_venue_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generation_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_venue_budgets, public.ai_generation_usage FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ai_venue_budgets, public.ai_generation_usage TO service_role;

CREATE FUNCTION public.ai_reserve_generation(
 p_venue_id uuid, p_kind text, p_provider text, p_model text, p_reserved_tokens integer
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.ai_venue_budgets%ROWTYPE;
 used bigint; period date; reservation uuid;
BEGIN
 IF p_kind NOT IN ('social_caption','digest') OR p_provider NOT IN ('gateway','openai')
    OR p_model IS NULL OR length(p_model) NOT BETWEEN 3 AND 100
    OR p_reserved_tokens IS NULL OR p_reserved_tokens < 1 OR p_reserved_tokens > 100000 THEN
   RAISE EXCEPTION 'AI_INVALID_RESERVATION';
 END IF;
 SELECT * INTO b FROM public.ai_venue_budgets WHERE venue_id=p_venue_id FOR UPDATE;
 IF NOT FOUND OR NOT b.enabled OR b.monthly_token_cap=0 THEN RAISE EXCEPTION 'AI_BUDGET_DISABLED'; END IF;
 period := date_trunc('month',now() AT TIME ZONE 'UTC')::date;
 SELECT COALESCE(sum(CASE WHEN outcome='failed' THEN 0
                          WHEN outcome='succeeded' THEN used_tokens
                          ELSE reserved_tokens END),0)
 INTO used FROM public.ai_generation_usage
 WHERE venue_id=p_venue_id AND period_start=period;
 IF used + p_reserved_tokens > b.monthly_token_cap THEN RAISE EXCEPTION 'AI_BUDGET_EXHAUSTED'; END IF;
 INSERT INTO public.ai_generation_usage(venue_id,period_start,kind,provider,model,reserved_tokens)
 VALUES(p_venue_id,period,p_kind,p_provider,p_model,p_reserved_tokens)
 RETURNING id INTO reservation;
 RETURN reservation;
END $$;
CREATE FUNCTION public.ai_settle_generation(
 p_venue_id uuid,p_id uuid,p_outcome text,p_used_tokens integer DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u public.ai_generation_usage%ROWTYPE;
BEGIN
 IF p_outcome NOT IN ('succeeded','failed','unknown') THEN RAISE EXCEPTION 'AI_INVALID_OUTCOME'; END IF;
 SELECT * INTO u FROM public.ai_generation_usage WHERE venue_id=p_venue_id AND id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'AI_RESERVATION_NOT_FOUND'; END IF;
 IF u.outcome <> 'reserved' THEN RETURN; END IF;
 IF p_outcome='succeeded' AND
   (p_used_tokens IS NULL OR p_used_tokens < 0 OR p_used_tokens > u.reserved_tokens) THEN
   RAISE EXCEPTION 'AI_INVALID_USAGE';
 END IF;
 UPDATE public.ai_generation_usage
 SET outcome=p_outcome,used_tokens=CASE WHEN p_outcome='succeeded' THEN p_used_tokens ELSE NULL END,
     settled_at=now()
 WHERE id=p_id;
END $$;
REVOKE ALL ON FUNCTION public.ai_reserve_generation(uuid,text,text,text,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.ai_settle_generation(uuid,uuid,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ai_reserve_generation(uuid,text,text,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_settle_generation(uuid,uuid,text,integer) TO service_role;
