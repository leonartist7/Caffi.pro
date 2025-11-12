# 🔧 Quick Fix: Missing app_name Column

## Problem

When creating a new tenant/client, you get this error:

```
Failed to save client: Failed to create tenant: Could not find the 'app_name' column of 'tenants' in the schema cache
```

## Root Cause

The "nuclear database reset" script that was run earlier didn't include all the columns from the original schema. The code tries to insert `app_name` and `bundle_id` columns that don't exist in your current database.

## Solution (Run This in Supabase SQL Editor)

**Step 1:** Go to your Supabase SQL Editor:
https://supabase.com/dashboard/project/ugppbaavzevmdkblniim/sql/new

**Step 2:** Copy and paste the entire migration script:

```sql
-- Copy the entire contents from:
-- supabase/migrations/20250112000001_add_app_branding_columns.sql
```

Or copy this directly:

```sql
-- Add app_name column (NOT NULL with default)
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS app_name TEXT NOT NULL DEFAULT 'Coffee Shop App';

-- Add bundle_id column (UNIQUE with default pattern)
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS bundle_id TEXT UNIQUE;

-- Update existing rows to have unique bundle_ids based on slug
UPDATE tenants
SET bundle_id = CONCAT('com.caffi.', slug)
WHERE bundle_id IS NULL;

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
ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;

-- Add timezone and currency columns
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Dublin';

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';
```

**Step 3:** Click **Run** or press `Ctrl+Enter`

**Step 4:** Verify it worked:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tenants'
ORDER BY column_name;
```

You should now see `app_name`, `bundle_id`, and other branding columns.

## What This Does

✅ Adds `app_name` column (required for tenant creation)
✅ Adds `bundle_id` column (required for mobile app identification)
✅ Adds optional branding columns (logo_url, primary_color, custom_domain)
✅ Adds missing timezone and currency columns
✅ Updates existing tenants with default bundle_ids based on their slug

## After Running This

Your tenant creation should work! Try creating a new client again.

---

**Note:** This issue happened because the database reset script I provided earlier was simplified and missing some columns. This migration adds them back.
