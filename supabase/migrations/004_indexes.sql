-- CAFFI.PRO - Database Indexes
-- Module 1: Performance optimization indexes
-- Created: 2025-01-XX

-- ============================================================================
-- TENANTS TABLE INDEXES
-- ============================================================================

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_owner_email ON tenants(owner_email);
CREATE INDEX idx_tenants_subscription_status ON tenants(subscription_status);
CREATE INDEX idx_tenants_created_at ON tenants(created_at DESC);

-- ============================================================================
-- USERS TABLE INDEXES
-- ============================================================================

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_tenant_phone ON users(tenant_id, phone);
CREATE INDEX idx_users_tenant_email ON users(tenant_id, email);
CREATE INDEX idx_users_loyalty_tier ON users(tenant_id, loyalty_tier);
CREATE INDEX idx_users_last_order_at ON users(tenant_id, last_order_at DESC NULLS LAST);
CREATE INDEX idx_users_fcm_token ON users(fcm_token) WHERE fcm_token IS NOT NULL;

-- ============================================================================
-- LOCATIONS TABLE INDEXES
-- ============================================================================

CREATE INDEX idx_locations_tenant_id ON locations(tenant_id);
CREATE INDEX idx_locations_is_active ON locations(tenant_id, is_active);
CREATE INDEX idx_locations_display_order ON locations(tenant_id, display_order);

-- ============================================================================
-- CATEGORIES TABLE INDEXES
-- ============================================================================

CREATE INDEX idx_categories_tenant_id ON categories(tenant_id);
CREATE INDEX idx_categories_is_active ON categories(tenant_id, is_active);
CREATE INDEX idx_categories_display_order ON categories(tenant_id, display_order);

-- ============================================================================
-- MENU_ITEMS TABLE INDEXES
-- ============================================================================

CREATE INDEX idx_menu_items_tenant_id ON menu_items(tenant_id);
CREATE INDEX idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX idx_menu_items_is_available ON menu_items(tenant_id, is_available);
CREATE INDEX idx_menu_items_is_featured ON menu_items(tenant_id, is_featured) WHERE is_featured = true;
CREATE INDEX idx_menu_items_display_order ON menu_items(tenant_id, display_order);
CREATE INDEX idx_menu_items_tags ON menu_items USING GIN(tags);

-- ============================================================================
-- ORDERS TABLE INDEXES
-- ============================================================================

CREATE INDEX idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_location_id ON orders(location_id);
CREATE INDEX idx_orders_status ON orders(tenant_id, status);
CREATE INDEX idx_orders_tenant_order_number ON orders(tenant_id, order_number);
CREATE INDEX idx_orders_created_at ON orders(tenant_id, created_at DESC);
CREATE INDEX idx_orders_user_created_at ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_payment_status ON orders(tenant_id, payment_status);
CREATE INDEX idx_orders_scheduled_for ON orders(tenant_id, scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX idx_orders_completed_at ON orders(tenant_id, completed_at DESC) WHERE completed_at IS NOT NULL;

-- Composite index for common queries
CREATE INDEX idx_orders_tenant_status_created ON orders(tenant_id, status, created_at DESC);

-- ============================================================================
-- ORDER_ITEMS TABLE INDEXES
-- ============================================================================

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_item_id ON order_items(item_id);

-- ============================================================================
-- LOYALTY_TRANSACTIONS TABLE INDEXES
-- ============================================================================

CREATE INDEX idx_loyalty_transactions_tenant_id ON loyalty_transactions(tenant_id);
CREATE INDEX idx_loyalty_transactions_user_id ON loyalty_transactions(user_id);
CREATE INDEX idx_loyalty_transactions_order_id ON loyalty_transactions(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_loyalty_transactions_created_at ON loyalty_transactions(tenant_id, created_at DESC);
CREATE INDEX idx_loyalty_transactions_user_created_at ON loyalty_transactions(user_id, created_at DESC);

-- ============================================================================
-- REWARDS_CATALOG TABLE INDEXES
-- ============================================================================

CREATE INDEX idx_rewards_catalog_tenant_id ON rewards_catalog(tenant_id);
CREATE INDEX idx_rewards_catalog_is_active ON rewards_catalog(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX idx_rewards_catalog_points_required ON rewards_catalog(tenant_id, points_required);

-- ============================================================================
-- COUPONS TABLE INDEXES
-- ============================================================================

CREATE INDEX idx_coupons_tenant_id ON coupons(tenant_id);
CREATE INDEX idx_coupons_code ON coupons(tenant_id, code);
CREATE INDEX idx_coupons_is_active ON coupons(tenant_id, is_active, valid_until);
CREATE INDEX idx_coupons_valid_dates ON coupons(tenant_id, valid_from, valid_until);

-- ============================================================================
-- COUPON_USAGE TABLE INDEXES
-- ============================================================================

CREATE INDEX idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_user_id ON coupon_usage(user_id);
CREATE INDEX idx_coupon_usage_order_id ON coupon_usage(order_id);
CREATE INDEX idx_coupon_usage_used_at ON coupon_usage(coupon_id, used_at DESC);

-- ============================================================================
-- PUSH_CAMPAIGNS TABLE INDEXES
-- ============================================================================

CREATE INDEX idx_push_campaigns_tenant_id ON push_campaigns(tenant_id);
CREATE INDEX idx_push_campaigns_status ON push_campaigns(tenant_id, status);
CREATE INDEX idx_push_campaigns_scheduled_for ON push_campaigns(tenant_id, scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX idx_push_campaigns_created_at ON push_campaigns(tenant_id, created_at DESC);

-- ============================================================================
-- FULL-TEXT SEARCH INDEXES (for future search features)
-- ============================================================================

-- Menu items search
CREATE INDEX idx_menu_items_search ON menu_items USING GIN(
    to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, ''))
);

-- Users search
CREATE INDEX idx_users_search ON users USING GIN(
    to_tsvector('english', COALESCE(full_name, '') || ' ' || COALESCE(email, '') || ' ' || COALESCE(phone, ''))
);

-- ============================================================================
-- PARTIAL INDEXES (for better performance on filtered queries)
-- ============================================================================

-- Active menu items only
CREATE INDEX idx_menu_items_active ON menu_items(tenant_id, display_order) 
WHERE is_available = true;

-- Pending orders (most common query)
CREATE INDEX idx_orders_pending ON orders(tenant_id, created_at DESC) 
WHERE status IN ('pending', 'confirmed', 'preparing');

-- Active rewards
CREATE INDEX idx_rewards_active ON rewards_catalog(tenant_id, points_required) 
WHERE is_active = true;

-- Valid coupons
CREATE INDEX idx_coupons_valid ON coupons(tenant_id, code) 
WHERE is_active = true 
AND (valid_until IS NULL OR valid_until > NOW())
AND (max_uses IS NULL OR current_uses < max_uses);
