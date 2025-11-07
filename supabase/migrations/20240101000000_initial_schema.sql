-- ============================================================================
-- CAFFI.PRO - INITIAL DATABASE SCHEMA
-- Multi-tenant SaaS platform for coffee shop loyalty apps
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Subscription status
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'cancelled', 'suspended');

-- Subscription plan
CREATE TYPE subscription_plan AS ENUM ('starter', 'pro', 'enterprise');

-- Loyalty tier
CREATE TYPE loyalty_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');

-- Order status
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled');

-- Payment status
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- Order type
CREATE TYPE order_type AS ENUM ('pickup', 'dine_in', 'delivery');

-- Reward type
CREATE TYPE reward_type AS ENUM ('coupon', 'free_item', 'discount');

-- Discount type
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount', 'free_item');

-- Push campaign audience
CREATE TYPE campaign_audience AS ENUM ('all', 'tier_based', 'location_based', 'inactive_users', 'custom');

-- Campaign status
CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'cancelled');

-- ============================================================================
-- TABLE 1: tenants - Café business information
-- ============================================================================

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
    subscription_status subscription_status DEFAULT 'trial',
    subscription_plan subscription_plan DEFAULT 'starter',
    trial_ends_at TIMESTAMPTZ,
    timezone TEXT DEFAULT 'Europe/Paris',
    currency TEXT DEFAULT 'EUR',
    language TEXT DEFAULT 'fr',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE 2: tenant_manifests - Design tokens for white-labeling
-- ============================================================================

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
                "small": 12,
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

-- ============================================================================
-- TABLE 3: users - Customers
-- ============================================================================

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    auth_id UUID UNIQUE, -- Links to auth.users
    phone TEXT,
    email TEXT,
    full_name TEXT,
    profile_image_url TEXT,
    loyalty_points INTEGER DEFAULT 0,
    loyalty_tier loyalty_tier DEFAULT 'bronze',
    lifetime_points INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    last_order_at TIMESTAMPTZ,
    fcm_token TEXT, -- Firebase Cloud Messaging token
    notifications_enabled BOOLEAN DEFAULT true,
    preferred_location_id UUID,
    favorite_items UUID[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_tenant_phone UNIQUE(tenant_id, phone)
);

-- ============================================================================
-- TABLE 4: locations - Physical café locations
-- ============================================================================

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
        "saturday": "08:00-20:00",
        "sunday": "09:00-18:00"
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

-- ============================================================================
-- TABLE 5: categories - Menu categories
-- ============================================================================

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

-- ============================================================================
-- TABLE 6: menu_items - Products
-- ============================================================================

CREATE TABLE menu_items (
    item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(category_id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
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
    available_at_locations UUID[],
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE 7: orders - Customer orders
-- ============================================================================

CREATE TABLE orders (
    order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(location_id) ON DELETE RESTRICT,
    order_number TEXT NOT NULL, -- "#1234" (unique per tenant)
    status order_status DEFAULT 'pending',
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    tip DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method TEXT, -- 'card', 'apple_pay', 'google_pay', 'cash'
    payment_status payment_status DEFAULT 'pending',
    payment_intent_id TEXT, -- Stripe
    order_type order_type DEFAULT 'pickup',
    special_instructions TEXT,
    scheduled_for TIMESTAMPTZ,
    estimated_ready_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    points_earned INTEGER DEFAULT 0,
    coupon_code_used TEXT,
    source TEXT DEFAULT 'mobile_app', -- 'mobile_app', 'pwa', 'dashboard'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_tenant_order_number UNIQUE(tenant_id, order_number)
);

-- ============================================================================
-- TABLE 8: order_items - Items within orders
-- ============================================================================

CREATE TABLE order_items (
    order_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    item_id UUID REFERENCES menu_items(item_id) ON DELETE SET NULL,
    item_name TEXT NOT NULL, -- Snapshot
    item_image_url TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    modifiers_selected JSONB DEFAULT '{}'::jsonb,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE 9: loyalty_transactions - Point history
-- ============================================================================

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

-- ============================================================================
-- TABLE 10: rewards_catalog - Redeemable rewards
-- ============================================================================

CREATE TABLE rewards_catalog (
    reward_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL,
    image_url TEXT,
    reward_type reward_type NOT NULL,
    reward_value JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    stock_limit INTEGER,
    stock_remaining INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE 11: coupons - Discount codes
-- ============================================================================

CREATE TABLE coupons (
    coupon_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    discount_type discount_type NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_tenant_code UNIQUE(tenant_id, code)
);

-- ============================================================================
-- TABLE 12: coupon_usage - Redemption tracking
-- ============================================================================

CREATE TABLE coupon_usage (
    usage_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES coupons(coupon_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    discount_applied DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE 13: push_campaigns - Marketing notifications
-- ============================================================================

CREATE TABLE push_campaigns (
    campaign_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    image_url TEXT,
    deep_link TEXT,
    audience campaign_audience DEFAULT 'all',
    audience_filter JSONB DEFAULT '{}'::jsonb,
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    status campaign_status DEFAULT 'draft',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- tenants indexes
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_owner_email ON tenants(owner_email);
CREATE INDEX idx_tenants_subscription_status ON tenants(subscription_status);

-- tenant_manifests indexes
CREATE INDEX idx_tenant_manifests_tenant_id ON tenant_manifests(tenant_id);

-- users indexes
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_loyalty_tier ON users(loyalty_tier);
CREATE INDEX idx_users_tenant_phone ON users(tenant_id, phone);

-- locations indexes
CREATE INDEX idx_locations_tenant_id ON locations(tenant_id);
CREATE INDEX idx_locations_is_active ON locations(is_active);
CREATE INDEX idx_locations_tenant_active ON locations(tenant_id, is_active);

-- categories indexes
CREATE INDEX idx_categories_tenant_id ON categories(tenant_id);
CREATE INDEX idx_categories_is_active ON categories(is_active);
CREATE INDEX idx_categories_tenant_active ON categories(tenant_id, is_active);
CREATE INDEX idx_categories_display_order ON categories(display_order);

-- menu_items indexes
CREATE INDEX idx_menu_items_tenant_id ON menu_items(tenant_id);
CREATE INDEX idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX idx_menu_items_is_available ON menu_items(is_available);
CREATE INDEX idx_menu_items_is_featured ON menu_items(is_featured);
CREATE INDEX idx_menu_items_tenant_available ON menu_items(tenant_id, is_available);
CREATE INDEX idx_menu_items_tags ON menu_items USING GIN(tags);

-- orders indexes
CREATE INDEX idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_location_id ON orders(location_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status);
CREATE INDEX idx_orders_tenant_created ON orders(tenant_id, created_at DESC);
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);

-- order_items indexes
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_item_id ON order_items(item_id);

-- loyalty_transactions indexes
CREATE INDEX idx_loyalty_transactions_tenant_id ON loyalty_transactions(tenant_id);
CREATE INDEX idx_loyalty_transactions_user_id ON loyalty_transactions(user_id);
CREATE INDEX idx_loyalty_transactions_order_id ON loyalty_transactions(order_id);
CREATE INDEX idx_loyalty_transactions_created_at ON loyalty_transactions(created_at DESC);
CREATE INDEX idx_loyalty_transactions_user_created ON loyalty_transactions(user_id, created_at DESC);

-- rewards_catalog indexes
CREATE INDEX idx_rewards_catalog_tenant_id ON rewards_catalog(tenant_id);
CREATE INDEX idx_rewards_catalog_is_active ON rewards_catalog(is_active);
CREATE INDEX idx_rewards_catalog_tenant_active ON rewards_catalog(tenant_id, is_active);

-- coupons indexes
CREATE INDEX idx_coupons_tenant_id ON coupons(tenant_id);
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_is_active ON coupons(is_active);
CREATE INDEX idx_coupons_valid_dates ON coupons(valid_from, valid_until);
CREATE INDEX idx_coupons_tenant_code ON coupons(tenant_id, code);

-- coupon_usage indexes
CREATE INDEX idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_user_id ON coupon_usage(user_id);
CREATE INDEX idx_coupon_usage_order_id ON coupon_usage(order_id);

-- push_campaigns indexes
CREATE INDEX idx_push_campaigns_tenant_id ON push_campaigns(tenant_id);
CREATE INDEX idx_push_campaigns_status ON push_campaigns(status);
CREATE INDEX idx_push_campaigns_scheduled_for ON push_campaigns(scheduled_for);
CREATE INDEX idx_push_campaigns_tenant_status ON push_campaigns(tenant_id, status);

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
-- DATABASE FUNCTIONS
-- ============================================================================

-- Function: Generate order number (unique per tenant)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
BEGIN
    -- Get the next order number for this tenant
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 2) AS INTEGER)), 0) + 1
    INTO next_number
    FROM orders
    WHERE tenant_id = NEW.tenant_id;
    
    NEW.order_number := '#' || LPAD(next_number::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_order_number_trigger
    BEFORE INSERT ON orders
    FOR EACH ROW
    WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
    EXECUTE FUNCTION generate_order_number();

-- Function: Calculate loyalty points based on order total
CREATE OR REPLACE FUNCTION calculate_loyalty_points(order_total DECIMAL, tenant_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    points_per_euro INTEGER;
BEGIN
    SELECT (loyalty_config->>'points_per_euro')::INTEGER
    INTO points_per_euro
    FROM tenants
    WHERE tenant_id = tenant_uuid;
    
    RETURN COALESCE(points_per_euro, 10) * FLOOR(order_total);
END;
$$ LANGUAGE plpgsql;

-- Function: Update user loyalty stats after transaction
CREATE OR REPLACE FUNCTION update_user_loyalty()
RETURNS TRIGGER AS $$
DECLARE
    new_balance INTEGER;
    new_tier loyalty_tier;
    tenant_config JSONB;
    tier_thresholds JSONB;
BEGIN
    -- Update user's loyalty points
    UPDATE users
    SET loyalty_points = NEW.balance_after,
        lifetime_points = lifetime_points + ABS(NEW.points_change),
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    -- Get tenant loyalty config
    SELECT loyalty_config INTO tenant_config
    FROM tenants
    WHERE tenant_id = NEW.tenant_id;
    
    -- Calculate tier based on lifetime points
    tier_thresholds := tenant_config->'tiers';
    
    SELECT CASE
        WHEN NEW.balance_after >= COALESCE((tier_thresholds->>'platinum')::INTEGER, 10000) THEN 'platinum'
        WHEN NEW.balance_after >= COALESCE((tier_thresholds->>'gold')::INTEGER, 5000) THEN 'gold'
        WHEN NEW.balance_after >= COALESCE((tier_thresholds->>'silver')::INTEGER, 2000) THEN 'silver'
        ELSE 'bronze'
    END INTO new_tier;
    
    -- Update tier if changed
    UPDATE users
    SET loyalty_tier = new_tier
    WHERE user_id = NEW.user_id AND loyalty_tier != new_tier;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_loyalty_trigger
    AFTER INSERT ON loyalty_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_loyalty();

-- Function: Update order stats when order status changes
CREATE OR REPLACE FUNCTION update_order_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- If order is completed, update user stats
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE users
        SET total_orders = total_orders + 1,
            total_spent = total_spent + NEW.total,
            last_order_at = NOW(),
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
        
        -- Award loyalty points if not already done
        IF NEW.points_earned = 0 THEN
            NEW.points_earned := calculate_loyalty_points(NEW.total, NEW.tenant_id);
            
            -- Create loyalty transaction
            INSERT INTO loyalty_transactions (
                tenant_id, user_id, order_id,
                points_change, balance_after, reason, description
            )
            SELECT
                NEW.tenant_id,
                NEW.user_id,
                NEW.order_id,
                NEW.points_earned,
                COALESCE(u.loyalty_points, 0) + NEW.points_earned,
                'order',
                'Points earned from order ' || NEW.order_number
            FROM users u
            WHERE u.user_id = NEW.user_id;
        END IF;
        
        NEW.completed_at := NOW();
    END IF;
    
    -- If order is cancelled, update timestamp
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        NEW.cancelled_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_order_stats_trigger
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_order_stats();

-- Function: Get sales analytics for a tenant
CREATE OR REPLACE FUNCTION get_sales_analytics(
    tenant_uuid UUID,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_revenue', COALESCE(SUM(total), 0),
        'total_orders', COUNT(*),
        'average_order_value', COALESCE(AVG(total), 0),
        'total_customers', COUNT(DISTINCT user_id),
        'completed_orders', COUNT(*) FILTER (WHERE status = 'completed'),
        'pending_orders', COUNT(*) FILTER (WHERE status IN ('pending', 'confirmed', 'preparing', 'ready')),
        'cancelled_orders', COUNT(*) FILTER (WHERE status = 'cancelled'),
        'total_points_earned', COALESCE(SUM(points_earned), 0),
        'revenue_by_status', jsonb_object_agg(status::TEXT, status_total)
    )
    INTO result
    FROM (
        SELECT 
            status,
            SUM(total) as status_total
        FROM orders
        WHERE tenant_id = tenant_uuid
            AND created_at >= start_date
            AND created_at <= end_date
        GROUP BY status
    ) status_totals
    CROSS JOIN (
        SELECT 
            SUM(total) as total,
            COUNT(*) as count,
            COUNT(DISTINCT user_id) as unique_users,
            AVG(total) as avg_total,
            SUM(points_earned) as points
        FROM orders
        WHERE tenant_id = tenant_uuid
            AND created_at >= start_date
            AND created_at <= end_date
    ) totals;
    
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function: Set tenant context for RLS (helper function)
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- This function is used by application code to set context
    -- RLS policies will use current_setting('app.tenant_id')
    PERFORM set_config('app.tenant_id', tenant_uuid::TEXT, false);
END;
$$ LANGUAGE plpgsql;
