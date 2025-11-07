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
-- =====================================================
-- CAFFI.PRO - ROW-LEVEL SECURITY (RLS) POLICIES
-- Multi-tenant data isolation
-- =====================================================

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_campaigns ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTION: Get tenant_id from JWT
-- =====================================================

CREATE OR REPLACE FUNCTION auth.user_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('request.jwt.claims', true)::json->>'tenant_id', '')::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if user is super admin
CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (current_setting('request.jwt.claims', true)::json->>'role') = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if user is authenticated
CREATE OR REPLACE FUNCTION auth.is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TENANTS TABLE POLICIES
-- =====================================================

-- Super admin can view all tenants
CREATE POLICY "Super admin can view all tenants"
    ON tenants FOR SELECT
    USING (auth.is_super_admin());

-- Super admin can insert tenants
CREATE POLICY "Super admin can insert tenants"
    ON tenants FOR INSERT
    WITH CHECK (auth.is_super_admin());

-- Super admin can update tenants
CREATE POLICY "Super admin can update tenants"
    ON tenants FOR UPDATE
    USING (auth.is_super_admin());

-- Tenant owners can view their own tenant
CREATE POLICY "Tenant owners can view their own tenant"
    ON tenants FOR SELECT
    USING (tenant_id = auth.user_tenant_id());

-- Tenant owners can update their own tenant
CREATE POLICY "Tenant owners can update their own tenant"
    ON tenants FOR UPDATE
    USING (tenant_id = auth.user_tenant_id());

-- =====================================================
-- TENANT_MANIFESTS TABLE POLICIES
-- =====================================================

-- Super admin can manage all manifests
CREATE POLICY "Super admin can manage all manifests"
    ON tenant_manifests FOR ALL
    USING (auth.is_super_admin());

-- Tenant can view their own manifest
CREATE POLICY "Tenant can view their own manifest"
    ON tenant_manifests FOR SELECT
    USING (tenant_id = auth.user_tenant_id());

-- Tenant can update their own manifest
CREATE POLICY "Tenant can update their own manifest"
    ON tenant_manifests FOR UPDATE
    USING (tenant_id = auth.user_tenant_id());

-- =====================================================
-- USERS TABLE POLICIES (Customers)
-- =====================================================

-- Super admin can view all users
CREATE POLICY "Super admin can view all users"
    ON users FOR SELECT
    USING (auth.is_super_admin());

-- Tenant can view their own users
CREATE POLICY "Tenant can view their own users"
    ON users FOR SELECT
    USING (tenant_id = auth.user_tenant_id());

-- Tenant can insert users
CREATE POLICY "Tenant can insert users"
    ON users FOR INSERT
    WITH CHECK (tenant_id = auth.user_tenant_id());

-- Tenant can update their own users
CREATE POLICY "Tenant can update their own users"
    ON users FOR UPDATE
    USING (tenant_id = auth.user_tenant_id());

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (auth_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE
    USING (auth_id = auth.uid());

-- =====================================================
-- LOCATIONS TABLE POLICIES
-- =====================================================

-- Super admin can manage all locations
CREATE POLICY "Super admin can manage all locations"
    ON locations FOR ALL
    USING (auth.is_super_admin());

-- Tenant can manage their own locations
CREATE POLICY "Tenant can manage their own locations"
    ON locations FOR ALL
    USING (tenant_id = auth.user_tenant_id());

-- Public can view active locations (for mobile app)
CREATE POLICY "Public can view active locations"
    ON locations FOR SELECT
    USING (is_active = true);

-- =====================================================
-- CATEGORIES TABLE POLICIES
-- =====================================================

-- Super admin can manage all categories
CREATE POLICY "Super admin can manage all categories"
    ON categories FOR ALL
    USING (auth.is_super_admin());

-- Tenant can manage their own categories
CREATE POLICY "Tenant can manage their own categories"
    ON categories FOR ALL
    USING (tenant_id = auth.user_tenant_id());

-- Public can view active categories
CREATE POLICY "Public can view active categories"
    ON categories FOR SELECT
    USING (is_active = true);

-- =====================================================
-- MENU_ITEMS TABLE POLICIES
-- =====================================================

-- Super admin can manage all menu items
CREATE POLICY "Super admin can manage all menu items"
    ON menu_items FOR ALL
    USING (auth.is_super_admin());

-- Tenant can manage their own menu items
CREATE POLICY "Tenant can manage their own menu items"
    ON menu_items FOR ALL
    USING (tenant_id = auth.user_tenant_id());

-- Public can view available menu items
CREATE POLICY "Public can view available menu items"
    ON menu_items FOR SELECT
    USING (is_available = true);

-- =====================================================
-- ORDERS TABLE POLICIES
-- =====================================================

-- Super admin can view all orders
CREATE POLICY "Super admin can view all orders"
    ON orders FOR SELECT
    USING (auth.is_super_admin());

-- Tenant can view their own orders
CREATE POLICY "Tenant can view their own orders"
    ON orders FOR SELECT
    USING (tenant_id = auth.user_tenant_id());

-- Tenant can update their own orders
CREATE POLICY "Tenant can update their own orders"
    ON orders FOR UPDATE
    USING (tenant_id = auth.user_tenant_id());

-- Users can view their own orders
CREATE POLICY "Users can view their own orders"
    ON orders FOR SELECT
    USING (user_id IN (SELECT user_id FROM users WHERE auth_id = auth.uid()));

-- Users can insert orders
CREATE POLICY "Users can insert orders"
    ON orders FOR INSERT
    WITH CHECK (user_id IN (SELECT user_id FROM users WHERE auth_id = auth.uid()));

-- Users can update their own pending orders
CREATE POLICY "Users can update their own pending orders"
    ON orders FOR UPDATE
    USING (
        user_id IN (SELECT user_id FROM users WHERE auth_id = auth.uid())
        AND status = 'pending'
    );

-- =====================================================
-- ORDER_ITEMS TABLE POLICIES
-- =====================================================

-- Order items inherit permissions from orders
CREATE POLICY "Can view order items if can view order"
    ON order_items FOR SELECT
    USING (
        order_id IN (
            SELECT order_id FROM orders 
            WHERE tenant_id = auth.user_tenant_id()
            OR user_id IN (SELECT user_id FROM users WHERE auth_id = auth.uid())
            OR auth.is_super_admin()
        )
    );

CREATE POLICY "Can insert order items with order"
    ON order_items FOR INSERT
    WITH CHECK (
        order_id IN (
            SELECT order_id FROM orders 
            WHERE user_id IN (SELECT user_id FROM users WHERE auth_id = auth.uid())
        )
    );

-- =====================================================
-- LOYALTY_TRANSACTIONS TABLE POLICIES
-- =====================================================

-- Super admin can view all transactions
CREATE POLICY "Super admin can view all transactions"
    ON loyalty_transactions FOR SELECT
    USING (auth.is_super_admin());

-- Tenant can view their own transactions
CREATE POLICY "Tenant can view their own transactions"
    ON loyalty_transactions FOR SELECT
    USING (tenant_id = auth.user_tenant_id());

-- Tenant can insert transactions
CREATE POLICY "Tenant can insert transactions"
    ON loyalty_transactions FOR INSERT
    WITH CHECK (tenant_id = auth.user_tenant_id());

-- Users can view their own transactions
CREATE POLICY "Users can view their own transactions"
    ON loyalty_transactions FOR SELECT
    USING (user_id IN (SELECT user_id FROM users WHERE auth_id = auth.uid()));

-- =====================================================
-- REWARDS_CATALOG TABLE POLICIES
-- =====================================================

-- Super admin can manage all rewards
CREATE POLICY "Super admin can manage all rewards"
    ON rewards_catalog FOR ALL
    USING (auth.is_super_admin());

-- Tenant can manage their own rewards
CREATE POLICY "Tenant can manage their own rewards"
    ON rewards_catalog FOR ALL
    USING (tenant_id = auth.user_tenant_id());

-- Public can view active rewards
CREATE POLICY "Public can view active rewards"
    ON rewards_catalog FOR SELECT
    USING (is_active = true);

-- =====================================================
-- COUPONS TABLE POLICIES
-- =====================================================

-- Super admin can manage all coupons
CREATE POLICY "Super admin can manage all coupons"
    ON coupons FOR ALL
    USING (auth.is_super_admin());

-- Tenant can manage their own coupons
CREATE POLICY "Tenant can manage their own coupons"
    ON coupons FOR ALL
    USING (tenant_id = auth.user_tenant_id());

-- Authenticated users can view active coupons (for validation)
CREATE POLICY "Users can view active coupons"
    ON coupons FOR SELECT
    USING (is_active = true AND auth.is_authenticated());

-- =====================================================
-- COUPON_USAGE TABLE POLICIES
-- =====================================================

-- Super admin can view all usage
CREATE POLICY "Super admin can view all usage"
    ON coupon_usage FOR SELECT
    USING (auth.is_super_admin());

-- Tenant can view usage for their coupons
CREATE POLICY "Tenant can view their coupon usage"
    ON coupon_usage FOR SELECT
    USING (
        coupon_id IN (
            SELECT coupon_id FROM coupons WHERE tenant_id = auth.user_tenant_id()
        )
    );

-- System can insert coupon usage
CREATE POLICY "System can insert coupon usage"
    ON coupon_usage FOR INSERT
    WITH CHECK (auth.is_authenticated());

-- Users can view their own usage
CREATE POLICY "Users can view their own usage"
    ON coupon_usage FOR SELECT
    USING (user_id IN (SELECT user_id FROM users WHERE auth_id = auth.uid()));

-- =====================================================
-- PUSH_CAMPAIGNS TABLE POLICIES
-- =====================================================

-- Super admin can manage all campaigns
CREATE POLICY "Super admin can manage all campaigns"
    ON push_campaigns FOR ALL
    USING (auth.is_super_admin());

-- Tenant can manage their own campaigns
CREATE POLICY "Tenant can manage their own campaigns"
    ON push_campaigns FOR ALL
    USING (tenant_id = auth.user_tenant_id());

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant table permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant sequence permissions
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON POLICY "Super admin can view all tenants" ON tenants IS 
    'Super admins (Caffi.pro team) can view all café tenants';

COMMENT ON POLICY "Tenant owners can view their own tenant" ON tenants IS 
    'Café owners can view their own business information';

COMMENT ON FUNCTION auth.user_tenant_id() IS 
    'Extracts tenant_id from JWT claims for RLS filtering';

COMMENT ON FUNCTION auth.is_super_admin() IS 
    'Checks if current user has super_admin role';
-- =====================================================
-- CAFFI.PRO - DATABASE FUNCTIONS
-- Business logic and automation
-- =====================================================

-- =====================================================
-- FUNCTION: Generate unique order number
-- =====================================================

CREATE OR REPLACE FUNCTION generate_order_number(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_count INTEGER;
    v_order_number TEXT;
BEGIN
    -- Get count of orders for this tenant today
    SELECT COUNT(*) INTO v_count
    FROM orders
    WHERE tenant_id = p_tenant_id
    AND DATE(created_at) = CURRENT_DATE;
    
    -- Generate order number: #YYYYMMDD-XXXX
    v_order_number := '#' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD((v_count + 1)::TEXT, 4, '0');
    
    RETURN v_order_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order number
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := generate_order_number(NEW.tenant_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_number();

-- =====================================================
-- FUNCTION: Calculate loyalty points for order
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_loyalty_points(
    p_order_total DECIMAL,
    p_tenant_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_points_per_euro INTEGER;
    v_points INTEGER;
BEGIN
    -- Get tenant's loyalty configuration
    SELECT (loyalty_config->>'points_per_euro')::INTEGER INTO v_points_per_euro
    FROM tenants
    WHERE tenant_id = p_tenant_id;
    
    -- Default to 10 points per euro if not set
    v_points_per_euro := COALESCE(v_points_per_euro, 10);
    
    -- Calculate points (rounded down)
    v_points := FLOOR(p_order_total * v_points_per_euro);
    
    RETURN v_points;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Calculate user's loyalty tier
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_loyalty_tier(
    p_lifetime_points INTEGER,
    p_tenant_id UUID
)
RETURNS loyalty_tier AS $$
DECLARE
    v_tiers JSONB;
    v_tier TEXT := 'bronze';
    v_tier_obj JSONB;
BEGIN
    -- Get tenant's tier configuration
    SELECT loyalty_config->'tiers' INTO v_tiers
    FROM tenants
    WHERE tenant_id = p_tenant_id;
    
    -- Loop through tiers (ordered by threshold descending)
    FOR v_tier_obj IN 
        SELECT * FROM jsonb_array_elements(v_tiers)
        ORDER BY (value->>'threshold')::INTEGER DESC
    LOOP
        IF p_lifetime_points >= (v_tier_obj->>'threshold')::INTEGER THEN
            v_tier := v_tier_obj->>'name';
            EXIT;
        END IF;
    END LOOP;
    
    RETURN v_tier::loyalty_tier;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Update user loyalty (trigger on transaction)
-- =====================================================

CREATE OR REPLACE FUNCTION update_user_loyalty()
RETURNS TRIGGER AS $$
DECLARE
    v_new_tier loyalty_tier;
BEGIN
    -- Update user's current points and lifetime points
    UPDATE users
    SET 
        loyalty_points = NEW.balance_after,
        lifetime_points = CASE 
            WHEN NEW.points_change > 0 THEN lifetime_points + NEW.points_change
            ELSE lifetime_points
        END,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    -- Calculate and update tier if points were earned
    IF NEW.points_change > 0 THEN
        SELECT calculate_loyalty_tier(
            (SELECT lifetime_points FROM users WHERE user_id = NEW.user_id),
            NEW.tenant_id
        ) INTO v_new_tier;
        
        UPDATE users
        SET loyalty_tier = v_new_tier
        WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_loyalty
    AFTER INSERT ON loyalty_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_loyalty();

-- =====================================================
-- FUNCTION: Update order statistics
-- =====================================================

CREATE OR REPLACE FUNCTION update_order_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- When order is completed, update user stats
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        UPDATE users
        SET 
            total_orders = total_orders + 1,
            total_spent = total_spent + NEW.total,
            last_order_at = NOW(),
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_stats
    AFTER INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_order_stats();

-- =====================================================
-- FUNCTION: Award loyalty points for completed order
-- =====================================================

CREATE OR REPLACE FUNCTION award_order_loyalty_points()
RETURNS TRIGGER AS $$
DECLARE
    v_points INTEGER;
    v_current_balance INTEGER;
BEGIN
    -- Only award points when order is completed
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Calculate points
        v_points := calculate_loyalty_points(NEW.total, NEW.tenant_id);
        
        -- Get current balance
        SELECT loyalty_points INTO v_current_balance
        FROM users
        WHERE user_id = NEW.user_id;
        
        -- Create loyalty transaction
        INSERT INTO loyalty_transactions (
            tenant_id,
            user_id,
            order_id,
            points_change,
            balance_after,
            reason,
            description
        ) VALUES (
            NEW.tenant_id,
            NEW.user_id,
            NEW.order_id,
            v_points,
            v_current_balance + v_points,
            'order',
            'Points earned from order ' || NEW.order_number
        );
        
        -- Update order with points earned
        UPDATE orders
        SET points_earned = v_points
        WHERE order_id = NEW.order_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_award_order_loyalty_points
    AFTER INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION award_order_loyalty_points();

-- =====================================================
-- FUNCTION: Award signup bonus
-- =====================================================

CREATE OR REPLACE FUNCTION award_signup_bonus()
RETURNS TRIGGER AS $$
DECLARE
    v_signup_bonus INTEGER;
BEGIN
    -- Get tenant's signup bonus
    SELECT (loyalty_config->>'signup_bonus')::INTEGER INTO v_signup_bonus
    FROM tenants
    WHERE tenant_id = NEW.tenant_id;
    
    -- Award signup bonus if configured
    IF v_signup_bonus IS NOT NULL AND v_signup_bonus > 0 THEN
        INSERT INTO loyalty_transactions (
            tenant_id,
            user_id,
            points_change,
            balance_after,
            reason,
            description
        ) VALUES (
            NEW.tenant_id,
            NEW.user_id,
            v_signup_bonus,
            v_signup_bonus,
            'signup_bonus',
            'Welcome bonus for joining!'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_award_signup_bonus
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION award_signup_bonus();

-- =====================================================
-- FUNCTION: Increment coupon usage
-- =====================================================

CREATE OR REPLACE FUNCTION increment_coupon_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE coupons
    SET current_uses = current_uses + 1
    WHERE coupon_id = NEW.coupon_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_coupon_usage
    AFTER INSERT ON coupon_usage
    FOR EACH ROW
    EXECUTE FUNCTION increment_coupon_usage();

-- =====================================================
-- FUNCTION: Validate coupon
-- =====================================================

CREATE OR REPLACE FUNCTION validate_coupon(
    p_tenant_id UUID,
    p_code TEXT,
    p_order_total DECIMAL,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
    valid BOOLEAN,
    discount_amount DECIMAL,
    error_message TEXT,
    coupon_id UUID,
    discount_type discount_type,
    discount_value DECIMAL
) AS $$
DECLARE
    v_coupon RECORD;
BEGIN
    -- Find coupon
    SELECT * INTO v_coupon
    FROM coupons
    WHERE tenant_id = p_tenant_id
    AND code = p_code;
    
    -- Coupon not found
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'Coupon code not found', NULL::UUID, NULL::discount_type, NULL::DECIMAL;
        RETURN;
    END IF;
    
    -- Check if active
    IF NOT v_coupon.is_active THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'This coupon is no longer active', NULL::UUID, NULL::discount_type, NULL::DECIMAL;
        RETURN;
    END IF;
    
    -- Check date validity
    IF v_coupon.valid_from > NOW() THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'This coupon is not yet valid', NULL::UUID, NULL::discount_type, NULL::DECIMAL;
        RETURN;
    END IF;
    
    IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW() THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'This coupon has expired', NULL::UUID, NULL::discount_type, NULL::DECIMAL;
        RETURN;
    END IF;
    
    -- Check usage limit
    IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'This coupon has reached its usage limit', NULL::UUID, NULL::discount_type, NULL::DECIMAL;
        RETURN;
    END IF;
    
    -- Check minimum order amount
    IF p_order_total < v_coupon.min_order_amount THEN
        RETURN QUERY SELECT 
            false, 
            0::DECIMAL, 
            'Minimum order amount of ' || v_coupon.min_order_amount || ' required',
            NULL::UUID,
            NULL::discount_type,
            NULL::DECIMAL;
        RETURN;
    END IF;
    
    -- Calculate discount
    DECLARE
        v_discount DECIMAL;
    BEGIN
        CASE v_coupon.discount_type
            WHEN 'percentage' THEN
                v_discount := p_order_total * (v_coupon.discount_value / 100);
            WHEN 'fixed_amount' THEN
                v_discount := LEAST(v_coupon.discount_value, p_order_total);
            ELSE
                v_discount := 0;
        END CASE;
        
        -- Return valid coupon
        RETURN QUERY SELECT 
            true,
            v_discount,
            NULL::TEXT,
            v_coupon.coupon_id,
            v_coupon.discount_type,
            v_coupon.discount_value;
    END;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Get sales analytics
-- =====================================================

CREATE OR REPLACE FUNCTION get_sales_analytics(
    p_tenant_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    WITH stats AS (
        SELECT
            COUNT(*) as total_orders,
            COUNT(DISTINCT user_id) as unique_customers,
            SUM(total) as total_revenue,
            AVG(total) as average_order_value,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
            SUM(points_earned) as total_points_awarded
        FROM orders
        WHERE tenant_id = p_tenant_id
        AND created_at BETWEEN p_start_date AND p_end_date
    ),
    daily_revenue AS (
        SELECT
            DATE(created_at) as date,
            SUM(total) as revenue,
            COUNT(*) as orders
        FROM orders
        WHERE tenant_id = p_tenant_id
        AND created_at BETWEEN p_start_date AND p_end_date
        AND status = 'completed'
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
    ),
    top_items AS (
        SELECT
            mi.name,
            mi.image_url,
            SUM(oi.quantity) as total_quantity,
            SUM(oi.subtotal) as total_revenue
        FROM order_items oi
        JOIN orders o ON o.order_id = oi.order_id
        LEFT JOIN menu_items mi ON mi.item_id = oi.item_id
        WHERE o.tenant_id = p_tenant_id
        AND o.created_at BETWEEN p_start_date AND p_end_date
        AND o.status = 'completed'
        GROUP BY mi.item_id, mi.name, mi.image_url
        ORDER BY total_quantity DESC
        LIMIT 10
    )
    SELECT json_build_object(
        'summary', (SELECT row_to_json(s) FROM stats s),
        'daily_revenue', (SELECT json_agg(d) FROM daily_revenue d),
        'top_items', (SELECT json_agg(t) FROM top_items t)
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Get customer analytics
-- =====================================================

CREATE OR REPLACE FUNCTION get_customer_analytics(
    p_tenant_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    WITH new_customers AS (
        SELECT COUNT(*) as count
        FROM users
        WHERE tenant_id = p_tenant_id
        AND created_at BETWEEN p_start_date AND p_end_date
    ),
    active_customers AS (
        SELECT COUNT(DISTINCT user_id) as count
        FROM orders
        WHERE tenant_id = p_tenant_id
        AND created_at BETWEEN p_start_date AND p_end_date
    ),
    tier_distribution AS (
        SELECT
            loyalty_tier,
            COUNT(*) as count
        FROM users
        WHERE tenant_id = p_tenant_id
        GROUP BY loyalty_tier
    ),
    top_customers AS (
        SELECT
            u.full_name,
            u.email,
            u.loyalty_tier,
            u.total_orders,
            u.total_spent,
            u.loyalty_points
        FROM users u
        WHERE u.tenant_id = p_tenant_id
        ORDER BY u.total_spent DESC
        LIMIT 20
    )
    SELECT json_build_object(
        'new_customers', (SELECT count FROM new_customers),
        'active_customers', (SELECT count FROM active_customers),
        'tier_distribution', (SELECT json_agg(td) FROM tier_distribution td),
        'top_customers', (SELECT json_agg(tc) FROM top_customers tc)
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Get loyalty analytics
-- =====================================================

CREATE OR REPLACE FUNCTION get_loyalty_analytics(
    p_tenant_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    WITH points_summary AS (
        SELECT
            SUM(CASE WHEN points_change > 0 THEN points_change ELSE 0 END) as total_earned,
            SUM(CASE WHEN points_change < 0 THEN ABS(points_change) ELSE 0 END) as total_redeemed,
            COUNT(DISTINCT user_id) as active_users
        FROM loyalty_transactions
        WHERE tenant_id = p_tenant_id
        AND created_at BETWEEN p_start_date AND p_end_date
    ),
    redemption_reasons AS (
        SELECT
            reason,
            COUNT(*) as count,
            SUM(ABS(points_change)) as points
        FROM loyalty_transactions
        WHERE tenant_id = p_tenant_id
        AND created_at BETWEEN p_start_date AND p_end_date
        AND points_change < 0
        GROUP BY reason
    )
    SELECT json_build_object(
        'summary', (SELECT row_to_json(ps) FROM points_summary ps),
        'redemption_reasons', (SELECT json_agg(rr) FROM redemption_reasons rr)
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION generate_order_number IS 
    'Generates unique order number in format #YYYYMMDD-XXXX';

COMMENT ON FUNCTION calculate_loyalty_points IS 
    'Calculates loyalty points based on order total and tenant config';

COMMENT ON FUNCTION calculate_loyalty_tier IS 
    'Determines loyalty tier based on lifetime points';

COMMENT ON FUNCTION validate_coupon IS 
    'Validates coupon code and calculates discount';

COMMENT ON FUNCTION get_sales_analytics IS 
    'Returns comprehensive sales analytics for date range';

COMMENT ON FUNCTION get_customer_analytics IS 
    'Returns customer analytics including new customers, tiers, and top spenders';

COMMENT ON FUNCTION get_loyalty_analytics IS 
    'Returns loyalty program analytics including points earned and redeemed';
-- =====================================================
-- CAFFI.PRO - AUTHENTICATION SETUP
-- Custom JWT claims and auth hooks
-- =====================================================

-- =====================================================
-- FUNCTION: Custom access token hook
-- Adds tenant_id and role to JWT claims
-- =====================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    claims jsonb;
    user_tenant_id uuid;
    user_role text;
    user_metadata jsonb;
BEGIN
    -- Get the user's metadata
    user_metadata := event->'claims'->'app_metadata';
    
    -- Extract existing claims
    claims := event->'claims';
    
    -- Check if user is super admin (set in app_metadata)
    user_role := user_metadata->>'role';
    
    IF user_role = 'super_admin' THEN
        -- Super admin doesn't need tenant_id
        claims := jsonb_set(claims, '{role}', to_jsonb('super_admin'));
    ELSE
        -- Get tenant_id from users table (for customers)
        SELECT u.tenant_id INTO user_tenant_id
        FROM public.users u
        WHERE u.auth_id = (event->'claims'->>'sub')::uuid;
        
        -- If not found in users table, check if it's a tenant owner
        IF user_tenant_id IS NULL THEN
            SELECT t.tenant_id INTO user_tenant_id
            FROM public.tenants t
            WHERE t.owner_email = event->'claims'->>'email';
            
            IF user_tenant_id IS NOT NULL THEN
                user_role := 'tenant_owner';
            END IF;
        ELSE
            user_role := 'customer';
        END IF;
        
        -- Add tenant_id and role to claims
        IF user_tenant_id IS NOT NULL THEN
            claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id::text));
            claims := jsonb_set(claims, '{role}', to_jsonb(user_role));
        END IF;
    END IF;
    
    -- Update the event
    event := jsonb_set(event, '{claims}', claims);
    
    RETURN event;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- =====================================================
-- FUNCTION: Handle new user signup
-- Creates user record in public.users table
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    user_tenant_id uuid;
    user_phone text;
    user_email text;
BEGIN
    -- Extract phone or email from user metadata
    user_phone := NEW.raw_user_meta_data->>'phone';
    user_email := NEW.email;
    
    -- Get tenant_id from metadata (set during signup)
    user_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;
    
    -- Only create user record if tenant_id is provided (not for admins)
    IF user_tenant_id IS NOT NULL THEN
        INSERT INTO public.users (
            auth_id,
            tenant_id,
            phone,
            email,
            full_name
        ) VALUES (
            NEW.id,
            user_tenant_id,
            user_phone,
            user_email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Customer')
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for new user signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- FUNCTION: Link existing user to auth
-- Updates user record when auth is created
-- =====================================================

CREATE OR REPLACE FUNCTION public.link_user_to_auth(
    p_tenant_id uuid,
    p_phone text,
    p_auth_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.users
    SET auth_id = p_auth_id
    WHERE tenant_id = p_tenant_id
    AND phone = p_phone
    AND auth_id IS NULL;
END;
$$;

-- =====================================================
-- TABLE: Super Admin Users
-- Separate table for platform administrators
-- =====================================================

CREATE TABLE IF NOT EXISTS public.super_admins (
    admin_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Super admins can view all super admins
CREATE POLICY "Super admins can view super admins"
    ON public.super_admins FOR SELECT
    USING (auth.is_super_admin());

-- Super admins can view their own record
CREATE POLICY "Super admins can view themselves"
    ON public.super_admins FOR SELECT
    USING (auth_id = auth.uid());

-- Index
CREATE INDEX idx_super_admins_auth_id ON public.super_admins(auth_id);
CREATE INDEX idx_super_admins_email ON public.super_admins(email);

-- Trigger for updated_at
CREATE TRIGGER update_super_admins_updated_at 
    BEFORE UPDATE ON public.super_admins
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED: Create initial super admin
-- =====================================================

-- Note: This will be created manually via Supabase Auth UI
-- Then we link it here. Example:
-- INSERT INTO public.super_admins (auth_id, email, full_name)
-- VALUES ('<auth_uuid>', 'admin@caffi.pro', 'Admin User');

-- =====================================================
-- HELPER FUNCTION: Create super admin
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_super_admin(
    p_email text,
    p_full_name text,
    p_password text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_admin_id uuid;
BEGIN
    -- This function should be called from Edge Function with Supabase Admin API
    -- For now, it's a placeholder
    -- Actual implementation requires Supabase Admin SDK
    
    RAISE EXCEPTION 'Use Supabase Admin SDK to create super admin users';
END;
$$;

-- =====================================================
-- FUNCTION: Update last login
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update super_admins last login
    UPDATE public.super_admins
    SET last_login_at = NOW()
    WHERE auth_id = NEW.id
    AND EXISTS (SELECT 1 FROM public.super_admins WHERE auth_id = NEW.id);
    
    RETURN NEW;
END;
$$;

-- Note: This trigger would go on auth.sessions if we had access
-- For now, we'll handle this in the application layer

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION public.custom_access_token_hook IS 
    'Adds tenant_id and role to JWT claims for RLS';

COMMENT ON FUNCTION public.handle_new_user IS 
    'Automatically creates user record when customer signs up';

COMMENT ON TABLE public.super_admins IS 
    'Platform administrators (Caffi.pro team)';

COMMENT ON FUNCTION public.link_user_to_auth IS 
    'Links existing user record to auth.users after OTP verification';
