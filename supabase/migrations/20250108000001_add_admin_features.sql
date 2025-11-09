-- =====================================================
-- Migration: Add Admin Features & Missing Fields
-- Date: 2025-01-08
-- Description: Add admin_activity_log table and missing fields to tenants
-- =====================================================

-- =====================================================
-- PART 1: Add missing fields to tenants table
-- =====================================================

-- Create setup_status enum
CREATE TYPE setup_status AS ENUM ('pending', 'in_progress', 'launched', 'paused');

-- Add missing columns to tenants
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS setup_status setup_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS onboarding_checklist JSONB DEFAULT '{
    "branding_uploaded": false,
    "locations_added": false,
    "menu_configured": false,
    "payment_connected": false,
    "test_order_completed": false,
    "app_published": false
}'::jsonb,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for monitoring
CREATE INDEX IF NOT EXISTS idx_tenants_last_activity ON tenants(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenants_setup_status ON tenants(setup_status);

COMMENT ON COLUMN tenants.internal_notes IS 'Private admin notes about this café client';
COMMENT ON COLUMN tenants.setup_status IS 'Current onboarding status: pending, in_progress, launched, paused';
COMMENT ON COLUMN tenants.onboarding_checklist IS 'Track completion of setup tasks';
COMMENT ON COLUMN tenants.last_activity_at IS 'Auto-updated when orders are created';

-- =====================================================
-- PART 2: Create admin_activity_log table
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_activity_log (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Who & what tenant
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE SET NULL,
    admin_id UUID NOT NULL, -- References auth.uid() or super_admins(admin_id)
    admin_email TEXT NOT NULL,

    -- Action details
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'approve', 'suspend', etc.
    resource_type TEXT NOT NULL, -- 'tenant', 'user', 'order', 'coupon', etc.
    resource_id UUID,
    description TEXT, -- Human-readable description

    -- Change tracking
    old_values JSONB,
    new_values JSONB,

    -- Request metadata
    ip_address TEXT,
    user_agent TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Super admins can view all logs
CREATE POLICY "Super admins can view all activity logs"
    ON admin_activity_log FOR SELECT
    USING (public.is_super_admin());

-- Tenant owners can view logs for their tenant
CREATE POLICY "Tenant owners can view their activity logs"
    ON admin_activity_log FOR SELECT
    USING (tenant_id = public.user_tenant_id());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_tenant_id ON admin_activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin_id ON admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at ON admin_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_resource ON admin_activity_log(resource_type, resource_id);

COMMENT ON TABLE admin_activity_log IS 'Audit trail of all admin actions';

-- =====================================================
-- PART 3: Trigger to update last_activity_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_tenant_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update tenant's last activity when a new order is created
    UPDATE tenants
    SET last_activity_at = NOW()
    WHERE tenant_id = NEW.tenant_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tenant_last_activity ON orders;
CREATE TRIGGER trigger_update_tenant_last_activity
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_last_activity();

-- =====================================================
-- PART 4: Helper function to log admin actions
-- =====================================================

CREATE OR REPLACE FUNCTION log_admin_action(
    p_admin_id UUID,
    p_admin_email TEXT,
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id UUID DEFAULT NULL,
    p_tenant_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO admin_activity_log (
        admin_id,
        admin_email,
        action,
        resource_type,
        resource_id,
        tenant_id,
        description,
        old_values,
        new_values,
        ip_address,
        user_agent
    ) VALUES (
        p_admin_id,
        p_admin_email,
        p_action,
        p_resource_type,
        p_resource_id,
        p_tenant_id,
        p_description,
        p_old_values,
        p_new_values,
        p_ip_address,
        p_user_agent
    ) RETURNING log_id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_admin_action IS
    'Helper function to log admin actions for audit trail. Call from application code.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION log_admin_action TO authenticated;

-- =====================================================
-- PART 5: Update seed data with new fields
-- =====================================================

-- Set initial setup status for existing tenants
UPDATE tenants
SET
    setup_status = 'launched',
    onboarding_checklist = '{
        "branding_uploaded": true,
        "locations_added": true,
        "menu_configured": true,
        "payment_connected": true,
        "test_order_completed": true,
        "app_published": true
    }'::jsonb,
    internal_notes = 'Test café - fully configured for development',
    last_activity_at = NOW()
WHERE slug IN ('blue-bottle-paris', 'sunrise-coffee-lyon');
