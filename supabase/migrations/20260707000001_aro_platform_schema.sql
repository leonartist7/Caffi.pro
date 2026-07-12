-- ============================================================================
-- aro PLATFORM SCHEMA — Phase 2.1 consolidated migration
-- Evolves the existing Caffi.pro schema to the aro Blueprint (§6) model.
-- MIGRATES, does not reset: existing data is renamed/backfilled, not dropped.
--
-- Model:  organizations → venues → memberships (owner|manager|staff|aro_admin)
--         members (diners, CASL consent) → visits → points_ledger (append-only)
--         rewards / redemptions / campaigns / messages / ai_drafts
--         leads / zones / events (analytics spine)
--
-- Member status is DERIVED (member_status view), never stored.
-- Point balances are DERIVED (member_balances view), never stored.
--
-- Idempotent where practical: safe to re-run on a database that already
-- has some of these changes (IF EXISTS / IF NOT EXISTS guards).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1 · ORGANIZATIONS (new) — billing entity; MVP: 1:1 with venues
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
    org_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    billing_email TEXT,
    billing_status TEXT NOT NULL DEFAULT 'trial'
        CHECK (billing_status IN ('trial', 'active', 'past_due', 'canceled')),
    stripe_customer_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2 · ZONES (new) — neighbourhood exclusivity
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS zones (
    zone_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Calgary',
    cap INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (city, name)
);

-- ----------------------------------------------------------------------------
-- 3 · TENANTS → VENUES (rename; keep the tenant_id spine on child tables)
--     Child tables keep their `tenant_id` column name — the FK follows the
--     rename automatically. New tables use `venue_id`.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tenants')
       AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'venues') THEN
        ALTER TABLE tenants RENAME TO venues;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'venues' AND column_name = 'tenant_id') THEN
        ALTER TABLE venues RENAME COLUMN tenant_id TO venue_id;
    END IF;
END $$;

ALTER TABLE venues
    ADD COLUMN IF NOT EXISTS custom_domain TEXT,
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(org_id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(zone_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS brand_kit JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS kill_switch BOOLEAN NOT NULL DEFAULT false;

-- Calgary/CAD defaults for new rows (existing rows keep their values)
ALTER TABLE venues ALTER COLUMN currency SET DEFAULT 'CAD';
ALTER TABLE venues ALTER COLUMN timezone SET DEFAULT 'America/Edmonton';
ALTER TABLE venues ALTER COLUMN language SET DEFAULT 'en';

-- Backfill: one organization per venue (MVP 1:1)
INSERT INTO organizations (org_id, name, billing_email)
SELECT v.venue_id, v.business_name, v.owner_email
FROM venues v
WHERE v.org_id IS NULL
ON CONFLICT (org_id) DO NOTHING;

UPDATE venues SET org_id = venue_id WHERE org_id IS NULL;
ALTER TABLE venues ALTER COLUMN org_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_venues_org_id ON venues(org_id);
CREATE INDEX IF NOT EXISTS idx_venues_zone_id ON venues(zone_id);

-- Read-only compatibility view for the parked shop PWA code
-- (security_invoker: RLS of the querying role applies).
DROP VIEW IF EXISTS tenants;
CREATE VIEW tenants WITH (security_invoker = true) AS
SELECT
    venue_id AS tenant_id,
    business_name, slug, owner_email, owner_phone, app_name, bundle_id,
    app_store_url, play_store_url, pwa_url, features_enabled, loyalty_config,
    subscription_status, subscription_plan, trial_ends_at,
    timezone, currency, language, custom_domain, created_at, updated_at
FROM venues;

-- ----------------------------------------------------------------------------
-- 4 · MEMBERSHIPS (new) — staff_users is migrated in, then deprecated
--     role: owner | manager | staff | aro_admin. Multiple owners per venue OK.
--     Pending email invites: user_id NULL + invite_email/invite_token set.
--     Shared-PIN counter login: counter_pin_hash (bcrypt via pgcrypto).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memberships (
    membership_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    venue_id UUID REFERENCES venues(venue_id) ON DELETE CASCADE, -- NULL = org-wide
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff', 'aro_admin')),
    full_name TEXT,
    -- shared-PIN counter login (staff role); bcrypt hash, verified server-side
    counter_pin_hash TEXT,
    pin_updated_at TIMESTAMPTZ,
    -- email invite flow
    invite_email TEXT,
    invite_token UUID UNIQUE DEFAULT uuid_generate_v4(),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invite_accepted_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT membership_identity CHECK (user_id IS NOT NULL OR invite_email IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_membership_user_scope
    ON memberships (user_id, org_id, COALESCE(venue_id, '00000000-0000-0000-0000-000000000000'::uuid))
    WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_venue_id ON memberships(venue_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org_id ON memberships(org_id);

-- Migrate staff_users → memberships as pending invites (no auth link existed)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'staff_users') THEN
        INSERT INTO memberships (org_id, venue_id, role, full_name, invite_email, is_active, created_at)
        SELECT
            v.org_id,
            s.tenant_id,
            CASE
                WHEN s.role::text = 'owner' THEN 'owner'
                WHEN s.role::text = 'manager' THEN 'manager'
                ELSE 'staff'
            END,
            s.full_name,
            s.email,
            s.is_active,
            s.created_at
        FROM staff_users s
        JOIN venues v ON v.venue_id = s.tenant_id
        WHERE NOT EXISTS (
            SELECT 1 FROM memberships m
            WHERE m.invite_email = s.email AND m.venue_id = s.tenant_id
        );
        COMMENT ON TABLE staff_users IS
            'DEPRECATED (Phase 2): migrated to memberships. Kept for data safety; drop after verification.';
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5 · USERS → MEMBERS (diners) + CASL consent; drop mutable balance columns
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users')
       AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'members') THEN
        ALTER TABLE users RENAME TO members;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'user_id') THEN
        ALTER TABLE members RENAME COLUMN user_id TO member_id;
    END IF;
END $$;

ALTER TABLE members
    ADD COLUMN IF NOT EXISTS birthday DATE,
    ADD COLUMN IF NOT EXISTS consent_ts TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS consent_text TEXT,
    ADD COLUMN IF NOT EXISTS consent_source TEXT
        CHECK (consent_source IN ('join_page', 'counter', 'import', 'other') OR consent_source IS NULL),
    ADD COLUMN IF NOT EXISTS unsubscribe_token UUID NOT NULL DEFAULT uuid_generate_v4(),
    ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;

-- §6 rule: balance is derived from the ledger. Mutable columns go away.
ALTER TABLE members DROP COLUMN IF EXISTS loyalty_points;
ALTER TABLE members DROP COLUMN IF EXISTS lifetime_points;

CREATE INDEX IF NOT EXISTS idx_members_tenant_phone ON members(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_members_tenant_email ON members(tenant_id, email);

-- ----------------------------------------------------------------------------
-- 6 · VISITS (new) — the core loop object; trackable without an order
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visits (
    visit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('scan', 'manual', 'order')),
    staff_membership_id UUID REFERENCES memberships(membership_id) ON DELETE SET NULL,
    order_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_visits_venue_ts ON visits(venue_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_visits_member_ts ON visits(member_id, ts DESC);

-- ----------------------------------------------------------------------------
-- 7 · LOYALTY_TRANSACTIONS → POINTS_LEDGER (append-only)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loyalty_transactions')
       AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'points_ledger') THEN
        ALTER TABLE loyalty_transactions RENAME TO points_ledger;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'points_ledger' AND column_name = 'user_id') THEN
        ALTER TABLE points_ledger RENAME COLUMN user_id TO member_id;
    END IF;
END $$;

ALTER TABLE points_ledger
    ADD COLUMN IF NOT EXISTS visit_id UUID REFERENCES visits(visit_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS staff_membership_id UUID REFERENCES memberships(membership_id) ON DELETE SET NULL;
-- balance_after violates "derive, don't store" — keep history, stop requiring it
ALTER TABLE points_ledger ALTER COLUMN balance_after DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_points_ledger_member ON points_ledger(member_id, created_at DESC);

-- Append-only enforcement
CREATE OR REPLACE FUNCTION forbid_ledger_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'points_ledger is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS points_ledger_append_only ON points_ledger;
CREATE TRIGGER points_ledger_append_only
    BEFORE UPDATE OR DELETE ON points_ledger
    FOR EACH ROW EXECUTE FUNCTION forbid_ledger_mutation();

-- Derived balances
CREATE OR REPLACE VIEW member_balances WITH (security_invoker = true) AS
SELECT
    member_id,
    COALESCE(SUM(points_change), 0)::int AS balance,
    COALESCE(SUM(points_change) FILTER (WHERE points_change > 0), 0)::int AS lifetime_points
FROM points_ledger
GROUP BY member_id;

-- Read-only compat views for parked shop code
DROP VIEW IF EXISTS loyalty_transactions;
CREATE VIEW loyalty_transactions WITH (security_invoker = true) AS
SELECT transaction_id, tenant_id, member_id AS user_id, order_id,
       points_change, balance_after, reason, description, created_at
FROM points_ledger;

DROP VIEW IF EXISTS users;
CREATE VIEW users WITH (security_invoker = true) AS
SELECT
    m.member_id AS user_id,
    m.tenant_id, m.auth_id, m.phone, m.email, m.full_name, m.profile_image_url,
    COALESCE(b.balance, 0) AS loyalty_points,
    m.loyalty_tier,
    COALESCE(b.lifetime_points, 0) AS lifetime_points,
    m.total_orders, m.total_spent, m.last_order_at,
    m.fcm_token, m.notifications_enabled, m.preferred_location_id, m.favorite_items,
    m.created_at, m.updated_at
FROM members m
LEFT JOIN member_balances b ON b.member_id = m.member_id;

-- ----------------------------------------------------------------------------
-- 7b · LEGACY TRIGGER RECONCILIATION — the old triggers mutate stored
--      balances on `users` (now a view) and auto-insert `users` rows on
--      auth signup. All of that contradicts the ledger-derived model (and
--      would error at runtime). Drop the balance mutators; retarget the
--      still-useful ones at `members`/`points_ledger`.
-- ----------------------------------------------------------------------------
-- Balance is derived — the stored-balance updater goes away entirely.
DROP TRIGGER IF EXISTS trigger_update_user_loyalty ON points_ledger;
DROP FUNCTION IF EXISTS update_user_loyalty();

-- Auth signups are venue staff/owners (memberships), never diners: the old
-- hook inserted a `users` row for each new auth user. Gone.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
-- Stale JWT hook (tenant claims from the old model). Roles come from the
-- memberships lookup now. OWNER ACTION: if this hook is enabled under
-- Auth → Hooks in the dashboard, disable it.
DROP FUNCTION IF EXISTS public.custom_access_token_hook(jsonb);

-- Order-driven stats + points: retarget at members/points_ledger (shop PWA
-- is parked, but these must not error if an order ever completes).
CREATE OR REPLACE FUNCTION update_order_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        UPDATE members
        SET total_orders = total_orders + 1,
            total_spent = total_spent + NEW.total,
            last_order_at = NOW(),
            updated_at = NOW()
        WHERE member_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION award_order_loyalty_points()
RETURNS TRIGGER AS $$
DECLARE
    v_points INTEGER;
    v_points_per_euro NUMERIC;
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed')
       AND COALESCE(NEW.points_earned, 0) = 0 THEN
        SELECT COALESCE((loyalty_config->>'points_per_euro')::NUMERIC, 0)
        INTO v_points_per_euro FROM venues WHERE venue_id = NEW.tenant_id;
        v_points := FLOOR(NEW.total * v_points_per_euro);
        IF v_points > 0 THEN
            INSERT INTO points_ledger (tenant_id, member_id, order_id, points_change, reason, description)
            VALUES (NEW.tenant_id, NEW.user_id, NEW.order_id, v_points, 'order',
                    'Points earned from order ' || NEW.order_number);
            UPDATE orders SET points_earned = v_points WHERE order_id = NEW.order_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION award_signup_bonus()
RETURNS TRIGGER AS $$
DECLARE
    v_signup_bonus INTEGER;
BEGIN
    SELECT (loyalty_config->>'signup_bonus')::INTEGER INTO v_signup_bonus
    FROM venues WHERE venue_id = NEW.tenant_id;
    IF v_signup_bonus IS NOT NULL AND v_signup_bonus > 0 THEN
        INSERT INTO points_ledger (tenant_id, member_id, points_change, reason, description)
        VALUES (NEW.tenant_id, NEW.member_id, v_signup_bonus, 'signup_bonus', 'Welcome bonus for joining!');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The signup-bonus trigger followed the users→members rename; make sure it
-- exists exactly once on members.
DROP TRIGGER IF EXISTS trigger_award_signup_bonus ON members;
CREATE TRIGGER trigger_award_signup_bonus
    AFTER INSERT ON members
    FOR EACH ROW EXECUTE FUNCTION award_signup_bonus();

-- ----------------------------------------------------------------------------
-- 8 · REWARDS_CATALOG → REWARDS + REDEMPTIONS (staff attribution)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rewards_catalog')
       AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rewards') THEN
        ALTER TABLE rewards_catalog RENAME TO rewards;
    END IF;
END $$;

DROP VIEW IF EXISTS rewards_catalog;
CREATE VIEW rewards_catalog WITH (security_invoker = true) AS SELECT * FROM rewards;

CREATE TABLE IF NOT EXISTS redemptions (
    redemption_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES rewards(reward_id) ON DELETE RESTRICT,
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    staff_membership_id UUID REFERENCES memberships(membership_id) ON DELETE SET NULL,
    ledger_transaction_id UUID REFERENCES points_ledger(transaction_id) ON DELETE SET NULL,
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_redemptions_venue_ts ON redemptions(venue_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_redemptions_member ON redemptions(member_id);

-- ----------------------------------------------------------------------------
-- 9 · CAMPAIGNS / MESSAGES / AI_DRAFTS (new)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaigns (
    campaign_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('winback', 'birthday', 'streak', 'slowday')),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    autopilot BOOLEAN NOT NULL DEFAULT false,
    template JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_venue ON campaigns(venue_id);

CREATE TABLE IF NOT EXISTS ai_drafts (
    draft_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('winback', 'slowday', 'social_caption', 'social_image', 'digest')),
    prompt_ctx JSONB NOT NULL DEFAULT '{}'::jsonb,
    output TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'approved', 'edited', 'skipped', 'sent')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_venue_status ON ai_drafts(venue_id, status);

CREATE TABLE IF NOT EXISTS messages (
    message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(campaign_id) ON DELETE SET NULL,
    ai_draft_id UUID REFERENCES ai_drafts(draft_id) ON DELETE SET NULL,
    channel TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'sent', 'failed', 'skipped_no_consent')),
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    unsub_token UUID NOT NULL DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_venue ON messages(venue_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_member ON messages(member_id);

-- ----------------------------------------------------------------------------
-- 10 · LEADS (new) — diagnostic + demo bookings from aro.club
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
    lead_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT NOT NULL DEFAULT 'diagnostic' CHECK (source IN ('diagnostic', 'demo', 'other')),
    name TEXT,
    email TEXT,
    phone TEXT,
    venue_name TEXT,
    city TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'contacted', 'qualified', 'won', 'lost')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status, created_at DESC);

-- ----------------------------------------------------------------------------
-- 11 · EVENTS (new) — analytics spine
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor TEXT,                                  -- e.g. 'membership:<id>', 'system', 'member:<id>'
    venue_id UUID REFERENCES venues(venue_id) ON DELETE CASCADE,
    type TEXT NOT NULL,                          -- e.g. 'member.joined', 'visit.recorded'
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_venue_ts ON events(venue_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_events_type_ts ON events(type, ts DESC);

-- ----------------------------------------------------------------------------
-- 12 · DERIVED MEMBER STATUS — the heart of the product; never stored.
--      new    : < 3 visits
--      lost   : no visit in > 60 days
--      fading : days since last visit > 2 × member's own median cadence
--      regular: otherwise
--      Cadence math lives in ONE function so "why did Maya get this?" is
--      always answerable.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION member_cadence_days(p_member_id UUID)
RETURNS NUMERIC
LANGUAGE sql STABLE AS $$
    -- Median gap in days between consecutive visits (NULL if < 2 visits)
    SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY gap)
    FROM (
        SELECT EXTRACT(EPOCH FROM ts - LAG(ts) OVER (ORDER BY ts)) / 86400.0 AS gap
        FROM visits WHERE member_id = p_member_id
    ) gaps
    WHERE gap IS NOT NULL;
$$;

CREATE OR REPLACE VIEW member_status WITH (security_invoker = true) AS
SELECT
    m.member_id,
    m.tenant_id AS venue_id,
    v.visit_count,
    v.last_visit_at,
    c.cadence_days,
    d.days_since_last,
    CASE
        WHEN COALESCE(v.visit_count, 0) < 3 THEN 'new'
        WHEN d.days_since_last > 60 THEN 'lost'
        WHEN c.cadence_days IS NOT NULL AND d.days_since_last > 2 * c.cadence_days THEN 'fading'
        ELSE 'regular'
    END AS status
FROM members m
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS visit_count, MAX(ts) AS last_visit_at
    FROM visits WHERE member_id = m.member_id
) v ON true
LEFT JOIN LATERAL (SELECT member_cadence_days(m.member_id) AS cadence_days) c ON true
LEFT JOIN LATERAL (
    SELECT EXTRACT(EPOCH FROM NOW() - v.last_visit_at) / 86400.0 AS days_since_last
) d ON true;

-- ----------------------------------------------------------------------------
-- 13 · COUNTER PIN — set + verify (bcrypt, pgcrypto). SECURITY DEFINER so the
--      hash never leaves the database; called only from server code.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_counter_pin(p_membership_id UUID, p_pin TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
    IF length(p_pin) < 4 OR length(p_pin) > 8 OR p_pin !~ '^[0-9]+$' THEN
        RAISE EXCEPTION 'PIN must be 4-8 digits';
    END IF;
    UPDATE memberships
    SET counter_pin_hash = crypt(p_pin, gen_salt('bf')), pin_updated_at = NOW()
    WHERE membership_id = p_membership_id AND role = 'staff';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'membership not found or not a staff membership';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION verify_counter_pin(p_venue_id UUID, p_pin TEXT)
RETURNS TABLE (membership_id UUID, full_name TEXT)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, extensions AS $$
    SELECT m.membership_id, m.full_name
    FROM memberships m
    WHERE m.venue_id = p_venue_id
      AND m.role = 'staff'
      AND m.is_active
      AND m.counter_pin_hash IS NOT NULL
      AND m.counter_pin_hash = crypt(p_pin, m.counter_pin_hash)
    LIMIT 1;
$$;

-- Lock the PIN functions down: service role / server only.
REVOKE ALL ON FUNCTION set_counter_pin(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION verify_counter_pin(UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 14 · updated_at maintenance for new tables
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['organizations', 'memberships', 'campaigns', 'ai_drafts'] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I_touch ON %I', t, t);
        EXECUTE format(
            'CREATE TRIGGER %I_touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',
            t, t);
    END LOOP;
END $$;
