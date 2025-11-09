# 🚀 Caffi.pro - Database Setup Instructions

Your Supabase project is ready! Follow these steps to set up the database.

---

## ✅ Your Credentials

```
Project URL: https://ugppbaavzevmdkblniim.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Project Ref: ugppbaavzevmdkblniim
```

---

## 📋 Step 1: Apply Database Migrations (5 minutes)

### Option A: Via Supabase Dashboard (Easiest)

1. **Go to your Supabase Dashboard**
   - Open: https://supabase.com/dashboard/project/ugppbaavzevmdkblniim

2. **Open SQL Editor**
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New query"**

3. **Run Migration 1: Initial Schema**
   - Copy contents of: `supabase/migrations/20250107000001_initial_schema.sql`
   - Paste into SQL Editor
   - Click **"Run"** button
   - Wait for success message (creates 13 tables)

4. **Run Migration 2: RLS Policies**
   - Copy contents of: `supabase/migrations/20250107000002_rls_policies.sql`
   - Paste into SQL Editor
   - Click **"Run"**
   - Wait for success (enables security)

5. **Run Migration 3: Database Functions**
   - Copy contents of: `supabase/migrations/20250107000003_database_functions.sql`
   - Paste into SQL Editor
   - Click **"Run"**
   - Wait for success (adds business logic)

6. **Run Migration 4: Auth Setup**
   - Copy contents of: `supabase/migrations/20250107000004_auth_setup.sql`
   - Paste into SQL Editor
   - Click **"Run"**
   - Wait for success (configures authentication)

### Option B: Via CLI (Advanced)

**Note:** npm global installation is no longer supported. Use the official installer:

```bash
# Install Supabase CLI (Linux/macOS)
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz -o /tmp/supabase.tar.gz
cd /tmp && tar -xzf supabase.tar.gz
sudo mv supabase /usr/local/bin/supabase

# Verify installation
supabase --version

# Login
supabase login

# Link project
cd /workspace/supabase
supabase link --project-ref ugppbaavzevmdkblniim

# Apply migrations
supabase db push
```

**For Windows:** Download from [Supabase CLI Releases](https://github.com/supabase/cli/releases)

---

## 📋 Step 2: Load Test Data (3 minutes)

After migrations are applied:

1. **Open SQL Editor** again
2. **Copy contents of:** `supabase/seed/01_test_tenants.sql`
3. **Paste and Run**
4. **Verify** - should see:
   - 2 tenants (Blue Bottle, Sunrise Coffee)
   - 3 locations
   - 7 menu items
   - 3 test customers

---

## 📋 Step 3: Verify Tables Created (2 minutes)

1. **Go to Table Editor**
   - Click **"Table Editor"** in left sidebar

2. **Check these tables exist:**
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

## 📋 Step 4: Test Database Functions (2 minutes)

In SQL Editor, run these test queries:

```sql
-- Test 1: Check tenants
SELECT business_name, slug, subscription_status 
FROM tenants;
-- Expected: 2 rows (Blue Bottle, Sunrise Coffee)

-- Test 2: Generate order number
SELECT generate_order_number('11111111-1111-1111-1111-111111111111');
-- Expected: #20250107-0001 (or current date)

-- Test 3: Calculate loyalty points
SELECT calculate_loyalty_points(25.50, '11111111-1111-1111-1111-111111111111');
-- Expected: 255 (25.50 × 10 points per euro)

-- Test 4: Validate coupon
SELECT * FROM validate_coupon(
    '11111111-1111-1111-1111-111111111111',
    'WELCOME10',
    50.00,
    NULL
);
-- Expected: valid = true, discount_amount = 5.00

-- Test 5: Check menu items
SELECT name, price FROM menu_items LIMIT 5;
-- Expected: 5 menu items with prices
```

---

## 📋 Step 5: Configure Authentication (5 minutes)

### A. Enable Phone Auth (for mobile customers)

1. **Go to Authentication > Providers**
2. **Enable Phone**
3. **For Testing:**
   - Select **"Enable phone confirmations"**
   - Leave default settings
4. **For Production (later):**
   - Choose **Twilio**
   - Add credentials from https://www.twilio.com
5. **Click Save**

### B. Enable Custom JWT Hook

1. **Go to Authentication > Hooks**
2. **Find "Custom Access Token"**
3. **Enable it**
4. **Select function:** `public.custom_access_token_hook`
5. **Click Save**

This adds `tenant_id` and `role` to JWT tokens for Row-Level Security.

---

## 📋 Step 6: Create Super Admin User (3 minutes)

### A. Create Auth User

1. **Go to Authentication > Users**
2. **Click "Add user"**
3. **Enter:**
   - Email: `admin@caffi.pro`
   - Password: Create a secure password (save it!)
   - Auto Confirm: ✅ Yes
4. **Click "Create user"**
5. **Copy the user's UUID** (you'll need it next)

### B. Link to Super Admin Table

1. **Go to SQL Editor**
2. **Run this** (replace `<user-uuid>` with the UUID you copied):

```sql
-- Add to super_admins table
INSERT INTO public.super_admins (auth_id, email, full_name)
VALUES (
    '<user-uuid>',
    'admin@caffi.pro',
    'Super Admin'
);

-- Set role in auth metadata
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "super_admin"}'::jsonb
WHERE id = '<user-uuid>';
```

3. **Click Run**
4. **Verify:** Should see "Success. 2 rows affected"

---

## 📋 Step 7: Test Connection (5 minutes)

### Option A: Via Browser Test Script

1. **Install dependencies:**
```bash
cd /workspace
npm install @supabase/supabase-js
```

2. **Run test:**
```bash
node test-connection.js
```

3. **Expected output:**
```
🔌 Testing Supabase connection...

📋 Test 1: Query tenants table...
✅ Found 2 tenants:
   - Blue Bottle Coffee Paris (bluebottle-paris) - active
   - Sunrise Coffee Lyon (sunrise-lyon) - trial

📋 Test 2: Query menu items...
✅ Found 5 menu items:
   - Drip Coffee: €4.5
   - Cappuccino: €5
   ...

🎉 All tests passed! Database is working correctly.
```

### Option B: Via Supabase Dashboard

1. **Go to Table Editor**
2. **Click on "tenants" table**
3. **Should see:**
   - Blue Bottle Coffee Paris
   - Sunrise Coffee Lyon

---

## ✅ Setup Complete Checklist

- [ ] Migrations 1-4 applied successfully
- [ ] Seed data loaded (2 tenants visible)
- [ ] 14 tables created
- [ ] Phone auth enabled
- [ ] Custom JWT hook enabled
- [ ] Super admin user created
- [ ] Connection test passed

---

## 🎉 You're Done!

Your Caffi.pro backend is now **100% operational**!

### What You Have Now:
- ✅ Multi-tenant database with 13 tables
- ✅ Row-Level Security enabled
- ✅ 8 database functions working
- ✅ Authentication configured (3 types)
- ✅ Test data ready to use
- ✅ Super admin account created

### What You Can Do:
- Query all tables via Supabase Dashboard
- Test loyalty point calculations
- Validate coupons
- Generate order numbers
- Run analytics queries

---

## 🚀 Next Steps

### Option 1: Build Admin Dashboard (Recommended)
Create a web interface to manage cafés:
```bash
cd /workspace/admin-dashboard
# Follow MODULE 3 in the specification
```

### Option 2: Build Client Dashboard
Create a dashboard for café owners:
```bash
cd /workspace/client-dashboard
# Follow MODULE 4 in the specification
```

### Option 3: Build Mobile App
Create the customer mobile app:
1. Go to https://flutterflow.io
2. Create new project
3. Connect to Supabase (use URL and Anon Key above)
4. Follow MODULE 6 in the specification

---

## 🆘 Troubleshooting

### "Migration failed"
- Make sure you're running migrations in order (1, 2, 3, 4)
- Check SQL Editor for error messages
- Try running each migration separately

### "Table already exists"
- Tables may have been created already
- Check Table Editor to see what exists
- Skip migrations for existing tables

### "RLS blocking queries"
- This is normal! RLS is working
- Queries need authentication
- Use test script with anon key to query

### "Custom JWT hook not found"
- Make sure Migration 4 ran successfully
- Check Database > Functions for `custom_access_token_hook`
- Re-run Migration 4 if needed

---

## 📚 Documentation

- **Full Setup Guide:** `docs/SETUP.md`
- **Database Reference:** `docs/DATABASE.md`
- **Authentication Guide:** `docs/AUTHENTICATION.md`
- **Deployment Guide:** `docs/DEPLOYMENT.md`

---

## 📞 Need Help?

- **Supabase Discord:** https://discord.supabase.com
- **Supabase Docs:** https://supabase.com/docs
- **Project Docs:** Check the `docs/` folder

---

**Ready to build! Let's go! 🚀**
