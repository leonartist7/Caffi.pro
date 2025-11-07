# ⚠️ IMPORTANT: How to Apply Migrations Correctly

## ❌ What You Did (Wrong)

You copied this:
```
supabase/migrations/20250107000001_initial_schema.sql
```

That's just the FILE PATH, not the actual SQL code!

---

## ✅ What You Should Do (Correct)

### Step 1: Open the File in Your Editor

**Don't copy the path!** Instead:

1. In your code editor (VS Code, Cursor, etc.)
2. Navigate to the file
3. **OPEN** the file: `supabase/migrations/20250107000001_initial_schema.sql`
4. You should see SQL code starting with:

```sql
-- =====================================================
-- CAFFI.PRO - INITIAL DATABASE SCHEMA
-- Multi-tenant SaaS for Coffee Shop Apps
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

### Step 2: Copy ALL the SQL Code

1. **Select all** (Ctrl+A or Cmd+A)
2. **Copy** (Ctrl+C or Cmd+C)
3. The file is about 600+ lines of SQL code

---

### Step 3: Paste in Supabase SQL Editor

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/ugppbaavzevmdkblniim
2. Click **SQL Editor** (left sidebar)
3. Click **"New Query"**
4. **Paste** the SQL code (Ctrl+V or Cmd+V)
5. Click **"Run"** button

You should see:
```
✅ Success
Applied migration
```

---

## 📋 Complete Process for All 5 Files

### File 1: Initial Schema

**Open:** `supabase/migrations/20250107000001_initial_schema.sql`

**Look for this at the top:**
```sql
-- =====================================================
-- CAFFI.PRO - INITIAL DATABASE SCHEMA
-- Multi-tenant SaaS for Coffee Shop Apps
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

**Copy ALL ~600 lines** → Paste in SQL Editor → Run

**Expected result:** Creates 13 tables

---

### File 2: RLS Policies

**Open:** `supabase/migrations/20250107000002_rls_policies.sql`

**Look for this at the top:**
```sql
-- =====================================================
-- CAFFI.PRO - ROW-LEVEL SECURITY (RLS) POLICIES
-- Multi-tenant data isolation
-- =====================================================

-- Enable RLS ON ALL TABLES
```

**Copy ALL ~400 lines** → Paste in SQL Editor → Run

**Expected result:** Enables security on all tables

---

### File 3: Database Functions

**Open:** `supabase/migrations/20250107000003_database_functions.sql`

**Look for this at the top:**
```sql
-- =====================================================
-- CAFFI.PRO - DATABASE FUNCTIONS
-- Business logic and automation
-- =====================================================

-- Generate unique order number
CREATE OR REPLACE FUNCTION generate_order_number
```

**Copy ALL ~500 lines** → Paste in SQL Editor → Run

**Expected result:** Creates 8 functions and 7 triggers

---

### File 4: Auth Setup

**Open:** `supabase/migrations/20250107000004_auth_setup.sql`

**Look for this at the top:**
```sql
-- =====================================================
-- CAFFI.PRO - AUTHENTICATION SETUP
-- Custom JWT claims and auth hooks
-- =====================================================

-- Custom access token hook
CREATE OR REPLACE FUNCTION public.custom_access_token_hook
```

**Copy ALL ~200 lines** → Paste in SQL Editor → Run

**Expected result:** Sets up authentication system

---

### File 5: Test Data

**Open:** `supabase/seed/01_test_tenants.sql`

**Look for this at the top:**
```sql
-- =====================================================
-- CAFFI.PRO - SEED DATA
-- Test tenants and sample data
-- =====================================================

-- TEST TENANT 1: Blue Bottle Coffee
INSERT INTO tenants (
```

**Copy ALL ~350 lines** → Paste in SQL Editor → Run

**Expected result:** Loads 2 test cafés with data

---

## ✅ Verification

After running all 5 files:

### Check Tables

Go to **Table Editor** in Supabase Dashboard.

You should see these 14 tables:
- tenants
- tenant_manifests
- users
- locations
- categories
- menu_items
- orders
- order_items
- loyalty_transactions
- rewards_catalog
- coupons
- coupon_usage
- push_campaigns
- super_admins

### Run Test Query

In SQL Editor:

```sql
SELECT business_name, slug FROM tenants;
```

Expected result: 2 rows
- Blue Bottle Coffee Paris (bluebottle-paris)
- Sunrise Coffee Lyon (sunrise-lyon)

---

## 🆘 Troubleshooting

### "No tables found"

You haven't run the migrations yet. Make sure you:
1. Copied the **file CONTENTS** (the SQL code)
2. NOT the file path
3. Ran all 5 files in order

### "Success. No rows returned"

This means the SQL ran but didn't create anything. You probably:
- Copied the file path instead of contents
- Commented out the actual SQL
- Need to start over with the actual SQL code

### "Syntax error"

- Make sure you copied ALL the file contents
- Don't include the file path in the SQL
- Don't add extra characters or comments

---

## 🎯 Quick Checklist

Before clicking "Run":
- [ ] I opened the file in my code editor
- [ ] I see SQL code (CREATE TABLE, INSERT, etc.)
- [ ] I selected ALL the code (Ctrl+A)
- [ ] I copied it (Ctrl+C)
- [ ] I pasted in SQL Editor (NOT the file path!)
- [ ] The SQL Editor shows hundreds of lines of code
- [ ] Now I click "Run"

---

## 💡 Visual Guide

**WRONG ❌**
```
Copy this text from the guide:
supabase/migrations/20250107000001_initial_schema.sql
```

**CORRECT ✅**
```
1. Open the file in your editor
2. See actual SQL code starting with:
   -- =====================================================
   -- CAFFI.PRO - INITIAL DATABASE SCHEMA
   ...
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ...
3. Select ALL and copy THAT code
```

---

**Ready to try again?** Open the first migration file in your editor and copy the ACTUAL SQL code! 🚀
