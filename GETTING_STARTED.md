# 🚀 Getting Started with Caffi.pro

**Welcome!** This guide will get you from zero to a working backend in 30 minutes.

---

## ⚡ Quick Start (30 minutes)

### Step 1: Create Supabase Project (5 minutes)

1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in:
   - **Name:** `caffi-pro`
   - **Database Password:** Generate a strong password (save it!)
   - **Region:** Europe West (or closest to you)
   - **Plan:** Free (for now)
4. Click **"Create new project"**
5. Wait ~2 minutes for setup
6. Copy your credentials:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **Anon (public) Key:** `eyJhbGciOi...`
   - **Service Role Key:** `eyJhbGciOi...` (keep secret!)

---

### Step 2: Install Supabase CLI (2 minutes)

**Note:** npm global installation is no longer supported. Use the official installer:

```bash
# Install on Linux/macOS
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz -o /tmp/supabase.tar.gz
cd /tmp && tar -xzf supabase.tar.gz
sudo mv supabase /usr/local/bin/supabase
# Verify installation
supabase --version

# Login to Supabase
supabase login
```

**For Windows:** Download the Windows installer from [Supabase CLI Releases](https://github.com/supabase/cli/releases)
Follow the prompts to authenticate.

---

### Step 3: Link Your Project (2 minutes)

```bash
# Navigate to workspace
cd /workspace

# Link to your Supabase project
cd supabase
supabase link --project-ref <your-project-ref>

# When prompted, enter your database password
```

**Project ref** is found in your Supabase Dashboard URL:
`https://supabase.com/dashboard/project/<project-ref>`

---

### Step 4: Apply Migrations (5 minutes)

```bash
# Push all migrations to your database
supabase db push

# You should see:
# ✅ Applied migration 20250107000001_initial_schema.sql
# ✅ Applied migration 20250107000002_rls_policies.sql
# ✅ Applied migration 20250107000003_database_functions.sql
# ✅ Applied migration 20250107000004_auth_setup.sql
```

**What just happened?**
- Created 13 tables
- Set up Row-Level Security
- Created database functions
- Configured authentication

---

### Step 5: Load Test Data (3 minutes)

```bash
# Run seed file
supabase db seed

# Or manually via Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Copy contents of supabase/seed/01_test_tenants.sql
# 3. Click "Run"
```

**What's in the seed data?**
- 2 test tenants (Blue Bottle, Sunrise Coffee)
- Locations for each café
- Menu categories and items
- Test customers
- Rewards and coupons

---

### Step 6: Verify Setup (5 minutes)

#### 6.1 Check Tables

In Supabase Dashboard, go to **Table Editor**. You should see:
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

#### 6.2 Run Test Query

Go to **SQL Editor** and run:

```sql
-- Should return 2 tenants
SELECT business_name, slug, subscription_status 
FROM tenants;

-- Should return 3 locations
SELECT name, city 
FROM locations;

-- Should return 7+ menu items
SELECT name, price 
FROM menu_items;
```

#### 6.3 Test Database Function

```sql
-- Generate an order number
SELECT generate_order_number('11111111-1111-1111-1111-111111111111');
-- Expected: #20250107-0001

-- Calculate loyalty points
SELECT calculate_loyalty_points(25.50, '11111111-1111-1111-1111-111111111111');
-- Expected: 255

-- Validate coupon
SELECT * FROM validate_coupon(
    '11111111-1111-1111-1111-111111111111',
    'WELCOME10',
    50.00,
    NULL
);
-- Expected: valid = true, discount_amount = 5.00
```

---

### Step 7: Configure Authentication (5 minutes)

#### 7.1 Enable Phone Auth

1. Go to **Authentication > Providers**
2. Enable **Phone**
3. Select provider: **Twilio** (or Supabase built-in for testing)
4. For Twilio:
   - Sign up at https://www.twilio.com
   - Get: Account SID, Auth Token, Phone Number
   - Enter in Supabase settings
5. Save

#### 7.2 Enable Custom JWT Hook

1. Go to **Authentication > Hooks**
2. Enable **Custom Access Token**
3. Select function: `public.custom_access_token_hook`
4. Save

#### 7.3 Create Super Admin User

1. Go to **Authentication > Users**
2. Click **"Add user"**
3. Enter:
   - **Email:** `admin@caffi.pro`
   - **Password:** Create a strong password
   - **Auto Confirm:** Yes
4. Click **"Create user"**
5. Copy the user's UUID

Now run this SQL in SQL Editor:

```sql
-- Replace <user-uuid> with the UUID you copied
INSERT INTO public.super_admins (auth_id, email, full_name)
VALUES (
    '<user-uuid>',
    'admin@caffi.pro',
    'Super Admin'
);

-- Set role in user metadata
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "super_admin"}'::jsonb
WHERE id = '<user-uuid>';
```

---

### Step 8: Test Authentication (3 minutes)

Create a test file: `test-auth.js`

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_ANON_KEY'
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  // Test login
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@caffi.pro',
    password: 'your-password'
  })
  
  if (error) {
    console.error('❌ Login failed:', error.message)
  } else {
    console.log('✅ Login successful!')
    console.log('User ID:', data.user.id)
    console.log('Email:', data.user.email)
    
    // Decode JWT to see claims
    const token = data.session.access_token
    const payload = JSON.parse(atob(token.split('.')[1]))
    console.log('JWT Claims:', payload)
  }
}

test()
```

Run it:

```bash
npm install @supabase/supabase-js
node test-auth.js
```

You should see:
```
✅ Login successful!
User ID: abc123...
Email: admin@caffi.pro
JWT Claims: { sub: '...', email: '...', role: 'super_admin', ... }
```

---

## ✅ You're Done!

**Congratulations!** You now have:

- ✅ A fully configured multi-tenant database
- ✅ 13 tables with real data
- ✅ Row-Level Security protecting all data
- ✅ Authentication system with 3 user types
- ✅ Business logic functions
- ✅ A super admin account

**Backend is 100% ready!**

---

## 🎯 What's Next?

### Option 1: Build Admin Dashboard (Recommended)

Create a web interface to manage tenants:

```bash
# Create Next.js app
npx create-next-app@latest admin-dashboard --typescript --tailwind --app

cd admin-dashboard

# Install Supabase
npm install @supabase/supabase-js

# Create .env.local
echo "NEXT_PUBLIC_SUPABASE_URL=your-url" > .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key" >> .env.local

# Start development
npm run dev
```

Then follow **MODULE 3** in the main specification.

**Time:** 1-2 weeks

---

### Option 2: Build Client Dashboard

Create a dashboard for café owners:

Same steps as above, but in `client-dashboard` folder.

Then follow **MODULE 4** in the main specification.

**Time:** 1-2 weeks

---

### Option 3: Build Mobile App

Create the customer-facing mobile app:

1. Go to https://flutterflow.io
2. Sign up for account
3. Create new project
4. Connect to Supabase:
   - Settings > Supabase
   - Enter URL and Anon Key
5. Start building screens

Then follow **MODULE 6** in the main specification.

**Time:** 2-3 weeks

---

## 📚 Documentation

- **[README.md](./README.md)** - Project overview
- **[PROGRESS.md](./PROGRESS.md)** - Development status
- **[docs/SETUP.md](./docs/SETUP.md)** - Detailed setup guide
- **[docs/DATABASE.md](./docs/DATABASE.md)** - Database documentation
- **[docs/AUTHENTICATION.md](./docs/AUTHENTICATION.md)** - Auth guide
- **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Deployment guide

---

## 🆘 Troubleshooting

### "Migration failed"

**Solution:**
```bash
# Reset and try again
supabase db reset
supabase db push
```

### "Can't connect to Supabase"

**Solution:**
1. Check project URL is correct
2. Check anon key is correct
3. Check network connection
4. Check project is not paused (free tier pauses after 1 week inactivity)

### "RLS blocking queries"

**Solution:**
You need to be authenticated. RLS policies filter data by user's `tenant_id`.

Test with service role key (bypasses RLS):
```javascript
const supabase = createClient(url, SERVICE_ROLE_KEY) // Not anon key
```

### "Phone OTP not sending"

**Solution:**
1. Verify Twilio credentials
2. Check phone format: `+33612345678`
3. Check Twilio balance
4. Try Supabase built-in (for testing only)

---

## 💬 Get Help

- **Discord:** https://discord.supabase.com
- **Docs:** https://supabase.com/docs
- **GitHub Issues:** [Your repo issues]

---

## 🎉 Celebrate!

You just set up a production-ready multi-tenant SaaS backend in 30 minutes!

**What you built:**
- PostgreSQL database with 13 tables
- Multi-tenant data isolation
- Authentication for 3 user types
- Business logic functions
- Analytics capabilities
- Security policies

**What's ready:**
- Accept orders
- Award loyalty points
- Manage menus
- Send notifications
- Track analytics

**Now go build the frontend!** 🚀

---

**Need help?** Check [docs/SETUP.md](./docs/SETUP.md) for more details.

**Ready to deploy?** Check [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

**Let's build! 💪**
