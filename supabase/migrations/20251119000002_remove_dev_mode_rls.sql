-- =====================================================
-- REMOVE DEVELOPMENT MODE RLS POLICIES
-- Security fix: Remove permissive dev-only policies
-- =====================================================

-- IMPORTANT: This migration removes all development mode RLS policies
-- that bypass authentication. Proper authentication is required after
-- this migration is applied.

-- =====================================================
-- Remove dev policies for tenants
-- =====================================================

DROP POLICY IF EXISTS "DEV: Allow anyone to view tenants" ON tenants;
DROP POLICY IF EXISTS "DEV: Allow anyone to insert tenants" ON tenants;
DROP POLICY IF EXISTS "DEV: Allow anyone to update tenants" ON tenants;
DROP POLICY IF EXISTS "DEV: Allow anyone to delete tenants" ON tenants;

-- =====================================================
-- Remove dev policies for manifests
-- =====================================================

DROP POLICY IF EXISTS "DEV: Allow anyone to manage manifests" ON tenant_manifests;

-- =====================================================
-- Remove dev policies for locations
-- =====================================================

DROP POLICY IF EXISTS "DEV: Allow anyone to manage locations" ON locations;

-- =====================================================
-- Remove dev policies for categories
-- =====================================================

DROP POLICY IF EXISTS "DEV: Allow anyone to manage categories" ON categories;

-- =====================================================
-- Remove dev policies for menu items
-- =====================================================

DROP POLICY IF EXISTS "DEV: Allow anyone to manage menu items" ON menu_items;

-- =====================================================
-- Remove dev policies for orders
-- =====================================================

DROP POLICY IF EXISTS "DEV: Allow anyone to manage orders" ON orders;
DROP POLICY IF EXISTS "DEV: Allow anyone to manage order items" ON order_items;

-- =====================================================
-- Remove dev policies for loyalty
-- =====================================================

DROP POLICY IF EXISTS "DEV: Allow anyone to manage loyalty transactions" ON loyalty_transactions;
DROP POLICY IF EXISTS "DEV: Allow anyone to manage rewards catalog" ON rewards_catalog;

-- =====================================================
-- Remove dev policies for coupons
-- =====================================================

DROP POLICY IF EXISTS "DEV: Allow anyone to manage coupons" ON coupons;
DROP POLICY IF EXISTS "DEV: Allow anyone to manage coupon usage" ON coupon_usage;

-- =====================================================
-- Remove dev policies for users
-- =====================================================

DROP POLICY IF EXISTS "DEV: Allow anyone to view users" ON users;
DROP POLICY IF EXISTS "DEV: Allow anyone to insert users" ON users;
DROP POLICY IF EXISTS "DEV: Allow anyone to update users" ON users;

-- =====================================================
-- Remove dev policies for push campaigns
-- =====================================================

DROP POLICY IF EXISTS "DEV: Allow anyone to manage push campaigns" ON push_campaigns;

-- =====================================================
-- Verification
-- =====================================================

-- After this migration, all operations require proper authentication.
-- Ensure you have production RLS policies in place before applying.

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Dev mode RLS policies removed successfully';
    RAISE NOTICE 'All operations now require proper authentication';
END $$;
