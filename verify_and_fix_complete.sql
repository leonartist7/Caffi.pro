-- =====================================================
-- COMPREHENSIVE VERIFICATION AND FIX SCRIPT
-- Run this in Supabase SQL Editor to verify everything
-- =====================================================

-- PART 1: VERIFY DATA EXISTS
-- =====================================================

SELECT '=== CHECKING IF TENANTS EXIST ===' as status;

SELECT
    tenant_id,
    business_name,
    slug,
    owner_email
FROM tenants
ORDER BY created_at DESC;

SELECT '=== CHECKING IF MANIFESTS EXIST ===' as status;

SELECT
    tm.manifest_id,
    tm.tenant_id,
    tm.name,
    tm.short_name,
    t.slug,
    t.business_name
FROM tenant_manifests tm
INNER JOIN tenants t ON t.tenant_id = tm.tenant_id
ORDER BY tm.created_at DESC;

SELECT '=== CHECKING SPECIFIC TENANT: green-landscaping-services ===' as status;

SELECT
    t.tenant_id,
    t.business_name,
    t.slug,
    tm.name as manifest_name,
    tm.short_name,
    tm.design_tokens->'colors'->>'primary' as primary_color,
    tm.design_tokens->'branding'->>'logo_url' as logo_url,
    CASE
        WHEN tm.tenant_id IS NULL THEN 'NO MANIFEST ❌'
        ELSE 'HAS MANIFEST ✅'
    END as status
FROM tenants t
LEFT JOIN tenant_manifests tm ON t.tenant_id = tm.tenant_id
WHERE t.slug = 'green-landscaping-services';

-- PART 2: CHECK RLS POLICIES
-- =====================================================

SELECT '=== CHECKING RLS POLICIES ON TENANTS ===' as status;

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'tenants'
ORDER BY policyname;

SELECT '=== CHECKING RLS POLICIES ON TENANT_MANIFESTS ===' as status;

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'tenant_manifests'
ORDER BY policyname;

-- PART 3: ENSURE PUBLIC READ ACCESS
-- =====================================================

-- Drop all old policies and create fresh ones
DROP POLICY IF EXISTS "Public can view tenant manifests" ON tenant_manifests;
DROP POLICY IF EXISTS "Dev mode: Allow all operations on tenant_manifests" ON tenant_manifests;
DROP POLICY IF EXISTS "DEV: Allow anyone to view tenants" ON tenants;
DROP POLICY IF EXISTS "Dev mode: Allow all operations on tenants" ON tenants;
DROP POLICY IF EXISTS "Users can view all tenants" ON tenants;

-- Create clean public read policies
CREATE POLICY "Public read tenants"
    ON tenants FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Public read manifests"
    ON tenant_manifests FOR SELECT
    TO anon, authenticated
    USING (true);

-- PART 4: FIX TRIGGER FUNCTION
-- =====================================================

-- Drop and recreate trigger with correct fields
DROP TRIGGER IF EXISTS trigger_create_tenant_manifest ON tenants;
DROP FUNCTION IF EXISTS public.create_default_manifest();

CREATE OR REPLACE FUNCTION public.create_default_manifest()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create if manifest doesn't already exist
    IF NOT EXISTS (SELECT 1 FROM tenant_manifests WHERE tenant_id = NEW.tenant_id) THEN
        INSERT INTO tenant_manifests (
            tenant_id,
            name,
            short_name,
            design_tokens
        ) VALUES (
            NEW.tenant_id,
            NEW.business_name || ' App',
            SUBSTRING(NEW.business_name FROM 1 FOR 30),
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
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_tenant_manifest
    AFTER INSERT ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION create_default_manifest();

-- PART 5: FINAL VERIFICATION
-- =====================================================

SELECT '=== FINAL CHECK: All Tenants with Manifests ===' as status;

SELECT
    t.tenant_id,
    t.business_name,
    t.slug,
    CASE
        WHEN tm.tenant_id IS NULL THEN '❌ MISSING'
        ELSE '✅ EXISTS'
    END as manifest_status,
    tm.name as manifest_name
FROM tenants t
LEFT JOIN tenant_manifests tm ON t.tenant_id = tm.tenant_id
ORDER BY t.business_name;

SELECT '=== Script Complete! ===' as status;
