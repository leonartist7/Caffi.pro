-- =====================================================
-- DATABASE RESET SCRIPT
-- Use this to clean up and start fresh if migration fails
-- =====================================================

-- Drop all tables in reverse order of creation
DROP TABLE IF EXISTS push_campaigns CASCADE;
DROP TABLE IF EXISTS coupon_usage CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS rewards_catalog CASCADE;
DROP TABLE IF EXISTS loyalty_transactions CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenant_manifests CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS super_admins CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS campaign_audience CASCADE;
DROP TYPE IF EXISTS campaign_status CASCADE;
DROP TYPE IF EXISTS reward_type CASCADE;
DROP TYPE IF EXISTS discount_type CASCADE;
DROP TYPE IF EXISTS order_type CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS loyalty_tier CASCADE;
DROP TYPE IF EXISTS subscription_plan CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS auth.user_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS auth.user_role() CASCADE;
DROP FUNCTION IF EXISTS auth.is_authenticated() CASCADE;
DROP FUNCTION IF EXISTS calculate_loyalty_points(DECIMAL, UUID) CASCADE;
DROP FUNCTION IF EXISTS generate_order_number(UUID) CASCADE;
DROP FUNCTION IF EXISTS validate_coupon(UUID, TEXT, DECIMAL, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_tenant_analytics(UUID, TIMESTAMPTZ, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS custom_access_token_hook(JSONB) CASCADE;

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE 'Database reset complete. You can now run migrations from scratch.';
END $$;
