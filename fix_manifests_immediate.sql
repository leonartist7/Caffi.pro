-- =====================================================
-- IMMEDIATE FIX FOR COFFEE SHOP NOT FOUND ERROR
-- Run this directly in Supabase SQL Editor
-- =====================================================

-- Step 1: Add public read access to tenant_manifests
-- This allows anonymous users to view the shop page
CREATE POLICY "Public can view tenant manifests"
    ON tenant_manifests FOR SELECT
    TO anon, authenticated
    USING (true);

-- Step 2: Backfill manifests for ALL existing tenants
INSERT INTO tenant_manifests (
    tenant_id,
    logo_url,
    design_tokens
)
SELECT
    t.tenant_id,
    NULL, -- Logo URL will be set via admin panel
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
WHERE tm.tenant_id IS NULL;

-- Step 3: Verify the fix - Check green-landscaping-services
SELECT
    t.tenant_id,
    t.business_name,
    t.slug,
    tm.logo_url,
    tm.design_tokens->'colors'->>'primary' as primary_color,
    tm.design_tokens->'branding'->>'logo_url' as branding_logo_url
FROM tenants t
LEFT JOIN tenant_manifests tm ON t.tenant_id = tm.tenant_id
WHERE t.slug = 'green-landscaping-services';

-- Step 4: Show all tenants with their manifest status
SELECT
    t.tenant_id,
    t.business_name,
    t.slug,
    CASE
        WHEN tm.tenant_id IS NULL THEN 'MISSING MANIFEST ❌'
        ELSE 'Has Manifest ✅'
    END as manifest_status
FROM tenants t
LEFT JOIN tenant_manifests tm ON t.tenant_id = tm.tenant_id
ORDER BY t.business_name;
