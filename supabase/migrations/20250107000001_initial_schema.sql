-- =====================================================
-- CAFFI.PRO - INITIAL DATABASE SCHEMA
-- Multi-tenant SaaS for Coffee Shop Apps
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for security functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CUSTOM TYPES
-- =====================================================

CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'cancelled', 'suspended');
CREATE TYPE subscription_plan AS ENUM ('starter', 'pro', 'enterprise');
CREATE TYPE loyalty_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE order_type AS ENUM ('pickup', 'dine_in', 'delivery');
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount', 'free_item');
CREATE TYPE reward_type AS ENUM ('coupon', 'free_item', 'discount');
CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'cancelled');
CREATE TYPE campaign_audience AS ENUM ('all', 'tier_based', 'location_based', 'inactive_users', 'custom');

-- =====================================================
-- TABLE 1: TENANTS (Café Businesses)
-- =====================================================

CREATE TABLE tenants (
    tenant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_email TEXT UNIQUE NOT NULL,
    owner_phone TEXT,
    
    -- App branding
    app_name TEXT NOT NULL,
    bundle_id TEXT UNIQUE NOT NULL,
    app_store_url TEXT,
    play_store_url TEXT,
    pwa_url TEXT,
    
    -- Feature flags
    features_enabled JSONB DEFAULT '{
        "ordering": true,
        "loyalty": true,
        "delivery": false,
        "pwa": true,
        "coupons": true,
        "rewards": true
    }'::jsonb,
    
    -- Loyalty configuration
    loyalty_config JSONB DEFAULT '{
        "points_per_euro": 10,
        "signup_bonus": 50,
        "tiers": [
            {"name": "bronze", "threshold": 0, "discount": 0},
            {"name": "silver", "threshold": 500, "discount": 5},
            {"name": "gold", "threshold": 1500, "discount": 10},
            {"name": "platinum", "threshold": 5000, "discount": 15}
        ]
    }'::jsonb,
    
    -- Subscription info
    subscription_status subscription_status DEFAULT 'trial',
    subscription_plan subscription_plan DEFAULT 'starter',
    trial_ends_at TIMESTAMPTZ,
    
    -- Localization
    timezone TEXT DEFAULT 'Europe/Paris',
    currency TEXT DEFAULT 'EUR',
    language TEXT DEFAULT 'fr',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE 2: TENANT_MANIFESTS (Design Tokens)
-- =====================================================

CREATE TABLE tenant_manifests (
    manifest_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID UNIQUE NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    
    -- Design tokens (colors, typography, spacing, etc.)
    design_tokens JSONB DEFAULT '{
        "colors": {
            "primary": "#2D5F5D",
            "secondary": "#F4A259",
            "accent": "#E07A5F",
            "background": "#FFFFFF",
            "surface": "#F8F9FA",
            "error": "#DC3545",
            "success": "#28A745",
            "text_primary": "#212529",
            "text_secondary": "#6C757D"
        },
        "typography": {
            "font_family": "Inter",
            "heading_font": "Poppins",
            "font_size_base": 16,
            "font_size_heading": 24,
            "font_weight_regular": 400,
            "font_weight_bold": 700
        },
        "spacing": {
            "xs": 4,
            "sm": 8,
            "md": 16,
            "lg": 24,
            "xl": 32
        },
        "border_radius": {
            "sm": 4,
            "md": 8,
            "lg": 16,
            "full": 9999
        }
    }'::jsonb,
    
    -- Brand assets
    logo_url TEXT,
    app_icon_url TEXT,
    splash_screen_url TEXT,
    
    -- Figma integration
    figma_file_key TEXT,
    figma_last_synced TIMESTAMPTZ,
    
    -- Versioning
    skin_version TEXT DEFAULT '1.0.0',
    slot_mappings JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE 3: USERS (Customers)
-- =====================================================

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    auth_id UUID UNIQUE, -- Links to auth.users
    
    -- Contact info
    phone TEXT,
    email TEXT,
    full_name TEXT,
    profile_image_url TEXT,
    
    -- Loyalty
    loyalty_points INTEGER DEFAULT 0,
    loyalty_tier loyalty_tier DEFAULT 'bronze',
    lifetime_points INTEGER DEFAULT 0,
    
    -- Stats
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    last_order_at TIMESTAMPTZ,
    
    -- Push notifications
    fcm_token TEXT,
    notifications_enabled BOOLEAN DEFAULT true,
    
    -- Preferences
    preferred_location_id UUID,
    favorite_items UUID[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_tenant_phone UNIQUE(tenant_id, phone)
);

-- =====================================================
-- TABLE 4: LOCATIONS (Physical Café Locations)
-- =====================================================

CREATE TABLE locations (
    location_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    
    -- Basic info
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'France',
    
    -- Geolocation
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Contact
    phone TEXT,
    email TEXT,
    
    -- Hours
    hours JSONB DEFAULT '{
        "monday": "07:00-19:00",
        "tuesday": "07:00-19:00",
        "wednesday": "07:00-19:00",
        "thursday": "07:00-19:00",
        "friday": "07:00-19:00",
        "saturday": "08:00-20:00",
        "sunday": "08:00-18:00"
    }'::jsonb,
    special_hours JSONB DEFAULT '[]'::jsonb, -- [{date: "2025-12-25", status: "closed"}]
    
    -- Settings
    accepts_mobile_orders BOOLEAN DEFAULT true,
    accepts_dine_in_orders BOOLEAN DEFAULT true,
    estimated_prep_time INTEGER DEFAULT 15, -- minutes
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE 5: CATEGORIES (Menu Categories)
-- =====================================================

CREATE TABLE categories (
    category_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    icon_name TEXT, -- Icon name for UI
    
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE 6: MENU_ITEMS (Products)
-- =====================================================

CREATE TABLE menu_items (
    item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,
    
    -- Basic info
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    
    -- Modifiers (sizes, add-ons)
    modifiers JSONB DEFAULT '{
        "sizes": [],
        "addons": []
    }'::jsonb,
    
    -- Tags and dietary info
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    calories INTEGER,
    allergens TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Availability
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    available_at_locations UUID[] DEFAULT ARRAY[]::UUID[],
    
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE 7: ORDERS (Customer Orders)
-- =====================================================

CREATE TABLE orders (
    order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
    
    order_number TEXT NOT NULL, -- "#1234"
    status order_status DEFAULT 'pending',
    
    -- Pricing
    subtotal DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    tip DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    
    -- Payment
    payment_method TEXT, -- 'card', 'apple_pay', 'google_pay', 'cash'
    payment_status payment_status DEFAULT 'pending',
    payment_intent_id TEXT, -- Stripe
    
    -- Order details
    order_type order_type DEFAULT 'pickup',
    special_instructions TEXT,
    
    -- Timing
    scheduled_for TIMESTAMPTZ,
    estimated_ready_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    -- Loyalty & Coupons
    points_earned INTEGER DEFAULT 0,
    coupon_code_used TEXT,
    
    -- Metadata
    source TEXT DEFAULT 'mobile_app', -- 'mobile_app', 'pwa', 'dashboard'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_order_number UNIQUE(tenant_id, order_number)
);

-- =====================================================
-- TABLE 8: ORDER_ITEMS (Items within Orders)
-- =====================================================

CREATE TABLE order_items (
    order_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    item_id UUID REFERENCES menu_items(item_id) ON DELETE SET NULL,
    
    -- Snapshot (in case item is deleted)
    item_name TEXT NOT NULL,
    item_image_url TEXT,
    
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    modifiers_selected JSONB DEFAULT '{}'::jsonb,
    subtotal DECIMAL(10,2) NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE 9: LOYALTY_TRANSACTIONS (Point History)
-- =====================================================

CREATE TABLE loyalty_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(order_id) ON DELETE SET NULL,
    
    points_change INTEGER NOT NULL, -- Positive = earned, negative = spent
    balance_after INTEGER NOT NULL,
    reason TEXT NOT NULL, -- 'order', 'signup_bonus', 'reward_redemption', 'manual_adjustment'
    description TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE 10: REWARDS_CATALOG (Redeemable Rewards)
-- =====================================================

CREATE TABLE rewards_catalog (
    reward_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL,
    image_url TEXT,
    
    reward_type reward_type NOT NULL,
    reward_value JSONB, -- Details depend on type
    
    is_active BOOLEAN DEFAULT true,
    stock_limit INTEGER, -- NULL = unlimited
    stock_remaining INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE 11: COUPONS (Discount Codes)
-- =====================================================

CREATE TABLE coupons (
    coupon_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    
    code TEXT NOT NULL,
    discount_type discount_type NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    
    max_uses INTEGER, -- NULL = unlimited
    current_uses INTEGER DEFAULT 0,
    
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_coupon_code UNIQUE(tenant_id, code)
);

-- =====================================================
-- TABLE 12: COUPON_USAGE (Redemption Tracking)
-- =====================================================

CREATE TABLE coupon_usage (
    usage_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES coupons(coupon_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    
    discount_applied DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE 13: PUSH_CAMPAIGNS (Marketing Notifications)
-- =====================================================

CREATE TABLE push_campaigns (
    campaign_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    image_url TEXT,
    deep_link TEXT, -- e.g., '/menu/coffee'
    
    -- Targeting
    audience campaign_audience DEFAULT 'all',
    audience_filter JSONB DEFAULT '{}'::jsonb,
    
    -- Scheduling
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    
    -- Analytics
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    
    status campaign_status DEFAULT 'draft',
    created_by UUID, -- Reference to admin user
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Tenant ID indexes (critical for multi-tenancy)
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_locations_tenant_id ON locations(tenant_id);
CREATE INDEX idx_categories_tenant_id ON categories(tenant_id);
CREATE INDEX idx_menu_items_tenant_id ON menu_items(tenant_id);
CREATE INDEX idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX idx_loyalty_transactions_tenant_id ON loyalty_transactions(tenant_id);
CREATE INDEX idx_rewards_catalog_tenant_id ON rewards_catalog(tenant_id);
CREATE INDEX idx_coupons_tenant_id ON coupons(tenant_id);
CREATE INDEX idx_push_campaigns_tenant_id ON push_campaigns(tenant_id);

-- Foreign key indexes
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_location_id ON orders(location_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_loyalty_transactions_user_id ON loyalty_transactions(user_id);

-- Status and date indexes (for filtering and sorting)
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status);
CREATE INDEX idx_orders_tenant_created ON orders(tenant_id, created_at DESC);
CREATE INDEX idx_menu_items_active ON menu_items(is_active);
CREATE INDEX idx_locations_active ON locations(is_active);

-- Search indexes
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_owner_email ON tenants(owner_email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_coupons_code ON coupons(tenant_id, code);

-- =====================================================
-- AUTO-UPDATE TIMESTAMPS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_manifests_updated_at BEFORE UPDATE ON tenant_manifests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rewards_catalog_updated_at BEFORE UPDATE ON rewards_catalog
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL DATA VALIDATION
-- =====================================================

-- Ensure email format
ALTER TABLE tenants ADD CONSTRAINT tenants_owner_email_check 
    CHECK (owner_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Ensure positive values
ALTER TABLE menu_items ADD CONSTRAINT menu_items_price_positive 
    CHECK (price >= 0);

ALTER TABLE orders ADD CONSTRAINT orders_totals_positive 
    CHECK (subtotal >= 0 AND tax >= 0 AND total >= 0);

ALTER TABLE users ADD CONSTRAINT users_points_positive 
    CHECK (loyalty_points >= 0 AND lifetime_points >= 0);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE tenants IS 'Café businesses using the platform';
COMMENT ON TABLE tenant_manifests IS 'Design tokens and branding for white-label apps';
COMMENT ON TABLE users IS 'End customers of cafés';
COMMENT ON TABLE locations IS 'Physical café locations';
COMMENT ON TABLE categories IS 'Menu categories (Coffee, Tea, Pastries, etc.)';
COMMENT ON TABLE menu_items IS 'Products available for order';
COMMENT ON TABLE orders IS 'Customer orders';
COMMENT ON TABLE order_items IS 'Line items within orders';
COMMENT ON TABLE loyalty_transactions IS 'Point earning and spending history';
COMMENT ON TABLE rewards_catalog IS 'Redeemable loyalty rewards';
COMMENT ON TABLE coupons IS 'Discount codes';
COMMENT ON TABLE coupon_usage IS 'Coupon redemption tracking';
COMMENT ON TABLE push_campaigns IS 'Marketing push notifications';
