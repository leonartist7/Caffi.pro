-- ============================================
-- COMPLETE DIAGNOSTIC: Why "Coffee Shop Not Found"?
-- ============================================

-- Step 1: Check if ANY tenants exist
SELECT
    COUNT(*) as total_tenants,
    COUNT(slug) as tenants_with_slug,
    COUNT(*) - COUNT(slug) as tenants_missing_slug
FROM tenants;

-- Step 2: List ALL tenants with their slugs
SELECT
    tenant_id,
    business_name,
    slug,
    created_at,
    CASE
        WHEN slug IS NULL THEN '❌ NO SLUG'
        WHEN slug = '' THEN '❌ EMPTY SLUG'
        ELSE '✅ HAS SLUG'
    END as slug_status
FROM tenants
ORDER BY created_at DESC
LIMIT 10;

-- Step 3: Check if tenant_manifests exist for each tenant
SELECT
    t.tenant_id,
    t.business_name,
    t.slug,
    CASE
        WHEN tm.manifest_id IS NOT NULL THEN '✅ HAS MANIFEST'
        ELSE '❌ NO MANIFEST'
    END as manifest_status,
    tm.logo_url,
    tm.design_tokens->>'colors' as colors
FROM tenants t
LEFT JOIN tenant_manifests tm ON t.tenant_id = tm.tenant_id
ORDER BY t.created_at DESC
LIMIT 10;

-- Step 4: Test getTenantBySlug for a specific slug
-- REPLACE 'your-slug-here' with the actual slug you're trying to access
SELECT
    t.tenant_id,
    t.business_name,
    t.slug,
    t.app_name,
    tm.logo_url,
    tm.design_tokens->'colors'->>'primary' as primary_color
FROM tenants t
LEFT JOIN tenant_manifests tm ON t.tenant_id = tm.tenant_id
WHERE t.slug = 'your-slug-here';  -- ← CHANGE THIS

-- Step 5: Check what errors occurred when creating clients
-- Look for recent INSERT errors in logs (if you have logging enabled)

-- Step 6: Verify tenant was actually created
-- Run this AFTER creating a new client to verify it saved
SELECT
    tenant_id,
    business_name,
    slug,
    owner_email,
    created_at
FROM tenants
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;
