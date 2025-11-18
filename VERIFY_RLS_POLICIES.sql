-- ============================================
-- Step 1: Check Current RLS Policies
-- ============================================
-- Run this first to see what policies exist

SELECT
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('tenant_manifests', 'tenants')
ORDER BY tablename, policyname;

-- ============================================
-- Step 2: Check if RLS is even enabled
-- ============================================

SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('tenant_manifests', 'tenants');

-- If rowsecurity is 'false', RLS is disabled (good for testing)
-- If rowsecurity is 'true', RLS is enabled (need correct policies)
