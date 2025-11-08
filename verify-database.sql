-- =====================================================
-- CAFFI.PRO - DATABASE VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor to verify everything
-- =====================================================

-- TEST 1: List all tables (should be 14)
SELECT 
    '1. TABLES' as test_section,
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = 'public' AND columns.table_name = tables.table_name) as column_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- TEST 2: Verify custom types (should be 10)
SELECT 
    '2. CUSTOM TYPES' as test_section,
    typname as type_name,
    string_agg(enumlabel, ', ' ORDER BY enumsortorder) as possible_values
FROM pg_type 
JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid
WHERE typnamespace = 'public'::regnamespace
GROUP BY typname
ORDER BY typname;

-- TEST 3: Check RLS is enabled (should be 14 tables)
SELECT 
    '3. RLS STATUS' as test_section,
    tablename, 
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- TEST 4: Count records in each table
SELECT 
    '4. RECORD COUNTS' as test_section,
    'tenants' as table_name,
    COUNT(*) as record_count
FROM tenants
UNION ALL
SELECT '4. RECORD COUNTS', 'tenant_manifests', COUNT(*) FROM tenant_manifests
UNION ALL
SELECT '4. RECORD COUNTS', 'users', COUNT(*) FROM users
UNION ALL
SELECT '4. RECORD COUNTS', 'locations', COUNT(*) FROM locations
UNION ALL
SELECT '4. RECORD COUNTS', 'categories', COUNT(*) FROM categories
UNION ALL
SELECT '4. RECORD COUNTS', 'menu_items', COUNT(*) FROM menu_items
UNION ALL
SELECT '4. RECORD COUNTS', 'orders', COUNT(*) FROM orders
UNION ALL
SELECT '4. RECORD COUNTS', 'order_items', COUNT(*) FROM order_items
UNION ALL
SELECT '4. RECORD COUNTS', 'loyalty_transactions', COUNT(*) FROM loyalty_transactions
UNION ALL
SELECT '4. RECORD COUNTS', 'rewards_catalog', COUNT(*) FROM rewards_catalog
UNION ALL
SELECT '4. RECORD COUNTS', 'coupons', COUNT(*) FROM coupons
UNION ALL
SELECT '4. RECORD COUNTS', 'coupon_usage', COUNT(*) FROM coupon_usage
UNION ALL
SELECT '4. RECORD COUNTS', 'push_campaigns', COUNT(*) FROM push_campaigns
UNION ALL
SELECT '4. RECORD COUNTS', 'super_admins', COUNT(*) FROM super_admins
ORDER BY table_name;

-- TEST 5: List all functions
SELECT 
    '5. FUNCTIONS' as test_section,
    routine_name,
    data_type as return_type,
    CASE 
        WHEN routine_name LIKE '%trigger%' OR routine_name LIKE 'update_%' THEN 'Trigger'
        WHEN routine_name LIKE 'get_%' THEN 'Analytics'
        WHEN routine_name LIKE 'calculate_%' THEN 'Calculation'
        WHEN routine_name LIKE 'validate_%' THEN 'Validation'
        WHEN routine_name LIKE 'handle_%' THEN 'Auth Handler'
        WHEN routine_name LIKE 'custom_%' THEN 'Auth Hook'
        WHEN routine_name LIKE 'is_%' THEN 'Helper'
        ELSE 'Utility'
    END as function_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY function_type, routine_name;

-- TEST 6: List all triggers
SELECT 
    '6. TRIGGERS' as test_section,
    trigger_name,
    event_manipulation,
    event_object_table as table_name
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- TEST 7: Test seed data - Tenants
SELECT 
    '7. SEED DATA - TENANTS' as test_section,
    business_name,
    slug,
    app_name,
    subscription_status,
    subscription_plan
FROM tenants
ORDER BY created_at;

-- TEST 8: Test seed data - Locations
SELECT 
    '8. SEED DATA - LOCATIONS' as test_section,
    t.business_name as tenant,
    l.name as location_name,
    l.city,
    l.is_active
FROM locations l
JOIN tenants t ON t.tenant_id = l.tenant_id
ORDER BY t.business_name, l.name;

-- TEST 9: Test seed data - Categories & Menu Items
SELECT 
    '9. SEED DATA - MENU' as test_section,
    t.business_name as tenant,
    c.name as category,
    COUNT(mi.item_id) as item_count,
    MIN(mi.price) as min_price,
    MAX(mi.price) as max_price
FROM menu_items mi
JOIN categories c ON c.category_id = mi.category_id
JOIN tenants t ON t.tenant_id = mi.tenant_id
GROUP BY t.business_name, c.name
ORDER BY t.business_name, c.name;

-- TEST 10: Test seed data - Users
SELECT 
    '10. SEED DATA - USERS' as test_section,
    t.business_name as tenant,
    u.full_name,
    u.loyalty_points,
    u.loyalty_tier,
    u.total_orders
FROM users u
JOIN tenants t ON t.tenant_id = u.tenant_id
ORDER BY t.business_name, u.full_name;

-- TEST 11: Test seed data - Coupons
SELECT 
    '11. SEED DATA - COUPONS' as test_section,
    t.business_name as tenant,
    c.code,
    c.discount_type,
    c.discount_value,
    c.min_order_amount,
    c.is_active
FROM coupons c
JOIN tenants t ON t.tenant_id = c.tenant_id
ORDER BY t.business_name, c.code;

-- TEST 12: Test function - generate_order_number
SELECT 
    '12. FUNCTION TEST - generate_order_number' as test_section,
    generate_order_number(tenant_id) as order_number,
    business_name
FROM tenants
LIMIT 1;

-- TEST 13: Test function - calculate_loyalty_points
SELECT 
    '13. FUNCTION TEST - calculate_loyalty_points' as test_section,
    calculate_loyalty_points(25.50, tenant_id) as points,
    business_name,
    '€25.50 order should give 255 points' as expected
FROM tenants
LIMIT 1;

-- TEST 14: Test function - calculate_loyalty_tier
SELECT 
    '14. FUNCTION TEST - calculate_loyalty_tier' as test_section,
    calculate_loyalty_tier(600, tenant_id) as tier,
    business_name,
    'silver' as expected_tier,
    '600 points should be silver tier' as note
FROM tenants
LIMIT 1;

-- TEST 15: Test function - validate_coupon
SELECT 
    '15. FUNCTION TEST - validate_coupon' as test_section,
    t.business_name,
    c.code,
    v.*
FROM coupons c
JOIN tenants t ON t.tenant_id = c.tenant_id
CROSS JOIN LATERAL validate_coupon(c.tenant_id, c.code, 50.00, NULL) v
WHERE c.is_active = true
LIMIT 1;

-- TEST 16: Check indexes (should be 20+)
SELECT 
    '16. INDEXES' as test_section,
    tablename,
    COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- TEST 17: Check constraints
SELECT 
    '17. CONSTRAINTS' as test_section,
    table_name,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE', 'CHECK')
ORDER BY table_name, constraint_type, constraint_name;

-- =====================================================
-- FINAL SUMMARY
-- =====================================================

SELECT 
    'SUMMARY' as test_section,
    'Tables' as metric,
    COUNT(*) as count,
    14 as expected
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
    'SUMMARY',
    'Custom Types',
    COUNT(DISTINCT typname),
    10
FROM pg_type 
JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid
WHERE typnamespace = 'public'::regnamespace

UNION ALL

SELECT 
    'SUMMARY',
    'Functions',
    COUNT(*),
    15
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'

UNION ALL

SELECT 
    'SUMMARY',
    'RLS Policies',
    COUNT(*),
    50
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'SUMMARY',
    'Indexes',
    COUNT(*),
    40
FROM pg_indexes
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'SUMMARY',
    'Triggers',
    COUNT(*),
    10
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT 
    '🎉 VERIFICATION COMPLETE' as message,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') = 14
        THEN 'All tables present ✅'
        ELSE 'Missing tables ❌'
    END as tables_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM tenants) >= 2
        THEN 'Seed data loaded ✅'
        ELSE 'Seed data missing ⚠️'
    END as seed_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION') >= 15
        THEN 'Functions present ✅'
        ELSE 'Missing functions ❌'
    END as functions_status;
