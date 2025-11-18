-- =====================================================
-- FIX MANIFEST AUTO-CREATION TRIGGER
-- Includes name and short_name required fields
-- =====================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_create_tenant_manifest ON tenants;
DROP FUNCTION IF EXISTS public.create_default_manifest();

-- Recreate function with name and short_name fields
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

-- Recreate trigger
CREATE TRIGGER trigger_create_tenant_manifest
    AFTER INSERT ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION create_default_manifest();

COMMENT ON FUNCTION public.create_default_manifest() IS
    'Automatically creates a default manifest with name and short_name when a new tenant is created';
