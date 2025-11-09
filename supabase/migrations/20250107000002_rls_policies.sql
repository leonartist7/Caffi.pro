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

CREATE OR REPLACE FUNCTION public.user_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('request.jwt.claims', true)::json->>'tenant_id', '')::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (current_setting('request.jwt.claims', true)::json->>'role') = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
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
    USING (public.is_super_admin());

-- Super admin can insert tenants
CREATE POLICY "Super admin can insert tenants"
    ON tenants FOR INSERT
    WITH CHECK (public.is_super_admin());

-- Super admin can update tenants
CREATE POLICY "Super admin can update tenants"
    ON tenants FOR UPDATE
    USING (public.is_super_admin());

-- Tenant owners can view their own tenant
CREATE POLICY "Tenant owners can view their own tenant"
    ON tenants FOR SELECT
    USING (tenant_id = public.user_tenant_id());

-- Tenant owners can update their own tenant
CREATE POLICY "Tenant owners can update their own tenant"
    ON tenants FOR UPDATE
    USING (tenant_id = public.user_tenant_id());

-- =====================================================
-- TENANT_MANIFESTS TABLE POLICIES
-- =====================================================

-- Super admin can manage all manifests
CREATE POLICY "Super admin can manage all manifests"
    ON tenant_manifests FOR ALL
    USING (public.is_super_admin());

-- Tenant can view their own manifest
CREATE POLICY "Tenant can view their own manifest"
    ON tenant_manifests FOR SELECT
    USING (tenant_id = public.user_tenant_id());

-- Tenant can update their own manifest
CREATE POLICY "Tenant can update their own manifest"
    ON tenant_manifests FOR UPDATE
    USING (tenant_id = public.user_tenant_id());

-- =====================================================
-- USERS TABLE POLICIES (Customers)
-- =====================================================

-- Super admin can view all users
CREATE POLICY "Super admin can view all users"
    ON users FOR SELECT
    USING (public.is_super_admin());

-- Tenant can view their own users
CREATE POLICY "Tenant can view their own users"
    ON users FOR SELECT
    USING (tenant_id = public.user_tenant_id());

-- Tenant can insert users
CREATE POLICY "Tenant can insert users"
    ON users FOR INSERT
    WITH CHECK (tenant_id = public.user_tenant_id());

-- Tenant can update their own users
CREATE POLICY "Tenant can update their own users"
    ON users FOR UPDATE
    USING (tenant_id = public.user_tenant_id());

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
    USING (public.is_super_admin());

-- Tenant can manage their own locations
CREATE POLICY "Tenant can manage their own locations"
    ON locations FOR ALL
    USING (tenant_id = public.user_tenant_id());

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
    USING (public.is_super_admin());

-- Tenant can manage their own categories
CREATE POLICY "Tenant can manage their own categories"
    ON categories FOR ALL
    USING (tenant_id = public.user_tenant_id());

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
    USING (public.is_super_admin());

-- Tenant can manage their own menu items
CREATE POLICY "Tenant can manage their own menu items"
    ON menu_items FOR ALL
    USING (tenant_id = public.user_tenant_id());

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
    USING (public.is_super_admin());

-- Tenant can view their own orders
CREATE POLICY "Tenant can view their own orders"
    ON orders FOR SELECT
    USING (tenant_id = public.user_tenant_id());

-- Tenant can update their own orders
CREATE POLICY "Tenant can update their own orders"
    ON orders FOR UPDATE
    USING (tenant_id = public.user_tenant_id());

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
            WHERE tenant_id = public.user_tenant_id()
            OR user_id IN (SELECT user_id FROM users WHERE auth_id = auth.uid())
            OR public.is_super_admin()
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
    USING (public.is_super_admin());

-- Tenant can view their own transactions
CREATE POLICY "Tenant can view their own transactions"
    ON loyalty_transactions FOR SELECT
    USING (tenant_id = public.user_tenant_id());

-- Tenant can insert transactions
CREATE POLICY "Tenant can insert transactions"
    ON loyalty_transactions FOR INSERT
    WITH CHECK (tenant_id = public.user_tenant_id());

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
    USING (public.is_super_admin());

-- Tenant can manage their own rewards
CREATE POLICY "Tenant can manage their own rewards"
    ON rewards_catalog FOR ALL
    USING (tenant_id = public.user_tenant_id());

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
    USING (public.is_super_admin());

-- Tenant can manage their own coupons
CREATE POLICY "Tenant can manage their own coupons"
    ON coupons FOR ALL
    USING (tenant_id = public.user_tenant_id());

-- Authenticated users can view active coupons (for validation)
CREATE POLICY "Users can view active coupons"
    ON coupons FOR SELECT
    USING (is_active = true AND public.is_authenticated());

-- =====================================================
-- COUPON_USAGE TABLE POLICIES
-- =====================================================

-- Super admin can view all usage
CREATE POLICY "Super admin can view all usage"
    ON coupon_usage FOR SELECT
    USING (public.is_super_admin());

-- Tenant can view usage for their coupons
CREATE POLICY "Tenant can view their coupon usage"
    ON coupon_usage FOR SELECT
    USING (
        coupon_id IN (
            SELECT coupon_id FROM coupons WHERE tenant_id = public.user_tenant_id()
        )
    );

-- System can insert coupon usage
CREATE POLICY "System can insert coupon usage"
    ON coupon_usage FOR INSERT
    WITH CHECK (public.is_authenticated());

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
    USING (public.is_super_admin());

-- Tenant can manage their own campaigns
CREATE POLICY "Tenant can manage their own campaigns"
    ON push_campaigns FOR ALL
    USING (tenant_id = public.user_tenant_id());

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

COMMENT ON FUNCTION public.user_tenant_id() IS 
    'Extracts tenant_id from JWT claims for RLS filtering';

COMMENT ON FUNCTION public.is_super_admin() IS 
    'Checks if current user has super_admin role';
