# Caffi.pro Setup Guide

## Prerequisites

- Node.js 18+ installed
- Supabase account (free tier works for development)
- Git installed
- A code editor (VS Code recommended)

## Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: `caffi-pro-dev` (or your choice)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to you (e.g., `West Europe`)
5. Click "Create new project"
6. Wait 2-3 minutes for project to initialize

## Step 2: Get Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy these values (you'll need them later):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep secret!)

## Step 3: Run Database Migrations

### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Seed test data
supabase db seed
```

### Option B: Using Supabase Dashboard (Manual)

1. Go to **SQL Editor** in your Supabase dashboard
2. Open `supabase/migrations/20240101000000_initial_schema.sql`
3. Copy entire contents and paste into SQL Editor
4. Click "Run" (or press Cmd/Ctrl + Enter)
5. Wait for completion (should take 10-30 seconds)
6. Repeat for `supabase/migrations/20240101000001_rls_policies.sql`
7. For seed data, run `supabase/seed/seed_data.sql`

## Step 4: Verify Setup

Run these queries in Supabase SQL Editor to verify:

```sql
-- Check tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
-- Should show 13 tables

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
-- rowsecurity should be 't' (true) for all tables

-- Check seed data
SELECT business_name, slug FROM tenants;
-- Should show: Blue Bottle Coffee Paris, Sunrise Coffee

SELECT COUNT(*) FROM menu_items;
-- Should show: 12 items (7 Blue Bottle + 5 Sunrise)
```

## Step 5: Configure Storage Buckets

1. Go to **Storage** in Supabase dashboard
2. Create buckets:
   - `logos` (public)
   - `menu-items` (public)
   - `app-icons` (public)
   - `splash-screens` (public)
   - `campaign-images` (public)

3. For each bucket:
   - Click "New bucket"
   - Enter name
   - Set to **Public bucket**
   - Click "Create bucket"

## Step 6: Set Up Authentication

### Configure Auth Settings

1. Go to **Authentication** → **Settings** in Supabase dashboard
2. Configure:
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: Add:
     - `http://localhost:3000/**`
     - `https://admin.caffi.pro/**`
     - `https://dashboard.caffi.pro/**`
   - **Enable Email Auth**: ✅
   - **Enable Phone Auth**: ✅ (for mobile app)
   - **Enable Magic Links**: ✅

### Create Super Admin User

```sql
-- Create super admin user in auth.users (via Supabase dashboard or API)
-- Then update JWT claims to include role = 'super_admin'
```

Or use Supabase Dashboard:
1. Go to **Authentication** → **Users**
2. Click "Add user" → "Create new user"
3. Enter email and password
4. After creation, you'll need to add custom claims (requires Edge Function or manual SQL)

## Step 7: Test Database Functions

```sql
-- Test order number generation
INSERT INTO orders (tenant_id, user_id, location_id, subtotal, total)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    '51111111-1111-1111-1111-111111111111',
    '21111111-1111-1111-1111-111111111111',
    10.00,
    10.00
);
-- Check order_number was auto-generated

-- Test loyalty points calculation
SELECT calculate_loyalty_points(25.50, '11111111-1111-1111-1111-111111111111');
-- Should return: 250 (10 points per euro × 25)

-- Test analytics function
SELECT get_sales_analytics(
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '30 days',
    NOW()
);
-- Should return JSON with sales stats
```

## Step 8: Environment Variables

Create `.env.local` files for your dashboards:

### `admin-dashboard/.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### `client-dashboard/.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Step 9: Verify RLS Policies

Test that RLS is working:

```sql
-- As authenticated user with tenant_id in JWT
-- (This will be done via application code)
-- Should only see data for their tenant

-- As super admin
-- Should see all tenant data
```

## Troubleshooting

### Migration Errors

**Error: "relation already exists"**
- Tables already exist, skip migration or drop tables first
- Use `DROP TABLE IF EXISTS table_name CASCADE;` carefully

**Error: "permission denied"**
- Make sure you're using service_role key or running as postgres user
- Check RLS policies aren't blocking

**Error: "function does not exist"**
- Run migrations in order (schema first, then RLS)
- Check all functions were created: `\df` in psql

### RLS Issues

**Can't see any data**
- Check JWT includes `tenant_id` claim
- Verify RLS policies are correct
- Check user has proper role

**Super admin can't access**
- Verify JWT includes `role = 'super_admin'` claim
- Check `is_super_admin()` function works

### Seed Data Issues

**No data after seeding**
- Check seed file ran without errors
- Verify tenant_ids match UUIDs in seed file
- Check foreign key constraints

## Next Steps

1. ✅ Database setup complete
2. ⏭️ Set up Authentication (Module 2)
3. ⏭️ Build Super Admin Dashboard (Module 3)
4. ⏭️ Build Client Dashboard (Module 4)

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row-Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

## Support

If you encounter issues:
1. Check Supabase logs: **Logs** → **Postgres Logs**
2. Check migration errors in SQL Editor
3. Verify all prerequisites are met
4. Review troubleshooting section above
