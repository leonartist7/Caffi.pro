-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- Multi-tenant data isolation with super admin bypass
-- ============================================================================

-- Helper function to get tenant_id from JWT claims
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS UUID AS $$
BEGIN
    -- Try to get tenant_id from JWT claims
    RETURN COALESCE(
        (current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')::UUID,
        (current_setting('request.jwt.claims', true)::jsonb->>'sub')::UUID
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'super_admin',
        false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

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
-- TENANTS TABLE POLICIES
-- ============================================================================

-- Super admin can do everything
CREATE POLICY "Super admin full access to tenants"
    ON tenants FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- Tenants can read their own record
CREATE POLICY "Tenants can read own record"
    ON tenants FOR SELECT
    USING (
        tenant_id = get_tenant_id() OR
        owner_email = (current_setting('request.jwt.claims', true)::jsonb->>'email')
    );

-- Tenants can update their own record (limited fields)
CREATE POLICY "Tenants can update own record"
    ON tenants FOR UPDATE
    USING (tenant_id = get_tenant_id())
    WITH CHECK (tenant_id = get_tenant_id());

-- ============================================================================
-- TENANT_MANIFESTS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Super admin full access to tenant_manifests"
    ON tenant_manifests FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

CREATE POLICY "Tenants can read own manifest"
    ON tenant_manifests FOR SELECT
    USING (tenant_id = get_tenant_id());

CREATE POLICY "Tenants can update own manifest"
    ON tenant_manifests FOR UPDATE
    USING (tenant_id = get_tenant_id())
    WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "Tenants can insert own manifest"
    ON tenant_manifests FOR INSERT
    WITH CHECK (tenant_id = get_tenant_id());

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Super admin full access to users"
    ON users FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

CREATE POLICY "Tenants can read own users"
    ON users FOR SELECT
    USING (tenant_id = get_tenant_id());

CREATE POLICY "Tenants can insert own users"
    ON users FOR INSERT
    WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "Tenants can update own users"
    ON users FOR UPDATE
    USING (tenant_id = get_tenant_id())
    WITH CHECK (tenant_id = get_tenant_id());

-- Users can read their own record
CREATE POLICY "Users can read own record"
    ON users FOR SELECT
    USING (
        auth_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')::UUID OR
        user_id = (current_setting('request.jwt.claims', true)::jsonb->>'user_id')::UUID
    );

-- Users can update their own record
CREATE POLICY "Users can update own record"
    ON users FOR UPDATE
    USING (
        auth_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')::UUID OR
        user_id = (current_setting('request.jwt.claims', true)::jsonb->>'user_id')::UUID
    )
    WITH CHECK (
        auth_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')::UUID OR
        user_id = (current_setting('request.jwt.claims', true)::jsonb->>'user_id')::UUID
    );

-- ============================================================================
-- LOCATIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Super admin full access to locations"
    ON locations FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

CREATE POLICY "Tenants can manage own locations"
    ON locations FOR ALL
    USING (tenant_id = get_tenant_id())
    WITH CHECK (tenant_id = get_tenant_id());

-- Public read access for active locations (for mobile app menu)
CREATE POLICY "Public can read active locations"
    ON locations FOR SELECT
    USING (is_active = true);

-- ============================================================================
-- CATEGORIES TABLE POLICIES
-- ============================================================================

CREATE POLICY "Super admin full access to categories"
    ON categories FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

CREATE POLICY "Tenants can manage own categories"
    ON categories FOR ALL
    USING (tenant_id = get_tenant_id())
    WITH CHECK (tenant_id = get_tenant_id());

-- Public read access for active categories
CREATE POLICY "Public can read active categories"
    ON categories FOR SELECT
    USING (is_active = true);

-- ============================================================================
-- MENU_ITEMS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Super admin full access to menu_items"
    ON menu_items FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

CREATE POLICY "Tenants can manage own menu_items"
    ON menu_items FOR ALL
    USING (tenant_id = get_tenant_id())
    WITH CHECK (tenant_id = get_tenant_id());

-- Public read access for available menu items
CREATE POLICY "Public can read available menu_items"
    ON menu_items FOR SELECT
    USING (is_available = true);

-- ============================================================================
-- ORDERS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Super admin full access to orders"
    ON orders FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

CREATE POLICY "Tenants can manage own orders"
    ON orders FOR ALL
    USING (tenant_id = get_tenant_id())
    WITH CHECK (tenant_id = get_tenant_id());

-- Users can read their own orders
CREATE POLICY "Users can read own orders"
    ON orders FOR SELECT
    USING (
        user_id = (current_setting('request.jwt.claims', true)::jsonb->>'user_id')::UUID OR
        user_id IN (
            SELECT user_id FROM users
            WHERE auth_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')::UUID
        )
    );

-- Users can insert their own orders
CREATE POLICY "Users can insert own orders"
    ON orders FOR INSERT
    WITH CHECK (
        user_id = (current_setting('request.jwt.claims', true)::jsonb->>'user_id')::UUID OR
        user_id IN (
            SELECT user_id FROM users
            WHERE auth_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')::UUID
        )
    );

-- Users can update their own orders (limited - only cancel)
CREATE POLICY "Users can cancel own orders"
    ON orders FOR UPDATE
    USING (
        user_id = (current_setting('request.jwt.claims', true)::jsonb->>'user_id')::UUID OR
        user_id IN (
            SELECT user_id FROM users
            WHERE auth_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')::UUID
        )
    )
    WITH CHECK (
        status = 'cancelled' AND
        (user_id = (current_setting('request.jwt.claims', true)::jsonb->>'user_id')::UUID OR
         user_id IN (
             SELECT user_id FROM users
             WHERE auth_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')::UUID
         ))
    );

-- ============================================================================
-- ORDER_ITEMS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Super admin full access to order_items"
    ON order_items FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- Access through parent order (RLS on orders handles security)
CREATE POLICY "Tenants can manage order_items via orders"
    ON order_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.order_id = order_items.order_id
            AND orders.tenant_id = get_tenant_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.order_id = order_items.order_id
            AND orders.tenant_id = get_tenant_id()
        )
    );

CREATE POLICY "Users can read own order_items"
    ON order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.order_id = order_items.order_id
            AND (
                orders.user_id = (current_setting('request.jwt.claims', true)::jsonb->>'user_id')::UUID OR
                orders.user_id IN (
                    SELECT user_id FROM users
                    WHERE auth_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')::UUID
                )
            )
        )
    );

-- ============================================================================
-- LOYALTY_TRANSACTIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Super admin full access to loyalty_transactions"
    ON loyalty_transactions FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

CREATE POLICY "Tenants can manage own loyalty_transactions"
    ON loyalty_transactions FOR ALL
    USING (tenant_id = get_tenant_id())
    WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "Users can read own loyalty_transactions"
    ON loyalty_transactions FOR SELECT
    USING (
        user_id = (current_setting('request.jwt.claims', true)::jsonb->>'user_id')::UUID OR
        user_id IN (
            SELECT user_id FROM users
            WHERE auth_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')::UUID
        )
    );

-- ============================================================================
-- REWARDS_CATALOG TABLE POLICIES
-- ============================================================================

CREATE POLICY "Super admin full access to rewards_catalog"
    ON rewards_catalog FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

CREATE POLICY "Tenants can manage own rewards_catalog"
    ON rewards_catalog FOR ALL
    USING (tenant_id = get_tenant_id())
    WITH CHECK (tenant_id = get_tenant_id());

-- Public read access for active rewards
CREATE POLICY "Public can read active rewards"
    ON rewards_catalog FOR SELECT
    USING (is_active = true);

-- ============================================================================
-- COUPONS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Super admin full access to coupons"
    ON coupons FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

CREATE POLICY "Tenants can manage own coupons"
    ON coupons FOR ALL
    USING (tenant_id = get_tenant_id())
    WITH CHECK (tenant_id = get_tenant_id());

-- Public read access for active coupons (for validation)
CREATE POLICY "Public can read active coupons"
    ON coupons FOR SELECT
    USING (
        is_active = true AND
        valid_from <= NOW() AND
        (valid_until IS NULL OR valid_until >= NOW()) AND
        (max_uses IS NULL OR current_uses < max_uses)
    );

-- ============================================================================
-- COUPON_USAGE TABLE POLICIES
-- ============================================================================

CREATE POLICY "Super admin full access to coupon_usage"
    ON coupon_usage FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- Access through parent coupon (RLS on coupons handles security)
CREATE POLICY "Tenants can manage coupon_usage via coupons"
    ON coupon_usage FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM coupons
            WHERE coupons.coupon_id = coupon_usage.coupon_id
            AND coupons.tenant_id = get_tenant_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coupons
            WHERE coupons.coupon_id = coupon_usage.coupon_id
            AND coupons.tenant_id = get_tenant_id()
        )
    );

CREATE POLICY "Users can read own coupon_usage"
    ON coupon_usage FOR SELECT
    USING (
        user_id = (current_setting('request.jwt.claims', true)::jsonb->>'user_id')::UUID OR
        user_id IN (
            SELECT user_id FROM users
            WHERE auth_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')::UUID
        )
    );

-- ============================================================================
-- PUSH_CAMPAIGNS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Super admin full access to push_campaigns"
    ON push_campaigns FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

CREATE POLICY "Tenants can manage own push_campaigns"
    ON push_campaigns FOR ALL
    USING (tenant_id = get_tenant_id())
    WITH CHECK (tenant_id = get_tenant_id());

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant select on all tables to authenticated users (RLS will filter)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant insert/update/delete to authenticated users (RLS will filter)
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_tenant_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION calculate_loyalty_points(DECIMAL, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_analytics(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION set_tenant_context(UUID) TO authenticated;

-- Grant sequence usage
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
