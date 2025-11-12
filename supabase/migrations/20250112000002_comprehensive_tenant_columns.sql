-- =====================================================
-- COMPREHENSIVE FIX: Add ALL Missing Tenant Columns
-- =====================================================
-- This migration adds all missing columns that the code expects
-- Run this INSTEAD of the previous migration if you haven't run that yet

-- First, let's check what we're working with
-- Uncomment to see current columns:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'tenants'
-- ORDER BY ordinal_position;

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

-- Migrate owner_phone to phone if needed (some schemas use 'phone' instead)
UPDATE tenants
SET phone = owner_phone
WHERE phone IS NULL AND owner_phone IS NOT NULL;

-- Add comments
COMMENT ON COLUMN tenants.owner_phone IS 'Owner phone number (contact info)';
COMMENT ON COLUMN tenants.app_name IS 'Display name for mobile app/PWA';
COMMENT ON COLUMN tenants.bundle_id IS 'Unique iOS/Android bundle identifier (e.g., com.caffi.joes-coffee)';
COMMENT ON COLUMN tenants.logo_url IS 'URL to tenant logo image';
COMMENT ON COLUMN tenants.primary_color IS 'Primary brand color (hex code)';
COMMENT ON COLUMN tenants.custom_domain IS 'Custom domain for branded PWA (e.g., order.joescoffee.com)';
COMMENT ON COLUMN tenants.timezone IS 'Tenant timezone (e.g., Europe/Dublin, America/New_York)';
COMMENT ON COLUMN tenants.currency IS 'Currency code (EUR, USD, GBP, etc.)';

-- Show final schema
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'tenants'
ORDER BY ordinal_position;
