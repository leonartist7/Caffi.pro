-- =====================================================
-- IMMEDIATE FIX FOR COFFEE SHOP NOT FOUND ERROR
-- Works WITHOUT logo_url column (stores everything in design_tokens)
-- Run this directly in Supabase SQL Editor
-- =====================================================

-- Step 1: Drop existing public view policy if it exists
DROP POLICY IF EXISTS "Public can view tenant manifests" ON tenant_manifests;

-- Step 2: Add public read access to tenant_manifests
-- This allows anonymous users to view the shop page
CREATE POLICY "Public can view tenant manifests"
    ON tenant_manifests FOR SELECT
    TO anon, authenticated
    USING (true);

-- Step 3: Backfill manifests for ALL existing tenants (NO logo_url column)
INSERT INTO tenant_manifests (
    tenant_id,
    design_tokens
)
SELECT
    t.tenant_id,
    jsonb_build_object(
        'colors', jsonb_build_object(
            'primary', '#6b3410',
            'secondary', '#F4A259',
            'accent', '#E07A5F',
            'background', '#FFFFFF',
            'surface', '#F8F9FA',
            'error', '#DC3545',
            'success', '#28A745',
            'text_primary', '#212529',
            'text_secondary', '#6C757D'
        ),
        'typography', jsonb_build_object(
            'font_family', 'Inter',
            'heading_font', 'Poppins',
            'font_size_base', 16,
            'font_size_heading', 24,
            'font_weight_regular', 400,
            'font_weight_bold', 700
        ),
        'spacing', jsonb_build_object(
            'xs', 4,
            'sm', 8,
            'md', 16,
            'lg', 24,
            'xl', 32
        ),
        'border_radius', jsonb_build_object(
            'sm', 4,
            'md', 8,
            'lg', 16,
            'full', 9999
        ),
        'branding', jsonb_build_object(
            'logo_url', NULL
        )
    )
FROM tenants t
LEFT JOIN tenant_manifests tm ON t.tenant_id = tm.tenant_id
WHERE tm.tenant_id IS NULL
ON CONFLICT (tenant_id) DO NOTHING;

-- Step 4: Verify the fix - Check green-landscaping-services
SELECT
    t.tenant_id,
    t.business_name,
    t.slug,
    tm.design_tokens->'colors'->>'primary' as primary_color,
    tm.design_tokens->'branding'->>'logo_url' as logo_url
FROM tenants t
LEFT JOIN tenant_manifests tm ON t.tenant_id = tm.tenant_id
WHERE t.slug = 'green-landscaping-services';

-- Step 5: Show all tenants with their manifest status
SELECT
    t.tenant_id,
    t.business_name,
    t.slug,
    CASE
        WHEN tm.tenant_id IS NULL THEN 'MISSING MANIFEST ❌'
        ELSE 'Has Manifest ✅'
    END as manifest_status,
    tm.design_tokens->'colors'->>'primary' as primary_color
FROM tenants t
LEFT JOIN tenant_manifests tm ON t.tenant_id = tm.tenant_id
ORDER BY t.business_name;
