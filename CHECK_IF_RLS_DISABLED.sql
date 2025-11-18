-- ============================================
-- DIAGNOSTIC: Check if RLS was actually disabled
-- ============================================

-- Step 1: Check current RLS status
SELECT
    schemaname,
    tablename,
    rowsecurity,
    CASE
        WHEN rowsecurity = true THEN '❌ RLS IS STILL ENABLED - THIS IS THE PROBLEM'
        WHEN rowsecurity = false THEN '✅ RLS IS DISABLED - GOOD'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('tenant_manifests', 'tenants', 'categories', 'menu_items')
ORDER BY tablename;

-- Step 2: Check what policies exist (if any)
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('tenant_manifests', 'tenants')
ORDER BY tablename, policyname;

-- Step 3: Check table ownership
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE tablename IN ('tenant_manifests', 'tenants', 'categories', 'menu_items')
ORDER BY tablename;
