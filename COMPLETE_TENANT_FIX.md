# 🔧 COMPLETE Tenant Creation Fix

## Current Error

```
Failed to save client: Failed to create tenant: new row violates row-level security policy for table "tenants"
```

## What Happened

After fixing the missing columns (`owner_phone`, `app_name`, `bundle_id`), we now have an RLS (Row Level Security) policy issue. The database is blocking tenant creation because there are no policies allowing authenticated users to INSERT into the tenants table.

## Complete Fix (Run Both Scripts)

### Step 1: Add Missing Columns (if not already done)

Go to Supabase SQL Editor: https://supabase.com/dashboard/project/ugppbaavzevmdkblniim/sql/new

**Copy and run this script:**

```sql
-- Add all missing columns
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_phone TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS app_name TEXT NOT NULL DEFAULT 'Coffee Shop App';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bundle_id TEXT;

UPDATE tenants
SET bundle_id = CONCAT('com.caffi.', slug)
WHERE bundle_id IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'tenants_bundle_id_key'
    ) THEN
        ALTER TABLE tenants ADD CONSTRAINT tenants_bundle_id_key UNIQUE (bundle_id);
    END IF;
END $$;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS app_store_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS play_store_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS pwa_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#6b3410';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_domain TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'tenants_custom_domain_key'
    ) THEN
        ALTER TABLE tenants ADD CONSTRAINT tenants_custom_domain_key UNIQUE (custom_domain);
    END IF;
END $$;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Dublin';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone TEXT;

UPDATE tenants
SET phone = owner_phone
WHERE phone IS NULL AND owner_phone IS NOT NULL;
```

### Step 2: Fix RLS Policies (THIS FIXES YOUR CURRENT ERROR)

**In the same SQL editor, copy and run this script:**

```sql
-- =====================================================
-- FIX RLS POLICIES FOR TENANT CREATION
-- =====================================================

-- Enable RLS on tenants table
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON tenants;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON tenants;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON tenants;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON tenants;
DROP POLICY IF EXISTS "Tenants are viewable by authenticated users" ON tenants;
DROP POLICY IF EXISTS "Tenants can be created by authenticated users" ON tenants;
DROP POLICY IF EXISTS "Tenants can be updated by authenticated users" ON tenants;
DROP POLICY IF EXISTS "Tenants can be deleted by authenticated users" ON tenants;

-- Create permissive policies for authenticated users
CREATE POLICY "Authenticated users can view all tenants"
ON tenants FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create tenants"
ON tenants FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update tenants"
ON tenants FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tenants"
ON tenants FOR DELETE
TO authenticated
USING (true);

-- Service role full access
CREATE POLICY "Service role has full access to tenants"
ON tenants FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

### Step 3: Verify Everything Worked

Run this query to check:

```sql
-- Check columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tenants'
ORDER BY column_name;

-- Check RLS policies
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'tenants'
ORDER BY policyname;
```

You should see:

- ✅ All required columns (owner_phone, app_name, bundle_id, etc.)
- ✅ 5 RLS policies (view, create, update, delete, service role)

### Step 4: Test Tenant Creation

Go back to your admin dashboard and try creating a new client again. It should work now! ✅

---

## What These Scripts Do

**Script 1 (Columns):**

- Adds all missing columns the code expects
- Sets up proper constraints and defaults
- Safe to run multiple times

**Script 2 (RLS Policies):**

- ✅ **Fixes your current error**
- Allows authenticated users to create/read/update/delete tenants
- Required for the admin dashboard to work
- Gives service role full access for migrations

## Security Note

⚠️ **For Production:** These policies are permissive (allow all authenticated users). Before going to production, you should:

1. Create an `admin_users` or `roles` table
2. Add a `role` column to track user permissions
3. Update policies to check `auth.uid()` and user roles
4. Restrict tenant creation to admin users only

For now (development), these permissive policies are fine and will let you test the application.

---

## Still Having Issues?

If you still get errors after running both scripts, please share:

1. The exact error message
2. The output of the verification queries above
3. Whether you're logged in to the admin dashboard
