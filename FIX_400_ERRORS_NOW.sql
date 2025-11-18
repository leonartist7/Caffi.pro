-- ============================================
-- FIX 400 ERRORS - Run in Supabase SQL Editor
-- ============================================
-- This fixes the RLS policies blocking tenant_manifests queries

-- Step 1: Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow authenticated users to read tenant manifests" ON tenant_manifests;
DROP POLICY IF EXISTS "Users can view tenant manifests" ON tenant_manifests;
DROP POLICY IF EXISTS "Public read access to tenant manifests" ON tenant_manifests;

-- Step 2: Create permissive read policy for authenticated users
CREATE POLICY "authenticated_read_tenant_manifests"
ON tenant_manifests
FOR SELECT
TO authenticated
USING (true);

-- Step 3: Also allow public read access for customer-facing shop pages
CREATE POLICY "public_read_tenant_manifests"
ON tenant_manifests
FOR SELECT
TO anon
USING (true);

-- Step 4: Verify the policies were created
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'tenant_manifests'
ORDER BY policyname;

-- Expected output: Should show 2 policies
-- 1. authenticated_read_tenant_manifests
-- 2. public_read_tenant_manifests

-- ============================================
-- Additional Fix: Same for tenants table
-- ============================================

DROP POLICY IF EXISTS "Allow authenticated users to read tenants" ON tenants;
DROP POLICY IF EXISTS "Users can view tenants" ON tenants;

CREATE POLICY "authenticated_read_tenants"
ON tenants
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "public_read_tenants"
ON tenants
FOR SELECT
TO anon
USING (true);

-- ============================================
-- Verify all tables have correct policies
-- ============================================

SELECT
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('tenants', 'tenant_manifests', 'categories', 'menu_items')
GROUP BY tablename
ORDER BY tablename;

-- Expected:
-- tenants: 2+ policies
-- tenant_manifests: 2+ policies
-- categories: 2+ policies
-- menu_items: 2+ policies
