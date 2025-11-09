# 🗄️ HOW TO APPLY DATABASE MIGRATIONS

Since the Supabase CLI requires internet access to download, here's how to apply your database migrations manually through the Supabase Dashboard.

---

## 📋 QUICK START (5 Minutes)

### **Step 1: Go to Supabase Dashboard**
1. Visit https://supabase.com/dashboard
2. Sign in to your account
3. Select your project: `ugppbaavzevmdkblniim`

### **Step 2: Apply All Migrations**
1. Click on **SQL Editor** in the left sidebar
2. Click **New Query**
3. Copy the entire contents of **`supabase/complete_migrations.sql`**
4. Paste into the SQL editor
5. Click **Run** (or press Ctrl/Cmd + Enter)
6. Wait ~10 seconds for completion

### **Step 3: Apply Seed Data (Optional)**
1. In SQL Editor, create a new query
2. Copy contents of **`supabase/seed/01_test_tenants.sql`**
3. Paste and run
4. This creates 2 test cafés with sample data

### **Step 4: Create Super Admin User**
1. Go to **Authentication > Users**
2. Click **Add User**
3. Enter your email and password
4. Copy the user's UUID
5. Go back to SQL Editor and run:

```sql
-- Replace <user-uuid> and <your-email> with your values
INSERT INTO public.super_admins (auth_id, email, full_name)
VALUES ('<user-uuid>', '<your-email>', 'Your Name');

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "super_admin"}'::jsonb
WHERE id = '<user-uuid>';
```

### **Step 5: Get Service Role Key**
1. Go to **Settings > API**
2. Copy the **service_role** key
3. Update `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### **Step 6: Test Your Setup**
```bash
npm run dev
# Visit http://localhost:3000
# Login with your super admin credentials
```

---

## ✅ VERIFICATION

After setup, verify you see:
- ✅ 14 tables in Table Editor
- ✅ 2 test cafés (if seed data applied)
- ✅ Your super admin user
- ✅ Can login to dashboard

---

## 🆘 TROUBLESHOOTING

**Can't login?**
- Check service role key is correct in `.env.local`
- Verify super admin user exists
- Restart dev server: `npm run dev`

**Tables already exist?**
- Skip migration or drop existing tables first
- Check if migrations were already applied

**RLS errors?**
- Make sure super admin user has correct role
- Check `raw_app_meta_data` includes `"role": "super_admin"`

---

## 📚 WHAT GETS CREATED

**14 Tables:**
- tenants, tenant_manifests, users, locations
- categories, menu_items, orders, order_items
- loyalty_transactions, rewards_catalog
- coupons, coupon_usage, push_campaigns
- admin_activity_log, super_admins

**40+ RLS Policies** for security

**14 Database Functions** for business logic

**9 Triggers** for automation

**20+ Indexes** for performance

---

**Your database will be fully configured after these steps! 🎉**
