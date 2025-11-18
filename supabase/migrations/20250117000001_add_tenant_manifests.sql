-- =====================================================
-- ADD TENANT_MANIFESTS TABLE
-- =====================================================
-- This table stores design tokens (colors, fonts, etc.) for each tenant's branded app

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS tenant_manifests (
    manifest_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID UNIQUE NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

    -- Logo URL
    logo_url TEXT,

    -- Design tokens (colors, typography, spacing, etc.)
    design_tokens JSONB DEFAULT '{
        "colors": {
            "primary": "#2D5F5D",
            "secondary": "#F4A259",
            "accent": "#E07A5F",
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
        },
        "branding": {
            "logo_url": null
        }
    }'::JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE tenant_manifests ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations in dev mode
CREATE POLICY "Dev mode: Allow all operations on tenant_manifests" ON tenant_manifests
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_tenant_manifests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_manifests_updated_at
    BEFORE UPDATE ON tenant_manifests
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_manifests_updated_at();

-- Comment on table
COMMENT ON TABLE tenant_manifests IS 'Stores design tokens (colors, fonts, branding) for each tenant''s white-label app';
