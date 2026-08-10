-- ============================================================================
-- PLAN-17 — Mystery reward gamification: reveal state.
--
-- The prize is drawn and fully decided server-side at ISSUE time
-- (lib/loyalty/mystery-issue.ts, before any reveal UI exists), stored in
-- the same value_cents/points_value columns every other offer type uses,
-- plus a new prize_label for the human-readable name a "$0 value, 50pt"
-- row alone can't carry. `revealed_at` records only WHEN the member first
-- saw it — never re-draws, never changes what was already decided.
-- ============================================================================

ALTER TABLE member_offers
    ADD COLUMN IF NOT EXISTS prize_label TEXT,
    ADD COLUMN IF NOT EXISTS revealed_at TIMESTAMPTZ;

-- forbid_member_offer_mutation (PLAN-10, extended by PLAN-13) enumerates
-- immutable columns explicitly. prize_label joins that list (set once at
-- issue, like value_cents — never changes after). revealed_at gets the
-- SAME write-once treatment redeemed_at already has: exempted from the
-- blanket immutable check, but an update that would move it from a value
-- back to something else still raises — "revealed" doesn't un-reveal.
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
       OR NEW.prize_label IS DISTINCT FROM OLD.prize_label
    THEN
        RAISE EXCEPTION 'member_offers is immutable after issue: only redeemed_at, redeemed_by_membership_id, status and revealed_at may change (offer %)', OLD.offer_id;
    END IF;

    IF OLD.redeemed_at IS NOT NULL AND NEW.redeemed_at IS DISTINCT FROM OLD.redeemed_at THEN
        RAISE EXCEPTION 'member_offers.redeemed_at is write-once: offer % was already redeemed at %', OLD.offer_id, OLD.redeemed_at;
    END IF;

    IF OLD.revealed_at IS NOT NULL AND NEW.revealed_at IS DISTINCT FROM OLD.revealed_at THEN
        RAISE EXCEPTION 'member_offers.revealed_at is write-once: offer % was already revealed at %', OLD.offer_id, OLD.revealed_at;
    END IF;

    RETURN NEW;
END;
$$;
