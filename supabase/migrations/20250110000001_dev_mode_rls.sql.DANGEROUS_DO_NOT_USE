-- =====================================================
-- DEVELOPMENT MODE RLS POLICIES
-- Temporary permissive policies for development
-- =====================================================

-- IMPORTANT: These policies bypass authentication for development.
-- Remove or disable these policies in production!

-- =====================================================
-- DEVELOPMENT: Allow unauthenticated tenant management
-- =====================================================

-- Allow anyone to view all tenants (for development)
CREATE POLICY "DEV: Allow anyone to view tenants"
    ON tenants FOR SELECT
    USING (true);

-- Allow anyone to insert tenants (for development)
CREATE POLICY "DEV: Allow anyone to insert tenants"
    ON tenants FOR INSERT
    WITH CHECK (true);

-- Allow anyone to update tenants (for development)
CREATE POLICY "DEV: Allow anyone to update tenants"
    ON tenants FOR UPDATE
    USING (true);

-- Allow anyone to delete tenants (for development)
CREATE POLICY "DEV: Allow anyone to delete tenants"
    ON tenants FOR DELETE
    USING (true);

-- =====================================================
-- DEVELOPMENT: Allow unauthenticated manifest management
-- =====================================================

-- Allow anyone to manage all manifests (for development)
CREATE POLICY "DEV: Allow anyone to manage manifests"
    ON tenant_manifests FOR ALL
    USING (true);

-- =====================================================
-- DEVELOPMENT: Allow unauthenticated location management
-- =====================================================

CREATE POLICY "DEV: Allow anyone to manage locations"
    ON locations FOR ALL
    USING (true);

-- =====================================================
-- DEVELOPMENT: Allow unauthenticated category management
-- =====================================================

CREATE POLICY "DEV: Allow anyone to manage categories"
    ON categories FOR ALL
    USING (true);

-- =====================================================
-- DEVELOPMENT: Allow unauthenticated menu item management
-- =====================================================

CREATE POLICY "DEV: Allow anyone to manage menu items"
    ON menu_items FOR ALL
    USING (true);

-- =====================================================
-- DEVELOPMENT: Allow unauthenticated order management
-- =====================================================

CREATE POLICY "DEV: Allow anyone to manage orders"
    ON orders FOR ALL
    USING (true);

CREATE POLICY "DEV: Allow anyone to manage order items"
    ON order_items FOR ALL
    USING (true);

-- =====================================================
-- DEVELOPMENT: Allow unauthenticated loyalty management
-- =====================================================

CREATE POLICY "DEV: Allow anyone to manage loyalty transactions"
    ON loyalty_transactions FOR ALL
    USING (true);

CREATE POLICY "DEV: Allow anyone to manage rewards catalog"
    ON rewards_catalog FOR ALL
    USING (true);

-- =====================================================
-- DEVELOPMENT: Allow unauthenticated coupon management
-- =====================================================

CREATE POLICY "DEV: Allow anyone to manage coupons"
    ON coupons FOR ALL
    USING (true);

CREATE POLICY "DEV: Allow anyone to manage coupon usage"
    ON coupon_usage FOR ALL
    USING (true);

-- =====================================================
-- DEVELOPMENT: Allow unauthenticated user management
-- =====================================================

CREATE POLICY "DEV: Allow anyone to view users"
    ON users FOR SELECT
    USING (true);

CREATE POLICY "DEV: Allow anyone to insert users"
    ON users FOR INSERT
    WITH CHECK (true);

CREATE POLICY "DEV: Allow anyone to update users"
    ON users FOR UPDATE
    USING (true);

-- =====================================================
-- DEVELOPMENT: Allow unauthenticated push campaign management
-- =====================================================

CREATE POLICY "DEV: Allow anyone to manage push campaigns"
    ON push_campaigns FOR ALL
    USING (true);
