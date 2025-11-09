# 📋 Database Migration Order

**Follow these steps in exact order to set up your Caffi.pro database.**

---

## ✅ Prerequisites

1. Supabase project created
2. Supabase Dashboard open: https://supabase.com/dashboard
3. SQL Editor ready

---

## 📝 Migration Steps

### Step 1: Initial Schema ✅
**File:** `supabase/migrations/20250107000001_initial_schema.sql`

**What it does:**
- Creates 13 tables (tenants, users, orders, etc.)
- Sets up custom types (enums)
- Creates indexes for performance
- Adds data validation constraints

**How to run:**
1. Copy entire file contents
2. Go to **SQL Editor** → **New Query**
3. Paste and click **"Run"**
4. Wait for success message

**Expected result:** ✅ 13 tables created

---

### Step 2: RLS Policies ✅
**File:** `supabase/migrations/20250107000002_rls_policies.sql`

**What it does:**
- Enables Row-Level Security on all tables
- Creates helper functions for multi-tenancy
- Sets up access policies (who can read/write what)

**How to run:**
1. Copy entire file contents
2. Go to **SQL Editor** → **New Query**
3. Paste and click **"Run"**
4. Wait for success message

**Expected result:** ✅ RLS enabled + 40+ policies created

---

### Step 3: Database Functions
**File:** `supabase/migrations/20250107000003_database_functions.sql`

**What it does:**
- Creates business logic functions:
  - `calculate_loyalty_points()` - Award points for purchases
  - `generate_order_number()` - Create unique order numbers
  - `validate_coupon()` - Check coupon validity
  - `get_tenant_analytics()` - Generate reports

**How to run:**
1. Copy entire file contents
2. Go to **SQL Editor** → **New Query**
3. Paste and click **"Run"**
4. Wait for success message

**Expected result:** ✅ 4 business functions created

---

### Step 4: Auth Setup
**File:** `supabase/migrations/20250107000004_auth_setup.sql`

**What it does:**
- Creates `super_admins` table
- Sets up custom JWT hook (adds tenant_id to tokens)
- Configures authentication flow

**How to run:**
1. Copy entire file contents
2. Go to **SQL Editor** → **New Query**
3. Paste and click **"Run"**
4. Wait for success message

**Expected result:** ✅ Auth system configured

---

### Step 5: Load Test Data (Optional)
**File:** `supabase/seed/01_test_tenants.sql`

**What it does:**
- Creates 2 test café businesses
- Adds 3 locations
- Inserts 7 menu items
- Creates 3 test customers

**How to run:**
1. Copy entire file contents
2. Go to **SQL Editor** → **New Query**
3. Paste and click **"Run"**
4. Wait for success message

**Expected result:** ✅ Sample data loaded

---

## 🔍 Verification

After all migrations complete, run this in SQL Editor:

```sql
-- Should return 14 tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should return 2 test tenants (if you loaded seed data)
SELECT business_name, slug FROM tenants;

-- Should return 4 helper functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'user_tenant_id',
    'is_super_admin', 
    'is_authenticated',
    'calculate_loyalty_points',
    'generate_order_number',
    'validate_coupon',
    'get_tenant_analytics'
  )
ORDER BY routine_name;

-- Should show RLS enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

**Expected results:**
- ✅ 14 tables
- ✅ 7+ functions
- ✅ RLS enabled (rowsecurity = true)
- ✅ 2 tenants (if seed data loaded)

---

## ❌ Common Errors & Fixes

### Error 1: "column is_active does not exist"
**Solution:** This has been fixed. Use the updated migration files.

### Error 2: "permission denied for schema auth"
**Solution:** This has been fixed. Helper functions now use `public` schema.

### Error 3: "relation does not exist"
**Solution:** You're running migrations out of order. Start from Step 1.

### Error 4: Migration partially failed
**Solution:** Run the reset script first:

```sql
-- Copy contents of: supabase/reset_database.sql
-- Then re-run migrations from Step 1
```

---

## 📊 Progress Checklist

- [ ] Step 1: Initial Schema ✅
- [ ] Step 2: RLS Policies ✅
- [ ] Step 3: Database Functions ✅
- [ ] Step 4: Auth Setup ✅
- [ ] Step 5: Test Data (Optional) ✅
- [ ] Verification queries pass ✅

---

## 🎯 Next Steps

After migrations complete:

1. **Configure Authentication**
   - Go to **Authentication** → **Providers**
   - Enable **Email** and **Phone**

2. **Enable JWT Hook**
   - Go to **Authentication** → **Hooks**
   - Enable **"Custom Access Token"**
   - Select: `public.custom_access_token_hook`

3. **Create Super Admin**
   - Go to **Authentication** → **Users**
   - Add user with email/password
   - Run SQL to link to super_admins table

4. **Test Connection**
   - Run: `node test-connection.js`

---

## 📚 Documentation

- **TROUBLESHOOTING.md** - Common issues & solutions
- **GETTING_STARTED.md** - Complete setup guide
- **docs/DATABASE.md** - Schema reference
- **docs/AUTHENTICATION.md** - Auth guide

---

**Ready?** Start with Step 1! 🚀
