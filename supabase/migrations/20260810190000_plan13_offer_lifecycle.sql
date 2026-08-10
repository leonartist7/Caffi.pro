-- ============================================================================
-- PLAN-13 — Bounce-back + appreciation: shared offer-lifecycle schema.
--
-- Two additions to member_offers, designed once here and reused by every
-- later Lane A program type that issues automatically (PLAN-14 birthday/
-- anniversary, PLAN-16 survey, PLAN-17 mystery), not just this PR's two:
--
--   · valid_from — a bounce-back offer with no dead period is a discount,
--     not a bounce-back ("$5 back when you return between day 3 and
--     day 14"). NULL means immediately valid (every existing PLAN-12
--     offer keeps working unchanged).
--   · period_key — "issue at most once per member per program per period"
--     as a DB fact, not an application check the batch-issue route has to
--     get right forever. A bounce-back keys this on the order that earned
--     it; a birthday/anniversary/survey-reward keys it on the
--     type+year/period it belongs to.
-- ============================================================================

ALTER TABLE member_offers
    ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS period_key TEXT;

-- "At most one offer per member per program per period" — a re-run batch,
-- a retried webhook, or a lazily-issued birthday offer that fires twice in
-- the same year all collide on this instead of relying on the caller to
-- check first. NULL period_key (PLAN-12's original manual-issue path) is
-- unconstrained, matching that every hand-issued offer is its own event.
CREATE UNIQUE INDEX IF NOT EXISTS uq_member_offers_program_member_period
    ON member_offers(program_id, member_id, period_key) WHERE period_key IS NOT NULL;

-- forbid_member_offer_mutation (PLAN-10) enumerates immutable columns
-- explicitly — valid_from/period_key must join that list or they would be
-- silently mutable after issue, unlike every other field on the row.
CREATE OR REPLACE FUNCTION public.forbid_member_offer_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.offer_id     IS DISTINCT FROM OLD.offer_id
       OR NEW.venue_id    IS DISTINCT FROM OLD.venue_id
       OR NEW.member_id   IS DISTINCT FROM OLD.member_id
       OR NEW.program_id  IS DISTINCT FROM OLD.program_id
       OR NEW.code        IS DISTINCT FROM OLD.code
       OR NEW.value_cents IS DISTINCT FROM OLD.value_cents
       OR NEW.points_value IS DISTINCT FROM OLD.points_value
       OR NEW.issued_at   IS DISTINCT FROM OLD.issued_at
       OR NEW.expires_at  IS DISTINCT FROM OLD.expires_at
       OR NEW.valid_from  IS DISTINCT FROM OLD.valid_from
       OR NEW.period_key  IS DISTINCT FROM OLD.period_key
    THEN
        RAISE EXCEPTION 'member_offers is immutable after issue: only redeemed_at, redeemed_by_membership_id and status may change (offer %)', OLD.offer_id;
    END IF;

    IF OLD.redeemed_at IS NOT NULL AND NEW.redeemed_at IS DISTINCT FROM OLD.redeemed_at THEN
        RAISE EXCEPTION 'member_offers.redeemed_at is write-once: offer % was already redeemed at %', OLD.offer_id, OLD.redeemed_at;
    END IF;

    RETURN NEW;
END;
$$;

-- redeem_member_offer (PLAN-12): add the valid_from boundary. Placed after
-- the expiry check and the now-terminal-status check (post-draft-audit fix
-- to PLAN-12) so a redemption attempt on a not-yet-valid offer never
-- reaches the redeem UPDATE — same "raise, write nothing" shape as every
-- other rejection branch in this function.
CREATE OR REPLACE FUNCTION redeem_member_offer(
    p_venue_id UUID,
    p_code TEXT,
    p_staff_membership_id UUID
)
RETURNS TABLE (
    offer_id UUID,
    member_id UUID,
    program_id UUID,
    value_cents INTEGER,
    points_value INTEGER,
    redeemed_at TIMESTAMPTZ,
    already_redeemed BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_offer_id UUID;
    v_member_id UUID;
    v_program_id UUID;
    v_value_cents INTEGER;
    v_points_value INTEGER;
    v_status TEXT;
    v_expires_at TIMESTAMPTZ;
    v_valid_from TIMESTAMPTZ;
    v_redeemed_at TIMESTAMPTZ;
    v_program_name TEXT;
BEGIN
    SELECT mo.offer_id, mo.member_id, mo.program_id, mo.value_cents,
           mo.points_value, mo.status, mo.expires_at, mo.valid_from, mo.redeemed_at
      INTO v_offer_id, v_member_id, v_program_id, v_value_cents,
           v_points_value, v_status, v_expires_at, v_valid_from, v_redeemed_at
      FROM member_offers mo
     WHERE mo.venue_id = p_venue_id AND mo.code = p_code
     FOR UPDATE;

    IF v_offer_id IS NULL THEN
        RAISE EXCEPTION 'offer_not_found' USING ERRCODE = 'P0002';
    END IF;

    IF v_status = 'void' THEN
        RAISE EXCEPTION 'offer_void' USING ERRCODE = 'P0004';
    END IF;

    -- Idempotent replay: already redeemed, return the existing state,
    -- write nothing.
    IF v_redeemed_at IS NOT NULL THEN
        RETURN QUERY SELECT v_offer_id, v_member_id, v_program_id, v_value_cents,
                            v_points_value, v_redeemed_at, TRUE;
        RETURN;
    END IF;

    IF v_status = 'issued' AND v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
        UPDATE member_offers SET status = 'expired'
         WHERE member_offers.offer_id = v_offer_id AND member_offers.status = 'issued';
        RAISE EXCEPTION 'offer_expired' USING ERRCODE = 'P0001';
    END IF;

    -- Any remaining non-'issued' status (e.g. 'expired' from an earlier
    -- call) is terminal — never fall through to the redeem UPDATE below.
    IF v_status <> 'issued' THEN
        RAISE EXCEPTION 'offer_expired' USING ERRCODE = 'P0001';
    END IF;

    -- Bounce-back's whole mechanism is this window: not yet valid is a
    -- distinct, non-terminal rejection (the offer is fine, just early) —
    -- its own ERRCODE so the counter can show "not yet — good from <date>"
    -- rather than reusing the expired/void copy.
    IF v_valid_from IS NOT NULL AND v_valid_from > NOW() THEN
        RAISE EXCEPTION 'offer_not_yet_valid' USING ERRCODE = 'P0005';
    END IF;

    UPDATE member_offers
       SET redeemed_at = NOW(),
           redeemed_by_membership_id = p_staff_membership_id,
           status = 'redeemed'
     WHERE member_offers.offer_id = v_offer_id AND member_offers.status = 'issued'
     RETURNING member_offers.redeemed_at INTO v_redeemed_at;

    IF v_redeemed_at IS NOT NULL AND v_points_value IS NOT NULL AND v_points_value > 0 THEN
        SELECT lp.name INTO v_program_name FROM loyalty_programs lp
         WHERE lp.program_id = v_program_id;

        INSERT INTO points_ledger (
            transaction_id, tenant_id, member_id, points_change, reason,
            description, staff_membership_id, offer_id
        ) VALUES (
            gen_random_uuid(), p_venue_id, v_member_id, v_points_value, 'offer_redemption',
            'Offer redeemed: ' || COALESCE(v_program_name, 'loyalty offer'), p_staff_membership_id, v_offer_id
        )
        ON CONFLICT (offer_id) WHERE offer_id IS NOT NULL AND reason = 'offer_redemption'
        DO NOTHING;
    END IF;

    RETURN QUERY SELECT v_offer_id, v_member_id, v_program_id, v_value_cents,
                        v_points_value, v_redeemed_at, FALSE;
END;
$$;

REVOKE ALL ON FUNCTION redeem_member_offer(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION redeem_member_offer(UUID, TEXT, UUID) TO service_role;
