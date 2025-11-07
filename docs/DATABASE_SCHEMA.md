# Database Schema Documentation

## Overview

Caffi.pro uses a multi-tenant PostgreSQL database hosted on Supabase. All data is isolated by `tenant_id` using Row-Level Security (RLS) policies.

## Architecture

- **Single Database**: All tenants share the same database
- **Row-Level Security**: Data isolation enforced at the database level
- **JWT Claims**: Tenant context passed via JWT tokens
- **Super Admin Bypass**: Special role can access all tenant data

## Tables

### Core Tables

1. **tenants** - Café business information
2. **tenant_manifests** - Design tokens for white-labeling
3. **users** - Customer accounts
4. **locations** - Physical café locations

### Menu & Products

5. **categories** - Menu categories
6. **menu_items** - Products with modifiers

### Orders

7. **orders** - Customer orders
8. **order_items** - Items within orders

### Loyalty

9. **loyalty_transactions** - Point history
10. **rewards_catalog** - Redeemable rewards
11. **coupons** - Discount codes
12. **coupon_usage** - Redemption tracking

### Marketing

13. **push_campaigns** - Marketing notifications

## Key Relationships

```
tenants (1) ──→ (many) users
tenants (1) ──→ (many) locations
tenants (1) ──→ (many) categories
tenants (1) ──→ (many) menu_items
tenants (1) ──→ (many) orders
tenants (1) ──→ (many) loyalty_transactions
tenants (1) ──→ (many) rewards_catalog
tenants (1) ──→ (many) coupons
tenants (1) ──→ (many) push_campaigns

users (1) ──→ (many) orders
users (1) ──→ (many) loyalty_transactions
locations (1) ──→ (many) orders
categories (1) ──→ (many) menu_items
menu_items (1) ──→ (many) order_items
orders (1) ──→ (many) order_items
```

## Row-Level Security

All tables have RLS enabled with policies that:

1. **Filter by tenant_id**: Users can only access data for their tenant
2. **Super admin bypass**: Users with `role = 'super_admin'` in JWT can access all data
3. **Public read access**: Some tables allow public read for active items (menu, categories, locations)

## Database Functions

### `generate_order_number()`
Automatically generates unique order numbers per tenant (e.g., #0001, #0002)

### `calculate_loyalty_points(order_total, tenant_id)`
Calculates loyalty points based on order total and tenant's configured rate

### `update_user_loyalty()`
Trigger function that updates user loyalty stats when transactions are created

### `update_order_stats()`
Trigger function that updates user stats and awards points when orders are completed

### `get_sales_analytics(tenant_id, start_date, end_date)`
Returns JSON analytics for a tenant's sales in a date range

### `set_tenant_context(tenant_id)`
Helper function to set tenant context for RLS (used by application code)

## Indexes

All tables have indexes on:
- `tenant_id` (for RLS filtering)
- Foreign keys
- Frequently queried columns (`status`, `created_at`)
- Composite indexes for common query patterns

## Enums

- `subscription_status`: trial, active, cancelled, suspended
- `subscription_plan`: starter, pro, enterprise
- `loyalty_tier`: bronze, silver, gold, platinum
- `order_status`: pending, confirmed, preparing, ready, completed, cancelled
- `payment_status`: pending, paid, failed, refunded
- `order_type`: pickup, dine_in, delivery
- `reward_type`: coupon, free_item, discount
- `discount_type`: percentage, fixed_amount, free_item
- `campaign_audience`: all, tier_based, location_based, inactive_users, custom
- `campaign_status`: draft, scheduled, sending, sent, cancelled

## Seed Data

The seed file includes:
- 2 test tenants: Blue Bottle Coffee and Sunrise Coffee
- Sample locations, categories, menu items
- Test users with loyalty points
- Sample orders and transactions
- Rewards and coupons

## Migration Files

- `20240101000000_initial_schema.sql` - Creates all tables, enums, indexes, triggers, and functions
- `20240101000001_rls_policies.sql` - Enables RLS and creates all security policies

## Usage

### Running Migrations

```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase SQL Editor
# Copy and paste migration files in order
```

### Seeding Data

```bash
# Using Supabase CLI
supabase db seed

# Or manually run seed_data.sql in Supabase SQL Editor
```

### Querying with Tenant Context

```sql
-- Set tenant context (application code should do this via JWT)
SELECT set_tenant_context('11111111-1111-1111-1111-111111111111');

-- Now queries will be filtered by RLS
SELECT * FROM orders; -- Only returns orders for the set tenant
```

## Security Notes

1. **Never disable RLS** in production
2. **Always include tenant_id** in JWT claims for authenticated requests
3. **Use service_role key** only for admin operations (bypasses RLS)
4. **Test RLS policies** regularly to ensure data isolation
5. **Super admin role** should be carefully controlled
