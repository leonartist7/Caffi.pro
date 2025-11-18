-- =====================================================
-- FIX TENANT MANIFESTS
-- Resolves "Coffee Shop Not Found" error
-- =====================================================

-- 1. ADD PUBLIC READ ACCESS TO TENANT_MANIFESTS
-- This allows the public shop page to load tenant branding
CREATE POLICY "Public can view tenant manifests"
    ON tenant_manifests FOR SELECT
    TO anon, authenticated
    USING (true);

-- 2. CREATE FUNCTION TO AUTO-CREATE MANIFEST ON TENANT INSERT
CREATE OR REPLACE FUNCTION public.create_default_manifest()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO tenant_manifests (
        tenant_id,
        logo_url,
        design_tokens
    ) VALUES (
        NEW.tenant_id,
        NULL, -- Will be updated via admin panel
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
    )
    ON CONFLICT (tenant_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CREATE TRIGGER TO AUTO-CREATE MANIFEST
DROP TRIGGER IF EXISTS trigger_create_tenant_manifest ON tenants;
CREATE TRIGGER trigger_create_tenant_manifest
    AFTER INSERT ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION create_default_manifest();

-- 4. BACKFILL MANIFESTS FOR EXISTING TENANTS
INSERT INTO tenant_manifests (
    tenant_id,
    logo_url,
    design_tokens
)
SELECT
    t.tenant_id,
    NULL,
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

-- 5. ADD COMMENT
COMMENT ON POLICY "Public can view tenant manifests" ON tenant_manifests IS
    'Allow anonymous users to view tenant branding for public shop pages';

COMMENT ON FUNCTION public.create_default_manifest() IS
    'Automatically creates a default manifest when a new tenant is created';
