-- =====================================================
-- ADD APP BRANDING COLUMNS TO TENANTS TABLE
-- =====================================================
-- Adds missing app_name and bundle_id columns that are required
-- for tenant creation but were missing from nuclear reset

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

-- Comment on columns
COMMENT ON COLUMN tenants.app_name IS 'Display name for mobile app/PWA';
COMMENT ON COLUMN tenants.bundle_id IS 'Unique iOS/Android bundle identifier (e.g., com.caffi.joes-coffee)';
COMMENT ON COLUMN tenants.logo_url IS 'URL to tenant logo image';
COMMENT ON COLUMN tenants.primary_color IS 'Primary brand color (hex code)';
COMMENT ON COLUMN tenants.custom_domain IS 'Custom domain for branded PWA (e.g., order.joescoffee.com)';
