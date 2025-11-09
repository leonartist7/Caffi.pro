# Database Setup Guide

## Overview

This guide will help you set up the Caffi.pro database schema in your Supabase project.

## Prerequisites

- Supabase account (sign up at https://supabase.com)
- Supabase project created
- Access to Supabase Dashboard SQL Editor

## Setup Steps

### Option 1: Using Supabase CLI (Recommended)

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Link your project**
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. **Run migrations**
   ```bash
   supabase db push
   ```

5. **Seed test data**
   ```bash
   supabase db seed
   ```

### Option 2: Manual Setup via SQL Editor

1. **Open Supabase Dashboard**
   - Go to your project dashboard
   - Navigate to SQL Editor

2. **Run migrations in order:**
   - Copy and paste `supabase/migrations/001_schema.sql`
   - Execute
   - Copy and paste `supabase/migrations/002_rls.sql`
   - Execute
   - Copy and paste `supabase/migrations/003_functions.sql`
   - Execute
   - Copy and paste `supabase/migrations/004_indexes.sql`
   - Execute

3. **Seed test data:**
   - Copy and paste `supabase/seed/seed.sql`
   - Execute

## Verification

After setup, verify the schema:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check test tenants
SELECT tenant_id, business_name, slug, subscription_status 
FROM tenants;
```

## Database Schema Overview

### Core Tables (13 total)

1. **tenants** - Café business information
2. **tenant_manifests** - Design tokens for white-labeling
3. **users** - Customer accounts
4. **locations** - Physical café locations
5. **categories** - Menu categories
6. **menu_items** - Products
7. **orders** - Customer orders
8. **order_items** - Items within orders
9. **loyalty_transactions** - Point history
10. **rewards_catalog** - Redeemable rewards
11. **coupons** - Discount codes
12. **coupon_usage** - Redemption tracking
13. **push_campaigns** - Marketing notifications

## Row-Level Security (RLS)

All tables have RLS enabled with policies that:
- Filter data by `tenant_id` from JWT claims
- Allow super admins to bypass filters
- Restrict access based on user roles

### Testing RLS

```sql
-- Test as tenant user (requires JWT with tenant_id claim)
SET request.jwt.claims = '{"tenant_id": "00000000-0000-0000-0000-000000000001"}';
SELECT * FROM menu_items;

-- Test as super admin
SET request.jwt.claims = '{"role": "super_admin"}';
SELECT * FROM tenants;
```

## Database Functions

### Order Management
- `generate_order_number(tenant_id)` - Generate unique order numbers
- `set_order_number()` - Trigger function for auto-generation

### Loyalty System
- `calculate_loyalty_points(order_total, tenant_id)` - Calculate points for order
- `update_user_loyalty()` - Update user points after transaction
- `calculate_loyalty_tier(user_id)` - Determine user tier
- `award_signup_bonus(user_id)` - Award welcome bonus

### Analytics
- `get_sales_analytics(tenant_id, start_date, end_date)` - Sales metrics
- `get_top_menu_items(tenant_id, start_date, end_date, limit)` - Top selling items

### Coupons
- `validate_coupon(tenant_id, code, order_total)` - Validate and calculate discount

## Indexes

Performance indexes are created on:
- Foreign keys (tenant_id, user_id, etc.)
- Frequently queried columns (status, created_at)
- Composite indexes for common query patterns
- Full-text search indexes (for future search features)
- Partial indexes for filtered queries

## Seed Data

The seed file includes:
- 2 test tenants (Blue Bottle Coffee, Sunrise Coffee)
- Design tokens for both tenants
- Sample locations
- Menu categories and items
- Test coupons and rewards

**Note:** Users are not seeded automatically. Create them via Supabase Auth API or the signup flow.

## Troubleshooting

### Migration Errors

If you encounter errors:
1. Check Supabase logs in Dashboard
2. Verify you're running migrations in order
3. Ensure UUID extension is enabled
4. Check for existing tables (drop if needed for fresh start)

### RLS Issues

If RLS blocks queries:
1. Verify JWT includes `tenant_id` claim
2. Check user role in JWT
3. Test policies individually
4. Review policy conditions

### Function Errors

If functions fail:
1. Check function dependencies
2. Verify trigger conditions
3. Review function logic
4. Check Supabase function logs

## Next Steps

After database setup:
1. Configure Supabase Auth (Module 2)
2. Set up JWT custom claims
3. Test authentication flows
4. Begin building dashboards

## Support

For issues or questions:
- Check Supabase documentation: https://supabase.com/docs
- Review migration files for details
- Check function comments for usage
