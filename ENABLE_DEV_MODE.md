# 🔓 Enable Development Mode (Disable RLS Temporarily)

## Problem

You're getting this error when creating tenants:

```
failed to create tenant: new row violates row level security policy for table tenants
```

This happens because Row Level Security (RLS) is enabled, but there's no authenticated user since we disabled login for development.

## Solution: Apply Development Mode Policies

Follow these steps to enable unauthenticated access during development:

### Option 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy & Paste the Migration**
   - Open the file: `supabase/migrations/20250110000001_dev_mode_rls.sql`
   - Copy ALL the content
   - Paste into the SQL Editor

4. **Run the Migration**
   - Click "Run" button (or press Ctrl+Enter)
   - Wait for success message

5. **Verify It Worked**
   - Try creating a tenant again in your app
   - It should work now!

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Navigate to your project
cd /home/user/Caffi.pro

# Apply the migration
supabase db push
```

## What This Does

The migration creates **temporary development policies** that allow:

- ✅ Anyone to view, create, update, delete tenants
- ✅ Anyone to manage tenant_manifests
- ✅ Anyone to manage locations, categories, menu items
- ✅ Anyone to manage orders and coupons
- ✅ Anyone to manage users

**These policies are prefixed with "DEV:" so you can easily find and remove them later.**

## Re-Enabling Authentication Later

When you're ready to re-enable authentication:

1. **Remove the dev mode policies:**

   ```sql
   -- Run in Supabase SQL Editor
   DROP POLICY "DEV: Allow anyone to view tenants" ON tenants;
   DROP POLICY "DEV: Allow anyone to insert tenants" ON tenants;
   DROP POLICY "DEV: Allow anyone to update tenants" ON tenants;
   DROP POLICY "DEV: Allow anyone to delete tenants" ON tenants;
   DROP POLICY "DEV: Allow anyone to manage manifests" ON tenant_manifests;
   -- ... (drop all DEV: policies)
   ```

2. **Re-enable login redirect in app:**
   - Edit `app/page.tsx`
   - Change line 12 from `router.push('/dashboard')` back to `router.push('/login')`

## Troubleshooting

**Still getting RLS errors?**

- Make sure you ran the ENTIRE migration file
- Check Supabase logs for specific error messages
- Verify the policies were created: SQL Editor → Run: `SELECT * FROM pg_policies WHERE tablename = 'tenants';`

**Need help?**

- Check the Supabase logs in Dashboard → Database → Logs
- Look at browser console (F12) for detailed error messages
