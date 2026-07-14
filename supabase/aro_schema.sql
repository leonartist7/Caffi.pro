-- ============================================================================
-- aro CONSOLIDATED SCHEMA — paste-ready for the Supabase SQL editor
-- Concatenation of, in order:
--   20260706000000_legacy_foundation_minimal.sql
--   20260707000001_aro_platform_schema.sql
--   20260707000002_aro_rls.sql
--   20260710000001_security_hardening.sql
--   20260710000002_pass_serials.sql
--   20260710000003_leads_status.sql
--   20260711000001_counter_rpc.sql
--   20260711000002_owner_stats.sql
--   20260711000003_fix_venue_week_stats_volatile.sql
--   20260714062310_ordering_core.sql
--   20260714075113_ordering_core_grant_hardening.sql
--   20260714075459_ordering_core_advisor_cleanup.sql
--   20260714080519_ordering_payment_event_atomicity.sql
--
-- Targets a FRESH Supabase project with zero tables (the legacy-foundation
-- migration bootstraps the empty legacy shape the aro migration expects,
-- then evolves/renames it — see that file's header for why). Re-runnable.
-- After applying, run supabase/tests/rls_tests.sql and expect
-- 'ALL RLS TESTS PASSED'. Then run supabase/seed/aro_dev_seed.sql for dev data.
--
-- GENERATED FILE — edit the migration files, then regenerate by
-- concatenating them in the order above (keeping this header).
-- ============================================================================

-- ============================================================================
-- LEGACY FOUNDATION (minimal) — fresh-project bootstrap
--
-- 20260707000001_aro_platform_schema.sql evolves the OLD Caffi.pro schema
-- (tenants/users/tenant_manifests/loyalty_transactions/rewards_catalog) into
-- the aro model via ALTER/RENAME. It was written against a database that
-- already had that legacy schema and never runs standalone on an empty one.
--
-- The original live project (ugppbaavzevmdkblniim) was paused >90 days and
-- is unrecoverable, so this repo now targets a brand-new Supabase project
-- with zero data. Rather than replay 18 legacy migrations (several of which
-- are the "DEV: USING(true)" landmines this rebuild exists to remove), this
-- migration creates ONLY the empty legacy shape the rename-and-evolve logic
-- needs to succeed. Zero rows ever go into these tables — they are renamed
-- to their aro equivalents (or become compat views) in the very next
-- migration. FK references to tables outside this minimal set (e.g. `orders`
-- on loyalty_transactions.order_id) are intentionally dropped since ordering
-- is parked (ORDERING_ENABLED=false) and ledger rows start empty anyway.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS tenants (
    tenant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_email TEXT UNIQUE NOT NULL,
    owner_phone TEXT,
    app_name TEXT NOT NULL,
    bundle_id TEXT UNIQUE NOT NULL,
    app_store_url TEXT,
    play_store_url TEXT,
    pwa_url TEXT,
    features_enabled JSONB DEFAULT '{}'::jsonb,
    loyalty_config JSONB DEFAULT '{"points_per_euro": 10, "signup_bonus": 50}'::jsonb,
    subscription_status TEXT DEFAULT 'trial',
    subscription_plan TEXT DEFAULT 'starter',
    trial_ends_at TIMESTAMPTZ,
    timezone TEXT DEFAULT 'America/Edmonton',
    currency TEXT DEFAULT 'CAD',
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_manifests (
    manifest_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID UNIQUE NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    design_tokens JSONB DEFAULT '{}'::jsonb,
    logo_url TEXT,
    app_icon_url TEXT,
    splash_screen_url TEXT,
    figma_file_key TEXT,
    figma_last_synced TIMESTAMPTZ,
    skin_version TEXT DEFAULT '1.0.0',
    slot_mappings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    auth_id UUID UNIQUE,
    phone TEXT,
    email TEXT,
    full_name TEXT,
    profile_image_url TEXT,
    loyalty_points INTEGER DEFAULT 0,
    loyalty_tier TEXT DEFAULT 'bronze',
    lifetime_points INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    last_order_at TIMESTAMPTZ,
    fcm_token TEXT,
    notifications_enabled BOOLEAN DEFAULT true,
    preferred_location_id UUID,
    favorite_items UUID[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_tenant_phone UNIQUE(tenant_id, phone)
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    order_id UUID,
    points_change INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rewards_catalog (
    reward_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL,
    image_url TEXT,
    reward_type TEXT NOT NULL,
    reward_value JSONB,
    is_active BOOLEAN DEFAULT true,
    stock_limit INTEGER,
    stock_remaining INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- ============================================================================
-- aro RLS — rebuilt from ZERO (Phase 2.1)
--
-- Drops EVERY existing policy in public (including all `DEV:` USING(true)
-- policies from 20250110000001_dev_mode_rls.sql), revokes the default broad
-- grants from anon/authenticated, then grants back the minimum.
--
-- Principles (Blueprint §8 / ARCHITECTURE §3):
--   · Browser = anon key + these policies. Server = service role.
--   · Venue isolation: every policy scopes through memberships.
--   · Staff never reads member contact info (column-level grants: email,
--     phone, tokens are NOT granted to authenticated at all — owner screens
--     read contact info through server API routes with role checks).
--   · anon can read only what public pages need: venues' public identity
--     columns + tenant_manifests (brand). Nothing else. Diner join POSTs to
--     /api/join (server) — anon never inserts.
--   · No client policy at all on: organizations, leads, zones, super_admins,
--     events(select), memberships(write) — server-only surfaces.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0 · Drop every existing policy in public; enable RLS everywhere
-- ----------------------------------------------------------------------------
DO $$
DECLARE p RECORD;
BEGIN
    FOR p IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    END LOOP;
END $$;

DO $$
DECLARE t RECORD;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    END LOOP;
END $$;

-- Reset grants: nothing for anon/authenticated until granted below.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
-- Server (service role) keeps full access — Supabase default, restated here
-- so a fresh database behaves identically.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
REVOKE EXECUTE ON FUNCTION set_counter_pin(UUID, TEXT) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION verify_counter_pin(UUID, TEXT) FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- 1 · Membership helper functions (SECURITY DEFINER: they read memberships
--     without recursing into its own policies)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION aro_my_venue_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT m.venue_id FROM memberships m
    WHERE m.user_id = auth.uid() AND m.is_active AND m.venue_id IS NOT NULL
    UNION
    SELECT v.venue_id FROM venues v
    JOIN memberships m ON m.org_id = v.org_id AND m.venue_id IS NULL
    WHERE m.user_id = auth.uid() AND m.is_active
$$;

CREATE OR REPLACE FUNCTION aro_my_managed_venue_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT m.venue_id FROM memberships m
    WHERE m.user_id = auth.uid() AND m.is_active AND m.venue_id IS NOT NULL
      AND m.role IN ('owner', 'manager')
    UNION
    SELECT v.venue_id FROM venues v
    JOIN memberships m ON m.org_id = v.org_id AND m.venue_id IS NULL
    WHERE m.user_id = auth.uid() AND m.is_active AND m.role IN ('owner', 'manager')
$$;

CREATE OR REPLACE FUNCTION aro_is_aro_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM memberships m
        WHERE m.user_id = auth.uid() AND m.is_active AND m.role = 'aro_admin'
    )
$$;

GRANT EXECUTE ON FUNCTION aro_my_venue_ids(), aro_my_managed_venue_ids(), aro_is_aro_admin()
    TO authenticated;

-- ----------------------------------------------------------------------------
-- 2 · VENUES — public identity readable by anyone (join page / shop / domain
--     routing); contact + billing columns are NOT granted to anon or
--     authenticated. Owners/managers may update their venue's public fields.
-- ----------------------------------------------------------------------------
GRANT SELECT (venue_id, org_id, business_name, slug, app_name, custom_domain,
              features_enabled, loyalty_config, timezone, currency, language,
              brand_kit, kill_switch, zone_id, created_at, updated_at)
    ON venues TO anon, authenticated;
GRANT UPDATE (business_name, app_name, features_enabled, loyalty_config,
              timezone, currency, language, brand_kit)
    ON venues TO authenticated;

CREATE POLICY venues_public_read ON venues
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY venues_manage_update ON venues
    FOR UPDATE TO authenticated
    USING (venue_id IN (SELECT aro_my_managed_venue_ids()) OR aro_is_aro_admin())
    WITH CHECK (venue_id IN (SELECT aro_my_managed_venue_ids()) OR aro_is_aro_admin());
-- venue INSERT/DELETE: HQ server-side only (service role)

-- tenant_manifests: brand kit for public pages
GRANT SELECT ON tenant_manifests TO anon, authenticated;
GRANT INSERT, UPDATE ON tenant_manifests TO authenticated;
CREATE POLICY manifests_public_read ON tenant_manifests
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY manifests_manage_write ON tenant_manifests
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id IN (SELECT aro_my_managed_venue_ids()) OR aro_is_aro_admin());
CREATE POLICY manifests_manage_update ON tenant_manifests
    FOR UPDATE TO authenticated
    USING (tenant_id IN (SELECT aro_my_managed_venue_ids()) OR aro_is_aro_admin())
    WITH CHECK (tenant_id IN (SELECT aro_my_managed_venue_ids()) OR aro_is_aro_admin());

-- ----------------------------------------------------------------------------
-- 3 · MEMBERS — venue-scoped; contact columns (email/phone/tokens) are never
--     granted to authenticated. Staff sees name/usual/points only (§8).
--     All writes go through server APIs (/api/join, counter) — no client
--     INSERT/UPDATE/DELETE.
-- ----------------------------------------------------------------------------
GRANT SELECT (member_id, tenant_id, full_name, birthday, loyalty_tier,
              total_orders, total_spent, last_order_at, preferred_location_id,
              favorite_items, consent_ts, consent_source, created_at, updated_at)
    ON members TO authenticated;

CREATE POLICY members_venue_read ON members
    FOR SELECT TO authenticated
    USING (tenant_id IN (SELECT aro_my_venue_ids()) OR aro_is_aro_admin());

-- ----------------------------------------------------------------------------
-- 4 · MEMBERSHIPS — read own rows; managers read their venue's team.
--     counter_pin_hash / invite_token are never granted. Writes server-only.
-- ----------------------------------------------------------------------------
GRANT SELECT (membership_id, user_id, org_id, venue_id, role, full_name,
              invite_email, invite_accepted_at, is_active, pin_updated_at,
              created_at, updated_at)
    ON memberships TO authenticated;

CREATE POLICY memberships_own_read ON memberships
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR venue_id IN (SELECT aro_my_managed_venue_ids())
        OR aro_is_aro_admin()
    );

-- ----------------------------------------------------------------------------
-- 5 · VISITS — venue members read + record (counter flow)
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT ON visits TO authenticated;
CREATE POLICY visits_venue_read ON visits
    FOR SELECT TO authenticated
    USING (venue_id IN (SELECT aro_my_venue_ids()) OR aro_is_aro_admin());
CREATE POLICY visits_venue_insert ON visits
    FOR INSERT TO authenticated
    WITH CHECK (venue_id IN (SELECT aro_my_venue_ids()));

-- ----------------------------------------------------------------------------
-- 6 · POINTS_LEDGER — append-only; venue members read + insert
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT ON points_ledger TO authenticated;
CREATE POLICY ledger_venue_read ON points_ledger
    FOR SELECT TO authenticated
    USING (tenant_id IN (SELECT aro_my_venue_ids()) OR aro_is_aro_admin());
CREATE POLICY ledger_venue_insert ON points_ledger
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id IN (SELECT aro_my_venue_ids()));
-- UPDATE/DELETE: no grant, no policy, and a trigger raises anyway.

-- ----------------------------------------------------------------------------
-- 7 · REWARDS + REDEMPTIONS
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON rewards TO authenticated;
CREATE POLICY rewards_venue_read ON rewards
    FOR SELECT TO authenticated
    USING (tenant_id IN (SELECT aro_my_venue_ids()) OR aro_is_aro_admin());
CREATE POLICY rewards_manage_insert ON rewards
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id IN (SELECT aro_my_managed_venue_ids()));
CREATE POLICY rewards_manage_update ON rewards
    FOR UPDATE TO authenticated
    USING (tenant_id IN (SELECT aro_my_managed_venue_ids()))
    WITH CHECK (tenant_id IN (SELECT aro_my_managed_venue_ids()));
CREATE POLICY rewards_manage_delete ON rewards
    FOR DELETE TO authenticated
    USING (tenant_id IN (SELECT aro_my_managed_venue_ids()));

GRANT SELECT, INSERT ON redemptions TO authenticated;
CREATE POLICY redemptions_venue_read ON redemptions
    FOR SELECT TO authenticated
    USING (venue_id IN (SELECT aro_my_venue_ids()) OR aro_is_aro_admin());
CREATE POLICY redemptions_venue_insert ON redemptions
    FOR INSERT TO authenticated
    WITH CHECK (venue_id IN (SELECT aro_my_venue_ids()));

-- ----------------------------------------------------------------------------
-- 8 · CAMPAIGNS / AI_DRAFTS / MESSAGES — owner/manager only (messages carry
--     outreach content; staff has no business here)
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON campaigns TO authenticated;
CREATE POLICY campaigns_manage_all ON campaigns
    FOR ALL TO authenticated
    USING (venue_id IN (SELECT aro_my_managed_venue_ids()) OR aro_is_aro_admin())
    WITH CHECK (venue_id IN (SELECT aro_my_managed_venue_ids()));

GRANT SELECT, UPDATE ON ai_drafts TO authenticated;
CREATE POLICY ai_drafts_manage_read ON ai_drafts
    FOR SELECT TO authenticated
    USING (venue_id IN (SELECT aro_my_managed_venue_ids()) OR aro_is_aro_admin());
CREATE POLICY ai_drafts_manage_update ON ai_drafts
    FOR UPDATE TO authenticated
    USING (venue_id IN (SELECT aro_my_managed_venue_ids()))
    WITH CHECK (venue_id IN (SELECT aro_my_managed_venue_ids()));
-- ai_drafts INSERT: server only (lib/ai.ts)

GRANT SELECT ON messages TO authenticated;
CREATE POLICY messages_manage_read ON messages
    FOR SELECT TO authenticated
    USING (venue_id IN (SELECT aro_my_managed_venue_ids()) OR aro_is_aro_admin());
-- messages INSERT/UPDATE: server send-pipeline only

-- ----------------------------------------------------------------------------
-- 9 · EVENTS — venue members append; managers read their venues
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT ON events TO authenticated;
CREATE POLICY events_venue_insert ON events
    FOR INSERT TO authenticated
    WITH CHECK (venue_id IN (SELECT aro_my_venue_ids()));
CREATE POLICY events_manage_read ON events
    FOR SELECT TO authenticated
    USING (venue_id IN (SELECT aro_my_managed_venue_ids()) OR aro_is_aro_admin());

-- ----------------------------------------------------------------------------
-- 10 · LEGACY OPERATIONAL TABLES (menu/orders/coupons/inventory/…) — venue
--      members read, owner/manager write. Shop PWA is parked behind
--      ORDERING_ENABLED=false; revisit anon needs if/when it revives.
-- ----------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'categories', 'menu_items', 'locations', 'orders', 'order_items',
        'coupons', 'coupon_usage', 'push_campaigns',
        'inventory_items', 'inventory_transactions', 'staff_shifts',
        'menu_item_ingredients'
    ] LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO authenticated', t);
            IF EXISTS (SELECT FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id') THEN
                EXECUTE format(
                    'CREATE POLICY %I_venue_read ON %I FOR SELECT TO authenticated
                     USING (tenant_id IN (SELECT aro_my_venue_ids()) OR aro_is_aro_admin())', t, t);
                EXECUTE format(
                    'CREATE POLICY %I_manage_write ON %I FOR INSERT TO authenticated
                     WITH CHECK (tenant_id IN (SELECT aro_my_managed_venue_ids()))', t, t);
                EXECUTE format(
                    'CREATE POLICY %I_manage_update ON %I FOR UPDATE TO authenticated
                     USING (tenant_id IN (SELECT aro_my_managed_venue_ids()))
                     WITH CHECK (tenant_id IN (SELECT aro_my_managed_venue_ids()))', t, t);
                EXECUTE format(
                    'CREATE POLICY %I_manage_delete ON %I FOR DELETE TO authenticated
                     USING (tenant_id IN (SELECT aro_my_managed_venue_ids()))', t, t);
            END IF;
        END IF;
    END LOOP;
END $$;

-- Tables WITHOUT tenant_id get no generic policies above; scope them here.
-- order_items / coupon_usage / inventory rows are reachable via their parent;
-- for simplicity Phase 2 leaves them server-only if they lack tenant_id.

-- ----------------------------------------------------------------------------
-- 11 · Server-only tables: RLS on, ZERO client policies, zero grants.
--      organizations, leads, zones, super_admins, staff_users (deprecated)
-- ----------------------------------------------------------------------------
-- (nothing to do — no grants, no policies = deny all for anon/authenticated)

-- ----------------------------------------------------------------------------
-- 12 · Views (security_invoker): grant SELECT; underlying table grants +
--      policies still apply to the querying role.
-- ----------------------------------------------------------------------------
GRANT SELECT ON tenants TO anon, authenticated;
GRANT SELECT ON member_balances, member_status, users, loyalty_transactions, rewards_catalog
    TO authenticated;
GRANT EXECUTE ON FUNCTION member_cadence_days(UUID) TO authenticated;

-- ============================================================================
-- SECURITY HARDENING — fixes from get_advisors() run against the live
-- aro-platform project right after 20260707000001/2 applied cleanly.
-- ============================================================================

-- Lock down mutable search_path on trigger/helper functions (linter WARN:
-- function_search_path_mutable). Without this, a function can be tricked by
-- a caller-controlled search_path into resolving an unqualified identifier
-- to an attacker-created object.
ALTER FUNCTION touch_updated_at() SET search_path = public;
ALTER FUNCTION update_order_stats() SET search_path = public;
ALTER FUNCTION forbid_ledger_mutation() SET search_path = public;
ALTER FUNCTION award_order_loyalty_points() SET search_path = public;
ALTER FUNCTION award_signup_bonus() SET search_path = public;
ALTER FUNCTION member_cadence_days(UUID) SET search_path = public;

-- These SECURITY DEFINER helpers rely on auth.uid(); anon has none, so calls
-- return empty sets and aren't a data leak, but there is no legitimate reason
-- for anon to call them at all. Tighten to authenticated only (linter WARN:
-- anon_security_definer_function_executable).
REVOKE EXECUTE ON FUNCTION aro_my_venue_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION aro_my_managed_venue_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION aro_is_aro_admin() FROM anon;

-- ============================================================================
-- PASS SERIALS (Plan 2 — diner join page)
-- Every member gets an unguessable pass serial: the bearer token printed as
-- the web-pass QR and scanned/pasted at the counter. Never enumerable; the
-- pass page resolves it server-side only (no anon grant on members).
-- ============================================================================

ALTER TABLE members
    ADD COLUMN IF NOT EXISTS pass_serial UUID NOT NULL DEFAULT gen_random_uuid();

-- Backfill happens implicitly via the DEFAULT on ADD COLUMN (Postgres 11+
-- fills existing rows). Enforce uniqueness + fast lookup:
CREATE UNIQUE INDEX IF NOT EXISTS uq_members_pass_serial ON members (pass_serial);

-- ============================================================================
-- LEADS PIPELINE (Plan 5) — columns for the AURA diagnostic forward.
-- The leads table (20260707000001 §10) already has source/name/email/phone/
-- venue_name/city/payload/status. This adds what the webhook needs:
--   score            — diagnostic score (0 is valid; typeof-number checks)
--   answers          — full per-question detail for the inbox expando
--   idempotency_key  — browser back + resubmit = one row, enforced by DB
-- RLS stance unchanged: leads is a server-only table (no anon/authenticated
-- grants, no policies) — writes come from the service role via /api/leads,
-- reads go through the aro_admin-gated API only.
-- ============================================================================

ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS score INTEGER,
    ADD COLUMN IF NOT EXISTS answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_idempotency_key
    ON leads (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

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

-- ============================================================================
-- OWNER STATS (Plan 4) — the one number + tiles, in ONE round trip.
--
-- "Regulars returned this week" = distinct members with >=3 visits ever
-- (cadence is noise below that) whose first visit THIS venue-local week
-- followed a gap >= 1.5x their own median cadence — people who were
-- drifting and came back. Never double-counts a brand-new member's 2nd
-- visit as a "return".
--
-- at-risk tile trend needs a snapshot because member_status is a
-- point-in-time view (no history) — snapshot-on-first-call-per-day is
-- cron-free.
-- ============================================================================

CREATE TABLE IF NOT EXISTS status_snapshots (
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    day DATE NOT NULL,
    fading_count INTEGER NOT NULL,
    PRIMARY KEY (venue_id, day)
);

CREATE INDEX IF NOT EXISTS idx_visits_venue_member_ts ON visits(venue_id, member_id, ts DESC);

-- venues.timezone already exists (default 'America/Edmonton', set in
-- 20260707000001) — no column add needed here.

CREATE OR REPLACE FUNCTION venue_week_stats(p_venue_id UUID, p_tz TEXT)
RETURNS TABLE (
    regulars_returned INTEGER,
    members_this_week INTEGER,
    members_last_week INTEGER,
    visits_this_week INTEGER,
    visits_last_week INTEGER,
    fading_now INTEGER,
    fading_7d_ago INTEGER,
    has_any_data BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_week_start TIMESTAMPTZ;
    v_last_week_start TIMESTAMPTZ;
    v_today DATE;
BEGIN
    -- Venue-local Monday 00:00 for the current and previous week, converted
    -- back to a proper timestamptz. date_trunc('week', ...) is ISO (Monday).
    v_week_start := (date_trunc('week', NOW() AT TIME ZONE p_tz)) AT TIME ZONE p_tz;
    v_last_week_start := v_week_start - INTERVAL '7 days';
    v_today := (NOW() AT TIME ZONE p_tz)::date;

    -- Snapshot today's fading count once (first call of the day wins).
    INSERT INTO status_snapshots (venue_id, day, fading_count)
    SELECT p_venue_id, v_today, COUNT(*)
    FROM member_status
    WHERE venue_id = p_venue_id AND status = 'fading'
    ON CONFLICT (venue_id, day) DO NOTHING;

    RETURN QUERY
    WITH visit_agg AS (
        SELECT
            v.member_id,
            COUNT(*) AS total_visits,
            MAX(v.ts) FILTER (WHERE v.ts < v_week_start) AS prev_visit_ts,
            MIN(v.ts) FILTER (WHERE v.ts >= v_week_start) AS first_visit_this_week
        FROM visits v
        WHERE v.venue_id = p_venue_id
        GROUP BY v.member_id
    ),
    regulars AS (
        SELECT COUNT(*) AS n
        FROM visit_agg va
        WHERE va.total_visits >= 3
          AND va.first_visit_this_week IS NOT NULL
          AND va.prev_visit_ts IS NOT NULL
          AND EXTRACT(EPOCH FROM (va.first_visit_this_week - va.prev_visit_ts)) / 86400.0
              >= 1.5 * member_cadence_days(va.member_id)
    ),
    member_counts AS (
        SELECT
            COUNT(*) FILTER (WHERE created_at >= v_week_start) AS this_week,
            COUNT(*) FILTER (WHERE created_at >= v_last_week_start AND created_at < v_week_start) AS last_week
        FROM members WHERE tenant_id = p_venue_id
    ),
    visit_counts AS (
        SELECT
            COUNT(*) FILTER (WHERE ts >= v_week_start) AS this_week,
            COUNT(*) FILTER (WHERE ts >= v_last_week_start AND ts < v_week_start) AS last_week
        FROM visits WHERE venue_id = p_venue_id
    ),
    fading AS (
        SELECT COUNT(*) AS now_count
        FROM member_status WHERE venue_id = p_venue_id AND status = 'fading'
    ),
    fading_prior AS (
        SELECT fading_count FROM status_snapshots
        WHERE venue_id = p_venue_id AND day = v_today - 7
    ),
    presence AS (
        SELECT EXISTS (SELECT 1 FROM members WHERE tenant_id = p_venue_id) AS any_members
    )
    SELECT
        regulars.n::INTEGER,
        member_counts.this_week::INTEGER,
        member_counts.last_week::INTEGER,
        visit_counts.this_week::INTEGER,
        visit_counts.last_week::INTEGER,
        fading.now_count::INTEGER,
        fading_prior.fading_count::INTEGER,
        presence.any_members
    FROM regulars, member_counts, visit_counts, fading, presence
    LEFT JOIN fading_prior ON true;
END;
$$;

-- service_role ONLY: this function does not verify the caller's membership
-- of p_venue_id, so any authenticated user could otherwise pass an
-- arbitrary venue_id and read another venue's aggregate stats. The (owner)
-- layout's session+role check is what authorizes the venueId before
-- lib/owner-stats.ts calls this via the service-role client.
REVOKE ALL ON FUNCTION venue_week_stats(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION venue_week_stats(UUID, TEXT) TO service_role;

-- ============================================================================
-- FIX: venue_week_stats was created STABLE but contains a write (the daily
-- status_snapshots INSERT) — Postgres rejects data-modifying statements in
-- STABLE/IMMUTABLE functions, but only at call time, not at CREATE time.
-- Every call errored with "INSERT is not allowed in a non-volatile function".
-- ============================================================================

ALTER FUNCTION venue_week_stats(UUID, TEXT) VOLATILE;

-- ============================================================================
-- ORDERING CORE — menus, QR tables, delivery zones, orders, payments
--
-- New ordering tables use `venue_id`; legacy loyalty tables retain
-- `tenant_id`. Public diner reads are limited to active menu/configuration
-- rows. Orders, order line items, and payments are service-role only.
-- ============================================================================

SET search_path = public, extensions;

-- Close two baseline gaps found by the current Supabase security advisor.
-- status_snapshots was created after the original all-table RLS sweep, and
-- the three RLS helpers still inherited PostgreSQL's default PUBLIC execute
-- grant even though anon had been revoked explicitly.
ALTER TABLE status_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON status_snapshots FROM PUBLIC, anon, authenticated;
GRANT ALL ON status_snapshots TO service_role;

REVOKE EXECUTE ON FUNCTION aro_my_venue_ids() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION aro_my_managed_venue_ids() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION aro_is_aro_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION aro_my_venue_ids(), aro_my_managed_venue_ids(),
    aro_is_aro_admin() TO authenticated, service_role;

-- Release-one tax configuration. Totals are computed server-side in Phase 4
-- from this basis-points rate; it is deliberately not client supplied.
ALTER TABLE venues
    ADD COLUMN IF NOT EXISTS tax_rate_bp INTEGER NOT NULL DEFAULT 0
        CHECK (tax_rate_bp >= 0 AND tax_rate_bp <= 10000);

-- --------------------------------------------------------------------------
-- 1 · Menu catalog
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS menu_categories (
    category_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    available_from TIME,
    available_until TIME,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
    item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    category_id UUID REFERENCES menu_categories(category_id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    dietary_tags TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modifier_groups (
    group_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES menu_items(item_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    min_select INTEGER NOT NULL DEFAULT 0 CHECK (min_select >= 0),
    max_select INTEGER NOT NULL DEFAULT 1 CHECK (max_select >= min_select),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modifiers (
    modifier_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES modifier_groups(group_id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_delta_cents INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- --------------------------------------------------------------------------
-- 2 · Fulfilment configuration
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS venue_tables (
    table_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    qr_token UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (venue_id, label)
);

CREATE TABLE IF NOT EXISTS delivery_zones (
    zone_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (fee_cents >= 0),
    min_order_cents INTEGER NOT NULL DEFAULT 0 CHECK (min_order_cents >= 0),
    postal_prefixes TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- --------------------------------------------------------------------------
-- 3 · Order and payment history
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(member_id) ON DELETE SET NULL,
    client_uuid UUID NOT NULL,
    order_type TEXT NOT NULL CHECK (order_type IN ('dine_in', 'pickup', 'delivery')),
    table_id UUID REFERENCES venue_tables(table_id) ON DELETE SET NULL,
    zone_id UUID REFERENCES delivery_zones(zone_id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'paid', 'accepted', 'preparing', 'ready',
        'out_for_delivery', 'completed', 'canceled', 'refunded'
    )),
    guest_name TEXT,
    guest_phone TEXT,
    guest_email TEXT,
    delivery_address TEXT,
    notes TEXT,
    subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
    delivery_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (delivery_fee_cents >= 0),
    tax_cents INTEGER NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
    total_cents INTEGER NOT NULL CHECK (
        total_cents >= 0
        AND total_cents = subtotal_cents + delivery_fee_cents + tax_cents
    ),
    placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (venue_id, client_uuid)
);

CREATE TABLE IF NOT EXISTS order_items (
    order_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    item_id UUID REFERENCES menu_items(item_id) ON DELETE SET NULL,
    name_snapshot TEXT NOT NULL,
    unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS order_item_modifiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID NOT NULL REFERENCES order_items(order_item_id) ON DELETE CASCADE,
    name_snapshot TEXT NOT NULL,
    price_delta_cents INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payments (
    payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE RESTRICT,
    provider TEXT NOT NULL,
    provider_ref TEXT,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CAD',
    status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    idempotency_key UUID UNIQUE,
    raw JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_categories_venue_display_order
    ON menu_categories(venue_id, display_order);
CREATE INDEX IF NOT EXISTS idx_menu_items_venue_category
    ON menu_items(venue_id, category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_modifier_groups_item ON modifier_groups(item_id);
CREATE INDEX IF NOT EXISTS idx_modifier_groups_venue ON modifier_groups(venue_id);
CREATE INDEX IF NOT EXISTS idx_modifiers_group ON modifiers(group_id);
CREATE INDEX IF NOT EXISTS idx_modifiers_venue ON modifiers(venue_id);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_venue ON delivery_zones(venue_id);
CREATE INDEX IF NOT EXISTS idx_orders_venue_status_placed_at
    ON orders(venue_id, status, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_venue_placed_at ON orders(venue_id, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_member ON orders(member_id);
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_zone ON orders(zone_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_venue ON order_items(venue_id);
CREATE INDEX IF NOT EXISTS idx_order_items_item ON order_items(item_id);
CREATE INDEX IF NOT EXISTS idx_order_item_modifiers_order_item
    ON order_item_modifiers(order_item_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_venue ON payments(venue_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_provider_ref
    ON payments(provider, provider_ref)
    WHERE provider_ref IS NOT NULL;

-- Keep the tables that expose updated_at accurate with the hardened shared
-- trigger created by the platform schema.
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['menu_categories', 'menu_items', 'orders'] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I_touch ON %I', t, t);
        EXECUTE format(
            'CREATE TRIGGER %I_touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',
            t, t
        );
    END LOOP;
END $$;

-- The prior rebuild left two *unattached* legacy trigger functions that
-- reference a different orders shape (tenant_id/user_id/total). This schema
-- intentionally supersedes them: Phase 5 is the sole order-completion path
-- and will append one ledger entry itself, preventing double point awards.
DROP FUNCTION IF EXISTS public.update_order_stats();
DROP FUNCTION IF EXISTS public.award_order_loyalty_points();

-- Stripe webhook success must move payment + order together. This function is
-- intentionally small and service-role-only: it locks the payment row, checks
-- the server-stored amount, then advances pending -> succeeded / paid in one
-- transaction. A replay is a no-op; a mismatched amount is conspicuously
-- flagged as failed without ever trusting the provider payload as pricing.
CREATE OR REPLACE FUNCTION record_order_payment_success(
    p_provider TEXT,
    p_provider_ref TEXT,
    p_amount_cents INTEGER,
    p_raw JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    order_id UUID,
    venue_id UUID,
    applied BOOLEAN,
    amount_mismatch BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_payment payments%ROWTYPE;
BEGIN
    SELECT * INTO v_payment
    FROM payments
    WHERE provider = p_provider AND provider_ref = p_provider_ref
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'payment_not_found' USING ERRCODE = 'P0002';
    END IF;

    IF v_payment.amount_cents <> p_amount_cents THEN
        UPDATE payments
        SET status = 'failed', raw = p_raw
        WHERE payment_id = v_payment.payment_id AND status = 'pending';

        RETURN QUERY SELECT v_payment.order_id, v_payment.venue_id, false, true;
        RETURN;
    END IF;

    IF v_payment.status <> 'pending' THEN
        RETURN QUERY SELECT v_payment.order_id, v_payment.venue_id, false, false;
        RETURN;
    END IF;

    UPDATE payments
    SET status = 'succeeded', raw = p_raw
    WHERE payment_id = v_payment.payment_id;

    UPDATE orders
    SET status = 'paid', updated_at = NOW()
    WHERE orders.order_id = v_payment.order_id AND orders.status = 'pending';

    RETURN QUERY SELECT v_payment.order_id, v_payment.venue_id, true, false;
END;
$$;

REVOKE ALL ON FUNCTION record_order_payment_success(TEXT, TEXT, INTEGER, JSONB)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_order_payment_success(TEXT, TEXT, INTEGER, JSONB)
    TO service_role;

-- --------------------------------------------------------------------------
-- 4 · RLS and grants
-- --------------------------------------------------------------------------
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- These tables are created after the baseline GRANT ALL ON ALL TABLES
-- statement, so service-role access is declared explicitly.
GRANT ALL ON menu_categories, menu_items, modifier_groups, modifiers,
    venue_tables, delivery_zones, orders, order_items, order_item_modifiers,
    payments TO service_role;

-- Diner-facing menu/configuration rows are readable through the Data API.
-- Column grants prevent accidental future expansion into private fields.
GRANT SELECT (category_id, venue_id, name, display_order, is_active,
              available_from, available_until, created_at, updated_at)
    ON menu_categories TO anon, authenticated;
GRANT SELECT (item_id, venue_id, category_id, name, description, price_cents,
              image_url, is_active, sort_order, dietary_tags, created_at, updated_at)
    ON menu_items TO anon, authenticated;
GRANT SELECT (group_id, venue_id, item_id, name, min_select, max_select, created_at)
    ON modifier_groups TO anon, authenticated;
GRANT SELECT (modifier_id, group_id, venue_id, name, price_delta_cents, is_active, sort_order)
    ON modifiers TO anon, authenticated;
GRANT SELECT (table_id, venue_id, label, qr_token, is_active)
    ON venue_tables TO anon, authenticated;
GRANT SELECT (zone_id, venue_id, name, fee_cents, min_order_cents, postal_prefixes, is_active)
    ON delivery_zones TO anon, authenticated;

CREATE POLICY menu_categories_public_read ON menu_categories
    FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY menu_items_public_read ON menu_items
    FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY modifier_groups_public_read ON modifier_groups
    FOR SELECT TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM menu_items item
            WHERE item.item_id = modifier_groups.item_id
              AND item.venue_id = modifier_groups.venue_id
              AND item.is_active
        )
    );
CREATE POLICY modifiers_public_read ON modifiers
    FOR SELECT TO anon, authenticated
    USING (
        is_active
        AND EXISTS (
            SELECT 1
            FROM modifier_groups grp
            JOIN menu_items item ON item.item_id = grp.item_id
            WHERE grp.group_id = modifiers.group_id
              AND grp.venue_id = modifiers.venue_id
              AND item.venue_id = modifiers.venue_id
              AND item.is_active
        )
    );
CREATE POLICY venue_tables_public_read ON venue_tables
    FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY delivery_zones_public_read ON delivery_zones
    FOR SELECT TO anon, authenticated USING (is_active);

-- Orders and money are intentionally service-role only: no anon/authenticated
-- grants or policies are created for orders, order_items,
-- order_item_modifiers, or payments.

-- ============================================================================
-- ORDERING CORE GRANT HARDENING
--
-- Supabase's postgres default privileges grant new public-schema tables to
-- anon/authenticated. RLS prevented row reads, but Ordering Core requires the
-- stronger boundary: private order/payment tables have no browser grants, and
-- storefront tables expose only an explicit public column set.
-- ============================================================================

SET search_path = public, extensions;

REVOKE ALL ON menu_categories, menu_items, modifier_groups, modifiers,
    venue_tables, delivery_zones, orders, order_items, order_item_modifiers,
    payments FROM PUBLIC, anon, authenticated;

GRANT ALL ON menu_categories, menu_items, modifier_groups, modifiers,
    venue_tables, delivery_zones, orders, order_items, order_item_modifiers,
    payments TO service_role;

GRANT SELECT (category_id, venue_id, name, display_order, is_active,
              available_from, available_until, created_at, updated_at)
    ON menu_categories TO anon, authenticated;
GRANT SELECT (item_id, venue_id, category_id, name, description, price_cents,
              image_url, is_active, sort_order, dietary_tags, created_at, updated_at)
    ON menu_items TO anon, authenticated;
GRANT SELECT (group_id, venue_id, item_id, name, min_select, max_select, created_at)
    ON modifier_groups TO anon, authenticated;
GRANT SELECT (modifier_id, group_id, venue_id, name, price_delta_cents, is_active, sort_order)
    ON modifiers TO anon, authenticated;
GRANT SELECT (table_id, venue_id, label, qr_token, is_active)
    ON venue_tables TO anon, authenticated;
GRANT SELECT (zone_id, venue_id, name, fee_cents, min_order_cents, postal_prefixes, is_active)
    ON delivery_zones TO anon, authenticated;

-- Require future migrations to opt browser roles and RPC callers in
-- explicitly instead of inheriting broad public-schema defaults.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- ============================================================================
-- ORDERING CORE ADVISOR CLEANUP
--
-- The membership helper functions must be SECURITY DEFINER to read the
-- memberships table without recursive RLS, but they do not need to be exposed
-- as public Data API RPCs. Move them behind a non-exposed schema while keeping
-- explicit execution for RLS evaluation. Also cache auth.uid() once in the
-- memberships policy instead of evaluating it for every candidate row.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.aro_my_venue_ids() SET SCHEMA private;
ALTER FUNCTION public.aro_my_managed_venue_ids() SET SCHEMA private;
ALTER FUNCTION public.aro_is_aro_admin() SET SCHEMA private;

REVOKE ALL ON FUNCTION private.aro_my_venue_ids() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.aro_my_managed_venue_ids() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.aro_is_aro_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.aro_my_venue_ids(),
    private.aro_my_managed_venue_ids(), private.aro_is_aro_admin()
    TO authenticated, service_role;

DROP POLICY memberships_own_read ON memberships;
CREATE POLICY memberships_own_read ON memberships
    FOR SELECT TO authenticated
    USING (
        user_id = (SELECT auth.uid())
        OR venue_id IN (SELECT private.aro_my_managed_venue_ids())
        OR private.aro_is_aro_admin()
    );

-- ============================================================================
-- ORDERING PAYMENT EVENT ATOMICITY
--
-- Payment success, order advancement, and the order.paid analytics event must
-- commit together. A replay sees the locked succeeded payment and emits no
-- duplicate event.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_order_payment_success(
    p_provider TEXT,
    p_provider_ref TEXT,
    p_amount_cents INTEGER,
    p_raw JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    order_id UUID,
    venue_id UUID,
    applied BOOLEAN,
    amount_mismatch BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_payment payments%ROWTYPE;
BEGIN
    SELECT * INTO v_payment
    FROM payments
    WHERE provider = p_provider AND provider_ref = p_provider_ref
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'payment_not_found' USING ERRCODE = 'P0002';
    END IF;

    IF v_payment.amount_cents <> p_amount_cents THEN
        UPDATE payments
        SET status = 'failed', raw = p_raw
        WHERE payment_id = v_payment.payment_id AND status = 'pending';

        RETURN QUERY SELECT v_payment.order_id, v_payment.venue_id, false, true;
        RETURN;
    END IF;

    IF v_payment.status <> 'pending' THEN
        RETURN QUERY SELECT v_payment.order_id, v_payment.venue_id, false, false;
        RETURN;
    END IF;

    UPDATE payments
    SET status = 'succeeded', raw = p_raw
    WHERE payment_id = v_payment.payment_id;

    UPDATE orders
    SET status = 'paid', updated_at = NOW()
    WHERE orders.order_id = v_payment.order_id AND orders.status = 'pending';

    INSERT INTO events (actor, venue_id, type, payload)
    VALUES (
        'provider:' || p_provider,
        v_payment.venue_id,
        'order.paid',
        jsonb_build_object(
            'order_id', v_payment.order_id,
            'provider_ref', p_provider_ref,
            'provider_event_id', p_raw ->> 'provider_event_id'
        )
    );

    RETURN QUERY SELECT v_payment.order_id, v_payment.venue_id, true, false;
END;
$$;

REVOKE ALL ON FUNCTION public.record_order_payment_success(TEXT, TEXT, INTEGER, JSONB)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_order_payment_success(TEXT, TEXT, INTEGER, JSONB)
    TO service_role;

-- Atomic, service-role-only storefront repricing and order creation.
CREATE OR REPLACE FUNCTION public.create_storefront_order(
    p_venue_slug TEXT, p_client_uuid UUID, p_order_type TEXT, p_items JSONB,
    p_guest JSONB, p_table_token UUID, p_zone_id UUID,
    p_delivery_address TEXT, p_delivery_postal_code TEXT, p_notes TEXT,
    p_member_pass_serial UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_venue RECORD;
    v_existing public.orders%ROWTYPE;
    v_order_id UUID := extensions.uuid_generate_v4();
    v_member_id UUID;
    v_table_id UUID;
    v_zone RECORD;
    v_item JSONB;
    v_priced_item JSONB;
    v_catalog RECORD;
    v_group RECORD;
    v_modifier_ids UUID[];
    v_selected_count INTEGER;
    v_modifier_count INTEGER;
    v_modifier_total INTEGER;
    v_unit_price INTEGER;
    v_quantity INTEGER;
    v_subtotal INTEGER := 0;
    v_delivery_fee INTEGER := 0;
    v_tax INTEGER;
    v_total INTEGER;
    v_priced_items JSONB := '[]'::JSONB;
    v_order_item_id UUID;
    v_modifier JSONB;
    v_postal_prefix TEXT;
BEGIN
    SELECT venue_id, business_name, currency, tax_rate_bp
    INTO v_venue
    FROM public.venues
    WHERE slug = p_venue_slug AND COALESCE(kill_switch, false) = false;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'VENUE_NOT_FOUND';
    END IF;

    SELECT * INTO v_existing FROM public.orders
    WHERE venue_id = v_venue.venue_id AND client_uuid = p_client_uuid;
    IF FOUND THEN
        RETURN jsonb_build_object(
            'order_id', v_existing.order_id, 'venue_id', v_existing.venue_id,
            'status', v_existing.status, 'subtotal_cents', v_existing.subtotal_cents,
            'delivery_fee_cents', v_existing.delivery_fee_cents,
            'tax_cents', v_existing.tax_cents, 'total_cents', v_existing.total_cents,
            'currency', COALESCE(v_venue.currency, 'CAD'), 'replayed', true
        );
    END IF;

    IF p_order_type NOT IN ('dine_in', 'pickup', 'delivery') THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_ORDER_TYPE';
    END IF;
    IF NULLIF(BTRIM(COALESCE(p_guest->>'name', '')), '') IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'GUEST_NAME_REQUIRED';
    END IF;
    IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) < 1
       OR jsonb_array_length(p_items) > 50 THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_CART';
    END IF;

    IF p_order_type = 'dine_in' THEN
        SELECT table_id INTO v_table_id FROM public.venue_tables
        WHERE venue_id = v_venue.venue_id AND qr_token = p_table_token AND is_active = true;
        IF NOT FOUND THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_TABLE';
        END IF;
    END IF;

    IF p_member_pass_serial IS NOT NULL THEN
        SELECT member_id INTO v_member_id FROM public.members
        WHERE tenant_id = v_venue.venue_id AND pass_serial = p_member_pass_serial;
    END IF;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
        BEGIN
            v_quantity := (v_item->>'quantity')::INTEGER;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_QUANTITY';
        END;
        IF v_quantity < 1 OR v_quantity > 99 THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_QUANTITY';
        END IF;

        SELECT item_id, name, price_cents INTO v_catalog FROM public.menu_items
        WHERE item_id = (v_item->>'item_id')::UUID
          AND venue_id = v_venue.venue_id AND is_active = true;
        IF NOT FOUND THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ITEM_UNAVAILABLE';
        END IF;

        SELECT COALESCE(array_agg(DISTINCT value::UUID), ARRAY[]::UUID[])
        INTO v_modifier_ids
        FROM jsonb_array_elements_text(COALESCE(v_item->'modifier_ids', '[]'::JSONB));

        SELECT COUNT(*) INTO v_modifier_count FROM public.modifiers m
        JOIN public.modifier_groups g ON g.group_id = m.group_id
        WHERE m.modifier_id = ANY(v_modifier_ids) AND m.venue_id = v_venue.venue_id
          AND m.is_active = true AND g.item_id = v_catalog.item_id;
        IF v_modifier_count <> cardinality(v_modifier_ids) THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_MODIFIERS';
        END IF;

        FOR v_group IN SELECT group_id, name, min_select, max_select
            FROM public.modifier_groups
            WHERE item_id = v_catalog.item_id AND venue_id = v_venue.venue_id
        LOOP
            SELECT COUNT(*) INTO v_selected_count FROM public.modifiers
            WHERE group_id = v_group.group_id AND modifier_id = ANY(v_modifier_ids);
            IF v_selected_count < v_group.min_select OR v_selected_count > v_group.max_select THEN
                RAISE EXCEPTION USING ERRCODE = 'P0001',
                    MESSAGE = 'MODIFIER_SELECTION_INVALID:' || v_group.name;
            END IF;
        END LOOP;

        SELECT COALESCE(SUM(price_delta_cents), 0) INTO v_modifier_total
        FROM public.modifiers WHERE modifier_id = ANY(v_modifier_ids);
        v_unit_price := v_catalog.price_cents + v_modifier_total;
        IF v_unit_price < 0 THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_ITEM_PRICE';
        END IF;
        v_subtotal := v_subtotal + (v_unit_price * v_quantity);
        v_priced_items := v_priced_items || jsonb_build_array(jsonb_build_object(
            'item_id', v_catalog.item_id, 'name', v_catalog.name,
            'unit_price_cents', v_unit_price, 'quantity', v_quantity,
            'notes', NULLIF(BTRIM(COALESCE(v_item->>'notes', '')), ''),
            'modifiers', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'name', m.name, 'price_delta_cents', m.price_delta_cents
            ) ORDER BY m.sort_order, m.name) FROM public.modifiers m
            WHERE m.modifier_id = ANY(v_modifier_ids)), '[]'::JSONB)
        ));
    END LOOP;

    IF p_order_type = 'delivery' THEN
        SELECT zone_id, fee_cents, min_order_cents, postal_prefixes INTO v_zone
        FROM public.delivery_zones WHERE zone_id = p_zone_id
          AND venue_id = v_venue.venue_id AND is_active = true;
        IF NOT FOUND THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'DELIVERY_ZONE_REQUIRED';
        END IF;
        IF NULLIF(BTRIM(COALESCE(p_delivery_address, '')), '') IS NULL THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'DELIVERY_ADDRESS_REQUIRED';
        END IF;
        v_postal_prefix := LEFT(UPPER(REPLACE(COALESCE(p_delivery_postal_code, ''), ' ', '')), 3);
        IF cardinality(v_zone.postal_prefixes) > 0 AND NOT (v_postal_prefix = ANY(ARRAY(
            SELECT UPPER(REPLACE(prefix, ' ', '')) FROM unnest(v_zone.postal_prefixes) prefix
        ))) THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'OUTSIDE_DELIVERY_ZONE';
        END IF;
        IF v_subtotal < v_zone.min_order_cents THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'DELIVERY_MINIMUM_NOT_MET';
        END IF;
        v_delivery_fee := v_zone.fee_cents;
    END IF;

    v_tax := ROUND((v_subtotal + v_delivery_fee) * v_venue.tax_rate_bp / 10000.0);
    v_total := v_subtotal + v_delivery_fee + v_tax;
    INSERT INTO public.orders (
        order_id, venue_id, member_id, client_uuid, order_type, table_id, zone_id,
        guest_name, guest_phone, guest_email, delivery_address, notes,
        subtotal_cents, delivery_fee_cents, tax_cents, total_cents
    ) VALUES (
        v_order_id, v_venue.venue_id, v_member_id, p_client_uuid, p_order_type,
        v_table_id, CASE WHEN p_order_type = 'delivery' THEN p_zone_id ELSE NULL END,
        BTRIM(p_guest->>'name'), NULLIF(BTRIM(COALESCE(p_guest->>'phone', '')), ''),
        NULLIF(BTRIM(COALESCE(p_guest->>'email', '')), ''),
        CASE WHEN p_order_type = 'delivery' THEN BTRIM(p_delivery_address) ELSE NULL END,
        NULLIF(BTRIM(COALESCE(p_notes, '')), ''),
        v_subtotal, v_delivery_fee, v_tax, v_total
    );

    FOR v_priced_item IN SELECT value FROM jsonb_array_elements(v_priced_items)
    LOOP
        INSERT INTO public.order_items (
            order_id, venue_id, item_id, name_snapshot, unit_price_cents, quantity, notes
        ) VALUES (
            v_order_id, v_venue.venue_id, (v_priced_item->>'item_id')::UUID,
            v_priced_item->>'name', (v_priced_item->>'unit_price_cents')::INTEGER,
            (v_priced_item->>'quantity')::INTEGER, v_priced_item->>'notes'
        ) RETURNING order_item_id INTO v_order_item_id;
        FOR v_modifier IN SELECT value FROM jsonb_array_elements(v_priced_item->'modifiers')
        LOOP
            INSERT INTO public.order_item_modifiers (order_item_id, name_snapshot, price_delta_cents)
            VALUES (v_order_item_id, v_modifier->>'name',
                (v_modifier->>'price_delta_cents')::INTEGER);
        END LOOP;
    END LOOP;

    INSERT INTO public.events (actor, venue_id, type, payload) VALUES (
        CASE WHEN v_member_id IS NULL THEN 'guest' ELSE 'member:' || v_member_id::TEXT END,
        v_venue.venue_id, 'order.placed', jsonb_build_object(
            'order_id', v_order_id, 'order_type', p_order_type, 'total_cents', v_total
        )
    );
    RETURN jsonb_build_object(
        'order_id', v_order_id, 'venue_id', v_venue.venue_id, 'status', 'pending',
        'subtotal_cents', v_subtotal, 'delivery_fee_cents', v_delivery_fee,
        'tax_cents', v_tax, 'total_cents', v_total,
        'currency', COALESCE(v_venue.currency, 'CAD'), 'replayed', false
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_storefront_order(
    TEXT, UUID, TEXT, JSONB, JSONB, UUID, UUID, TEXT, TEXT, TEXT, UUID
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_storefront_order(
    TEXT, UUID, TEXT, JSONB, JSONB, UUID, UUID, TEXT, TEXT, TEXT, UUID
) TO service_role;
