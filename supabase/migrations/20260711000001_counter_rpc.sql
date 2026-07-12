-- ============================================================================
-- COUNTER RPC (Plan 3) — atomic redemption + visit idempotency.
--
-- Redemptions must never race: two staff devices redeeming the same member
-- at once must not both succeed against a balance that only covers one.
-- The whole check-then-deduct happens inside ONE Postgres function so it's
-- one transaction, not two round trips from JS.
-- ============================================================================

ALTER TABLE visits
    ADD COLUMN IF NOT EXISTS client_uuid UUID;

CREATE UNIQUE INDEX IF NOT EXISTS uq_visits_client_uuid
    ON visits (client_uuid)
    WHERE client_uuid IS NOT NULL;

-- redeem_reward: locks the member's ledger rows, recomputes balance,
-- refuses if insufficient, else inserts the negative ledger entry +
-- redemptions row atomically. SECURITY DEFINER so RLS on points_ledger
-- (insert-only, no update) doesn't block the deduction; only callable by
-- the service role (counter API routes), never by anon/authenticated.
CREATE OR REPLACE FUNCTION redeem_reward(
    p_member_id UUID,
    p_reward_id UUID,
    p_venue_id UUID,
    p_staff_membership_id UUID
)
RETURNS TABLE (new_balance INTEGER, redemption_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_points_required INTEGER;
    v_reward_name TEXT;
    v_reward_venue UUID;
    v_current_balance INTEGER;
    v_transaction_id UUID;
    v_redemption_id UUID;
BEGIN
    -- Lock the reward row to stop concurrent edits mid-redemption.
    SELECT points_required, name, tenant_id
      INTO v_points_required, v_reward_name, v_reward_venue
      FROM rewards
     WHERE reward_id = p_reward_id AND is_active = true
     FOR UPDATE;

    IF v_points_required IS NULL THEN
        RAISE EXCEPTION 'reward_not_found' USING ERRCODE = 'P0002';
    END IF;
    IF v_reward_venue IS DISTINCT FROM p_venue_id THEN
        RAISE EXCEPTION 'reward_wrong_venue' USING ERRCODE = 'P0003';
    END IF;

    -- Lock this member's ledger rows so a concurrent redemption on the
    -- same member blocks until this transaction commits (serializes the
    -- balance check against the deduction).
    PERFORM 1 FROM points_ledger WHERE member_id = p_member_id FOR UPDATE;

    SELECT COALESCE(SUM(points_change), 0) INTO v_current_balance
      FROM points_ledger WHERE member_id = p_member_id;

    IF v_current_balance < v_points_required THEN
        RAISE EXCEPTION 'insufficient_balance' USING ERRCODE = 'P0001';
    END IF;

    v_transaction_id := gen_random_uuid();
    INSERT INTO points_ledger (
        transaction_id, tenant_id, member_id, points_change, reason,
        description, staff_membership_id
    ) VALUES (
        v_transaction_id, p_venue_id, p_member_id, -v_points_required, 'redemption',
        'Redeemed: ' || v_reward_name, p_staff_membership_id
    );

    INSERT INTO redemptions (
        member_id, reward_id, venue_id, staff_membership_id, ledger_transaction_id
    ) VALUES (
        p_member_id, p_reward_id, p_venue_id, p_staff_membership_id, v_transaction_id
    ) RETURNING redemptions.redemption_id INTO v_redemption_id;

    RETURN QUERY SELECT (v_current_balance - v_points_required), v_redemption_id;
END;
$$;

REVOKE ALL ON FUNCTION redeem_reward(UUID, UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION redeem_reward(UUID, UUID, UUID, UUID) TO service_role;
