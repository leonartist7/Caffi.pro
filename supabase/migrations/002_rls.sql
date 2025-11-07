-- CAFFI.PRO - Row-Level Security Policies
-- Module 1: RLS policies for multi-tenant data isolation
-- Created: 2025-01-XX

-- Enable Row-Level Security on all tables
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

-- ============================================================================
-- HELPER FUNCTION: Get tenant_id from JWT
-- ============================================================================

CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS UUID AS $$
BEGIN
    -- Check if user is super admin (bypass RLS)
    IF (auth.jwt()->>'role')::text = 'super_admin' THEN
        RETURN NULL; -- NULL means no filter (super admin sees all)
    END IF;
    
    -- Extract tenant_id from JWT claims
    RETURN (auth.jwt()->>'tenant_id')::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Check if user is super admin
-- ============================================================================

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (auth.jwt()->>'role')::text = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TENANTS TABLE POLICIES
-- ============================================================================

-- Super admin can do everything
CREATE POLICY "Super admin full access to tenants"
    ON tenants FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- Tenant owners can read their own tenant
CREATE POLICY "Tenant owners can read own tenant"
    ON tenants FOR SELECT
    USING (
        tenant_id = get_tenant_id() OR
        owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Tenant owners can update their own tenant (limited fields)
CREATE POLICY "Tenant owners can update own tenant"
    ON tenants FOR UPDATE
    USING (
        tenant_id = get_tenant_id() OR
        owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    WITH CHECK (
        tenant_id = get_tenant_id() OR
        owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- ============================================================================
-- TENANT_MANIFESTS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Super admin full access to tenant_manifests"
    ON tenant_manifests FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

CREATE POLICY "Users can read tenant manifests"
    ON tenant_manifests FOR SELECT
    USING (
        is_super_admin() OR
        tenant_id = get_tenant_id()
    );

CREATE POLICY "Tenant owners can update own manifest"
    ON tenant_manifests FOR UPDATE
    USING (
        is_super_admin() OR
        tenant_id = get_tenant_id()
    )
    WITH CHECK (
        is_super_admin() OR
        tenant_id = get_tenant_id()
    );

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Super admin full access to users"
    ON users FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON users FOR SELECT
    USING (
        is_super_admin() OR
        tenant_id = get_tenant_id() AND (
            auth_id = auth.uid() OR
            -- Tenant owners can see all their customers
            tenant_id IN (
                SELECT tenant_id FROM tenants 
                WHERE owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
            )
        )
    );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (
        is_super_admin() OR
        tenant_id = get_tenant_id() AND auth_id = auth.uid()
    )
    WITH CHECK (
        is_super_admin() OR
        tenant_id = get_tenant_id() AND auth_id = auth.uid()
    );

-- Tenant owners can insert users (for their tenant)
CREATE POLICY "Tenant owners can insert users"
    ON users FOR INSERT
    WITH CHECK (
        is_super_admin() OR
        tenant_id = get_tenant_id()
    );

-- ============================================================================
-- LOCATIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Super admin full access to locations"
    ON locations FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

CREATE POLICY "Users can read locations"
    ON locations FOR SELECT
    USING (
        is_super_admin() OR
        tenant_id = get_tenant_id()
    );

CREATE POLICY "Tenant owners can manage locations"
    ON locations FOR ALL
    USING (
        is_super_admin() OR
        tenant_id = get_tenant_id()
    )
    WITH CHECK (
        is_super_admin() OR
        tenant_id = get_tenant_id()
    );

-- ============================================================================
-- CATEGORIES TABLE POLICIES
-- ============================================================================

CREATE POLICY "Super admin full access to categories"
    ON categories FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

CREATE POLICY "Users can read categories"
    ON categories FOR SELECT
    USING (
        is_super_admin() OR
        tenant_id = get_tenant_id() AND is_active = true
    );

CREATE POLICY "Tenant owners can manage categories"
    ON categories FOR ALL
    USING (
        is_super_admin() OR
        tenant_id = get_tenant_id()
    )
    WITH CHECK (
        is_super_admin() OR
        tenant_id = get_tenant_id()
    );

-- ============================================================================
-- MENU_ITEMS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Super admin full access to menu_items"
    ON menu_items FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

CREATE POLICY "Users can read available menu items"
    ON menu_items FOR SELECT
    USING (
        is_super_admin() OR
        tenant_id = get_tenant_id() AND is_available = true
    );

CREATE POLICY "Tenant owners can manage menu items"
    ON menu_items FOR ALL
    USING (
        is_super_admin() OR
        tenant_id = get_tenant_id()
    )
    WITH CHECK (
        is_super_admin() OR
        tenant_id = get_tenant_id()
    );

-- ============================================================================
-- ORDERS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Super admin full access to orders"
    ON orders FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- Users can read their own orders
CREATE POLICY "Users can read own orders"
    ON orders FOR SELECT
    USING (
        is_super_admin() OR
        tenant_id = get_tenant_id() AND (
            user_id IN (
                SELECT user_id FROM users WHERE auth_id = auth.uid()
            ) OR
            -- Tenant owners can see all orders for their tenant
            tenant_id IN (
                SELECT tenant_id FROM tenants 
                WHERE owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
            )
        )
    );

-- Users can create orders for themselves
CREATE POLICY "Users can create own orders"
    ON orders FOR INSERT
    WITH CHECK (
        is_super_admin() OR
        tenant_id = get_tenant_id() AND
        user_id IN (
            SELECT user_id FROM users WHERE auth_id = auth.uid()
        )
    );

-- Tenant owners can update orders for their tenant
CREATE POLICY "Tenant owners can update orders"
    ON orders FOR UPDATE
    USING (
        is_super_admin() OR
        tenant_id = get_tenant_id()
    )
    WITH CHECK (
        is_super_admin() OR
        tenant_id = get_tenant_id()
    );

-- ============================================================================
-- ORDER_ITEMS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Super admin full access to order_items"
    ON order_items FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

CREATE POLICY "Users can read order items for own orders"
    ON order_items FOR SELECT
    USING (
        is_super_admin() OR
        order_id IN (
            SELECT order_id FROM orders 
            WHERE tenant_id = get_tenant_id() AND (
                user_id IN (
                    SELECT user_id FROM users WHERE auth_id = auth.uid()
                ) OR
                tenant_id IN (
                    SELECT tenant_id FROM tenants 
                    WHERE owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
                )
            )
        )
    );

CREATE POLICY "Users can create order items for own orders"
    ON order_items FOR INSERT
    WITH CHECK (
        is_super_admin() OR
        order_id IN (
            SELECT order_id FROM orders 
            WHERE tenant_id = get_tenant_id() AND
            user_id IN (
                SELECT user_id FROM users WHERE auth_id = auth.uid()
            )
        )
    );

CREATE POLICY "Tenant owners can manage order items"
    ON order_items FOR ALL
    USING (
        is_super_admin() OR
        order_id IN (
            SELECT order_id FROM orders WHERE tenant_id = get_tenant_id()
        )
    )
    WITH CHECK (
        is_super_admin() OR
        order_id IN (
            SELECT order_id FROM orders WHERE tenant_id = get_tenant_id()
        )
    );

-- ============================================================================
-- LOYALTY_TRANSACTIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Super admin full access to loyalty_transactions"
    ON loyalty_transactions FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

CREATE POLICY "Users can read own loyalty transactions"
    ON loyalty_transactions FOR SELECT
    USING (
        is_super_admin() OR
        tenant_id = get_tenant_id() AND (
            user_id IN (
                SELECT user_id FROM users WHERE auth_id = auth.uid()
            ) OR
            tenant_id IN (
                SELECT tenant_id FROM tenants 
                WHERE owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
            )
        )
    );

CREATE POLICY "System can insert loyalty transactions"
    ON loyalty_transactions FOR INSERT
    WITH CHECK (
        is_super_admin() OR
        tenant_id = get_tenant_id()
    );

-- ============================================================================
-- REWARDS_CATALOG TABLE POLICIES
-- ============================================================================

CREATE POLICY "Super admin full access to rewards_catalog"
    ON rewards_catalog FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

CREATE POLICY "Users can read active rewards"
    ON rewards_catalog FOR SELECT
    USING (
        is_super_admin() OR
        tenant_id = get_tenant_id() AND is_active = true
    );

CREATE POLICY "Tenant owners can manage rewards"
    ON rewards_catalog FOR ALL
    USING (
        is_super_admin() OR
        tenant_id = get_tenant_id()
    )
    WITH CHECK (
        is_super_admin() OR
        tenant_id = get_tenant_id()
    );

-- ============================================================================
-- COUPONS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Super admin full access to coupons"
    ON coupons FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

CREATE POLICY "Users can read active coupons"
    ON coupons FOR SELECT
    USING (
        is_super_admin() OR
        tenant_id = get_tenant_id() AND is_active = true AND
        (valid_until IS NULL OR valid_until > NOW()) AND
        (max_uses IS NULL OR current_uses < max_uses)
    );

CREATE POLICY "Tenant owners can manage coupons"
    ON coupons FOR ALL
    USING (
        is_super_admin() OR
        tenant_id = get_tenant_id()
    )
    WITH CHECK (
        is_super_admin() OR
        tenant_id = get_tenant_id()
    );

-- ============================================================================
-- COUPON_USAGE TABLE POLICIES
-- ============================================================================

CREATE POLICY "Super admin full access to coupon_usage"
    ON coupon_usage FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

CREATE POLICY "Users can read own coupon usage"
    ON coupon_usage FOR SELECT
    USING (
        is_super_admin() OR
        user_id IN (
            SELECT user_id FROM users WHERE auth_id = auth.uid()
        ) OR
        coupon_id IN (
            SELECT coupon_id FROM coupons 
            WHERE tenant_id IN (
                SELECT tenant_id FROM tenants 
                WHERE owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
            )
        )
    );

CREATE POLICY "System can insert coupon usage"
    ON coupon_usage FOR INSERT
    WITH CHECK (
        is_super_admin() OR
        coupon_id IN (
            SELECT coupon_id FROM coupons WHERE tenant_id = get_tenant_id()
        )
    );

-- ============================================================================
-- PUSH_CAMPAIGNS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Super admin full access to push_campaigns"
    ON push_campaigns FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

CREATE POLICY "Tenant owners can manage campaigns"
    ON push_campaigns FOR ALL
    USING (
        is_super_admin() OR
        tenant_id = get_tenant_id()
    )
    WITH CHECK (
        is_super_admin() OR
        tenant_id = get_tenant_id()
    );

-- Users cannot read campaigns (they're internal)
