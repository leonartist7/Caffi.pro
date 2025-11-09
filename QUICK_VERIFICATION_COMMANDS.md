# ⚡ Quick Verification Commands

Copy and paste these commands to verify your setup.

## 🚀 Fastest Verification (30 seconds)

```bash
cd /workspace
npm install
npm run verify
```

**Expected:** `🎉 ALL TESTS PASSED!`

---

## 📋 All Verification Commands

### Automated Tests

```bash
# Full verification (all tests)
npm run verify

# Just test connection
npm run test:connection

# Direct Node execution
node verify-setup.js
node test-connection.js
```

---

### SQL Queries (Run in Supabase SQL Editor)

```sql
-- Quick check: Count everything
SELECT 'Tables' as item, COUNT(*) as count, 14 as expected
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 'Functions', COUNT(*), 15
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
UNION ALL
SELECT 'RLS Policies', COUNT(*), 50
FROM pg_policies WHERE schemaname = 'public'
UNION ALL
SELECT 'Tenants', COUNT(*), 2 FROM tenants
UNION ALL
SELECT 'Menu Items', COUNT(*), 10 FROM menu_items;
```

```sql
-- Full verification suite
-- Copy entire contents of: /workspace/verify-database.sql
```

---

### Database Structure Checks

```sql
-- List all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Count records in each table
SELECT 
    'tenants' as table_name, COUNT(*) as records FROM tenants
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'locations', COUNT(*) FROM locations
UNION ALL SELECT 'menu_items', COUNT(*) FROM menu_items
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'categories', COUNT(*) FROM categories
UNION ALL SELECT 'coupons', COUNT(*) FROM coupons;

-- Check RLS status
SELECT tablename, rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policies
FROM pg_tables WHERE schemaname = 'public'
ORDER BY tablename;
```

---

### Function Tests

```sql
-- Test order number generation
SELECT generate_order_number(
    (SELECT tenant_id FROM tenants LIMIT 1)
);
-- Expected: #YYYYMMDD-XXXX

-- Test loyalty points calculation
SELECT calculate_loyalty_points(
    25.50, 
    (SELECT tenant_id FROM tenants LIMIT 1)
);
-- Expected: 255

-- Test loyalty tier calculation
SELECT calculate_loyalty_tier(
    600,
    (SELECT tenant_id FROM tenants LIMIT 1)
);
-- Expected: silver

-- Test coupon validation
SELECT * FROM validate_coupon(
    (SELECT tenant_id FROM tenants LIMIT 1),
    'WELCOME10',
    50.00,
    NULL
);
-- Expected: valid = true
```

---

### Seed Data Checks

```sql
-- Check tenants
SELECT business_name, slug, subscription_status 
FROM tenants;
-- Expected: 2 tenants

-- Check locations
SELECT t.business_name, l.name, l.city 
FROM locations l
JOIN tenants t ON t.tenant_id = l.tenant_id;
-- Expected: 3+ locations

-- Check menu items
SELECT t.business_name, c.name as category, mi.name, mi.price
FROM menu_items mi
JOIN categories c ON c.category_id = mi.category_id
JOIN tenants t ON t.tenant_id = mi.tenant_id
ORDER BY t.business_name, c.name, mi.name;
-- Expected: 10+ items

-- Check coupons
SELECT t.business_name, c.code, c.discount_type, c.discount_value
FROM coupons c
JOIN tenants t ON t.tenant_id = c.tenant_id;
-- Expected: 4+ coupons
```

---

### Authentication Checks

```sql
-- Check auth functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'custom_access_token_hook',
    'handle_new_user',
    'user_tenant_id',
    'is_super_admin',
    'is_authenticated'
);
-- Expected: 5 functions

-- Check super_admins table
SELECT column_name FROM information_schema.columns
WHERE table_name = 'super_admins'
ORDER BY ordinal_position;
-- Expected: 8 columns
```

---

### Performance Checks

```sql
-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
    tablename,
    COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
-- Expected: 3-5 indexes per table
```

---

### Troubleshooting Commands

```sql
-- Check for errors in recent migrations
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC LIMIT 5;

-- Check RLS policies
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check triggers
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;
```

---

## 🔧 Migration Commands

```bash
# Apply migrations
cd /workspace/supabase
supabase db push

# Check migration status
supabase db diff

# Reset database (development only!)
supabase db reset

# Link to project
supabase link --project-ref YOUR_PROJECT_ID

# Check Supabase status
supabase status
```

---

## 🌐 Supabase Dashboard URLs

Replace `YOUR_PROJECT` with your project ID:

```
Dashboard:     https://supabase.com/dashboard/project/YOUR_PROJECT
SQL Editor:    https://supabase.com/dashboard/project/YOUR_PROJECT/sql
Table Editor:  https://supabase.com/dashboard/project/YOUR_PROJECT/editor
Auth:          https://supabase.com/dashboard/project/YOUR_PROJECT/auth/users
Logs:          https://supabase.com/dashboard/project/YOUR_PROJECT/logs/explorer
Settings:      https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
```

---

## 📊 Expected Results Summary

| Check | Expected | Command |
|-------|----------|---------|
| Tables | 14 | `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'` |
| Functions | 15+ | `SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public'` |
| RLS Policies | 50+ | `SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public'` |
| Tenants | 2 | `SELECT COUNT(*) FROM tenants` |
| Locations | 3+ | `SELECT COUNT(*) FROM locations` |
| Menu Items | 10+ | `SELECT COUNT(*) FROM menu_items` |
| Coupons | 4+ | `SELECT COUNT(*) FROM coupons` |
| Indexes | 40+ | `SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public'` |

---

## ✅ Success Criteria

Your setup is complete when all these pass:

```bash
# 1. Automated tests pass
npm run verify
# ✅ All tests passed

# 2. Connection works
npm run test:connection
# ✅ Found tenants, items, locations

# 3. SQL verification passes
# Run verify-database.sql in Supabase
# ✅ All sections show ✅

# 4. Tables visible in dashboard
# Open Supabase → Table Editor
# ✅ See 14 tables with data
```

---

## 🆘 Quick Fixes

### Connection Failed?
```bash
# Check your credentials in the scripts
grep -n "SUPABASE_URL\|SUPABASE_KEY" verify-setup.js test-connection.js
```

### Missing Tables?
```bash
cd /workspace/supabase
supabase db push
```

### RLS Blocking?
```sql
-- Temporarily disable (development only)
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;
```

### Need to Reset?
```bash
cd /workspace/supabase
supabase db reset
supabase db push
```

---

## 📚 Documentation Quick Links

- **Start Here:** `HOW_TO_VERIFY.md`
- **Full Guide:** `VERIFICATION_GUIDE.md`
- **Checklist:** `VERIFICATION_CHECKLIST.md`
- **Troubleshooting:** `TROUBLESHOOTING.md`
- **Database Docs:** `docs/DATABASE.md`
- **Auth Docs:** `docs/AUTHENTICATION.md`

---

**Last Updated:** 2025-01-08  
**Quick Reference Version:** 1.0
<<<<<<< HEAD
=======

>>>>>>> origin/main
