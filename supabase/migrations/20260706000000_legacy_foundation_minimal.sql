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
