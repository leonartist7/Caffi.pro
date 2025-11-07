# ⚡ Quick Setup Guide - 15 Minutes

Follow these steps in order to set up your Caffi.pro database.

---

## 🔗 Your Supabase Project

**URL:** https://ugppbaavzevmdkblniim.supabase.co  
**Dashboard:** https://supabase.com/dashboard/project/ugppbaavzevmdkblniim

---

## Step 1️⃣: Apply Migrations (5 min)

Go to **SQL Editor** → **New Query** → Copy & paste each file:

### Migration 1: Initial Schema
📁 File: `supabase/migrations/20250107000001_initial_schema.sql`
- Copy entire file into SQL Editor
- Click **"Run"**
- ✅ Success → Creates 13 tables

### Migration 2: RLS Policies
📁 File: `supabase/migrations/20250107000002_rls_policies.sql`
- Copy entire file into SQL Editor
- Click **"Run"**
- ✅ Success → Enables security

### Migration 3: Database Functions
📁 File: `supabase/migrations/20250107000003_database_functions.sql`
- Copy entire file into SQL Editor
- Click **"Run"**
- ✅ Success → Adds business logic

### Migration 4: Auth Setup
📁 File: `supabase/migrations/20250107000004_auth_setup.sql`
- Copy entire file into SQL Editor
- Click **"Run"**
- ✅ Success → Configures authentication

---

## Step 2️⃣: Load Test Data (2 min)

📁 File: `supabase/seed/01_test_tenants.sql`
- Copy entire file into SQL Editor
- Click **"Run"**
- ✅ Success → Loads 2 test cafés with data

---

## Step 3️⃣: Verify (2 min)

Go to **Table Editor** → Check these tables exist:

- ✅ tenants
- ✅ tenant_manifests  
- ✅ users
- ✅ locations
- ✅ categories
- ✅ menu_items
- ✅ orders
- ✅ order_items
- ✅ loyalty_transactions
- ✅ rewards_catalog
- ✅ coupons
- ✅ coupon_usage
- ✅ push_campaigns
- ✅ super_admins

**Total: 14 tables**

---

## Step 4️⃣: Configure Auth (3 min)

### Enable Phone Auth
1. Go to **Authentication** → **Providers**
2. Enable **Phone**
3. Click **Save**

### Enable JWT Hook
1. Go to **Authentication** → **Hooks**
2. Enable **"Custom Access Token"**
3. Select: `public.custom_access_token_hook`
4. Click **Save**

---

## Step 5️⃣: Create Super Admin (3 min)

### A. Create User
1. Go to **Authentication** → **Users**
2. Click **"Add user"**
3. Enter:
   - Email: `admin@caffi.pro`
   - Password: (create secure password)
   - Auto Confirm: ✅ Yes
4. Click **"Create user"**
5. **Copy the user UUID** (long string like `abc123...`)

### B. Link to Super Admin

Go to **SQL Editor** → Run this (replace `<UUID>` with copied UUID):

```sql
INSERT INTO public.super_admins (auth_id, email, full_name)
VALUES ('<UUID>', 'admin@caffi.pro', 'Super Admin');

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "super_admin"}'::jsonb
WHERE id = '<UUID>';
```

---

## ✅ Done!

### Quick Test

Run this in **SQL Editor**:

```sql
SELECT business_name, slug FROM tenants;
```

Expected result: 2 rows (Blue Bottle, Sunrise Coffee)

---

## 🚀 What's Next?

Your backend is ready! Now you can:

1. **Test the connection:**
   ```bash
   cd /workspace
   npm install @supabase/supabase-js
   node test-connection.js
   ```

2. **Start building:**
   - Admin Dashboard (MODULE 3)
   - Client Dashboard (MODULE 4)
   - Mobile App (MODULE 6)

---

## 📚 Full Documentation

- **SETUP_INSTRUCTIONS.md** - Detailed setup guide
- **docs/SETUP.md** - Complete reference
- **docs/DATABASE.md** - Schema documentation
- **docs/AUTHENTICATION.md** - Auth guide

---

**Need help?** Check `SETUP_INSTRUCTIONS.md` for troubleshooting!
