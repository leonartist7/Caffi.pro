-- ============================================
-- FIX: Missing design_tokens column in tenant_manifests
-- ============================================

-- Step 1: Check current schema
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'tenant_manifests'
ORDER BY ordinal_position;

-- Expected columns:
-- manifest_id (uuid)
-- tenant_id (uuid)
-- design_tokens (jsonb) ← This might be missing!
-- logo_url (text)
-- created_at (timestamp)
-- updated_at (timestamp)

-- Step 2: Add design_tokens column if missing
ALTER TABLE tenant_manifests
ADD COLUMN IF NOT EXISTS design_tokens JSONB DEFAULT '{
  "colors": {
    "primary": "#6b3410",
    "secondary": "#8D4004",
    "accent": "#D2691E",
    "background": "#FFFFFF",
    "surface": "#F8F9FA",
    "error": "#DC3545",
    "success": "#28A745",
    "text_primary": "#212529",
    "text_secondary": "#6C757D"
  },
  "typography": {
    "font_family": "Inter",
    "heading_font": "Poppins",
    "font_size_base": 16,
    "font_size_heading": 24,
    "font_weight_regular": 400,
    "font_weight_bold": 700
  },
  "spacing": {
    "xs": 4,
    "sm": 8,
    "md": 16,
    "lg": 24,
    "xl": 32
  },
  "border_radius": {
    "sm": 4,
    "md": 8,
    "lg": 16,
    "full": 9999
  }
}'::jsonb;

-- Step 3: Verify column was added
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'tenant_manifests'
  AND column_name = 'design_tokens';

-- Expected output:
-- design_tokens | jsonb | YES | '{"colors": {...}}'::jsonb

-- Step 4: Update existing manifests with default design_tokens if NULL
UPDATE tenant_manifests
SET design_tokens = '{
  "colors": {
    "primary": "#6b3410",
    "secondary": "#8D4004",
    "accent": "#D2691E",
    "background": "#FFFFFF",
    "surface": "#F8F9FA",
    "error": "#DC3545",
    "success": "#28A745",
    "text_primary": "#212529",
    "text_secondary": "#6C757D"
  },
  "typography": {
    "font_family": "Inter",
    "heading_font": "Poppins",
    "font_size_base": 16,
    "font_size_heading": 24,
    "font_weight_regular": 400,
    "font_weight_bold": 700
  },
  "spacing": {
    "xs": 4,
    "sm": 8,
    "md": 16,
    "lg": 24,
    "xl": 32
  },
  "border_radius": {
    "sm": 4,
    "md": 8,
    "lg": 16,
    "full": 9999
  }
}'::jsonb
WHERE design_tokens IS NULL;

-- Step 5: Count manifests with design_tokens
SELECT
    COUNT(*) as total_manifests,
    COUNT(design_tokens) as manifests_with_design_tokens,
    COUNT(*) - COUNT(design_tokens) as manifests_missing_design_tokens
FROM tenant_manifests;

-- Expected: All manifests should have design_tokens now
