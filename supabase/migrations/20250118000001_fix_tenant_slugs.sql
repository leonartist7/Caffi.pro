-- Migration: Add slugs to existing tenants
-- This fixes the "Coffee Shop Not Found" error

-- First, add slugs to any tenants that don't have them
UPDATE tenants
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(business_name, '[^a-zA-Z0-9]+', '-', 'g'),
    '^-+|-+$', '', 'g'  -- Remove leading/trailing dashes
  )
)
WHERE slug IS NULL OR slug = '';

-- Make slug NOT NULL and UNIQUE if not already
DO $$
BEGIN
  -- Check if slug column allows NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants'
    AND column_name = 'slug'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE tenants ALTER COLUMN slug SET NOT NULL;
  END IF;

  -- Add unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenants_slug_unique'
  ) THEN
    ALTER TABLE tenants ADD CONSTRAINT tenants_slug_unique UNIQUE (slug);
  END IF;
END $$;

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

-- Verify all tenants have valid slugs
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM tenants
  WHERE slug IS NULL OR slug = '';

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Found % tenants with invalid slugs', invalid_count;
  END IF;

  RAISE NOTICE 'All tenants have valid slugs ✅';
END $$;
