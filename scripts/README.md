# 🌱 Database Seeding Scripts

This directory contains scripts for populating the database with demo data.

## Quick Start

### Option 1: Supabase SQL Editor (Recommended)

1. **Open Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/ugppbaavzevmdkblniim/sql/new
   ```

2. **Copy and paste** the contents of `seed.sql`

3. **Click "RUN"**

4. **Check the output** - You should see success messages with details about created data

5. **Test it:**
   ```
   http://localhost:3000/shop/demo-cafe
   ```

### Option 2: Using psql (Advanced)

If you have `psql` installed:

```bash
# Get your connection string from Supabase Dashboard → Settings → Database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.ugppbaavzevmdkblniim.supabase.co:5432/postgres" -f scripts/seed.sql
```

---

## What Gets Created

### 🏪 1 Tenant
- **Business Name:** Demo Coffee House
- **Slug:** `demo-cafe`
- **Features:** All enabled (ordering, loyalty, delivery, PWA)

### 📍 2 Locations
1. **Downtown Branch** - 123 Main Street, San Francisco, CA
2. **Mission District** - 456 Valencia Street, San Francisco, CA

### 👥 4 Demo Customers
| Name | Email | Points | Tier |
|------|-------|--------|------|
| Sarah Chen | sarah.chen@email.com | 450 | Gold |
| Marcus Williams | marcus.williams@email.com | 180 | Silver |
| Emily Rodriguez | emily.rodriguez@email.com | 820 | Platinum |
| James Patel | james.patel@email.com | 50 | Bronze |

### 📂 5 Categories
1. Espresso Drinks
2. Drip Coffee
3. Cold Brew & Iced
4. Pastries
5. Breakfast

### ☕ 13 Menu Items
**Espresso Drinks:**
- Cappuccino ($4.50)
- Latte ($5.00) - Bestseller
- Americano ($3.50)
- Mocha ($5.50)

**Drip Coffee:**
- House Blend ($2.50)
- Dark Roast ($2.75)

**Cold Brew:**
- Cold Brew ($4.50)
- Iced Latte ($5.25)

**Pastries:**
- Croissant ($3.50)
- Chocolate Chip Cookie ($2.50)
- Blueberry Muffin ($3.75)

**Breakfast:**
- Avocado Toast ($8.50)
- Breakfast Burrito ($9.50)

### 🎟️ 3 Active Coupons
| Code | Type | Value | Min Order |
|------|------|-------|-----------|
| WELCOME10 | Percentage | 10% off | $5.00 |
| FREESHIP | Fixed | $3.00 off | $15.00 |
| MORNING20 | Percentage | 20% off | $10.00 |

### 🎁 4 Loyalty Rewards
1. **Free Small Coffee** - 100 points
2. **Free Pastry** - 150 points
3. **$5 Off Your Order** - 250 points
4. **Free Specialty Drink** - 400 points

### 📦 4 Sample Orders
- 1 Completed order (2 hours ago)
- 1 Being prepared (15 minutes ago)
- 1 Ready for pickup (10 minutes ago)
- 1 Pending (2 minutes ago)

---

## Testing After Seeding

### Test the Customer Shop
```
http://localhost:3000/shop/demo-cafe
```

**Try:**
- Browsing menu items
- Adding items to cart with modifiers
- Applying coupon codes (WELCOME10, FREESHIP, MORNING20)
- Viewing demo orders

### Test Admin Dashboard
```
http://localhost:3000/dashboard
```

**Try:**
- Select "Demo Coffee House" from tenant selector
- View menu items
- Check orders dashboard
- See customer list with loyalty points
- Review coupons and rewards

---

## Cleaning Demo Data

To remove all demo data (keep this commented out in seed.sql by default):

```sql
-- Run this in Supabase SQL Editor
DELETE FROM order_items WHERE order_id IN (SELECT order_id FROM orders WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE slug = 'demo-cafe'));
DELETE FROM orders WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE slug = 'demo-cafe');
DELETE FROM coupon_usage WHERE coupon_id IN (SELECT coupon_id FROM coupons WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE slug = 'demo-cafe'));
DELETE FROM loyalty_transactions WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE slug = 'demo-cafe');
DELETE FROM coupons WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE slug = 'demo-cafe');
DELETE FROM rewards_catalog WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE slug = 'demo-cafe');
DELETE FROM menu_items WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE slug = 'demo-cafe');
DELETE FROM categories WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE slug = 'demo-cafe');
DELETE FROM users WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE slug = 'demo-cafe');
DELETE FROM locations WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE slug = 'demo-cafe');
DELETE FROM tenants WHERE slug = 'demo-cafe';
```

---

## Notes

- All UUIDs are deterministic for easier testing
- Prices include realistic modifiers (sizes, add-ons)
- Orders have realistic timestamps (recent orders)
- Loyalty points match customer tiers
- Coupons have varied expiration dates
- Menu items include allergen information
- Categories have display order for consistent UI

---

## Troubleshooting

**Error: duplicate key value violates unique constraint**
→ Demo data already exists. Run the cleanup SQL above first.

**Error: relation "tenants" does not exist**
→ Run the main schema migration first (see `/supabase/migrations/`)

**No data showing in app**
→ Make sure you're selecting "Demo Coffee House" in the tenant selector

---

**Ready to test! 🚀**
