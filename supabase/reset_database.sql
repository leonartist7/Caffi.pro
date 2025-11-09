-- =====================================================
-- DATABASE RESET SCRIPT
-- Use this to clean up and start fresh if migration fails
-- =====================================================
-- Run this in Supabase SQL Editor BEFORE applying migrations
-- This ensures a clean start with no conflicts

-- WARNING: This will delete ALL data!
-- Only run this if you're sure you want to start fresh

-- Drop all tables in reverse order of creation (including NEW tables)
DROP TABLE IF EXISTS admin_activity_log CASCADE;
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

-- Drop custom types (including NEW types)
DROP TYPE IF EXISTS setup_status CASCADE;
DROP TYPE IF EXISTS subscription_tier CASCADE;
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

-- Drop functions (including NEW functions)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS set_order_number() CASCADE;
DROP FUNCTION IF EXISTS award_order_loyalty_points() CASCADE;
DROP FUNCTION IF EXISTS update_order_stats() CASCADE;
DROP FUNCTION IF EXISTS award_signup_bonus() CASCADE;
DROP FUNCTION IF EXISTS increment_coupon_usage() CASCADE;
DROP FUNCTION IF EXISTS update_user_loyalty() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_tenant_last_activity() CASCADE;
DROP FUNCTION IF EXISTS log_admin_action CASCADE;
DROP FUNCTION IF EXISTS public.user_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_authenticated() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_loyalty_points CASCADE;
DROP FUNCTION IF EXISTS public.calculate_loyalty_tier CASCADE;
DROP FUNCTION IF EXISTS public.generate_order_number CASCADE;
DROP FUNCTION IF EXISTS public.validate_coupon CASCADE;
DROP FUNCTION IF EXISTS public.get_sales_analytics CASCADE;
DROP FUNCTION IF EXISTS public.get_customer_analytics CASCADE;
DROP FUNCTION IF EXISTS public.get_loyalty_analytics CASCADE;
DROP FUNCTION IF EXISTS public.get_tenant_analytics CASCADE;
DROP FUNCTION IF EXISTS public.custom_access_token_hook CASCADE;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Database reset complete!';
    RAISE NOTICE 'Next step: Run complete_migrations.sql to create fresh schema';
END $$;
