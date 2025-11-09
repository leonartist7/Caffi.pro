# Caffi.pro - Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ and npm
- **Git**
- **Supabase CLI** (see installation instructions below)
- **Supabase Account** (https://supabase.com)

## 🚀 Quick Start

### Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in details:
   - **Name:** Caffi.pro
   - **Database Password:** (save this securely)
   - **Region:** Choose closest to your users (e.g., Europe West for France)
   - **Plan:** Free (for development) or Pro (for production)
4. Wait for project to be created (~2 minutes)
5. Note your project credentials:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **Anon Key:** (public key)
   - **Service Role Key:** (secret key - never expose)

### Step 2: Initialize Local Development

```bash
# Clone the repository (if not already done)
git clone <your-repo-url>
cd caffi-pro

# Install Supabase CLI (Linux/macOS)
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz -o /tmp/supabase.tar.gz
cd /tmp && tar -xzf supabase.tar.gz
sudo mv supabase /usr/local/bin/supabase

# For Windows: Download from https://github.com/supabase/cli/releases

# Verify installation
supabase --version

# Login to Supabase
supabase login

# Link to your project
cd supabase
supabase link --project-ref <your-project-id>

# Or start local development
supabase start
```

### Step 3: Run Database Migrations

```bash
# Push migrations to Supabase
supabase db push

# Or apply them manually in order:
# 1. 20250107000001_initial_schema.sql
# 2. 20250107000002_rls_policies.sql
# 3. 20250107000003_database_functions.sql
# 4. 20250107000004_auth_setup.sql

# Verify migrations applied
supabase db diff
```

### Step 4: Seed Test Data

```bash
# Run seed file
supabase db seed

# Or manually via SQL Editor in Supabase Dashboard:
# - Open SQL Editor
# - Copy contents of supabase/seed/01_test_tenants.sql
# - Run query
```

### Step 5: Configure Authentication

#### A. Enable Auth Providers

1. Go to **Authentication > Providers** in Supabase Dashboard
2. Enable:
   - **Email** (for admin and tenant owners)
   - **Phone** (for mobile customers)

#### B. Configure Phone Auth (Twilio)

1. Sign up for Twilio: https://www.twilio.com
2. Get your credentials:
   - Account SID
   - Auth Token
   - Phone Number
3. In Supabase Dashboard:
   - Go to **Authentication > Settings**
   - Scroll to **Phone Provider**
   - Select **Twilio**
   - Enter credentials
4. Test by sending OTP

#### C. Set Up Custom JWT Claims

1. Go to **Database > Functions** in Supabase Dashboard
2. Find `custom_access_token_hook`
3. Go to **Authentication > Settings > JWT Settings**
4. Enable **Custom Access Token Hook**
5. Set URI: `pg-functions://postgres/public/custom_access_token_hook`

### Step 6: Create Super Admin User

```bash
# Via Supabase Dashboard:
# 1. Go to Authentication > Users
# 2. Click "Add User"
# 3. Enter:
#    - Email: admin@caffi.pro
#    - Password: <secure-password>
#    - Confirm Email: Yes

# Then run this SQL in SQL Editor:
INSERT INTO public.super_admins (auth_id, email, full_name)
VALUES (
    (SELECT id FROM auth.users WHERE email = 'admin@caffi.pro'),
    'admin@caffi.pro',
    'Super Admin'
);

# Update user metadata to include role:
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "super_admin"}'::jsonb
WHERE email = 'admin@caffi.pro';
```

### Step 7: Configure Storage

```bash
# Create storage buckets
# Via Supabase Dashboard > Storage:

# 1. Create bucket: "logos"
#    - Public: true
#    - File size limit: 5MB
#    - Allowed MIME types: image/png, image/jpeg, image/svg+xml

# 2. Create bucket: "menu-items"
#    - Public: true
#    - File size limit: 2MB
#    - Allowed MIME types: image/png, image/jpeg, image/webp

# 3. Create bucket: "campaigns"
#    - Public: true
#    - File size limit: 2MB
#    - Allowed MIME types: image/png, image/jpeg, image/webp

# Or via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('logos', 'logos', true),
    ('menu-items', 'menu-items', true),
    ('campaigns', 'campaigns', true);
```

### Step 8: Test Database Connection

```bash
# Create a test script: test-connection.js
cat > test-connection.js << 'EOF'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_ANON_KEY'
const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  // Test: Fetch tenants
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
  
  if (error) {
    console.error('❌ Error:', error)
  } else {
    console.log('✅ Connected! Found', data.length, 'tenants')
    console.log(data)
  }
}

testConnection()
EOF

# Install dependencies
npm install @supabase/supabase-js

# Run test
node test-connection.js
```

## 🔐 Environment Variables

Create `.env.local` files for each application:

### Admin Dashboard (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Client Dashboard (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Mobile App (FlutterFlow)

Configure directly in FlutterFlow:
- Supabase URL
- Anon Key

## ✅ Verification Checklist

- [ ] Supabase project created
- [ ] All 4 migrations applied successfully
- [ ] Seed data loaded (2 test tenants, categories, items)
- [ ] RLS policies enabled (test by querying as different users)
- [ ] Phone auth configured (send test OTP)
- [ ] Super admin user created and can log in
- [ ] Storage buckets created
- [ ] JWT custom claims working (check token in browser dev tools)

## 🧪 Test Your Setup

### Test 1: Query Test Tenants

```sql
SELECT business_name, slug, subscription_status 
FROM tenants;
-- Should return: Blue Bottle Coffee Paris, Sunrise Coffee Lyon
```

### Test 2: Test RLS

```sql
-- This should return 0 rows (no tenant_id in JWT)
SELECT * FROM menu_items;

-- Login as tenant owner first, then should see items
```

### Test 3: Test Loyalty Function

```sql
SELECT calculate_loyalty_points(
    25.50, 
    '11111111-1111-1111-1111-111111111111'
);
-- Should return: 255 (25.50 * 10 points per euro)
```

### Test 4: Test Order Number Generation

```sql
SELECT generate_order_number('11111111-1111-1111-1111-111111111111');
-- Should return: #20250107-0001 (or current date)
```

## 🐛 Troubleshooting

### Issue: Migrations fail

**Solution:**
```bash
# Reset local database
supabase db reset

# Or manually delete tables and re-run
supabase db push --force
```

### Issue: RLS blocking all queries

**Solution:**
1. Check JWT token includes `tenant_id` claim
2. Verify custom access token hook is enabled
3. Test with service role key (bypasses RLS)

### Issue: Phone OTP not sending

**Solution:**
1. Verify Twilio credentials
2. Check Twilio account balance
3. Check phone number format (+33...)
4. Check Supabase logs for errors

### Issue: Auth not working

**Solution:**
```bash
# Check auth config
supabase status

# View auth logs
supabase logs auth

# Test JWT decoding
https://jwt.io
```

## 📚 Next Steps

1. **Set up Admin Dashboard** (MODULE 3)
   - Create Next.js project
   - Connect to Supabase
   - Build tenant management UI

2. **Set up Client Dashboard** (MODULE 4)
   - Create Next.js project
   - Connect to Supabase
   - Build menu and order management

3. **Set up Edge Functions** (MODULE 5)
   - Deploy create-order function
   - Deploy push notification function
   - Test API endpoints

4. **Set up Mobile App** (MODULE 6)
   - Create FlutterFlow account
   - Connect to Supabase
   - Build customer app screens

## 🆘 Support

- **Supabase Docs:** https://supabase.com/docs
- **Supabase Discord:** https://discord.supabase.com
- **Project Issues:** [Your GitHub Issues]

---

**Ready to build! 🚀**
