# ✅ Quick Verification Checklist

Use this checklist to quickly verify your Caffi.pro setup is complete.

## 🚀 Quick Start Verification

### Option 1: Automated Script (Recommended)
```bash
cd /workspace
node verify-setup.js
```

### Option 2: Manual SQL Check
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste `/workspace/verify-database.sql`
3. Click "Run"
4. Review results

### Option 3: Connection Test
```bash
cd /workspace
node test-connection.js
```

---

## 📋 Manual Verification Checklist

### 1. Database Structure ✅

- [ ] **14 tables created**
  - Run: `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';`
  - Expected: 14

- [ ] **10 custom types**
  - Check: subscription_status, order_status, loyalty_tier, etc.
  - Run: `SELECT COUNT(DISTINCT typname) FROM pg_type JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid WHERE typnamespace = 'public'::regnamespace;`
  - Expected: 10

- [ ] **40+ indexes created**
  - Run: `SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';`
  - Expected: 40+

---

### 2. Row-Level Security (RLS) ✅

- [ ] **RLS enabled on all tables**
  - Run: `SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;`
  - Expected: 14

- [ ] **50+ RLS policies**
  - Run: `SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';`
  - Expected: 50+

- [ ] **Helper functions work**
  - Check: `user_tenant_id()`, `is_super_admin()`, `is_authenticated()`

---

### 3. Database Functions ✅

- [ ] **15+ functions created**
  - Run: `SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';`
  - Expected: 15+

- [ ] **Key functions tested**
  - [ ] `generate_order_number()` - returns `#YYYYMMDD-XXXX`
  - [ ] `calculate_loyalty_points(25.50, tenant_id)` - returns 255
  - [ ] `calculate_loyalty_tier(600, tenant_id)` - returns 'silver'
  - [ ] `validate_coupon()` - validates coupon codes

---

### 4. Seed Data ✅

- [ ] **2 test tenants**
  - Blue Bottle Coffee (blue-bottle)
  - Sunrise Coffee Roasters (sunrise-coffee)
  - Run: `SELECT COUNT(*) FROM tenants;`
  - Expected: 2

- [ ] **3+ locations**
  - Run: `SELECT COUNT(*) FROM locations;`
  - Expected: 3+

- [ ] **10+ menu items**
  - Run: `SELECT COUNT(*) FROM menu_items;`
  - Expected: 10+

- [ ] **2+ test users**
  - Run: `SELECT COUNT(*) FROM users;`
  - Expected: 2+

- [ ] **4+ coupons**
  - Run: `SELECT COUNT(*) FROM coupons;`
  - Expected: 4+

---

### 5. Authentication Setup ✅

- [ ] **Custom JWT hook exists**
  - Function: `custom_access_token_hook`
  - Run: `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'custom_access_token_hook';`

- [ ] **New user trigger exists**
  - Function: `handle_new_user`
  - Trigger: `on_auth_user_created`

- [ ] **super_admins table created**
  - Run: `SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'super_admins';`
  - Expected: 1

---

### 6. Business Logic Tests ✅

- [ ] **Order number generation**
  ```sql
  SELECT generate_order_number((SELECT tenant_id FROM tenants LIMIT 1));
  ```
  - Format: `#YYYYMMDD-XXXX`

- [ ] **Loyalty points calculation**
  ```sql
  SELECT calculate_loyalty_points(25.50, (SELECT tenant_id FROM tenants LIMIT 1));
  ```
  - Expected: 255 (€25.50 × 10 points/euro)

- [ ] **Loyalty tier calculation**
  ```sql
  SELECT calculate_loyalty_tier(600, (SELECT tenant_id FROM tenants LIMIT 1));
  ```
  - Expected: 'silver' (threshold is 500 points)

- [ ] **Coupon validation**
  ```sql
  SELECT * FROM validate_coupon(
    (SELECT tenant_id FROM tenants LIMIT 1),
    'WELCOME10',
    50.00,
    NULL
  );
  ```
  - Should return: valid = true, with discount amount

---

### 7. Connection Tests ✅

- [ ] **Supabase connection works**
  ```bash
  node test-connection.js
  ```
  - Should query: tenants, menu_items, locations, users
  - All queries should succeed

- [ ] **Can query all tables**
  - Test in Supabase Dashboard
  - Try SELECT on each table
  - Respect RLS policies

---

## 🎯 Quick SQL Verification

Run this one query to check everything at once:

```sql
SELECT 
    'Tables' as metric,
    COUNT(*) as actual,
    14 as expected,
    CASE WHEN COUNT(*) = 14 THEN '✅' ELSE '❌' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
    'Functions',
    COUNT(*),
    15,
    CASE WHEN COUNT(*) >= 15 THEN '✅' ELSE '❌' END
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'

UNION ALL

SELECT 
    'RLS Policies',
    COUNT(*),
    50,
    CASE WHEN COUNT(*) >= 50 THEN '✅' ELSE '❌' END
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Tenants (seed data)',
    COUNT(*),
    2,
    CASE WHEN COUNT(*) >= 2 THEN '✅' ELSE '⚠️' END
FROM tenants

UNION ALL

SELECT 
    'Menu Items (seed data)',
    COUNT(*),
    10,
    CASE WHEN COUNT(*) >= 10 THEN '✅' ELSE '⚠️' END
FROM menu_items;
```

**Expected Result:** All rows should have ✅ status

---

## 🔧 Troubleshooting

If any checks fail:

1. **Check migration order**
   - Migrations must run in order: 
     1. `initial_schema.sql`
     2. `rls_policies.sql`
     3. `database_functions.sql`
     4. `auth_setup.sql`

2. **Re-run failed migration**
   - Open Supabase SQL Editor
   - Copy migration file content
   - Run manually

3. **Check for errors**
   - Go to Supabase → Logs
   - Look for SQL errors
   - Check TROUBLESHOOTING.md

4. **Reset database (development only)**
   ```sql
   -- Copy contents of /workspace/supabase/reset_database.sql
   -- Run in SQL Editor
   -- Then re-apply all migrations
   ```

---

## ✨ Success Criteria

Your setup is complete when:

- ✅ All 14 tables exist
- ✅ All RLS policies are active
- ✅ All functions work correctly
- ✅ Seed data is loaded
- ✅ Connection test passes
- ✅ No errors in Supabase logs

---

## 🚀 Next Steps After Verification

Once everything passes:

1. **Configure Authentication**
   - Enable JWT hook in Supabase Dashboard
   - Set up phone auth (Twilio)
   - Create first super admin user

2. **Test Auth Flows**
   - Super admin login
   - Tenant owner login
   - Customer phone OTP

3. **Start Building Frontend**
   - Option A: Admin Dashboard (MODULE 3)
   - Option B: Client Dashboard (MODULE 4)
   - Option C: Mobile App (MODULE 6)

4. **Update Environment Variables**
   - Copy `.env.example` to `.env`
   - Add Supabase URL and keys
   - Add Twilio credentials (for phone auth)

---

## 📚 Documentation References

- **Full Guide:** `VERIFICATION_GUIDE.md`
- **Database Docs:** `docs/DATABASE.md`
- **Auth Docs:** `docs/AUTHENTICATION.md`
- **Setup Guide:** `docs/SETUP.md`
- **Troubleshooting:** `TROUBLESHOOTING.md`

---

## 💡 Pro Tips

1. **Use service_role key for testing**
   - Bypasses RLS for easier debugging
   - Never expose in production!

2. **Check Supabase Dashboard**
   - Table Editor → See data visually
   - SQL Editor → Run custom queries
   - Logs → Debug errors

3. **Save verification queries**
   - Create a "Verification" query in SQL Editor
   - Re-run periodically
   - Share with team

4. **Automate checks**
   - Run `verify-setup.js` in CI/CD
   - Add to pre-deployment checks
   - Monitor production database health

---

**Last Updated:** 2025-01-08
**Version:** 1.0.0
**Status:** ✅ Ready for use

