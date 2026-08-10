-- ============================================================================
-- PLAN-15 — Referral engine: structural once-only credit for the points
-- path. (The value-reward path reuses PLAN-13's member_offers period_key
-- dedup as-is — no schema change needed there.)
--
-- "Referrer credited exactly once, on first visit only" — the points_ledger
-- INSERT this backs is guarded by the SAME primitive PLAN-12's
-- points_ledger.offer_id backstop already established: a nullable FK column
-- naming what triggered the row, plus a partial unique index on it. Here
-- the trigger is "which referred member's first visit caused this," not an
-- offer, so it needs its own column — but the shape (nullable FK +
-- WHERE ... AND reason = '<x>' partial unique index) is identical.
-- ============================================================================

ALTER TABLE points_ledger
    ADD COLUMN IF NOT EXISTS referred_member_id UUID REFERENCES members(member_id) ON DELETE SET NULL;

-- At most one referral credit per REFERRED member (not per referrer) — a
-- member can only have one "first visit," so this is the correct key: it
-- also means two different active referral programs can't both credit the
-- same referrer for the same referred member's first visit twice.
CREATE UNIQUE INDEX IF NOT EXISTS uq_points_ledger_referral_award
    ON points_ledger(referred_member_id) WHERE referred_member_id IS NOT NULL AND reason = 'referral';
