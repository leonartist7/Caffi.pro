-- ============================================================================
-- PLAN-12 — Offer engine core: redemption RPC.
--
-- loyalty_programs, member_offers, their RLS policies, the
-- forbid_member_offer_mutation trigger, and the uq_member_offers_redeemed_once
-- partial unique index all already exist (20260722120000_batch_schema_lanes_abc.sql,
-- Lane A's PLAN-10). This migration adds the redemption RPC, modelled directly
-- on redeem_reward() (aro_schema.sql) — same SECURITY DEFINER + FOR UPDATE +
-- typed-ERRCODE shape, service_role-only — plus one small schema addition
-- added in post-draft audit: a structural, DB-level backstop against the
-- points-ledger double-credit this function's control flow alone was found
-- to be capable of (see the comment above the CREATE FUNCTION below).
-- ============================================================================

-- points_ledger.offer_id: which offer (if any) a points_ledger row came
-- from. Mirrors the existing order_id column/uq_points_ledger_order_award
-- pattern (20260714110000_order_operations.sql) exactly: "at most one
-- credit row per offer" is a fact the catalogue itself enforces, not
-- something only the RPC's own control flow has to get right forever.
ALTER TABLE points_ledger
    ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES member_offers(offer_id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_points_ledger_offer_award
    ON points_ledger(offer_id) WHERE offer_id IS NOT NULL AND reason = 'offer_redemption';

-- redeem_member_offer: locks the offer row, then:
--   · not found (including cross-venue — the lookup is scoped to
--     p_venue_id, so another venue's code simply isn't there)  -> P0002
--   · status = 'void'                                          -> P0004
--   · already redeemed (redeemed_at IS NOT NULL)  -> NOT an error. Returns
--     the existing redemption unchanged — a replay writes nothing and
--     looks identical to the caller as a normal success, by design (the
--     counter shows "already redeemed", not a raised error).
--   · issued but past expires_at -> flips status to 'expired' (idempotent,
--     guarded by WHERE status = 'issued') and raises              -> P0001
--   · status already 'expired' (a prior call already flipped it, or a
--     future terminal status this function doesn't itself set) -> raises
--     the same P0001 directly. Post-draft-audit fix: the original version
--     only ever checked `v_status = 'issued'` before the expiry branch, so
--     a *second* call against an already-'expired', not-yet-redeemed row
--     fell through every guard, hit an UPDATE ... WHERE status='issued'
--     that matched zero rows (leaving v_redeemed_at NULL), and then still
--     ran the unconditional points_ledger INSERT below — crediting points
--     again on every replay. Any status that isn't 'issued' at this point
--     is now terminal and raises, never falls through to the redeem path.
--   · otherwise (status = 'issued', not expired) -> redeems: sets
--     redeemed_at/status/staff, and if points_value is set, credits it via
--     points_ledger — but only when the redeeming UPDATE actually matched
--     a row (checked via v_redeemed_at, not assumed), so a concurrent
--     loser that reaches this line after losing the row lock race can
--     never double-credit either.
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
    v_redeemed_at TIMESTAMPTZ;
    v_program_name TEXT;
BEGIN
    SELECT mo.offer_id, mo.member_id, mo.program_id, mo.value_cents,
           mo.points_value, mo.status, mo.expires_at, mo.redeemed_at
      INTO v_offer_id, v_member_id, v_program_id, v_value_cents,
           v_points_value, v_status, v_expires_at, v_redeemed_at
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
    -- call) is terminal — never fall through to the redeem UPDATE below,
    -- which would silently match zero rows and skip straight to crediting
    -- points on every replay.
    IF v_status <> 'issued' THEN
        RAISE EXCEPTION 'offer_expired' USING ERRCODE = 'P0001';
    END IF;

    UPDATE member_offers
       SET redeemed_at = NOW(),
           redeemed_by_membership_id = p_staff_membership_id,
           status = 'redeemed'
     WHERE member_offers.offer_id = v_offer_id AND member_offers.status = 'issued'
     RETURNING member_offers.redeemed_at INTO v_redeemed_at;

    -- Points credit is gated on the redeeming UPDATE having actually
    -- matched and returned a new redeemed_at, not merely on
    -- v_points_value being set — so a call that reaches this point
    -- without a real state transition (defensive: should be unreachable
    -- given the status check above, but the ledger insert must never be
    -- unconditional) writes nothing.
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
        -- Structural backstop, not the primary guard (the status check
        -- above and the row lock already make a double-insert practically
        -- unreachable): if it were ever hit anyway, silently do nothing
        -- rather than raise mid-redemption, matching the "a replay writes
        -- nothing and looks like success" doctrine this whole function follows.
        ON CONFLICT (offer_id) WHERE offer_id IS NOT NULL AND reason = 'offer_redemption'
        DO NOTHING;
    END IF;

    RETURN QUERY SELECT v_offer_id, v_member_id, v_program_id, v_value_cents,
                        v_points_value, v_redeemed_at, FALSE;
END;
$$;

REVOKE ALL ON FUNCTION redeem_member_offer(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION redeem_member_offer(UUID, TEXT, UUID) TO service_role;
