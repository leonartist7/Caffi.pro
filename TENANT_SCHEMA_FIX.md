# 🔧 Complete Tenant Schema Fix

## Problem

You're getting errors like:

```
Could not find the 'app_name' column of 'tenants' in the schema cache
Could not find the 'owner_phone' column of 'tenants' in the schema cache
```

## Root Cause

The database reset script was simplified and didn't include all the columns the application code expects when creating/updating tenants.

## Solution: Run This ONE Complete Migration

**Go to Supabase SQL Editor:**
https://supabase.com/dashboard/project/ugppbaavzevmdkblniim/sql/new

**Copy and paste this ENTIRE script and click RUN:**

```sql
-- =====================================================
-- COMPREHENSIVE FIX: Add ALL Missing Tenant Columns
-- =====================================================

-- Add owner_phone column (nullable)
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS owner_phone TEXT;

-- Add app_name column (NOT NULL with default)
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS app_name TEXT NOT NULL DEFAULT 'Coffee Shop App';

-- Add bundle_id column (UNIQUE, nullable for now)
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS bundle_id TEXT;

-- Update existing rows to have unique bundle_ids based on slug
UPDATE tenants
SET bundle_id = CONCAT('com.caffi.', slug)
WHERE bundle_id IS NULL;

-- Now make bundle_id unique
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'tenants_bundle_id_key'
    ) THEN
        ALTER TABLE tenants ADD CONSTRAINT tenants_bundle_id_key UNIQUE (bundle_id);
    END IF;
END $$;

-- Add optional branding columns
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS app_store_url TEXT;

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS play_store_url TEXT;

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS pwa_url TEXT;

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS logo_url TEXT;

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#6b3410';

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS custom_domain TEXT;

-- Make custom_domain unique
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'tenants_custom_domain_key'
    ) THEN
        ALTER TABLE tenants ADD CONSTRAINT tenants_custom_domain_key UNIQUE (custom_domain);
    END IF;
END $$;

-- Add timezone and currency columns
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Dublin';

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';

-- Add phone column (if not exists for older schemas)
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Migrate owner_phone to phone if needed
UPDATE tenants
SET phone = owner_phone
WHERE phone IS NULL AND owner_phone IS NOT NULL;
```

## Verify It Worked

After running the migration, verify with this query:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tenants'
ORDER BY column_name;
```

You should see ALL these columns:

- ✅ app_name
- ✅ app_store_url
- ✅ bundle_id
- ✅ business_name
- ✅ created_at
- ✅ currency
- ✅ custom_domain
- ✅ features_enabled
- ✅ logo_url
- ✅ loyalty_config
- ✅ owner_email
- ✅ owner_phone ← **This was missing!**
- ✅ phone
- ✅ play_store_url
- ✅ primary_color
- ✅ pwa_url
- ✅ slug
- ✅ subscription_plan
- ✅ subscription_status
- ✅ tenant_id
- ✅ timezone
- ✅ trial_ends_at
- ✅ updated_at

## What This Migration Does

✅ Adds `owner_phone` (the column causing your current error)
✅ Adds `app_name` (if you didn't run previous migration)
✅ Adds `bundle_id` (if you didn't run previous migration)
✅ Adds all branding columns (logo_url, primary_color, custom_domain)
✅ Adds timezone and currency
✅ Makes columns unique where needed
✅ Updates existing tenants with proper bundle IDs
✅ Safe to run multiple times (uses IF NOT EXISTS)

## After Running

✅ **Try creating a new client again - it should work!**

---

**Note:** This is the COMPLETE fix. You only need to run this one migration. If you already ran the previous migration (20250112000001), this will just add the missing `owner_phone` column and won't duplicate anything.
