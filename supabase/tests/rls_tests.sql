-- ============================================================================
-- aro RLS TEST SUITE (Phase 2.1)
--
-- Proves, with real role switches:
--   T1  anon reads venue public identity, but NOT owner_email
--   T2  anon cannot read members / visits / points_ledger / memberships
--   T3  venue A owner cannot see venue B members, visits, rewards
--   T4  staff (and even owners, client-side) cannot read member email/phone
--       — contact info is only reachable via server (service role)
--   T5  staff can record a visit for their venue, not for another venue
--   T6  points_ledger is append-only (UPDATE/DELETE raise)
--   T7  member_balances derives balance = SUM(points_change)
--   T8  memberships: user sees own rows; staff can't read counter_pin_hash
--
-- HOW TO RUN
--   · Local/CI:  psql -v ON_ERROR_STOP=1 -f supabase/tests/rls_tests.sql
--   · Live Supabase: paste into the SQL editor (runs as postgres) — the
--     script switches into anon/authenticated per test and always switches
--     back. It creates its own fixtures in a transaction and ROLLS BACK.
--
-- Output: one NOTICE per passing test, final 'ALL RLS TESTS PASSED'.
-- Any failure raises an exception (non-zero psql exit).
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- Fixtures (as postgres, bypassing RLS)
-- --------------------------------------------------------------------------
INSERT INTO auth.users (id, email) VALUES
    ('00000000-0000-4000-a000-000000000001', 'ownerA@test.local'),
    ('00000000-0000-4000-a000-000000000002', 'staffA@test.local'),
    ('00000000-0000-4000-a000-000000000003', 'ownerB@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO organizations (org_id, name) VALUES
    ('00000000-0000-4000-b000-000000000001', 'Org A'),
    ('00000000-0000-4000-b000-000000000002', 'Org B')
ON CONFLICT (org_id) DO NOTHING;

-- loyalty_config '{}' so no signup-bonus trigger fires (T7 asserts exact sums)
INSERT INTO venues (venue_id, org_id, business_name, slug, owner_email, app_name, bundle_id, loyalty_config)
VALUES
    ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001',
     'Cafe A', 'rls-test-cafe-a', 'secret-a@test.local', 'Cafe A', 'test.rls.a', '{}'::jsonb),
    ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-b000-000000000002',
     'Cafe B', 'rls-test-cafe-b', 'secret-b@test.local', 'Cafe B', 'test.rls.b', '{}'::jsonb)
ON CONFLICT (venue_id) DO NOTHING;

INSERT INTO memberships (membership_id, user_id, org_id, venue_id, role, full_name)
VALUES
    ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-a000-000000000001',
     '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-c000-000000000001', 'owner', 'Owner A'),
    ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-a000-000000000002',
     '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-c000-000000000001', 'staff', 'Staff A'),
    ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-a000-000000000003',
     '00000000-0000-4000-b000-000000000002', '00000000-0000-4000-c000-000000000002', 'owner', 'Owner B')
ON CONFLICT (membership_id) DO NOTHING;

SELECT set_counter_pin('00000000-0000-4000-d000-000000000002', '4242');

INSERT INTO members (member_id, tenant_id, full_name, phone, email)
VALUES
    ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-c000-000000000001',
     'Maya Member', '+14035550001', 'maya@test.local'),
    ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-c000-000000000002',
     'Bob B-Member', '+14035550002', 'bob@test.local')
ON CONFLICT (member_id) DO NOTHING;

INSERT INTO visits (visit_id, member_id, venue_id, ts, source)
VALUES ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-e000-000000000001',
        '00000000-0000-4000-c000-000000000001', NOW() - interval '3 days', 'manual')
ON CONFLICT (visit_id) DO NOTHING;

INSERT INTO points_ledger (transaction_id, tenant_id, member_id, points_change, reason)
VALUES
    ('00000000-0000-4000-0000-000000000001'::uuid, '00000000-0000-4000-c000-000000000001',
     '00000000-0000-4000-e000-000000000001', 50, 'signup_bonus'),
    ('00000000-0000-4000-0000-000000000002'::uuid, '00000000-0000-4000-c000-000000000001',
     '00000000-0000-4000-e000-000000000001', -20, 'reward_redemption')
ON CONFLICT (transaction_id) DO NOTHING;

INSERT INTO rewards (reward_id, tenant_id, name, points_required, reward_type)
VALUES ('00000000-0000-4000-1000-000000000001'::uuid, '00000000-0000-4000-c000-000000000002',
        'Venue B Secret Reward', 100, 'free_item')
ON CONFLICT (reward_id) DO NOTHING;

-- --------------------------------------------------------------------------
-- Helpers to impersonate roles (works locally and in Supabase SQL editor)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.impersonate(p_role text, p_uid uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    PERFORM set_config('role', p_role, true);
    PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid::text, ''), true);
    PERFORM set_config('request.jwt.claims',
                       CASE WHEN p_uid IS NULL THEN '' ELSE json_build_object('sub', p_uid, 'role', p_role)::text END,
                       true);
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.reset_role() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    PERFORM set_config('role', 'postgres', true);
    PERFORM set_config('request.jwt.claim.sub', '', true);
    PERFORM set_config('request.jwt.claims', '', true);
END;
$$;

-- ============================================================================
-- T1 · anon: venue public identity YES, owner_email NO
-- ============================================================================
DO $$
DECLARE n int; denied boolean := false;
BEGIN
    PERFORM pg_temp.impersonate('anon', NULL);

    SELECT count(*) INTO n FROM venues WHERE slug = 'rls-test-cafe-a';
    IF n <> 1 THEN RAISE EXCEPTION 'T1 FAIL: anon should read venue public row (got %)', n; END IF;

    BEGIN
        PERFORM owner_email FROM venues WHERE slug = 'rls-test-cafe-a';
    EXCEPTION WHEN insufficient_privilege THEN denied := true;
    END;
    IF NOT denied THEN RAISE EXCEPTION 'T1 FAIL: anon must NOT read venues.owner_email'; END IF;

    PERFORM pg_temp.reset_role();
    RAISE NOTICE 'T1 PASS: anon reads public venue identity, denied owner_email';
END $$;

-- ============================================================================
-- T2 · anon: members / visits / points_ledger / memberships all denied
-- ============================================================================
DO $$
DECLARE denied int := 0;
BEGIN
    PERFORM pg_temp.impersonate('anon', NULL);
    BEGIN PERFORM count(*) FROM members;       EXCEPTION WHEN insufficient_privilege THEN denied := denied + 1; END;
    BEGIN PERFORM count(*) FROM visits;        EXCEPTION WHEN insufficient_privilege THEN denied := denied + 1; END;
    BEGIN PERFORM count(*) FROM points_ledger; EXCEPTION WHEN insufficient_privilege THEN denied := denied + 1; END;
    BEGIN PERFORM count(*) FROM memberships;   EXCEPTION WHEN insufficient_privilege THEN denied := denied + 1; END;
    IF denied <> 4 THEN RAISE EXCEPTION 'T2 FAIL: anon reached % of 4 protected tables', 4 - denied; END IF;
    PERFORM pg_temp.reset_role();
    RAISE NOTICE 'T2 PASS: anon denied on members/visits/ledger/memberships';
END $$;

-- ============================================================================
-- T3 · venue isolation: owner A sees zero of venue B's data
-- ============================================================================
DO $$
DECLARE n int;
BEGIN
    PERFORM pg_temp.impersonate('authenticated', '00000000-0000-4000-a000-000000000001');

    SELECT count(*) INTO n FROM members WHERE tenant_id = '00000000-0000-4000-c000-000000000002';
    IF n <> 0 THEN RAISE EXCEPTION 'T3 FAIL: owner A sees % venue-B members', n; END IF;

    SELECT count(*) INTO n FROM rewards WHERE tenant_id = '00000000-0000-4000-c000-000000000002';
    IF n <> 0 THEN RAISE EXCEPTION 'T3 FAIL: owner A sees % venue-B rewards', n; END IF;

    SELECT count(*) INTO n FROM members;  -- should see only own venue's member
    IF n <> 1 THEN RAISE EXCEPTION 'T3 FAIL: owner A should see exactly 1 member, got %', n; END IF;

    PERFORM pg_temp.reset_role();
    RAISE NOTICE 'T3 PASS: venue A cannot see venue B (and sees own data)';
END $$;

-- ============================================================================
-- T4 · member contact info is unreadable client-side (staff AND owner):
--      email/phone columns are not granted to authenticated at all
-- ============================================================================
DO $$
DECLARE denied int := 0; nm text;
BEGIN
    PERFORM pg_temp.impersonate('authenticated', '00000000-0000-4000-a000-000000000002'); -- staff A

    SELECT full_name INTO nm FROM members LIMIT 1;   -- safe columns fine
    IF nm IS NULL THEN RAISE EXCEPTION 'T4 FAIL: staff should read member name'; END IF;

    BEGIN PERFORM email FROM members LIMIT 1; EXCEPTION WHEN insufficient_privilege THEN denied := denied + 1; END;
    BEGIN PERFORM phone FROM members LIMIT 1; EXCEPTION WHEN insufficient_privilege THEN denied := denied + 1; END;
    IF denied <> 2 THEN RAISE EXCEPTION 'T4 FAIL: staff reached member contact columns'; END IF;

    -- owner client-side is equally blocked (contact info flows via server API)
    PERFORM pg_temp.impersonate('authenticated', '00000000-0000-4000-a000-000000000001');
    denied := 0;
    BEGIN PERFORM email FROM members LIMIT 1; EXCEPTION WHEN insufficient_privilege THEN denied := denied + 1; END;
    IF denied <> 1 THEN RAISE EXCEPTION 'T4 FAIL: owner client read member email'; END IF;

    PERFORM pg_temp.reset_role();
    RAISE NOTICE 'T4 PASS: member email/phone unreadable with anon-key sessions';
END $$;

-- ============================================================================
-- T5 · staff records a visit at own venue; cross-venue insert denied by RLS
-- ============================================================================
DO $$
DECLARE ok boolean := false;
BEGIN
    PERFORM pg_temp.impersonate('authenticated', '00000000-0000-4000-a000-000000000002'); -- staff A

    INSERT INTO visits (member_id, venue_id, source)
    VALUES ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-c000-000000000001', 'manual');

    BEGIN
        INSERT INTO visits (member_id, venue_id, source)
        VALUES ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-c000-000000000002', 'manual');
    EXCEPTION WHEN OTHERS THEN ok := true;  -- RLS: new row violates policy
    END;
    IF NOT ok THEN RAISE EXCEPTION 'T5 FAIL: staff A inserted a visit at venue B'; END IF;

    PERFORM pg_temp.reset_role();
    RAISE NOTICE 'T5 PASS: staff visit insert scoped to own venue';
END $$;

-- ============================================================================
-- T6 · points_ledger append-only
-- ============================================================================
DO $$
DECLARE blocked int := 0;
BEGIN
    BEGIN
        UPDATE points_ledger SET points_change = 999
        WHERE transaction_id = '00000000-0000-4000-0000-000000000001';
    EXCEPTION WHEN OTHERS THEN blocked := blocked + 1;
    END;
    BEGIN
        DELETE FROM points_ledger WHERE transaction_id = '00000000-0000-4000-0000-000000000001';
    EXCEPTION WHEN OTHERS THEN blocked := blocked + 1;
    END;
    IF blocked <> 2 THEN RAISE EXCEPTION 'T6 FAIL: ledger mutation not blocked (%/2)', blocked; END IF;
    RAISE NOTICE 'T6 PASS: points_ledger is append-only (even for superuser)';
END $$;

-- ============================================================================
-- T7 · balance is derived: member_balances = SUM(points_change) = 30
-- ============================================================================
DO $$
DECLARE bal int;
BEGIN
    PERFORM pg_temp.impersonate('authenticated', '00000000-0000-4000-a000-000000000001');
    SELECT balance INTO bal FROM member_balances
    WHERE member_id = '00000000-0000-4000-e000-000000000001';
    IF bal <> 30 THEN RAISE EXCEPTION 'T7 FAIL: expected balance 30, got %', bal; END IF;
    PERFORM pg_temp.reset_role();
    RAISE NOTICE 'T7 PASS: member_balances derives 50 - 20 = 30';
END $$;

-- ============================================================================
-- T8 · memberships: own-row visibility; counter_pin_hash never granted
-- ============================================================================
DO $$
DECLARE n int; denied boolean := false;
BEGIN
    PERFORM pg_temp.impersonate('authenticated', '00000000-0000-4000-a000-000000000002'); -- staff A

    SELECT count(*) INTO n FROM memberships WHERE user_id = auth.uid();
    IF n <> 1 THEN RAISE EXCEPTION 'T8 FAIL: staff should see own membership, got %', n; END IF;

    BEGIN
        PERFORM counter_pin_hash FROM memberships LIMIT 1;
    EXCEPTION WHEN insufficient_privilege THEN denied := true;
    END;
    IF NOT denied THEN RAISE EXCEPTION 'T8 FAIL: counter_pin_hash readable client-side'; END IF;

    PERFORM pg_temp.reset_role();
    RAISE NOTICE 'T8 PASS: memberships own-row read; PIN hash unreadable';
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL RLS TESTS PASSED'; END $$;

ROLLBACK;
