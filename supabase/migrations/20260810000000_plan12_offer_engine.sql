-- ============================================================================
-- PLAN-12 — Offer engine core: redemption RPC.
--
-- No schema changes. loyalty_programs, member_offers, their RLS policies,
-- the forbid_member_offer_mutation trigger, and the
-- uq_member_offers_redeemed_once partial unique index all already exist
-- (20260722120000_batch_schema_lanes_abc.sql, Lane A's PLAN-10). This
-- migration adds exactly one function: the redemption RPC, modelled
-- directly on redeem_reward() (aro_schema.sql) — same SECURITY DEFINER +
-- FOR UPDATE + typed-ERRCODE shape, service_role-only.
-- ============================================================================

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
--   · otherwise -> redeems: sets redeemed_at/status/staff, and if
--     points_value is set, credits it via points_ledger (same table,
--     same 'reason' free-text convention redeem_reward already uses).
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

    UPDATE member_offers
       SET redeemed_at = NOW(),
           redeemed_by_membership_id = p_staff_membership_id,
           status = 'redeemed'
     WHERE member_offers.offer_id = v_offer_id AND member_offers.status = 'issued'
     RETURNING member_offers.redeemed_at INTO v_redeemed_at;

    IF v_points_value IS NOT NULL AND v_points_value > 0 THEN
        SELECT lp.name INTO v_program_name FROM loyalty_programs lp
         WHERE lp.program_id = v_program_id;

        INSERT INTO points_ledger (
            transaction_id, tenant_id, member_id, points_change, reason,
            description, staff_membership_id
        ) VALUES (
            gen_random_uuid(), p_venue_id, v_member_id, v_points_value, 'offer_redemption',
            'Offer redeemed: ' || COALESCE(v_program_name, 'loyalty offer'), p_staff_membership_id
        );
    END IF;

    RETURN QUERY SELECT v_offer_id, v_member_id, v_program_id, v_value_cents,
                        v_points_value, v_redeemed_at, FALSE;
END;
$$;

REVOKE ALL ON FUNCTION redeem_member_offer(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION redeem_member_offer(UUID, TEXT, UUID) TO service_role;
