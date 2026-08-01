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
-- PLAN-21 follow-up: bounds anonymous review-event replay to one row per
-- (order, event type) — see 20260801083000_lane_b_review_event_dedup.sql.
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_review_once
    ON events (type, (payload ->> 'order_id'))
    WHERE type IN ('review.prompted', 'review.clicked');

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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- PLAN-26: 86-ing / stock-out. is_86ed hides the item right now;
    -- auto_86ed tracks whether the *current* state was set by stock
    -- recompute, not a person — a manual toggle always clears it.
    is_86ed BOOLEAN NOT NULL DEFAULT false,
    auto_86ed BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT menu_items_auto_86_implies_86 CHECK (NOT auto_86ed OR is_86ed)
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

    -- PLAN-24: depletion is best-effort by design. This inner
    -- BEGIN...EXCEPTION is a sub-transaction (implicit savepoint): a
    -- failure rolls back the stock movements ONLY. The payment, the order
    -- status, and the order.paid event above are already durable and
    -- still commit. An order must never be lost to a stock bug.
    BEGIN
        PERFORM public.deplete_order_stock(v_payment.order_id);
    EXCEPTION WHEN OTHERS THEN
        BEGIN
            INSERT INTO events (actor, venue_id, type, payload)
            VALUES (
                'system',
                v_payment.venue_id,
                'inventory.depletion_failed',
                jsonb_build_object(
                    'order_id', v_payment.order_id,
                    'phase', 'depletion',
                    'sqlstate', SQLSTATE,
                    'message', SQLERRM
                )
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'depletion failure event unwritable for order %', v_payment.order_id;
        END;
    END;

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
    p_member_pass_serial UUID, p_tip_cents INTEGER DEFAULT 0
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
    v_tip INTEGER;
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
            'tax_cents', v_existing.tax_cents, 'tip_cents', v_existing.tip_cents,
            'total_cents', v_existing.total_cents,
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

        SELECT item_id, name, price_cents, is_86ed INTO v_catalog FROM public.menu_items
        WHERE item_id = (v_item->>'item_id')::UUID
          AND venue_id = v_venue.venue_id AND is_active = true;
        IF NOT FOUND THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ITEM_UNAVAILABLE';
        END IF;
        IF v_catalog.is_86ed THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ITEM_86ED:' || v_catalog.name;
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

    v_tip := COALESCE(p_tip_cents, 0);
    IF v_tip < 0 OR v_tip > GREATEST(v_subtotal * 3, 5000) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_TIP';
    END IF;

    v_tax := ROUND((v_subtotal + v_delivery_fee) * v_venue.tax_rate_bp / 10000.0);
    v_total := v_subtotal + v_delivery_fee + v_tax + v_tip;
    INSERT INTO public.orders (
        order_id, venue_id, member_id, client_uuid, order_type, table_id, zone_id,
        guest_name, guest_phone, guest_email, delivery_address, notes,
        subtotal_cents, delivery_fee_cents, tax_cents, tip_cents, total_cents
    ) VALUES (
        v_order_id, v_venue.venue_id, v_member_id, p_client_uuid, p_order_type,
        v_table_id, CASE WHEN p_order_type = 'delivery' THEN p_zone_id ELSE NULL END,
        BTRIM(p_guest->>'name'), NULLIF(BTRIM(COALESCE(p_guest->>'phone', '')), ''),
        NULLIF(BTRIM(COALESCE(p_guest->>'email', '')), ''),
        CASE WHEN p_order_type = 'delivery' THEN BTRIM(p_delivery_address) ELSE NULL END,
        NULLIF(BTRIM(COALESCE(p_notes, '')), ''),
        v_subtotal, v_delivery_fee, v_tax, v_tip, v_total
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
            'order_id', v_order_id, 'order_type', p_order_type, 'total_cents', v_total,
            'tip_cents', v_tip
        )
    );
    RETURN jsonb_build_object(
        'order_id', v_order_id, 'venue_id', v_venue.venue_id, 'status', 'pending',
        'subtotal_cents', v_subtotal, 'delivery_fee_cents', v_delivery_fee,
        'tax_cents', v_tax, 'tip_cents', v_tip, 'total_cents', v_total,
        'currency', COALESCE(v_venue.currency, 'CAD'), 'replayed', false
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_storefront_order(
    TEXT, UUID, TEXT, JSONB, JSONB, UUID, UUID, TEXT, TEXT, TEXT, UUID, INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_storefront_order(
    TEXT, UUID, TEXT, JSONB, JSONB, UUID, UUID, TEXT, TEXT, TEXT, UUID, INTEGER
) TO service_role;

-- PLAN-20 follow-up: atomic delivery-tip toggle. A single UPDATE that only
-- ever touches brand_kit->'tip_config'->'delivery_enabled', merged against
-- the row's current brand_kit at lock time -- immune to a concurrent writer
-- (e.g. the client site-profile route) clobbering unrelated keys.
CREATE OR REPLACE FUNCTION public.set_venue_tip_delivery_enabled(p_venue_id UUID, p_delivery_enabled BOOLEAN)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE venues
    SET brand_kit = COALESCE(brand_kit, '{}'::jsonb) ||
        jsonb_build_object(
            'tip_config',
            COALESCE(brand_kit->'tip_config', '{}'::jsonb) ||
                jsonb_build_object('delivery_enabled', p_delivery_enabled)
        )
    WHERE venue_id = p_venue_id
    RETURNING brand_kit->'tip_config';
$$;

REVOKE ALL ON FUNCTION public.set_venue_tip_delivery_enabled(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_venue_tip_delivery_enabled(UUID, BOOLEAN) TO service_role;

-- PLAN-21: post-payment review prompt. Same atomic single-statement
-- pattern as set_venue_tip_delivery_enabled, applied to
-- brand_kit->'review_profile'->'url' instead.
CREATE OR REPLACE FUNCTION public.set_venue_review_url(p_venue_id UUID, p_url TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE venues
    SET brand_kit = COALESCE(brand_kit, '{}'::jsonb) ||
        jsonb_build_object(
            'review_profile',
            COALESCE(brand_kit->'review_profile', '{}'::jsonb) ||
                jsonb_build_object('url', p_url)
        )
    WHERE venue_id = p_venue_id
    RETURNING brand_kit->'review_profile';
$$;

REVOKE ALL ON FUNCTION public.set_venue_review_url(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_venue_review_url(UUID, TEXT) TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS uq_points_ledger_order_award
    ON public.points_ledger(order_id) WHERE order_id IS NOT NULL AND reason = 'order';

CREATE OR REPLACE FUNCTION public.transition_order_status(
    p_order_id UUID, p_venue_id UUID, p_new_status TEXT, p_actor TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_order public.orders%ROWTYPE;
    v_points INTEGER := 0;
    v_rate NUMERIC := 0;
BEGIN
    SELECT * INTO v_order FROM public.orders
    WHERE order_id = p_order_id AND venue_id = p_venue_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ORDER_NOT_FOUND'; END IF;
    IF v_order.status = p_new_status THEN
        RETURN jsonb_build_object('order_id', v_order.order_id, 'status', v_order.status, 'replayed', true);
    END IF;
    IF NOT (
        (v_order.status = 'paid' AND p_new_status = 'accepted') OR
        (v_order.status = 'accepted' AND p_new_status = 'preparing') OR
        (v_order.status = 'preparing' AND p_new_status = 'ready') OR
        (v_order.status = 'ready' AND p_new_status = 'completed' AND v_order.order_type <> 'delivery') OR
        (v_order.status = 'ready' AND p_new_status = 'out_for_delivery' AND v_order.order_type = 'delivery') OR
        (v_order.status = 'out_for_delivery' AND p_new_status = 'completed') OR
        (p_new_status = 'canceled' AND v_order.status IN ('pending','paid','accepted','preparing','ready','out_for_delivery')) OR
        (p_new_status = 'refunded' AND v_order.status IN ('paid','accepted','preparing','ready','out_for_delivery','canceled'))
    ) THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ILLEGAL_ORDER_TRANSITION'; END IF;

    -- Kitchen ticket-age timestamps (PLAN-22 reads these).
    UPDATE public.orders SET
        status = p_new_status,
        updated_at = NOW(),
        accepted_at = CASE WHEN p_new_status = 'accepted' THEN NOW() ELSE accepted_at END,
        ready_at = CASE WHEN p_new_status = 'ready' THEN NOW() ELSE ready_at END
    WHERE order_id = p_order_id;
    IF p_new_status = 'completed' AND v_order.member_id IS NOT NULL THEN
        SELECT COALESCE((loyalty_config->>'points_per_euro')::NUMERIC, 0) INTO v_rate
        FROM public.venues WHERE venue_id = p_venue_id;
        -- subtotal_cents only: tips and delivery/tax never earn points (PLAN-20).
        v_points := FLOOR(v_order.subtotal_cents * v_rate / 100.0);
        IF v_points > 0 THEN
            INSERT INTO public.points_ledger (
                tenant_id, member_id, order_id, points_change, reason, description
            ) VALUES (
                p_venue_id, v_order.member_id, v_order.order_id, v_points, 'order',
                'Order ' || LEFT(v_order.order_id::TEXT, 8)
            ) ON CONFLICT (order_id) WHERE order_id IS NOT NULL AND reason = 'order' DO NOTHING;
        END IF;
    END IF;

    -- PLAN-24: a refund writes compensating stock movements in the same
    -- transaction as the status change, inside its own savepoint so a
    -- stock failure can never block or reverse the refund.
    IF p_new_status = 'refunded' THEN
        BEGIN
            PERFORM public.reverse_order_stock_depletion(p_order_id);
        EXCEPTION WHEN OTHERS THEN
            BEGIN
                INSERT INTO public.events(actor, venue_id, type, payload) VALUES (
                    'system', p_venue_id, 'inventory.depletion_failed',
                    jsonb_build_object(
                        'order_id', p_order_id,
                        'phase', 'reversal',
                        'sqlstate', SQLSTATE,
                        'message', SQLERRM
                    )
                );
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'reversal failure event unwritable for order %', p_order_id;
            END;
        END;
    END IF;

    INSERT INTO public.events(actor, venue_id, type, payload) VALUES (
        COALESCE(p_actor, 'system'), p_venue_id, 'order.status_changed',
        jsonb_build_object('order_id', p_order_id, 'from', v_order.status, 'to', p_new_status)
    );
    RETURN jsonb_build_object('order_id', p_order_id, 'status', p_new_status, 'points_awarded', v_points, 'replayed', false);
END;
$$;

REVOKE ALL ON FUNCTION public.transition_order_status(UUID, UUID, TEXT, TEXT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transition_order_status(UUID, UUID, TEXT, TEXT) TO service_role;

-- Idempotent Ordering Core demo for the canonical Roastery venue.
INSERT INTO public.menu_categories (category_id, venue_id, name, display_order, is_active)
VALUES
('c1000000-0000-4000-8000-000000000001','a0000000-0000-4000-3000-000000000001','Coffee',10,true),
('c1000000-0000-4000-8000-000000000002','a0000000-0000-4000-3000-000000000001','Bakery',20,true)
ON CONFLICT (category_id) DO UPDATE SET name=EXCLUDED.name, display_order=EXCLUDED.display_order, is_active=true;

INSERT INTO public.menu_items (item_id, venue_id, category_id, name, description, price_cents, is_active, sort_order, dietary_tags)
VALUES
('c2000000-0000-4000-8000-000000000001','a0000000-0000-4000-3000-000000000001','c1000000-0000-4000-8000-000000000001','Flat White','Velvety espresso and steamed milk.',475,true,10,ARRAY['vegetarian']),
('c2000000-0000-4000-8000-000000000002','a0000000-0000-4000-3000-000000000001','c1000000-0000-4000-8000-000000000001','Americano','Double espresso lengthened with hot water.',375,true,20,ARRAY['vegan']),
('c2000000-0000-4000-8000-000000000003','a0000000-0000-4000-3000-000000000001','c1000000-0000-4000-8000-000000000001','Cold Brew','Slow-steeped, chocolatey and bright.',500,true,30,ARRAY['vegan']),
('c2000000-0000-4000-8000-000000000004','a0000000-0000-4000-3000-000000000001','c1000000-0000-4000-8000-000000000002','Butter Croissant','Flaky, cultured-butter pastry.',425,true,10,ARRAY['vegetarian']),
('c2000000-0000-4000-8000-000000000005','a0000000-0000-4000-3000-000000000001','c1000000-0000-4000-8000-000000000002','Morning Bun','Cinnamon, orange and raw sugar.',450,true,20,ARRAY['vegetarian'])
ON CONFLICT (item_id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, price_cents=EXCLUDED.price_cents, is_active=true;

INSERT INTO public.modifier_groups (group_id, venue_id, item_id, name, min_select, max_select)
VALUES
('c3000000-0000-4000-8000-000000000001','a0000000-0000-4000-3000-000000000001','c2000000-0000-4000-8000-000000000001','Size',1,1),
('c3000000-0000-4000-8000-000000000002','a0000000-0000-4000-3000-000000000001','c2000000-0000-4000-8000-000000000001','Milk',1,1)
ON CONFLICT (group_id) DO UPDATE SET name=EXCLUDED.name, min_select=EXCLUDED.min_select, max_select=EXCLUDED.max_select;

INSERT INTO public.modifiers (modifier_id, group_id, venue_id, name, price_delta_cents, is_active, sort_order)
VALUES
('c4000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','a0000000-0000-4000-3000-000000000001','Regular',0,true,10),
('c4000000-0000-4000-8000-000000000002','c3000000-0000-4000-8000-000000000001','a0000000-0000-4000-3000-000000000001','Large',75,true,20),
('c4000000-0000-4000-8000-000000000003','c3000000-0000-4000-8000-000000000002','a0000000-0000-4000-3000-000000000001','Whole milk',0,true,10),
('c4000000-0000-4000-8000-000000000004','c3000000-0000-4000-8000-000000000002','a0000000-0000-4000-3000-000000000001','Oat milk',75,true,20)
ON CONFLICT (modifier_id) DO UPDATE SET name=EXCLUDED.name, price_delta_cents=EXCLUDED.price_delta_cents, is_active=true;

INSERT INTO public.venue_tables (table_id, venue_id, label, qr_token, is_active)
VALUES
('c5000000-0000-4000-8000-000000000001','a0000000-0000-4000-3000-000000000001','Table 1','c5100000-0000-4000-8000-000000000001',true),
('c5000000-0000-4000-8000-000000000002','a0000000-0000-4000-3000-000000000001','Table 2','c5100000-0000-4000-8000-000000000002',true)
ON CONFLICT (table_id) DO UPDATE SET label=EXCLUDED.label, is_active=true;

INSERT INTO public.delivery_zones (zone_id, venue_id, name, fee_cents, min_order_cents, postal_prefixes, is_active)
VALUES ('c6000000-0000-4000-8000-000000000001','a0000000-0000-4000-3000-000000000001','Calgary core',500,2000,ARRAY['T2N','T2P','T2R'],true)
ON CONFLICT (zone_id) DO UPDATE SET name=EXCLUDED.name, fee_cents=EXCLUDED.fee_cents, min_order_cents=EXCLUDED.min_order_cents, postal_prefixes=EXCLUDED.postal_prefixes, is_active=true;


-- ============================================================================
-- RESERVATIONS CORE (mirrored from 20260716160000_reservations_core.sql)
-- ============================================================================

-- ============================================================================
-- RESERVATIONS CORE — config, table capacity, bookings, waitlist, atomic RPCs
--
-- Fresh tables use `venue_id` (never `tenant_id`). Guest PII tables are
-- service-role only — no anon/authenticated grants or policies.
-- ============================================================================

SET search_path = public, extensions;

-- --------------------------------------------------------------------------
-- 1 · Extend existing tables
-- --------------------------------------------------------------------------
ALTER TABLE venues ADD COLUMN IF NOT EXISTS reservation_config JSONB NOT NULL DEFAULT
  '{"slot_minutes":30,"min_party":1,"max_party":8,"max_advance_days":30,
    "buffer_minutes":15,"default_duration_minutes":90,"hours":null}'::jsonb;

ALTER TABLE venue_tables ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 2
  CHECK (capacity > 0);

-- Re-assert public column grant WITHOUT capacity (staff-only field).
REVOKE ALL ON venue_tables FROM PUBLIC, anon, authenticated;
GRANT ALL ON venue_tables TO service_role;
GRANT SELECT (table_id, venue_id, label, qr_token, is_active)
    ON venue_tables TO anon, authenticated;

-- --------------------------------------------------------------------------
-- 2 · New tables
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reservations (
    reservation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(member_id) ON DELETE SET NULL,
    table_id UUID REFERENCES venue_tables(table_id) ON DELETE SET NULL,
    client_uuid UUID NOT NULL,
    guest_name TEXT NOT NULL,
    guest_phone TEXT NOT NULL,
    guest_email TEXT,
    party_size INTEGER NOT NULL CHECK (party_size > 0),
    status TEXT NOT NULL DEFAULT 'confirmed'
        CHECK (status IN ('confirmed', 'seated', 'completed', 'no_show', 'canceled')),
    starts_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'guest' CHECK (source IN ('guest', 'staff')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (venue_id, client_uuid)
);

CREATE TABLE IF NOT EXISTS waitlist_entries (
    waitlist_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(member_id) ON DELETE SET NULL,
    client_uuid UUID NOT NULL,
    guest_name TEXT NOT NULL,
    guest_phone TEXT NOT NULL,
    party_size INTEGER NOT NULL CHECK (party_size > 0),
    status TEXT NOT NULL DEFAULT 'waiting'
        CHECK (status IN ('waiting', 'notified', 'seated', 'canceled', 'expired')),
    notes TEXT,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (venue_id, client_uuid)
);

CREATE INDEX IF NOT EXISTS idx_reservations_venue_starts_at
    ON reservations(venue_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_reservations_venue_status_starts_at
    ON reservations(venue_id, status, starts_at);
CREATE INDEX IF NOT EXISTS idx_reservations_table
    ON reservations(table_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_entries_venue_status_joined
    ON waitlist_entries(venue_id, status, joined_at);

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['reservations', 'waitlist_entries'] LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS %I_touch ON %I',
            t, t
        );
        EXECUTE format(
            'CREATE TRIGGER %I_touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',
            t, t
        );
    END LOOP;
END;
$$;

-- --------------------------------------------------------------------------
-- 3 · RLS and grants (PII — service-role only)
-- --------------------------------------------------------------------------
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON reservations, waitlist_entries FROM PUBLIC, anon, authenticated;
GRANT ALL ON reservations, waitlist_entries TO service_role;

-- No anon/authenticated policies or grants for reservations / waitlist_entries.

-- --------------------------------------------------------------------------
-- 4 · Atomic helpers and mutations (SECURITY DEFINER, service_role only)
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.find_available_table(
    p_venue_id UUID,
    p_party_size INT,
    p_starts_at TIMESTAMPTZ,
    p_duration_minutes INT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_buffer INT;
    v_new_end TIMESTAMPTZ;
    v_table RECORD;
    v_conflict BOOLEAN;
BEGIN
    SELECT COALESCE((reservation_config->>'buffer_minutes')::INT, 15)
    INTO v_buffer
    FROM public.venues
    WHERE venue_id = p_venue_id;

    IF v_buffer IS NULL THEN
        RETURN NULL;
    END IF;

    v_new_end := p_starts_at + make_interval(mins => p_duration_minutes);

    FOR v_table IN
        SELECT table_id
        FROM public.venue_tables
        WHERE venue_id = p_venue_id
          AND is_active = true
          AND capacity >= p_party_size
        ORDER BY capacity ASC, label ASC
        FOR UPDATE
    LOOP
        SELECT EXISTS (
            SELECT 1
            FROM public.reservations r
            WHERE r.table_id = v_table.table_id
              AND r.status IN ('confirmed', 'seated')
              AND r.starts_at < (v_new_end + make_interval(mins => v_buffer))
              AND (r.starts_at + make_interval(mins => r.duration_minutes))
                  > (p_starts_at - make_interval(mins => v_buffer))
        ) INTO v_conflict;

        IF NOT v_conflict THEN
            RETURN v_table.table_id;
        END IF;
    END LOOP;

    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_reservation(
    p_venue_id UUID,
    p_client_uuid UUID,
    p_guest_name TEXT,
    p_guest_phone TEXT,
    p_guest_email TEXT,
    p_party_size INT,
    p_starts_at TIMESTAMPTZ,
    p_notes TEXT,
    p_member_id UUID,
    p_source TEXT
)
RETURNS public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_existing public.reservations%ROWTYPE;
    v_config JSONB;
    v_timezone TEXT;
    v_min_party INT;
    v_max_party INT;
    v_max_advance INT;
    v_duration INT;
    v_hours JSONB;
    v_day JSONB;
    v_local TIMESTAMP;
    v_day_key TEXT;
    v_open TIME;
    v_close TIME;
    v_table_id UUID;
    v_row public.reservations%ROWTYPE;
    v_source TEXT;
BEGIN
    -- Idempotent replay: return existing row, do not emit a second event.
    SELECT * INTO v_existing
    FROM public.reservations
    WHERE venue_id = p_venue_id AND client_uuid = p_client_uuid;
    IF FOUND THEN
        RETURN v_existing;
    END IF;

    SELECT reservation_config, COALESCE(timezone, 'UTC')
    INTO v_config, v_timezone
    FROM public.venues
    WHERE venue_id = p_venue_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'VENUE_NOT_FOUND';
    END IF;

    v_min_party := COALESCE((v_config->>'min_party')::INT, 1);
    v_max_party := COALESCE((v_config->>'max_party')::INT, 8);
    v_max_advance := COALESCE((v_config->>'max_advance_days')::INT, 30);
    v_duration := COALESCE((v_config->>'default_duration_minutes')::INT, 90);
    v_hours := v_config->'hours';

    IF p_party_size IS NULL OR p_party_size < v_min_party OR p_party_size > v_max_party THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_PARTY_SIZE';
    END IF;

    IF NULLIF(BTRIM(COALESCE(p_guest_name, '')), '') IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'GUEST_NAME_REQUIRED';
    END IF;
    IF NULLIF(BTRIM(COALESCE(p_guest_phone, '')), '') IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'GUEST_PHONE_REQUIRED';
    END IF;

    IF p_starts_at IS NULL OR p_starts_at <= NOW() THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'STARTS_AT_IN_PAST';
    END IF;
    IF p_starts_at > NOW() + make_interval(days => v_max_advance) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'STARTS_AT_TOO_FAR';
    END IF;

    -- Hours gating: null hours or closed day ⇒ same catchable class as no availability.
    IF v_hours IS NULL OR v_hours = 'null'::jsonb THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'NO_AVAILABILITY';
    END IF;

    v_local := p_starts_at AT TIME ZONE v_timezone;
    v_day_key := (ARRAY['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'])[
        (EXTRACT(DOW FROM v_local)::INT + 1)
    ];
    v_day := v_hours->v_day_key;
    IF v_day IS NULL OR v_day = 'null'::jsonb OR jsonb_typeof(v_day) <> 'array'
       OR jsonb_array_length(v_day) < 2 THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'NO_AVAILABILITY';
    END IF;

    BEGIN
        v_open := (v_day->>0)::TIME;
        v_close := (v_day->>1)::TIME;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'NO_AVAILABILITY';
    END;

    IF v_local::TIME < v_open OR v_local::TIME >= v_close THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'NO_AVAILABILITY';
    END IF;

    v_source := CASE WHEN p_source IN ('guest', 'staff') THEN p_source ELSE 'guest' END;

    v_table_id := public.find_available_table(
        p_venue_id, p_party_size, p_starts_at, v_duration
    );
    IF v_table_id IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'NO_AVAILABILITY';
    END IF;

    BEGIN
        INSERT INTO public.reservations (
            venue_id, member_id, table_id, client_uuid,
            guest_name, guest_phone, guest_email, party_size,
            status, starts_at, duration_minutes, notes, source
        ) VALUES (
            p_venue_id, p_member_id, v_table_id, p_client_uuid,
            BTRIM(p_guest_name), BTRIM(p_guest_phone),
            NULLIF(BTRIM(COALESCE(p_guest_email, '')), ''),
            p_party_size, 'confirmed', p_starts_at, v_duration,
            NULLIF(BTRIM(COALESCE(p_notes, '')), ''), v_source
        )
        RETURNING * INTO v_row;
    EXCEPTION WHEN unique_violation THEN
        SELECT * INTO v_row
        FROM public.reservations
        WHERE venue_id = p_venue_id AND client_uuid = p_client_uuid;
        RETURN v_row;
    END;

    INSERT INTO public.events (actor, venue_id, type, payload) VALUES (
        CASE WHEN p_member_id IS NULL THEN 'guest' ELSE 'member:' || p_member_id::TEXT END,
        p_venue_id,
        'reservation.created',
        jsonb_build_object(
            'reservation_id', v_row.reservation_id,
            'party_size', v_row.party_size,
            'starts_at', v_row.starts_at,
            'table_id', v_row.table_id
        )
    );

    RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_reservation_status(
    p_reservation_id UUID,
    p_new_status TEXT
)
RETURNS public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_row public.reservations%ROWTYPE;
    v_from TEXT;
BEGIN
    SELECT * INTO v_row
    FROM public.reservations
    WHERE reservation_id = p_reservation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'RESERVATION_NOT_FOUND';
    END IF;

    v_from := v_row.status;
    IF v_from = p_new_status THEN
        RETURN v_row;
    END IF;

    IF NOT (
        (v_from = 'confirmed' AND p_new_status IN ('seated', 'canceled', 'no_show'))
        OR (v_from = 'seated' AND p_new_status IN ('completed', 'canceled'))
    ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ILLEGAL_RESERVATION_TRANSITION';
    END IF;

    UPDATE public.reservations
    SET status = p_new_status, updated_at = NOW()
    WHERE reservation_id = p_reservation_id
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.find_available_table(UUID, INT, TIMESTAMPTZ, INT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_available_table(UUID, INT, TIMESTAMPTZ, INT)
    TO service_role;

REVOKE ALL ON FUNCTION public.create_reservation(
    UUID, UUID, TEXT, TEXT, TEXT, INT, TIMESTAMPTZ, TEXT, UUID, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_reservation(
    UUID, UUID, TEXT, TEXT, TEXT, INT, TIMESTAMPTZ, TEXT, UUID, TEXT
) TO service_role;

REVOKE ALL ON FUNCTION public.update_reservation_status(UUID, TEXT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_reservation_status(UUID, TEXT)
    TO service_role;


-- ============================================================================
-- BATCH SCHEMA LANES A/B/C
-- (mirrored from 20260722120000_batch_schema_lanes_abc.sql)
-- ============================================================================

-- ============================================================================
-- BATCH SCHEMA — LANES A / B / C (one coherent migration)
--
--   Lane A · loyalty & member growth
--            loyalty_programs, member_offers, survey_responses,
--            push_subscriptions, members.birthday_month/_day,
--            members.referred_by_member_id, guarded drop of members.birthday
--   Lane B · commerce & kitchen ops
--            orders.tip_cents/accepted_at/ready_at, inventory_items,
--            inventory_movements (append-only), menu_item_ingredients
--   Lane C · team & platform
--            staff_shifts (one open shift per membership), tip_allocations
--   Shared · messages.channel widened to allow 'push' (needed by PLAN-18;
--            done here so a second migration never touches the same CHECK)
--
-- HOUSE RULES APPLIED (MASTER-PLAN-aro.md §4, §7)
--   · Fresh tables use `venue_id`, never `tenant_id` (§4.2).
--   · Every new table carries a REAL venue_id column so every policy is a
--     direct `venue_id IN (SELECT private.aro_my_venue_ids())` — tenant
--     isolation is never inferred through a parent join (§4.1).
--   · The RLS helpers live in schema `private` since
--     20260714075459_ordering_core_advisor_cleanup.sql. Policies below call
--     private.aro_my_venue_ids() / private.aro_my_managed_venue_ids() /
--     private.aro_is_aro_admin() — NOT the original public.* names.
--   · RLS ON for all nine new tables. Read = venue members or aro_admin.
--     Write = owner/manager only. NO anon grant anywhere in this batch
--     (public code-lookup is PLAN-12 work, deliberately not done here).
--   · push_subscriptions and tip_allocations get RLS + ZERO client grants and
--     ZERO policies — service_role only (bearer capability / payroll data).
--   · Append-only money and history: inventory_movements mirrors the
--     points_ledger `forbid_ledger_mutation()` trigger; member_offers is
--     immutable after issue except the redemption triple.
--   · Idempotency at the DB level, modelled on uq_points_ledger_order_award.
--   · Destructive steps (dropping members.birthday, rewriting the orders
--     total CHECK) are gated by DO-block assertions that RAISE rather than
--     silently discard real production data (§7).
--
-- ADDITIVE GUARDS BEYOND THE BATCH SPEC (deliberate, all non-restrictive on
-- any legitimate row — called out so a reviewer can see them at a glance):
--   · `>= 0` CHECKs on every new *_cents / quantity column, matching the
--     house convention on price_cents / fee_cents / tax_cents.
--   · staff_shifts.ended_at >= started_at, tip_allocations.period_end >=
--     period_start, member_offers.code length bound ("short" made explicit).
--   · COMPOSITE (venue_id, <parent pk>) foreign keys wherever both columns
--     are NOT NULL, backed by new (venue_id, pk) unique indexes on the parent
--     tables. A denormalised venue_id that can disagree with its parent's
--     venue_id is a cross-tenant integrity hole: without these, a manager of
--     venue A could insert member_offers(venue_id = A, member_id = <a member
--     of venue B>) and pass every policy. These FKs make that impossible in
--     the database rather than only in app code. They cannot fail on existing
--     data (the unique indexes are over a PK).
--
-- Re-runnable: every statement is IF EXISTS / IF NOT EXISTS guarded, every
-- policy is dropped before creation, and every assertion is written so a
-- second run on an already-migrated database is a no-op rather than a raise.
-- ============================================================================

SET search_path = public, extensions;

-- --------------------------------------------------------------------------
-- 0 · Preconditions — confirm the nine tables are genuinely net-new
--
-- 20260707000002_aro_rls.sql §10 names `inventory_items`, `staff_shifts`,
-- `menu_item_ingredients` (and `inventory_transactions`) as LEGACY,
-- tenant_id-shaped operational tables and grants them conditionally. None of
-- them exist on aro-platform, but if a legacy variant ever did appear this
-- batch must refuse rather than create a second, venue_id-shaped table
-- alongside it and fork the data.
-- --------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'loyalty_programs', 'member_offers', 'survey_responses',
        'push_subscriptions', 'inventory_items', 'inventory_movements',
        'menu_item_ingredients', 'staff_shifts', 'tip_allocations'
    ] LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id'
        ) THEN
            RAISE EXCEPTION 'REFUSING TO PROCEED: public.% already exists with a legacy tenant_id column. This batch assumes venue_id-scoped net-new tables (MASTER-PLAN §4.2). Reconcile the legacy table by hand before re-running.', t;
        END IF;
    END LOOP;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_transactions') THEN
        RAISE EXCEPTION 'REFUSING TO PROCEED: legacy public.inventory_transactions exists — creating inventory_movements would fork stock history across two tables. Migrate or drop it first.';
    END IF;
END $$;

-- --------------------------------------------------------------------------
-- 1 · Tenant-coherence unique indexes on EXISTING parents
--
-- These exist only so the composite (venue_id, parent_pk) foreign keys below
-- have something to point at. Each is unique by construction (it extends a
-- primary key), so it cannot fail on live data. `members` keeps its legacy
-- `tenant_id` column name (§4.2) — that is the venue column here.
-- --------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_members_venue_member
    ON members(tenant_id, member_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_menu_items_venue_item
    ON menu_items(venue_id, item_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_venue_order
    ON orders(venue_id, order_id);

-- ==========================================================================
-- LANE A · LOYALTY & MEMBER GROWTH
-- ==========================================================================

-- --------------------------------------------------------------------------
-- A1 · loyalty_programs — one row per configured program per venue.
--      `config` stays JSONB: every program type has a different shape and
--      the loyalty engine reads it server-side.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loyalty_programs (
    program_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'accrual', 'bounce_back', 'birthday', 'anniversary',
        'appreciation', 'winback', 'mystery', 'survey', 'referral'
    )),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (venue_id, type, name)
);

CREATE INDEX IF NOT EXISTS idx_loyalty_programs_venue_status
    ON loyalty_programs(venue_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_loyalty_programs_venue_program
    ON loyalty_programs(venue_id, program_id);

-- --------------------------------------------------------------------------
-- A2 · member_offers — an issued, redeemable offer. Immutable after issue
--      except the redemption triple (redeemed_at, redeemed_by_membership_id,
--      status); redeemed_at is write-once.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_offers (
    offer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    member_id UUID NOT NULL,
    program_id UUID NOT NULL,
    -- short, human-readable, spoken-at-the-counter code; unique per venue
    code TEXT NOT NULL CHECK (char_length(code) BETWEEN 4 AND 24),
    value_cents INTEGER CHECK (value_cents IS NULL OR value_cents >= 0),
    points_value INTEGER CHECK (points_value IS NULL OR points_value >= 0),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    redeemed_at TIMESTAMPTZ,
    redeemed_by_membership_id UUID REFERENCES memberships(membership_id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'issued'
        CHECK (status IN ('issued', 'redeemed', 'expired', 'void')),
    UNIQUE (venue_id, code),
    -- Tenant coherence: the member and the program must belong to the same
    -- venue as the offer. Enforced in the database, not just in app code.
    CONSTRAINT member_offers_venue_member_fk
        FOREIGN KEY (venue_id, member_id)
        REFERENCES members(tenant_id, member_id) ON DELETE CASCADE,
    CONSTRAINT member_offers_venue_program_fk
        FOREIGN KEY (venue_id, program_id)
        REFERENCES loyalty_programs(venue_id, program_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_member_offers_venue_status
    ON member_offers(venue_id, status);
CREATE INDEX IF NOT EXISTS idx_member_offers_member_issued
    ON member_offers(member_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_offers_program
    ON member_offers(program_id);
CREATE INDEX IF NOT EXISTS idx_member_offers_expires_at
    ON member_offers(expires_at) WHERE redeemed_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_member_offers_venue_offer
    ON member_offers(venue_id, offer_id);

-- Redemption idempotency, modelled on uq_points_ledger_order_award
-- (20260714100000: ON points_ledger(order_id) WHERE order_id IS NOT NULL AND
-- reason = 'order'). Two guarantees, stated separately because they are not
-- equally load-bearing:
--
--   (a) The partial unique index below declares "at most one redemption per
--       offer" in the catalogue, where \d and the advisors can see it. It is
--       structurally satisfied by the primary key, so it is documentation
--       plus a tripwire against a future composite-key refactor, not the
--       operative guard.
--   (b) The OPERATIVE write-once guarantee is the trigger clause: an UPDATE
--       may take redeemed_at from NULL to a value, never from a value to
--       anything else. Two concurrent redemptions of the same offer serialise
--       on that row's lock, so the loser sees the committed redeemed_at and
--       raises instead of double-redeeming. A caller treats that raise the
--       way the house pattern treats 23505 — already done, not an error.
CREATE UNIQUE INDEX IF NOT EXISTS uq_member_offers_redeemed_once
    ON member_offers(offer_id) WHERE redeemed_at IS NOT NULL;

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
    THEN
        RAISE EXCEPTION 'member_offers is immutable after issue: only redeemed_at, redeemed_by_membership_id and status may change (offer %)', OLD.offer_id;
    END IF;

    IF OLD.redeemed_at IS NOT NULL AND NEW.redeemed_at IS DISTINCT FROM OLD.redeemed_at THEN
        RAISE EXCEPTION 'member_offers.redeemed_at is write-once: offer % was already redeemed at %', OLD.offer_id, OLD.redeemed_at;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS member_offers_update_only ON member_offers;
CREATE TRIGGER member_offers_update_only
    BEFORE UPDATE ON member_offers
    FOR EACH ROW EXECUTE FUNCTION public.forbid_member_offer_mutation();

-- DELETE is deliberately not granted to any client role: an offer that should
-- not have been issued is set to status 'void', never removed.

-- --------------------------------------------------------------------------
-- A3 · survey_responses — one response per member per survey program.
--      member_id is nullable so anonymous responses are possible; the
--      partial unique index only constrains identified ones.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS survey_responses (
    response_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(member_id) ON DELETE SET NULL,
    program_id UUID NOT NULL,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    offer_id UUID REFERENCES member_offers(offer_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT survey_responses_venue_program_fk
        FOREIGN KEY (venue_id, program_id)
        REFERENCES loyalty_programs(venue_id, program_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_survey_responses_program_member
    ON survey_responses(program_id, member_id) WHERE member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_survey_responses_venue_created
    ON survey_responses(venue_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_survey_responses_offer
    ON survey_responses(offer_id);

-- --------------------------------------------------------------------------
-- A4 · push_subscriptions — Web Push endpoint + keys. The endpoint is a
--      BEARER CAPABILITY: whoever holds it can push to that device. RLS on,
--      zero client grants, zero policies — service_role only, same stance as
--      reservations/waitlist PII (20260716160000 §3).
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    member_id UUID NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT,
    auth TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    CONSTRAINT push_subscriptions_venue_member_fk
        FOREIGN KEY (venue_id, member_id)
        REFERENCES members(tenant_id, member_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_venue_member
    ON push_subscriptions(venue_id, member_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_member
    ON push_subscriptions(member_id);

-- --------------------------------------------------------------------------
-- A5 · members — split birthday into month/day, add the referral edge.
--      No cross-field calendar-validity constraint by design (Feb 30 is
--      rejected in app code; the database only bounds each field).
-- --------------------------------------------------------------------------
ALTER TABLE members
    ADD COLUMN IF NOT EXISTS birthday_month SMALLINT
        CHECK (birthday_month IS NULL OR birthday_month BETWEEN 1 AND 12),
    ADD COLUMN IF NOT EXISTS birthday_day SMALLINT
        CHECK (birthday_day IS NULL OR birthday_day BETWEEN 1 AND 31),
    ADD COLUMN IF NOT EXISTS referred_by_member_id UUID
        REFERENCES members(member_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_members_referred_by
    ON members(referred_by_member_id) WHERE referred_by_member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_birthday
    ON members(tenant_id, birthday_month, birthday_day)
    WHERE birthday_month IS NOT NULL;

-- --------------------------------------------------------------------------
-- A6 · members.birthday — GUARDED DROP.
--
-- This runs against a live database with real member data. The column is only
-- dropped if it is provably empty; otherwise the migration aborts with a
-- message telling the operator exactly what to do. Real dates are never
-- silently discarded, and the birthday_month/_day split is not backfilled
-- here by guesswork.
-- --------------------------------------------------------------------------
DO $$
DECLARE v_count BIGINT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'birthday'
    ) THEN
        RAISE NOTICE 'members.birthday already dropped — nothing to do.';
        RETURN;
    END IF;

    EXECUTE 'SELECT count(*) FROM public.members WHERE birthday IS NOT NULL' INTO v_count;

    IF v_count <> 0 THEN
        RAISE EXCEPTION 'REFUSING TO DROP members.birthday: % row(s) still hold a non-null birthday. Backfill members.birthday_month/birthday_day from those rows, verify the result, then re-run this migration. No date is discarded by this migration.', v_count;
    END IF;

    EXECUTE 'ALTER TABLE public.members DROP COLUMN birthday';
    RAISE NOTICE 'members.birthday dropped (0 non-null rows asserted).';
END $$;

-- ==========================================================================
-- LANE B · COMMERCE & KITCHEN OPS
-- ==========================================================================

-- --------------------------------------------------------------------------
-- B1 · orders — tips and kitchen timestamps.
--
-- The existing total CHECK (20260714062310) is
--   total_cents = subtotal_cents + delivery_fee_cents + tax_cents
-- and must become
--   total_cents = subtotal_cents + delivery_fee_cents + tax_cents + tip_cents
--
-- tip_cents defaults to 0, so every existing row should already satisfy the
-- new formula — but "should" is not "does", so it is asserted explicitly
-- BEFORE the constraint is swapped. If any row disagreed, ADD CONSTRAINT
-- would fail anyway; the assertion turns that into a message that names the
-- number of offending rows instead of a bare constraint violation.
-- --------------------------------------------------------------------------
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS tip_cents INTEGER NOT NULL DEFAULT 0 CHECK (tip_cents >= 0),
    ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;

DO $$
DECLARE v_bad BIGINT;
BEGIN
    SELECT count(*) INTO v_bad
    FROM public.orders
    WHERE total_cents IS DISTINCT FROM
          (subtotal_cents + delivery_fee_cents + tax_cents + COALESCE(tip_cents, 0));

    IF v_bad <> 0 THEN
        RAISE EXCEPTION 'REFUSING TO REWRITE the orders total CHECK: % existing order row(s) do not satisfy total_cents = subtotal_cents + delivery_fee_cents + tax_cents + tip_cents. Reconcile those orders first — do not relax the constraint.', v_bad;
    END IF;
END $$;

-- Drop the old total CHECK by shape rather than by assumed name (it was
-- created inline, so its name is generated), then re-add it named.
--
-- The constraint is located by the SET OF COLUMNS it references, never by
-- string-matching its definition: `subtotal_cents` CONTAINS the substring
-- `total_cents`, so a LIKE '%total_cents%' filter would also match — and
-- silently drop — the unrelated `CHECK (subtotal_cents >= 0)`. Matching on
-- pg_constraint.conkey cannot make that mistake.
DO $$
DECLARE v_con TEXT;
BEGIN
    FOR v_con IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public' AND t.relname = 'orders' AND c.contype = 'c'
          AND (
              SELECT array_agg(a.attname::text)
              FROM unnest(c.conkey) AS k
              JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k
          ) @> ARRAY['total_cents', 'subtotal_cents']
    LOOP
        EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', v_con);
    END LOOP;
END $$;

ALTER TABLE orders
    ADD CONSTRAINT orders_total_cents_sum_check CHECK (
        total_cents >= 0
        AND total_cents = subtotal_cents + delivery_fee_cents + tax_cents + tip_cents
    );

-- --------------------------------------------------------------------------
-- B2 · inventory_items — the stock catalogue.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_items (
    item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unit TEXT NOT NULL CHECK (unit IN ('g', 'kg', 'ml', 'l', 'each')),
    cost_per_unit_cents INTEGER CHECK (cost_per_unit_cents IS NULL OR cost_per_unit_cents >= 0),
    par_level NUMERIC CHECK (par_level IS NULL OR par_level >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (venue_id, name)
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_venue_active
    ON inventory_items(venue_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_items_venue_item
    ON inventory_items(venue_id, item_id);

-- --------------------------------------------------------------------------
-- B3 · inventory_movements — APPEND-ONLY signed stock movements. On-hand is
--      derived (SUM(qty) per item), never stored: §4.3 "derive, don't store".
--      Trigger mirrors forbid_ledger_mutation() on points_ledger.
--
--      order_id / item_id use ON DELETE RESTRICT, matching payments.order_id
--      and redemptions.reward_id: an append-only history cannot be rewritten
--      by a parent delete, so the parent delete is refused instead.
--      membership_id uses ON DELETE SET NULL, matching
--      points_ledger.staff_membership_id — attribution may be forgotten, the
--      movement may not.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_movements (
    movement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    item_id UUID NOT NULL,
    qty NUMERIC NOT NULL,                      -- signed: receive/count +, waste/sale -
    reason TEXT NOT NULL CHECK (reason IN ('receive', 'count', 'waste', 'sale', 'adjust', 'sale_reversal')),
    order_id UUID,
    note TEXT,
    membership_id UUID REFERENCES memberships(membership_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT inventory_movements_venue_item_fk
        FOREIGN KEY (venue_id, item_id)
        REFERENCES inventory_items(venue_id, item_id) ON DELETE RESTRICT,
    -- order_id is nullable; a composite FK with MATCH SIMPLE (the default)
    -- skips the check when order_id IS NULL, so this both allows non-order
    -- movements and forbids pointing at another venue's order.
    CONSTRAINT inventory_movements_venue_order_fk
        FOREIGN KEY (venue_id, order_id)
        REFERENCES orders(venue_id, order_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_venue_created
    ON inventory_movements(venue_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_created
    ON inventory_movements(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_order
    ON inventory_movements(order_id) WHERE order_id IS NOT NULL;

-- PLAN-24: one movement row per (order, inventory item) per kind. Partial,
-- so manual movements (order_id IS NULL) are unconstrained. Paired with the
-- GROUP BY in deplete_order_stock(): an order that uses the same ingredient
-- across two lines writes ONE summed row, never two.
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_movements_order_sale
    ON inventory_movements(order_id, item_id)
    WHERE order_id IS NOT NULL AND reason = 'sale';

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_movements_order_sale_reversal
    ON inventory_movements(order_id, item_id)
    WHERE order_id IS NOT NULL AND reason = 'sale_reversal';

-- PLAN-24: depletion. Safe to call any number of times for any order — the
-- index above makes every call after the first a no-op (returns rows
-- inserted, 0 on replay). An order with no recipe links produces zero rows
-- and no error.
CREATE OR REPLACE FUNCTION public.deplete_order_stock(p_order_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_rows INTEGER := 0;
BEGIN
    INSERT INTO public.inventory_movements (
        venue_id, item_id, qty, reason, order_id, note
    )
    SELECT
        o.venue_id,
        mii.inventory_item_id,
        -SUM(mii.qty_per_unit * oi.quantity),
        'sale',
        o.order_id,
        'Auto-depleted on payment'
    FROM public.orders o
    JOIN public.order_items oi
      ON oi.order_id = o.order_id
    JOIN public.menu_item_ingredients mii
      ON mii.item_id = oi.item_id
     AND mii.venue_id = o.venue_id
    WHERE o.order_id = p_order_id
      AND o.status NOT IN ('pending', 'canceled', 'refunded')
    GROUP BY o.venue_id, o.order_id, mii.inventory_item_id
    HAVING SUM(mii.qty_per_unit * oi.quantity) > 0
    ON CONFLICT (order_id, item_id)
        WHERE order_id IS NOT NULL AND reason = 'sale'
        DO NOTHING;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RETURN v_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.deplete_order_stock(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deplete_order_stock(UUID) TO service_role;

-- PLAN-24: reversal. Negates the STORED sale rows — never re-derived from
-- the recipe, which may have changed since the sale. Append-only: the
-- original 'sale' rows are left exactly as they are.
CREATE OR REPLACE FUNCTION public.reverse_order_stock_depletion(p_order_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_rows INTEGER := 0;
BEGIN
    INSERT INTO public.inventory_movements (
        venue_id, item_id, qty, reason, order_id, note
    )
    SELECT
        m.venue_id,
        m.item_id,
        -m.qty,
        'sale_reversal',
        m.order_id,
        'Reversed on refund of order ' || LEFT(m.order_id::TEXT, 8)
    FROM public.inventory_movements m
    WHERE m.order_id = p_order_id
      AND m.reason = 'sale'
    ON CONFLICT (order_id, item_id)
        WHERE order_id IS NOT NULL AND reason = 'sale_reversal'
        DO NOTHING;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RETURN v_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.reverse_order_stock_depletion(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_order_stock_depletion(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.forbid_inventory_movement_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RAISE EXCEPTION 'inventory_movements is append-only';
END;
$$;

DROP TRIGGER IF EXISTS inventory_movements_append_only ON inventory_movements;
CREATE TRIGGER inventory_movements_append_only
    BEFORE UPDATE OR DELETE ON inventory_movements
    FOR EACH ROW EXECUTE FUNCTION public.forbid_inventory_movement_mutation();

-- --------------------------------------------------------------------------
-- B4 · menu_item_ingredients — recipe edge: how much of an inventory item a
--      menu item consumes. Both sides are venue-checked by composite FK.
--      NOTE: `item_id` is the MENU item; `inventory_item_id` is the stock
--      item (whose own PK is also called item_id).
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    item_id UUID NOT NULL,
    inventory_item_id UUID NOT NULL,
    qty_per_unit NUMERIC NOT NULL CHECK (qty_per_unit >= 0),
    UNIQUE (item_id, inventory_item_id),
    CONSTRAINT menu_item_ingredients_venue_menu_item_fk
        FOREIGN KEY (venue_id, item_id)
        REFERENCES menu_items(venue_id, item_id) ON DELETE CASCADE,
    CONSTRAINT menu_item_ingredients_venue_inventory_item_fk
        FOREIGN KEY (venue_id, inventory_item_id)
        REFERENCES inventory_items(venue_id, item_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_menu_item_ingredients_venue
    ON menu_item_ingredients(venue_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_ingredients_inventory_item
    ON menu_item_ingredients(inventory_item_id);

-- PLAN-26: 86-ing / stock-out. Recompute stock-derived availability for a
-- set of menu items. Auto-86 a short item (any linked ingredient at/below
-- zero on-hand) that isn't already 86'd; auto-restore only a row the
-- system itself 86'd, once every linked ingredient is back above zero.
-- Never touches a row that's 86'd but not auto_86ed (a manual decision
-- outranks an automatic one). Idempotent — only emits an event when a
-- row actually transitions.
CREATE OR REPLACE FUNCTION public.recompute_menu_item_stock_status(p_menu_item_ids UUID[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item RECORD;
    v_short BOOLEAN;
BEGIN
    FOR v_item IN
        SELECT item_id, venue_id, name, is_86ed, auto_86ed
        FROM menu_items
        WHERE item_id = ANY(p_menu_item_ids)
    LOOP
        SELECT EXISTS (
            SELECT 1
            FROM menu_item_ingredients mii
            LEFT JOIN (
                SELECT item_id, SUM(qty) AS on_hand
                FROM inventory_movements
                GROUP BY item_id
            ) stock ON stock.item_id = mii.inventory_item_id
            WHERE mii.item_id = v_item.item_id
              AND COALESCE(stock.on_hand, 0) <= 0
        ) INTO v_short;

        IF v_short AND NOT v_item.is_86ed THEN
            UPDATE menu_items SET is_86ed = true, auto_86ed = true
            WHERE menu_items.item_id = v_item.item_id;
            INSERT INTO events (actor, venue_id, type, payload)
            VALUES ('system', v_item.venue_id, 'menu.item_86ed',
                jsonb_build_object('item_id', v_item.item_id, 'name', v_item.name, 'auto', true));
        ELSIF NOT v_short AND v_item.auto_86ed THEN
            UPDATE menu_items SET is_86ed = false, auto_86ed = false
            WHERE menu_items.item_id = v_item.item_id;
            INSERT INTO events (actor, venue_id, type, payload)
            VALUES ('system', v_item.venue_id, 'menu.item_restored',
                jsonb_build_object('item_id', v_item.item_id, 'name', v_item.name, 'auto', true));
        END IF;
    END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_menu_item_stock_status(UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_menu_item_stock_status(UUID[]) TO service_role;

-- Every inventory_movements insert (manual waste/adjust/receive/count, or
-- the automatic 'sale'/'sale_reversal' rows PLAN-24 writes) can flip a
-- dependent menu item's availability within the same transaction.
CREATE OR REPLACE FUNCTION public.trg_menu_availability_after_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ids UUID[];
BEGIN
    SELECT COALESCE(array_agg(DISTINCT item_id), ARRAY[]::UUID[])
    INTO v_ids
    FROM menu_item_ingredients
    WHERE inventory_item_id = NEW.item_id;

    IF array_length(v_ids, 1) > 0 THEN
        PERFORM public.recompute_menu_item_stock_status(v_ids);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_menu_availability_after_movement ON inventory_movements;
CREATE TRIGGER trg_menu_availability_after_movement
AFTER INSERT ON inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.trg_menu_availability_after_movement();

REVOKE ALL ON FUNCTION public.trg_menu_availability_after_movement() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trg_menu_availability_after_movement() TO service_role;

-- Linking/unlinking a recipe ingredient can also flip availability
-- immediately, without waiting for the next unrelated movement.
CREATE OR REPLACE FUNCTION public.trg_menu_availability_after_ingredient_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.recompute_menu_item_stock_status(ARRAY[OLD.item_id]);
        RETURN OLD;
    ELSE
        PERFORM public.recompute_menu_item_stock_status(ARRAY[NEW.item_id]);
        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_menu_availability_after_ingredient_change ON menu_item_ingredients;
CREATE TRIGGER trg_menu_availability_after_ingredient_change
AFTER INSERT OR UPDATE OR DELETE ON menu_item_ingredients
FOR EACH ROW EXECUTE FUNCTION public.trg_menu_availability_after_ingredient_change();

REVOKE ALL ON FUNCTION public.trg_menu_availability_after_ingredient_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trg_menu_availability_after_ingredient_change() TO service_role;
-- PLAN-25: food costing & margin report. Read-model only — no new tables.
-- All cost/margin arithmetic lives here in Postgres NUMERIC (exact
-- decimal) math, never in JavaScript.
CREATE OR REPLACE FUNCTION public.get_food_costing_report(p_venue_id UUID)
RETURNS TABLE (
    item_id UUID,
    name TEXT,
    price_cents INTEGER,
    recipe_status TEXT,
    cost_cents INTEGER,
    margin_cents INTEGER,
    margin_pct NUMERIC,
    units_sold BIGINT,
    margin_contribution_cents BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    WITH recipe AS (
        SELECT
            mii.item_id,
            COUNT(*) FILTER (WHERE ii.cost_per_unit_cents IS NULL) AS missing_cost_count,
            SUM(mii.qty_per_unit * ii.cost_per_unit_cents) AS raw_cost
        FROM menu_item_ingredients mii
        JOIN inventory_items ii ON ii.item_id = mii.inventory_item_id
        WHERE mii.venue_id = p_venue_id
        GROUP BY mii.item_id
    ),
    -- "Sold" mirrors deplete_order_stock's own definition of a real sale
    -- (PLAN-24) — the costing report and the depletion trigger can never
    -- quietly disagree about what counts.
    sales AS (
        SELECT oi.item_id, SUM(oi.quantity) AS units_sold
        FROM order_items oi
        JOIN orders o ON o.order_id = oi.order_id
        WHERE o.venue_id = p_venue_id
          AND o.status NOT IN ('pending', 'canceled', 'refunded')
        GROUP BY oi.item_id
    )
    SELECT
        mi.item_id,
        mi.name,
        mi.price_cents,
        CASE
            WHEN r.item_id IS NULL THEN 'none'
            WHEN r.missing_cost_count > 0 THEN 'partial'
            ELSE 'complete'
        END AS recipe_status,
        CASE WHEN r.item_id IS NOT NULL AND r.missing_cost_count = 0
             THEN ROUND(r.raw_cost)::INTEGER END AS cost_cents,
        CASE WHEN r.item_id IS NOT NULL AND r.missing_cost_count = 0
             THEN mi.price_cents - ROUND(r.raw_cost)::INTEGER END AS margin_cents,
        CASE WHEN r.item_id IS NOT NULL AND r.missing_cost_count = 0 AND mi.price_cents > 0
             THEN ROUND((mi.price_cents - r.raw_cost) / mi.price_cents * 100, 1) END AS margin_pct,
        COALESCE(s.units_sold, 0) AS units_sold,
        CASE WHEN r.item_id IS NOT NULL AND r.missing_cost_count = 0
             THEN (mi.price_cents - ROUND(r.raw_cost)::INTEGER) * COALESCE(s.units_sold, 0) END
             AS margin_contribution_cents
    FROM menu_items mi
    LEFT JOIN recipe r ON r.item_id = mi.item_id
    LEFT JOIN sales s ON s.item_id = mi.item_id
    WHERE mi.venue_id = p_venue_id
    ORDER BY margin_contribution_cents DESC NULLS LAST, mi.name;
$$;

REVOKE ALL ON FUNCTION public.get_food_costing_report(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_food_costing_report(UUID) TO service_role;

-- ==========================================================================
-- LANE C · TEAM & PLATFORM
-- ==========================================================================

-- --------------------------------------------------------------------------
-- C1 · staff_shifts — clock in/out. At most ONE open shift per membership,
--      enforced by a partial unique index (the uq_points_ledger_order_award
--      pattern): a second clock-in raises 23505, which the caller treats as
--      "already clocked in" rather than an error.
--
--      membership_id keeps a plain single-column FK: memberships.venue_id is
--      NULLABLE (org-wide owners), so a composite (venue_id, membership_id)
--      FK would reject legitimate org-wide staff. Venue coherence for shifts
--      is therefore an app-layer check, and is called out here so nobody
--      assumes the database enforces it.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_shifts (
    shift_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES memberships(membership_id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    source TEXT NOT NULL DEFAULT 'counter' CHECK (source IN ('counter', 'manual')),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT staff_shifts_ended_after_started
        CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_shifts_open_per_membership
    ON staff_shifts(membership_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_staff_shifts_venue_started
    ON staff_shifts(venue_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_membership_started
    ON staff_shifts(membership_id, started_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_shifts_venue_shift
    ON staff_shifts(venue_id, shift_id);

-- --------------------------------------------------------------------------
-- C2 · tip_allocations — who gets how much of the tip pool. This is PAYROLL
--      data: RLS on, zero client grants, zero policies — service_role only,
--      same stance as push_subscriptions. Owners read it through an
--      aro-gated server route, never through the Data API.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tip_allocations (
    allocation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    shift_id UUID NOT NULL,
    membership_id UUID NOT NULL REFERENCES memberships(membership_id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    tip_cents INTEGER NOT NULL CHECK (tip_cents >= 0),
    basis TEXT NOT NULL CHECK (basis IN ('hours', 'equal', 'manual')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT tip_allocations_period_ordered CHECK (period_end >= period_start),
    CONSTRAINT tip_allocations_venue_shift_fk
        FOREIGN KEY (venue_id, shift_id)
        REFERENCES staff_shifts(venue_id, shift_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tip_allocations_venue_period
    ON tip_allocations(venue_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_tip_allocations_shift
    ON tip_allocations(shift_id);
CREATE INDEX IF NOT EXISTS idx_tip_allocations_membership
    ON tip_allocations(membership_id, period_start DESC);

-- ==========================================================================
-- SHARED · messages.channel widened to allow 'push'
--
-- PLAN-18 needs it and doing it inside this shared batch means no second
-- migration ever touches the same CHECK. The original constraint was created
-- inline (generated name), so it is located by the exact set of columns it
-- references — {channel} and nothing else — and re-added named. String
-- matching on the definition is deliberately avoided here for the same reason
-- as the orders total CHECK above.
-- ==========================================================================
DO $$
DECLARE v_con TEXT;
BEGIN
    FOR v_con IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public' AND t.relname = 'messages' AND c.contype = 'c'
          AND (
              SELECT array_agg(a.attname::text)
              FROM unnest(c.conkey) AS k
              JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k
          ) = ARRAY['channel']
    LOOP
        EXECUTE format('ALTER TABLE public.messages DROP CONSTRAINT %I', v_con);
    END LOOP;
END $$;

ALTER TABLE messages
    ADD CONSTRAINT messages_channel_check CHECK (channel IN ('sms', 'email', 'push'));

-- ==========================================================================
-- updated_at maintenance — reuse the hardened shared trigger
-- (member_offers has no updated_at: it is immutable except the redemption
-- triple, and it carries its own BEFORE UPDATE guard.)
-- ==========================================================================
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['loyalty_programs', 'inventory_items', 'staff_shifts'] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I_touch ON %I', t, t);
        EXECUTE format(
            'CREATE TRIGGER %I_touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',
            t, t
        );
    END LOOP;
END $$;

-- ==========================================================================
-- RLS, GRANTS AND POLICIES
--
-- Uniform shape for every table that gets a client grant at all:
--   read   USING (venue_id IN (SELECT private.aro_my_venue_ids())
--                 OR private.aro_is_aro_admin())
--   write  WITH CHECK (venue_id IN (SELECT private.aro_my_managed_venue_ids()))
-- Every policy tests this table's OWN venue_id column — never a parent join.
-- NO anon grant on anything in this batch.
-- ==========================================================================

ALTER TABLE loyalty_programs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_offers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shifts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tip_allocations       ENABLE ROW LEVEL SECURITY;

-- Start from zero for the browser roles (20260714075113 also revoked the
-- public-schema default privileges, but a fresh project may not have that
-- ALTER DEFAULT PRIVILEGES applied yet — restate it here, cheaply).
REVOKE ALL ON loyalty_programs, member_offers, survey_responses,
    push_subscriptions, inventory_items, inventory_movements,
    menu_item_ingredients, staff_shifts, tip_allocations
    FROM PUBLIC, anon, authenticated;

GRANT ALL ON loyalty_programs, member_offers, survey_responses,
    push_subscriptions, inventory_items, inventory_movements,
    menu_item_ingredients, staff_shifts, tip_allocations
    TO service_role;

-- --------------------------------------------------------------------------
-- Server-only tables: RLS on, ZERO client grants, ZERO policies.
--
-- push_subscriptions holds Web Push endpoints, which are bearer credentials.
-- tip_allocations holds payroll amounts. NEITHER table gets a GRANT or a
-- CREATE POLICY for anon or authenticated — not now, not "read-only for the
-- owner". They are reachable only via the service role from server routes
-- that have already run requireVenueRole / requireAroAdmin. With RLS enabled
-- and no policy, anon AND every authenticated session are denied, which is
-- what scripts/verify-live.mjs proves for both roles.
-- --------------------------------------------------------------------------

-- --------------------------------------------------------------------------
-- loyalty_programs — venue members read; owner/manager write.
-- --------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON loyalty_programs TO authenticated;

DROP POLICY IF EXISTS loyalty_programs_venue_read ON loyalty_programs;
CREATE POLICY loyalty_programs_venue_read ON loyalty_programs
    FOR SELECT TO authenticated
    USING (venue_id IN (SELECT private.aro_my_venue_ids()) OR private.aro_is_aro_admin());

DROP POLICY IF EXISTS loyalty_programs_manage_insert ON loyalty_programs;
CREATE POLICY loyalty_programs_manage_insert ON loyalty_programs
    FOR INSERT TO authenticated
    WITH CHECK (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

DROP POLICY IF EXISTS loyalty_programs_manage_update ON loyalty_programs;
CREATE POLICY loyalty_programs_manage_update ON loyalty_programs
    FOR UPDATE TO authenticated
    USING (venue_id IN (SELECT private.aro_my_managed_venue_ids()))
    WITH CHECK (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

DROP POLICY IF EXISTS loyalty_programs_manage_delete ON loyalty_programs;
CREATE POLICY loyalty_programs_manage_delete ON loyalty_programs
    FOR DELETE TO authenticated
    USING (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

-- --------------------------------------------------------------------------
-- member_offers — venue members read; owner/manager insert/update. No DELETE
-- grant and no DELETE policy: an offer is voided, never removed. Counter
-- redemption runs server-side (service role) so staff need no write grant.
-- --------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON member_offers TO authenticated;

DROP POLICY IF EXISTS member_offers_venue_read ON member_offers;
CREATE POLICY member_offers_venue_read ON member_offers
    FOR SELECT TO authenticated
    USING (venue_id IN (SELECT private.aro_my_venue_ids()) OR private.aro_is_aro_admin());

DROP POLICY IF EXISTS member_offers_manage_insert ON member_offers;
CREATE POLICY member_offers_manage_insert ON member_offers
    FOR INSERT TO authenticated
    WITH CHECK (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

DROP POLICY IF EXISTS member_offers_manage_update ON member_offers;
CREATE POLICY member_offers_manage_update ON member_offers
    FOR UPDATE TO authenticated
    USING (venue_id IN (SELECT private.aro_my_managed_venue_ids()))
    WITH CHECK (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

-- --------------------------------------------------------------------------
-- survey_responses — venue members read. Writes are server-only: responses
-- arrive from diner surfaces through a server route, so no client INSERT
-- grant/policy exists (nothing to grant means nothing to get wrong).
-- --------------------------------------------------------------------------
GRANT SELECT ON survey_responses TO authenticated;

DROP POLICY IF EXISTS survey_responses_venue_read ON survey_responses;
CREATE POLICY survey_responses_venue_read ON survey_responses
    FOR SELECT TO authenticated
    USING (venue_id IN (SELECT private.aro_my_venue_ids()) OR private.aro_is_aro_admin());

-- --------------------------------------------------------------------------
-- inventory_items — venue members read; owner/manager write.
-- --------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_items TO authenticated;

DROP POLICY IF EXISTS inventory_items_venue_read ON inventory_items;
CREATE POLICY inventory_items_venue_read ON inventory_items
    FOR SELECT TO authenticated
    USING (venue_id IN (SELECT private.aro_my_venue_ids()) OR private.aro_is_aro_admin());

DROP POLICY IF EXISTS inventory_items_manage_insert ON inventory_items;
CREATE POLICY inventory_items_manage_insert ON inventory_items
    FOR INSERT TO authenticated
    WITH CHECK (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

DROP POLICY IF EXISTS inventory_items_manage_update ON inventory_items;
CREATE POLICY inventory_items_manage_update ON inventory_items
    FOR UPDATE TO authenticated
    USING (venue_id IN (SELECT private.aro_my_managed_venue_ids()))
    WITH CHECK (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

DROP POLICY IF EXISTS inventory_items_manage_delete ON inventory_items;
CREATE POLICY inventory_items_manage_delete ON inventory_items
    FOR DELETE TO authenticated
    USING (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

-- --------------------------------------------------------------------------
-- inventory_movements — append-only: venue members read, owner/manager
-- insert. No UPDATE/DELETE grant, no UPDATE/DELETE policy, and the trigger
-- raises anyway (same triple belt as points_ledger).
-- --------------------------------------------------------------------------
GRANT SELECT, INSERT ON inventory_movements TO authenticated;

DROP POLICY IF EXISTS inventory_movements_venue_read ON inventory_movements;
CREATE POLICY inventory_movements_venue_read ON inventory_movements
    FOR SELECT TO authenticated
    USING (venue_id IN (SELECT private.aro_my_venue_ids()) OR private.aro_is_aro_admin());

DROP POLICY IF EXISTS inventory_movements_manage_insert ON inventory_movements;
CREATE POLICY inventory_movements_manage_insert ON inventory_movements
    FOR INSERT TO authenticated
    WITH CHECK (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

-- --------------------------------------------------------------------------
-- menu_item_ingredients — venue members read; owner/manager write.
-- --------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON menu_item_ingredients TO authenticated;

DROP POLICY IF EXISTS menu_item_ingredients_venue_read ON menu_item_ingredients;
CREATE POLICY menu_item_ingredients_venue_read ON menu_item_ingredients
    FOR SELECT TO authenticated
    USING (venue_id IN (SELECT private.aro_my_venue_ids()) OR private.aro_is_aro_admin());

DROP POLICY IF EXISTS menu_item_ingredients_manage_insert ON menu_item_ingredients;
CREATE POLICY menu_item_ingredients_manage_insert ON menu_item_ingredients
    FOR INSERT TO authenticated
    WITH CHECK (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

DROP POLICY IF EXISTS menu_item_ingredients_manage_update ON menu_item_ingredients;
CREATE POLICY menu_item_ingredients_manage_update ON menu_item_ingredients
    FOR UPDATE TO authenticated
    USING (venue_id IN (SELECT private.aro_my_managed_venue_ids()))
    WITH CHECK (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

DROP POLICY IF EXISTS menu_item_ingredients_manage_delete ON menu_item_ingredients;
CREATE POLICY menu_item_ingredients_manage_delete ON menu_item_ingredients
    FOR DELETE TO authenticated
    USING (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

-- --------------------------------------------------------------------------
-- staff_shifts — venue members read (a shift board is not a secret from the
-- team); owner/manager write. Counter clock-in/out runs server-side.
-- --------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON staff_shifts TO authenticated;

DROP POLICY IF EXISTS staff_shifts_venue_read ON staff_shifts;
CREATE POLICY staff_shifts_venue_read ON staff_shifts
    FOR SELECT TO authenticated
    USING (venue_id IN (SELECT private.aro_my_venue_ids()) OR private.aro_is_aro_admin());

DROP POLICY IF EXISTS staff_shifts_manage_insert ON staff_shifts;
CREATE POLICY staff_shifts_manage_insert ON staff_shifts
    FOR INSERT TO authenticated
    WITH CHECK (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

DROP POLICY IF EXISTS staff_shifts_manage_update ON staff_shifts;
CREATE POLICY staff_shifts_manage_update ON staff_shifts
    FOR UPDATE TO authenticated
    USING (venue_id IN (SELECT private.aro_my_managed_venue_ids()))
    WITH CHECK (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

DROP POLICY IF EXISTS staff_shifts_manage_delete ON staff_shifts;
CREATE POLICY staff_shifts_manage_delete ON staff_shifts
    FOR DELETE TO authenticated
    USING (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

-- --------------------------------------------------------------------------
-- members — preserve the pre-existing capability exactly. The old column
-- grant list (20260707000002 §3) included `birthday`; dropping the column
-- dropped that grant with it, so the replacement pair is granted here.
-- referred_by_member_id is deliberately NOT granted: the referral graph is a
-- server-only projection, and exposing it invites member-id enumeration.
-- --------------------------------------------------------------------------
GRANT SELECT (birthday_month, birthday_day) ON members TO authenticated;
