# Caffi.pro - Database Documentation

## Overview

Caffi.pro uses a **multi-tenant PostgreSQL database** hosted on Supabase with Row-Level Security (RLS) for data isolation.

- **Database:** PostgreSQL 15
- **Total Tables:** 13 core tables + auth tables
- **Multi-Tenancy:** Isolated by `tenant_id` column
- **Security:** RLS policies on all tables
- **Performance:** Optimized indexes on frequently queried columns

---

## Entity Relationship Diagram

```
┌─────────────┐
│   tenants   │────┐
└─────────────┘    │
       │           │
       ├───────────┼─────────────────────┐
       │           │                     │
       ↓           ↓                     ↓
┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│tenant_      │  │  locations   │  │  categories  │
│manifests    │  └──────────────┘  └──────────────┘
└─────────────┘         │                 │
                        │                 ↓
                        │          ┌──────────────┐
                        │          │  menu_items  │
                        │          └──────────────┘
                        │                 │
       ┌────────────────┼─────────────────┘
       ↓                ↓
┌─────────────┐  ┌──────────────┐
│    users    │  │    orders    │
│ (customers) │  └──────────────┘
└─────────────┘         │
       │                ↓
       │         ┌──────────────┐
       │         │ order_items  │
       │         └──────────────┘
       │
       ├────────┬────────┬────────┐
       ↓        ↓        ↓        ↓
┌───────────┐ ┌────────┐ ┌──────┐ ┌───────────┐
│loyalty_   │ │coupons │ │coupon│ │ rewards_  │
│trans      │ │        │ │usage │ │ catalog   │
└───────────┘ └────────┘ └──────┘ └───────────┘

┌──────────────┐
│push_         │
│campaigns     │
└──────────────┘
```

---

## Table Schemas

### 1. tenants
Café businesses using the platform.

| Column | Type | Description |
|--------|------|-------------|
| tenant_id | UUID | Primary key |
| business_name | TEXT | Full business name |
| slug | TEXT | URL-friendly identifier (unique) |
| owner_email | TEXT | Owner's email (unique) |
| owner_phone | TEXT | Owner's phone number |
| app_name | TEXT | Mobile app display name |
| bundle_id | TEXT | iOS/Android bundle ID (unique) |
| app_store_url | TEXT | Apple App Store URL |
| play_store_url | TEXT | Google Play Store URL |
| pwa_url | TEXT | Progressive Web App URL |
| features_enabled | JSONB | Feature flags |
| loyalty_config | JSONB | Loyalty program settings |
| subscription_status | ENUM | trial, active, cancelled, suspended |
| subscription_plan | ENUM | starter, pro, enterprise |
| trial_ends_at | TIMESTAMPTZ | Trial expiration date |
| timezone | TEXT | Default: 'Europe/Paris' |
| currency | TEXT | Default: 'EUR' |
| language | TEXT | Default: 'fr' |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `idx_tenants_slug` on slug
- `idx_tenants_owner_email` on owner_email

**Example:**
```sql
SELECT * FROM tenants WHERE slug = 'bluebottle-paris';
```

---

### 2. tenant_manifests
Design tokens for white-label branding.

| Column | Type | Description |
|--------|------|-------------|
| manifest_id | UUID | Primary key |
| tenant_id | UUID | Foreign key → tenants (unique) |
| design_tokens | JSONB | Colors, typography, spacing |
| logo_url | TEXT | Brand logo URL |
| app_icon_url | TEXT | App icon URL (1024x1024) |
| splash_screen_url | TEXT | Splash screen URL |
| figma_file_key | TEXT | Figma file reference |
| figma_last_synced | TIMESTAMPTZ | Last sync with Figma |
| skin_version | TEXT | Version number (e.g., "1.0.0") |
| slot_mappings | JSONB | UI component mappings |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Design Tokens Structure:**
```json
{
  "colors": {
    "primary": "#2D5F5D",
    "secondary": "#F4A259",
    "accent": "#E07A5F",
    "background": "#FFFFFF",
    "surface": "#F8F9FA",
    "text_primary": "#212529"
  },
  "typography": {
    "font_family": "Inter",
    "heading_font": "Poppins",
    "font_size_base": 16
  },
  "spacing": {
    "xs": 4, "sm": 8, "md": 16, "lg": 24, "xl": 32
  }
}
```

---

### 3. users
End customers (coffee shop patrons).

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | Primary key |
| tenant_id | UUID | Foreign key → tenants |
| auth_id | UUID | Foreign key → auth.users (unique) |
| phone | TEXT | Phone number |
| email | TEXT | Email address |
| full_name | TEXT | Customer name |
| profile_image_url | TEXT | Profile picture URL |
| loyalty_points | INTEGER | Current points balance |
| loyalty_tier | ENUM | bronze, silver, gold, platinum |
| lifetime_points | INTEGER | Total points ever earned |
| total_orders | INTEGER | Number of completed orders |
| total_spent | DECIMAL(10,2) | Total amount spent |
| last_order_at | TIMESTAMPTZ | Last order timestamp |
| fcm_token | TEXT | Firebase Cloud Messaging token |
| notifications_enabled | BOOLEAN | Push notification preference |
| preferred_location_id | UUID | Favorite location |
| favorite_items | UUID[] | Array of favorite item IDs |
| created_at | TIMESTAMPTZ | Account creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Unique Constraint:** (tenant_id, phone)

**Indexes:**
- `idx_users_tenant_id` on tenant_id
- `idx_users_auth_id` on auth_id
- `idx_users_phone` on phone
- `idx_users_email` on email

**Triggers:**
- `award_signup_bonus` - Awards points on new user creation
- `update_users_updated_at` - Auto-updates timestamp

---

### 4. locations
Physical café locations.

| Column | Type | Description |
|--------|------|-------------|
| location_id | UUID | Primary key |
| tenant_id | UUID | Foreign key → tenants |
| name | TEXT | Location name |
| address | TEXT | Street address |
| city | TEXT | City name |
| state | TEXT | State/region |
| postal_code | TEXT | ZIP/postal code |
| country | TEXT | Default: 'France' |
| latitude | DECIMAL(10,8) | GPS latitude |
| longitude | DECIMAL(11,8) | GPS longitude |
| phone | TEXT | Location phone number |
| email | TEXT | Location email |
| hours | JSONB | Operating hours by day |
| special_hours | JSONB | Holiday/special closures |
| accepts_mobile_orders | BOOLEAN | Enable mobile ordering |
| accepts_dine_in_orders | BOOLEAN | Enable dine-in orders |
| estimated_prep_time | INTEGER | Minutes for order prep |
| is_active | BOOLEAN | Location status |
| display_order | INTEGER | Sort order in app |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Hours Structure:**
```json
{
  "monday": "07:00-19:00",
  "tuesday": "07:00-19:00",
  "wednesday": "07:00-19:00",
  "thursday": "07:00-19:00",
  "friday": "07:00-19:00",
  "saturday": "08:00-20:00",
  "sunday": "08:00-18:00"
}
```

---

### 5. categories
Menu categories (Coffee, Tea, Pastries, etc.).

| Column | Type | Description |
|--------|------|-------------|
| category_id | UUID | Primary key |
| tenant_id | UUID | Foreign key → tenants |
| name | TEXT | Category name |
| description | TEXT | Category description |
| image_url | TEXT | Category image URL |
| icon_name | TEXT | Icon identifier for UI |
| display_order | INTEGER | Sort order |
| is_active | BOOLEAN | Visibility status |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `idx_categories_tenant_id` on tenant_id

---

### 6. menu_items
Products available for order.

| Column | Type | Description |
|--------|------|-------------|
| item_id | UUID | Primary key |
| tenant_id | UUID | Foreign key → tenants |
| category_id | UUID | Foreign key → categories |
| name | TEXT | Item name |
| description | TEXT | Item description |
| price | DECIMAL(10,2) | Base price |
| image_url | TEXT | Item image URL |
| modifiers | JSONB | Sizes and add-ons |
| tags | TEXT[] | Tags (vegan, gluten-free, etc.) |
| calories | INTEGER | Calorie count |
| allergens | TEXT[] | Allergen information |
| is_available | BOOLEAN | Availability status |
| is_featured | BOOLEAN | Featured item flag |
| available_at_locations | UUID[] | Location availability |
| display_order | INTEGER | Sort order |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Modifiers Structure:**
```json
{
  "sizes": [
    {"id": "sm", "name": "Small", "price": 0},
    {"id": "md", "name": "Medium", "price": 0.50},
    {"id": "lg", "name": "Large", "price": 1.00}
  ],
  "addons": [
    {"id": "oat-milk", "name": "Oat Milk", "price": 0.75},
    {"id": "extra-shot", "name": "Extra Shot", "price": 1.50}
  ]
}
```

**Indexes:**
- `idx_menu_items_tenant_id` on tenant_id
- `idx_menu_items_category_id` on category_id
- `idx_menu_items_active` on is_available

---

### 7. orders
Customer orders.

| Column | Type | Description |
|--------|------|-------------|
| order_id | UUID | Primary key |
| tenant_id | UUID | Foreign key → tenants |
| user_id | UUID | Foreign key → users |
| location_id | UUID | Foreign key → locations |
| order_number | TEXT | Display number (e.g., "#20250107-0001") |
| status | ENUM | pending, confirmed, preparing, ready, completed, cancelled |
| subtotal | DECIMAL(10,2) | Items total before tax/discounts |
| tax | DECIMAL(10,2) | Tax amount |
| discount | DECIMAL(10,2) | Discount amount |
| tip | DECIMAL(10,2) | Tip amount |
| total | DECIMAL(10,2) | Final total |
| payment_method | TEXT | card, apple_pay, google_pay, cash |
| payment_status | ENUM | pending, paid, failed, refunded |
| payment_intent_id | TEXT | Stripe payment ID |
| order_type | ENUM | pickup, dine_in, delivery |
| special_instructions | TEXT | Customer notes |
| scheduled_for | TIMESTAMPTZ | Scheduled order time |
| estimated_ready_at | TIMESTAMPTZ | Estimated completion |
| completed_at | TIMESTAMPTZ | Actual completion time |
| cancelled_at | TIMESTAMPTZ | Cancellation time |
| cancellation_reason | TEXT | Cancellation reason |
| points_earned | INTEGER | Loyalty points awarded |
| coupon_code_used | TEXT | Applied coupon code |
| source | TEXT | mobile_app, pwa, dashboard |
| created_at | TIMESTAMPTZ | Order creation time |
| updated_at | TIMESTAMPTZ | Last update time |

**Unique Constraint:** (tenant_id, order_number)

**Indexes:**
- `idx_orders_tenant_id` on tenant_id
- `idx_orders_user_id` on user_id
- `idx_orders_location_id` on location_id
- `idx_orders_status` on status
- `idx_orders_created_at` on created_at DESC
- `idx_orders_tenant_status` on (tenant_id, status)
- `idx_orders_tenant_created` on (tenant_id, created_at DESC)

**Triggers:**
- `trigger_set_order_number` - Auto-generates order number
- `trigger_update_order_stats` - Updates user statistics
- `trigger_award_order_loyalty_points` - Awards loyalty points
- `update_orders_updated_at` - Auto-updates timestamp

---

### 8. order_items
Line items within orders.

| Column | Type | Description |
|--------|------|-------------|
| order_item_id | UUID | Primary key |
| order_id | UUID | Foreign key → orders |
| item_id | UUID | Foreign key → menu_items (nullable) |
| item_name | TEXT | Item name snapshot |
| item_image_url | TEXT | Item image snapshot |
| quantity | INTEGER | Quantity ordered |
| unit_price | DECIMAL(10,2) | Price per unit |
| modifiers_selected | JSONB | Selected modifiers |
| subtotal | DECIMAL(10,2) | Line item total |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Indexes:**
- `idx_order_items_order_id` on order_id

**Note:** Item name/image are snapshotted to preserve order history even if item is deleted.

---

### 9. loyalty_transactions
Point earning and spending history.

| Column | Type | Description |
|--------|------|-------------|
| transaction_id | UUID | Primary key |
| tenant_id | UUID | Foreign key → tenants |
| user_id | UUID | Foreign key → users |
| order_id | UUID | Foreign key → orders (nullable) |
| points_change | INTEGER | Points delta (positive = earned, negative = spent) |
| balance_after | INTEGER | Point balance after transaction |
| reason | TEXT | order, signup_bonus, reward_redemption, manual_adjustment |
| description | TEXT | Transaction description |
| created_at | TIMESTAMPTZ | Transaction timestamp |

**Indexes:**
- `idx_loyalty_transactions_tenant_id` on tenant_id
- `idx_loyalty_transactions_user_id` on user_id

**Triggers:**
- `trigger_update_user_loyalty` - Updates user points and tier

---

### 10. rewards_catalog
Redeemable loyalty rewards.

| Column | Type | Description |
|--------|------|-------------|
| reward_id | UUID | Primary key |
| tenant_id | UUID | Foreign key → tenants |
| name | TEXT | Reward name |
| description | TEXT | Reward description |
| points_required | INTEGER | Cost in points |
| image_url | TEXT | Reward image URL |
| reward_type | ENUM | coupon, free_item, discount |
| reward_value | JSONB | Type-specific details |
| is_active | BOOLEAN | Availability status |
| stock_limit | INTEGER | Max redemptions (null = unlimited) |
| stock_remaining | INTEGER | Remaining stock |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `idx_rewards_catalog_tenant_id` on tenant_id

---

### 11. coupons
Discount codes.

| Column | Type | Description |
|--------|------|-------------|
| coupon_id | UUID | Primary key |
| tenant_id | UUID | Foreign key → tenants |
| code | TEXT | Coupon code (e.g., "WELCOME10") |
| discount_type | ENUM | percentage, fixed_amount, free_item |
| discount_value | DECIMAL(10,2) | Discount amount or percentage |
| min_order_amount | DECIMAL(10,2) | Minimum order requirement |
| max_uses | INTEGER | Usage limit (null = unlimited) |
| current_uses | INTEGER | Times used |
| valid_from | TIMESTAMPTZ | Start date |
| valid_until | TIMESTAMPTZ | Expiration date |
| is_active | BOOLEAN | Active status |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Unique Constraint:** (tenant_id, code)

**Indexes:**
- `idx_coupons_tenant_id` on tenant_id
- `idx_coupons_code` on (tenant_id, code)

**Triggers:**
- `trigger_increment_coupon_usage` - Increments usage count

---

### 12. coupon_usage
Coupon redemption tracking.

| Column | Type | Description |
|--------|------|-------------|
| usage_id | UUID | Primary key |
| coupon_id | UUID | Foreign key → coupons |
| user_id | UUID | Foreign key → users |
| order_id | UUID | Foreign key → orders |
| discount_applied | DECIMAL(10,2) | Actual discount amount |
| used_at | TIMESTAMPTZ | Redemption timestamp |

---

### 13. push_campaigns
Marketing push notifications.

| Column | Type | Description |
|--------|------|-------------|
| campaign_id | UUID | Primary key |
| tenant_id | UUID | Foreign key → tenants |
| title | TEXT | Notification title |
| message | TEXT | Notification body |
| image_url | TEXT | Notification image URL |
| deep_link | TEXT | App deep link (e.g., "/menu/coffee") |
| audience | ENUM | all, tier_based, location_based, inactive_users, custom |
| audience_filter | JSONB | Audience targeting criteria |
| scheduled_for | TIMESTAMPTZ | Scheduled send time |
| sent_at | TIMESTAMPTZ | Actual send time |
| total_sent | INTEGER | Total notifications sent |
| total_delivered | INTEGER | Successfully delivered |
| total_opened | INTEGER | Opened count |
| total_clicked | INTEGER | Clicked count |
| status | ENUM | draft, scheduled, sending, sent, cancelled |
| created_by | UUID | Creator user ID |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Indexes:**
- `idx_push_campaigns_tenant_id` on tenant_id

---

## Database Functions

### 1. generate_order_number(tenant_id)
Generates unique order number in format `#YYYYMMDD-XXXX`.

**Usage:**
```sql
SELECT generate_order_number('11111111-1111-1111-1111-111111111111');
-- Returns: #20250107-0012
```

### 2. calculate_loyalty_points(order_total, tenant_id)
Calculates points based on order total and tenant config.

**Usage:**
```sql
SELECT calculate_loyalty_points(25.50, '11111111-1111-1111-1111-111111111111');
-- Returns: 255 (if points_per_euro = 10)
```

### 3. calculate_loyalty_tier(lifetime_points, tenant_id)
Determines loyalty tier from lifetime points.

**Usage:**
```sql
SELECT calculate_loyalty_tier(1200, '11111111-1111-1111-1111-111111111111');
-- Returns: 'silver'
```

### 4. validate_coupon(tenant_id, code, order_total, user_id)
Validates coupon and calculates discount.

**Usage:**
```sql
SELECT * FROM validate_coupon(
    '11111111-1111-1111-1111-111111111111',
    'WELCOME10',
    50.00,
    NULL
);
-- Returns: {valid: true, discount_amount: 5.00, error_message: null, ...}
```

### 5. get_sales_analytics(tenant_id, start_date, end_date)
Returns sales analytics JSON.

**Usage:**
```sql
SELECT get_sales_analytics(
    '11111111-1111-1111-1111-111111111111',
    '2025-01-01'::timestamptz,
    '2025-01-31'::timestamptz
);
-- Returns: {"summary": {...}, "daily_revenue": [...], "top_items": [...]}
```

### 6. get_customer_analytics(tenant_id, start_date, end_date)
Returns customer analytics JSON.

### 7. get_loyalty_analytics(tenant_id, start_date, end_date)
Returns loyalty program analytics JSON.

---

## Common Queries

### Get all menu items for a tenant
```sql
SELECT 
    mi.*,
    c.name as category_name
FROM menu_items mi
JOIN categories c ON c.category_id = mi.category_id
WHERE mi.tenant_id = '<tenant_id>'
AND mi.is_available = true
ORDER BY c.display_order, mi.display_order;
```

### Get recent orders for a location
```sql
SELECT 
    o.*,
    u.full_name as customer_name,
    u.phone as customer_phone
FROM orders o
JOIN users u ON u.user_id = o.user_id
WHERE o.location_id = '<location_id>'
AND o.created_at > NOW() - INTERVAL '1 day'
ORDER BY o.created_at DESC;
```

### Get customer loyalty summary
```sql
SELECT 
    u.full_name,
    u.loyalty_points,
    u.loyalty_tier,
    u.total_orders,
    u.total_spent,
    COUNT(lt.transaction_id) as total_transactions
FROM users u
LEFT JOIN loyalty_transactions lt ON lt.user_id = u.user_id
WHERE u.tenant_id = '<tenant_id>'
GROUP BY u.user_id
ORDER BY u.total_spent DESC
LIMIT 20;
```

### Get top selling items
```sql
SELECT 
    mi.name,
    SUM(oi.quantity) as total_sold,
    SUM(oi.subtotal) as total_revenue
FROM order_items oi
JOIN orders o ON o.order_id = oi.order_id
JOIN menu_items mi ON mi.item_id = oi.item_id
WHERE o.tenant_id = '<tenant_id>'
AND o.status = 'completed'
AND o.created_at > NOW() - INTERVAL '30 days'
GROUP BY mi.item_id, mi.name
ORDER BY total_sold DESC
LIMIT 10;
```

---

## Maintenance

### Backup
Supabase automatically backs up your database daily. Manual backups:
```bash
# Via Supabase CLI
supabase db dump -f backup.sql

# Via pg_dump
pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres > backup.sql
```

### Restore
```bash
psql -h db.xxxxx.supabase.co -U postgres -d postgres < backup.sql
```

### Migrations
```bash
# Create new migration
supabase migration new my_change

# Apply migrations
supabase db push

# Rollback (manual)
# Edit migration file and run
```

---

## Performance Tips

1. **Use indexes** - Already configured for common queries
2. **Limit large queries** - Use pagination with LIMIT/OFFSET
3. **Use RLS** - Let Supabase filter at database level
4. **Cache frequently accessed data** - Use Redis or client-side caching
5. **Monitor slow queries** - Check Dashboard > Database > Query Performance

---

**Need help? Check [Setup Guide](./SETUP.md) or [Authentication Guide](./AUTHENTICATION.md)**
