# Database Query Reference

Quick reference for common database operations in Caffi.pro

## Tenant Operations

### Get all tenants (super admin only)
```sql
SELECT * FROM tenants ORDER BY created_at DESC;
```

### Get tenant by slug
```sql
SELECT * FROM tenants WHERE slug = 'bluebottle-paris';
```

### Get tenant with manifest
```sql
SELECT 
    t.*,
    tm.design_tokens,
    tm.logo_url
FROM tenants t
LEFT JOIN tenant_manifests tm ON t.tenant_id = tm.tenant_id
WHERE t.tenant_id = '11111111-1111-1111-1111-111111111111';
```

## Menu Operations

### Get all active menu items for a tenant
```sql
SELECT 
    mi.*,
    c.name as category_name
FROM menu_items mi
JOIN categories c ON mi.category_id = c.category_id
WHERE mi.tenant_id = '11111111-1111-1111-1111-111111111111'
    AND mi.is_available = true
    AND c.is_active = true
ORDER BY c.display_order, mi.display_order;
```

### Get featured items
```sql
SELECT * FROM menu_items
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
    AND is_featured = true
    AND is_available = true
ORDER BY display_order;
```

### Search menu items
```sql
SELECT * FROM menu_items
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
    AND (
        name ILIKE '%coffee%'
        OR description ILIKE '%coffee%'
        OR 'coffee' = ANY(tags)
    )
    AND is_available = true;
```

## Order Operations

### Get recent orders for a tenant
```sql
SELECT 
    o.*,
    u.full_name as customer_name,
    u.phone as customer_phone,
    l.name as location_name
FROM orders o
JOIN users u ON o.user_id = u.user_id
JOIN locations l ON o.location_id = l.location_id
WHERE o.tenant_id = '11111111-1111-1111-1111-111111111111'
ORDER BY o.created_at DESC
LIMIT 20;
```

### Get orders by status
```sql
SELECT * FROM orders
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
    AND status = 'pending'
ORDER BY created_at ASC;
```

### Get order with items
```sql
SELECT 
    o.*,
    json_agg(
        json_build_object(
            'item_name', oi.item_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'subtotal', oi.subtotal
        )
    ) as items
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
WHERE o.order_id = '81111111-1111-1111-1111-111111111111'
GROUP BY o.order_id;
```

### Get today's revenue
```sql
SELECT 
    COUNT(*) as order_count,
    SUM(total) as total_revenue,
    AVG(total) as avg_order_value
FROM orders
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
    AND status = 'completed'
    AND DATE(created_at) = CURRENT_DATE;
```

## User Operations

### Get user with loyalty stats
```sql
SELECT 
    u.*,
    COUNT(DISTINCT o.order_id) as total_orders,
    SUM(o.total) as lifetime_spent
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id AND o.status = 'completed'
WHERE u.user_id = '51111111-1111-1111-1111-111111111111'
GROUP BY u.user_id;
```

### Get users by loyalty tier
```sql
SELECT * FROM users
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
    AND loyalty_tier = 'gold'
ORDER BY loyalty_points DESC;
```

### Get user's loyalty transaction history
```sql
SELECT * FROM loyalty_transactions
WHERE user_id = '51111111-1111-1111-1111-111111111111'
ORDER BY created_at DESC
LIMIT 20;
```

## Loyalty Operations

### Get available rewards
```sql
SELECT * FROM rewards_catalog
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
    AND is_active = true
    AND (stock_limit IS NULL OR stock_remaining > 0)
ORDER BY points_required ASC;
```

### Check if user can redeem reward
```sql
SELECT 
    u.loyalty_points >= r.points_required as can_redeem,
    u.loyalty_points,
    r.points_required,
    r.name as reward_name
FROM users u
CROSS JOIN rewards_catalog r
WHERE u.user_id = '51111111-1111-1111-1111-111111111111'
    AND r.reward_id = '61111111-1111-1111-1111-111111111111'
    AND r.is_active = true;
```

## Coupon Operations

### Validate coupon code
```sql
SELECT * FROM coupons
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
    AND code = 'WELCOME10'
    AND is_active = true
    AND valid_from <= NOW()
    AND (valid_until IS NULL OR valid_until >= NOW())
    AND (max_uses IS NULL OR current_uses < max_uses);
```

### Get coupon usage stats
```sql
SELECT 
    c.code,
    c.discount_type,
    c.discount_value,
    c.current_uses,
    c.max_uses,
    COUNT(cu.usage_id) as actual_uses
FROM coupons c
LEFT JOIN coupon_usage cu ON c.coupon_id = cu.coupon_id
WHERE c.tenant_id = '11111111-1111-1111-1111-111111111111'
GROUP BY c.coupon_id;
```

## Analytics Queries

### Sales analytics (using function)
```sql
SELECT get_sales_analytics(
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '30 days',
    NOW()
);
```

### Revenue by day (last 7 days)
```sql
SELECT 
    DATE(created_at) as date,
    COUNT(*) as orders,
    SUM(total) as revenue
FROM orders
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
    AND status = 'completed'
    AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Top selling items
```sql
SELECT 
    mi.name,
    SUM(oi.quantity) as total_sold,
    SUM(oi.subtotal) as revenue
FROM order_items oi
JOIN orders o ON oi.order_id = o.order_id
JOIN menu_items mi ON oi.item_id = mi.item_id
WHERE o.tenant_id = '11111111-1111-1111-1111-111111111111'
    AND o.status = 'completed'
    AND o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY mi.item_id, mi.name
ORDER BY total_sold DESC
LIMIT 10;
```

### Customer acquisition
```sql
SELECT 
    DATE(created_at) as signup_date,
    COUNT(*) as new_customers
FROM users
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
    AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY signup_date DESC;
```

## Push Campaign Operations

### Get active campaigns
```sql
SELECT * FROM push_campaigns
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
    AND status IN ('scheduled', 'sending')
ORDER BY scheduled_for ASC;
```

### Get campaign stats
```sql
SELECT 
    campaign_id,
    title,
    total_sent,
    total_delivered,
    total_opened,
    total_clicked,
    ROUND(total_opened::numeric / NULLIF(total_delivered, 0) * 100, 2) as open_rate,
    ROUND(total_clicked::numeric / NULLIF(total_opened, 0) * 100, 2) as click_rate
FROM push_campaigns
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
ORDER BY created_at DESC;
```

## Location Operations

### Get active locations
```sql
SELECT * FROM locations
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
    AND is_active = true
ORDER BY display_order;
```

### Check if location is open
```sql
SELECT 
    name,
    hours->>LOWER(TO_CHAR(NOW(), 'Day')) as today_hours,
    CASE 
        WHEN hours->>LOWER(TO_CHAR(NOW(), 'Day')) IS NULL THEN false
        ELSE true
    END as is_open
FROM locations
WHERE location_id = '21111111-1111-1111-1111-111111111111';
```

## Testing RLS

### Test tenant isolation
```sql
-- This should only return data for the tenant_id in JWT
-- (when called from application with proper JWT)
SELECT * FROM orders;

-- Super admin should see all
-- (when JWT has role = 'super_admin')
SELECT COUNT(*) FROM orders;
```

### Test public access
```sql
-- These should work without authentication (public read)
SELECT * FROM menu_items WHERE is_available = true;
SELECT * FROM categories WHERE is_active = true;
SELECT * FROM locations WHERE is_active = true;
```

## Utility Queries

### Reset user loyalty points
```sql
UPDATE users
SET loyalty_points = 0,
    lifetime_points = 0,
    loyalty_tier = 'bronze'
WHERE user_id = '51111111-1111-1111-1111-111111111111';
```

### Calculate total points for user
```sql
SELECT 
    COALESCE(SUM(points_change), 0) as total_points_earned
FROM loyalty_transactions
WHERE user_id = '51111111-1111-1111-1111-111111111111'
    AND points_change > 0;
```

### Get order count by status
```sql
SELECT 
    status,
    COUNT(*) as count
FROM orders
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
GROUP BY status;
```
