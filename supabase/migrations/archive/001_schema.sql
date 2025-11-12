-- CAFFI.PRO - Database Schema
-- Module 1: Complete database schema with 13 tables
-- Created: 2025-01-XX

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for location data (optional, for future features)
-- CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- 1. tenants - Café business information
CREATE TABLE tenants (
    tenant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- e.g. "bluebottle-paris"
    owner_email TEXT UNIQUE NOT NULL,
    owner_phone TEXT,
    app_name TEXT NOT NULL, -- "Blue Bottle"
    bundle_id TEXT UNIQUE NOT NULL, -- "com.bluebottle.app"
    app_store_url TEXT,
    play_store_url TEXT,
    pwa_url TEXT,
    features_enabled JSONB DEFAULT '{"ordering": true, "loyalty": true, "delivery": false, "pwa": true}'::jsonb,
    loyalty_config JSONB DEFAULT '{"points_per_euro": 10, "signup_bonus": 50, "tiers": []}'::jsonb,
    subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'cancelled', 'suspended')),
    subscription_plan TEXT DEFAULT 'starter' CHECK (subscription_plan IN ('starter', 'pro', 'enterprise')),
    trial_ends_at TIMESTAMPTZ,
    timezone TEXT DEFAULT 'Europe/Paris',
    currency TEXT DEFAULT 'EUR',
    language TEXT DEFAULT 'fr',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. tenant_manifests - Design tokens for white-labeling
CREATE TABLE tenant_manifests (
    manifest_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID UNIQUE NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    design_tokens JSONB DEFAULT '{
        "colors": {
            "primary": "#007AFF",
            "secondary": "#5856D6",
            "accent": "#FF9500",
            "background": "#FFFFFF",
            "surface": "#F2F2F7",
            "text": "#000000",
            "textSecondary": "#8E8E93"
        },
        "typography": {
            "fontFamily": "System",
            "fontSize": {
                "small": 14,
                "medium": 16,
                "large": 20,
                "xlarge": 24
            }
        },
        "spacing": {
            "xs": 4,
            "sm": 8,
            "md": 16,
            "lg": 24,
            "xl": 32
        }
    }'::jsonb,
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

-- 3. users - Customers
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT,
    email TEXT,
    full_name TEXT,
    profile_image_url TEXT,
    loyalty_points INTEGER DEFAULT 0 CHECK (loyalty_points >= 0),
    loyalty_tier TEXT DEFAULT 'bronze' CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum')),
    lifetime_points INTEGER DEFAULT 0 CHECK (lifetime_points >= 0),
    total_orders INTEGER DEFAULT 0 CHECK (total_orders >= 0),
    total_spent DECIMAL(10,2) DEFAULT 0 CHECK (total_spent >= 0),
    last_order_at TIMESTAMPTZ,
    fcm_token TEXT, -- Firebase Cloud Messaging token
    notifications_enabled BOOLEAN DEFAULT true,
    preferred_location_id UUID,
    favorite_items UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, phone),
    UNIQUE(tenant_id, email)
);

-- 4. locations - Physical café locations
CREATE TABLE locations (
    location_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'France',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone TEXT,
    email TEXT,
    hours JSONB DEFAULT '{
        "monday": "07:00-19:00",
        "tuesday": "07:00-19:00",
        "wednesday": "07:00-19:00",
        "thursday": "07:00-19:00",
        "friday": "07:00-19:00",
        "saturday": "08:00-18:00",
        "sunday": "09:00-17:00"
    }'::jsonb,
    special_hours JSONB DEFAULT '[]'::jsonb,
    accepts_mobile_orders BOOLEAN DEFAULT true,
    accepts_dine_in_orders BOOLEAN DEFAULT true,
    estimated_prep_time INTEGER DEFAULT 15, -- minutes
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. categories - Menu categories
CREATE TABLE categories (
    category_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    icon_name TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. menu_items - Products
CREATE TABLE menu_items (
    item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(category_id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    image_url TEXT,
    modifiers JSONB DEFAULT '{
        "sizes": [],
        "addons": []
    }'::jsonb,
    tags TEXT[] DEFAULT '{}',
    calories INTEGER,
    allergens TEXT[] DEFAULT '{}',
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    available_at_locations UUID[] DEFAULT '{}',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. orders - Customer orders
CREATE TABLE orders (
    order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(location_id) ON DELETE RESTRICT,
    order_number TEXT NOT NULL, -- "#1234" (unique per tenant)
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    tax DECIMAL(10,2) DEFAULT 0 CHECK (tax >= 0),
    discount DECIMAL(10,2) DEFAULT 0 CHECK (discount >= 0),
    tip DECIMAL(10,2) DEFAULT 0 CHECK (tip >= 0),
    total DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    payment_method TEXT CHECK (payment_method IN ('card', 'apple_pay', 'google_pay', 'cash')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_intent_id TEXT, -- Stripe payment intent ID
    order_type TEXT DEFAULT 'pickup' CHECK (order_type IN ('pickup', 'dine_in', 'delivery')),
    special_instructions TEXT,
    scheduled_for TIMESTAMPTZ,
    estimated_ready_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    points_earned INTEGER DEFAULT 0 CHECK (points_earned >= 0),
    coupon_code_used TEXT,
    source TEXT DEFAULT 'mobile_app' CHECK (source IN ('mobile_app', 'pwa', 'dashboard')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, order_number)
);

-- 8. order_items - Items within orders
CREATE TABLE order_items (
    order_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    item_id UUID REFERENCES menu_items(item_id) ON DELETE SET NULL,
    item_name TEXT NOT NULL, -- Snapshot at time of order
    item_image_url TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    modifiers_selected JSONB DEFAULT '{}'::jsonb,
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. loyalty_transactions - Point history
CREATE TABLE loyalty_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(order_id) ON DELETE SET NULL,
    points_change INTEGER NOT NULL, -- Positive = earned, negative = spent
    balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
    reason TEXT NOT NULL CHECK (reason IN ('order', 'signup_bonus', 'reward_redemption', 'manual_adjustment', 'expiration')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. rewards_catalog - Redeemable rewards
CREATE TABLE rewards_catalog (
    reward_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL CHECK (points_required > 0),
    image_url TEXT,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('coupon', 'free_item', 'discount')),
    reward_value JSONB NOT NULL, -- {"discount_percent": 10} or {"free_item_id": "uuid"} or {"coupon_code": "SAVE10"}
    is_active BOOLEAN DEFAULT true,
    stock_limit INTEGER,
    stock_remaining INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. coupons - Discount codes
CREATE TABLE coupons (
    coupon_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_item')),
    discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value >= 0),
    min_order_amount DECIMAL(10,2) DEFAULT 0 CHECK (min_order_amount >= 0),
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0 CHECK (current_uses >= 0),
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

-- 12. coupon_usage - Redemption tracking
CREATE TABLE coupon_usage (
    usage_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES coupons(coupon_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    discount_applied DECIMAL(10,2) NOT NULL CHECK (discount_applied >= 0),
    used_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. push_campaigns - Marketing notifications
CREATE TABLE push_campaigns (
    campaign_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) <= 50),
    message TEXT NOT NULL CHECK (char_length(message) <= 250),
    image_url TEXT,
    deep_link TEXT,
    audience TEXT DEFAULT 'all' CHECK (audience IN ('all', 'tier_based', 'location_based', 'inactive_users', 'custom')),
    audience_filter JSONB DEFAULT '{}'::jsonb,
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    total_sent INTEGER DEFAULT 0 CHECK (total_sent >= 0),
    total_delivered INTEGER DEFAULT 0 CHECK (total_delivered >= 0),
    total_opened INTEGER DEFAULT 0 CHECK (total_opened >= 0),
    total_clicked INTEGER DEFAULT 0 CHECK (total_clicked >= 0),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE tenants IS 'Café business information and subscription details';
COMMENT ON TABLE tenant_manifests IS 'Design tokens and branding assets for white-labeling';
COMMENT ON TABLE users IS 'Customer accounts with loyalty program data';
COMMENT ON TABLE locations IS 'Physical café locations with hours and settings';
COMMENT ON TABLE categories IS 'Menu categories for organizing items';
COMMENT ON TABLE menu_items IS 'Products available for order with modifiers and tags';
COMMENT ON TABLE orders IS 'Customer orders with payment and status tracking';
COMMENT ON TABLE order_items IS 'Individual items within orders (snapshot data)';
COMMENT ON TABLE loyalty_transactions IS 'Point history for all loyalty activities';
COMMENT ON TABLE rewards_catalog IS 'Redeemable rewards available to customers';
COMMENT ON TABLE coupons IS 'Discount codes for promotions';
COMMENT ON TABLE coupon_usage IS 'Tracking of coupon redemptions';
COMMENT ON TABLE push_campaigns IS 'Marketing push notification campaigns';
