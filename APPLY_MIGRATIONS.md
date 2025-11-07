# 🚀 Apply Database Migrations - Manual Method

This is the **easiest and most reliable** way to set up your database!

---

## ⚡ 5-Minute Setup

### Step 1: Open Your Dashboard

Go to: **https://supabase.com/dashboard/project/ugppbaavzevmdkblniim**

---

### Step 2: Open SQL Editor

Click **"SQL Editor"** in the left sidebar

---

### Step 3: Run Migration Files (One at a Time)

For each file below:
1. Open the file in your code editor
2. **Copy ALL contents** (Ctrl+A, Ctrl+C)
3. Go to SQL Editor in Supabase Dashboard
4. Click **"New Query"**
5. **Paste** the contents (Ctrl+V)
6. Click **"Run"** button (or press Ctrl+Enter)
7. Wait for ✅ "Success" message

---

### Migration 1: Initial Schema (Creates 13 tables)

📁 **File:** `/workspace/supabase/migrations/20250107000001_initial_schema.sql`

**What it does:** Creates all database tables
- tenants, tenant_manifests, users, locations
- categories, menu_items, orders, order_items
- loyalty_transactions, rewards_catalog
- coupons, coupon_usage, push_campaigns

---

### Migration 2: RLS Policies (Enables security)

📁 **File:** `/workspace/supabase/migrations/20250107000002_rls_policies.sql`

**What it does:** Enables Row-Level Security
- Protects all tables with security policies
- Multi-tenant data isolation
- Role-based access control

---

### Migration 3: Database Functions (Business logic)

📁 **File:** `/workspace/supabase/migrations/20250107000003_database_functions.sql`

**What it does:** Adds business logic
- Order number generation
- Loyalty point calculations
- Coupon validation
- Analytics functions
- 7 automated triggers

---

### Migration 4: Auth Setup (Authentication)

📁 **File:** `/workspace/supabase/migrations/20250107000004_auth_setup.sql`

**What it does:** Configures authentication
- Custom JWT claims
- Super admin table
- Auth hooks
- User signup handling

---

### Migration 5: Test Data (Optional but recommended)

📁 **File:** `/workspace/supabase/seed/01_test_tenants.sql`

**What it does:** Loads sample data
- 2 test cafés (Blue Bottle, Sunrise Coffee)
- 3 locations
- 7 menu items with prices
- 3 test customers
- Sample rewards and coupons

---

## ✅ Verification

After running all files, verify in **Table Editor**:

You should see these 14 tables:
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

---

## 🧪 Quick Test

In SQL Editor, run:

```sql
-- Should return 2 cafés
SELECT business_name, slug FROM tenants;

-- Should return menu items
SELECT name, price FROM menu_items LIMIT 5;

-- Should return locations
SELECT name, city FROM locations;
```

Expected results:
- 2 tenants (Blue Bottle, Sunrise Coffee)
- 5+ menu items
- 3 locations

---

## 🎯 What's Next

Once migrations are done:

### 1. Enable Phone Auth (2 min)
- Go to **Authentication > Providers**
- Enable **Phone**
- Click **Save**

### 2. Enable JWT Hook (1 min)
- Go to **Authentication > Hooks**
- Enable **"Custom Access Token"**
- Select function: `public.custom_access_token_hook`
- Click **Save**

### 3. Create Super Admin (2 min)
- Go to **Authentication > Users**
- Click **"Add user"**
- Email: `admin@caffi.pro`
- Password: (create secure password)
- Auto Confirm: ✅ Yes
- Click **"Create user"**

Then in SQL Editor:

```sql
-- Replace <USER_UUID> with the UUID from the created user
INSERT INTO public.super_admins (auth_id, email, full_name)
VALUES ('<USER_UUID>', 'admin@caffi.pro', 'Super Admin');

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "super_admin"}'::jsonb
WHERE id = '<USER_UUID>';
```

---

## 🎉 Done!

Your database is now fully operational!

Test it:
```bash
cd /workspace
npm install @supabase/supabase-js
node test-connection.js
```

---

## 🆘 Troubleshooting

### "Syntax error near..."
- Make sure you copied the **entire** file
- Check you didn't accidentally copy line numbers
- Try copying again

### "Relation already exists"
- Table was already created
- This is okay! Skip to next migration

### "Function does not exist"
- Make sure Migration 3 ran successfully
- Re-run Migration 3 if needed

---

## 📚 Next Steps

Once database is working:
- Read **START_HERE.md** for what to build next
- Test connection with `node test-connection.js`
- Choose next module (Admin Dashboard, Client Dashboard, or Mobile App)

---

**Ready? Open your Supabase Dashboard and start copying files!** 🚀

Dashboard: https://supabase.com/dashboard/project/ugppbaavzevmdkblniim
