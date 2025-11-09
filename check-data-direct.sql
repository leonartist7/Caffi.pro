-- =====================================================
-- Quick Check: What data actually exists?
-- Run this in Supabase SQL Editor
-- =====================================================

-- Check 1: Count records in all tables
SELECT 'tenants' as table_name, COUNT(*) as record_count FROM tenants
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'locations', COUNT(*) FROM locations
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'menu_items', COUNT(*) FROM menu_items
UNION ALL
SELECT 'coupons', COUNT(*) FROM coupons
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'loyalty_transactions', COUNT(*) FROM loyalty_transactions
ORDER BY table_name;

-- Check 2: Show actual tenant data
SELECT 
    '=== TENANTS ===' as section,
    business_name,
    slug,
    subscription_status
FROM tenants;

-- Check 3: Show actual user data
SELECT 
    '=== USERS ===' as section,
    full_name,
    email,
    loyalty_points,
    loyalty_tier
FROM users;

-- Check 4: Show actual coupon data
SELECT 
    '=== COUPONS ===' as section,
    code,
    discount_type,
    discount_value,
    is_active
FROM coupons;

-- Check 5: RLS Status
SELECT 
    '=== RLS STATUS ===' as section,
    tablename,
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('tenants', 'users', 'coupons', 'orders')
ORDER BY tablename;

