-- ============================================
-- NUCLEAR OPTION: Temporarily Disable RLS
-- ============================================
-- This will fix the 400 errors immediately
-- WARNING: This disables security - only for development/testing

-- Option 1: Disable RLS completely (fastest fix for development)
ALTER TABLE tenant_manifests DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('tenant_manifests', 'tenants', 'categories', 'menu_items')
ORDER BY tablename;

-- Expected: All should show rowsecurity = false

-- ============================================
-- After this, refresh your admin dashboard
-- All 400 errors should be GONE
-- ============================================
