-- ============================================
-- CAFFI.PRO - DEMO SEED DATA
-- ============================================
-- This script creates realistic demo data for testing
-- Run this AFTER creating the database schema
-- ============================================

-- Clean existing demo data (optional - comment out if you want to keep existing data)
-- DELETE FROM order_items WHERE order_id IN (SELECT order_id FROM orders WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE slug = 'demo-cafe'));
-- DELETE FROM orders WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE slug = 'demo-cafe');
-- DELETE FROM coupon_usage WHERE coupon_id IN (SELECT coupon_id FROM coupons WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE slug = 'demo-cafe'));
-- DELETE FROM coupons WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE slug = 'demo-cafe');
-- DELETE FROM rewards_catalog WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE slug = 'demo-cafe');
-- DELETE FROM menu_items WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE slug = 'demo-cafe');
-- DELETE FROM categories WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE slug = 'demo-cafe');
-- DELETE FROM users WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE slug = 'demo-cafe');
-- DELETE FROM locations WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE slug = 'demo-cafe');
-- DELETE FROM tenants WHERE slug = 'demo-cafe';

-- ============================================
-- 1. CREATE DEMO TENANT
-- ============================================
INSERT INTO tenants (
  tenant_id,
  business_name,
  slug,
  owner_email,
  phone,
  primary_color,
  currency,
  tax_rate,
  subscription_tier,
  subscription_status,
  features_enabled
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Demo Coffee House',
  'demo-cafe',
  'owner@democafe.com',
  '+1-555-COFFEE',
  '#6B4423',
  'USD',
  8.50,
  'premium',
  'active',
  '{"ordering": true, "loyalty": true, "delivery": true, "pwa": true}'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 2. CREATE LOCATIONS
-- ============================================
INSERT INTO locations (
  location_id,
  tenant_id,
  name,
  address,
  city,
  state,
  zip_code,
  country,
  phone,
  email,
  latitude,
  longitude,
  hours,
  is_active,
  accepts_orders
) VALUES
(
  '22222222-2222-2222-2222-222222222221',
  '11111111-1111-1111-1111-111111111111',
  'Downtown Branch',
  '123 Main Street',
  'San Francisco',
  'CA',
  '94102',
  'USA',
  '+1-555-1234',
  'downtown@democafe.com',
  37.7749,
  -122.4194,
  '{"monday": "6:00-20:00", "tuesday": "6:00-20:00", "wednesday": "6:00-20:00", "thursday": "6:00-20:00", "friday": "6:00-21:00", "saturday": "7:00-21:00", "sunday": "7:00-19:00"}'::jsonb,
  true,
  true
),
(
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Mission District',
  '456 Valencia Street',
  'San Francisco',
  'CA',
  '94110',
  'USA',
  '+1-555-5678',
  'mission@democafe.com',
  37.7599,
  -122.4212,
  '{"monday": "7:00-19:00", "tuesday": "7:00-19:00", "wednesday": "7:00-19:00", "thursday": "7:00-19:00", "friday": "7:00-20:00", "saturday": "8:00-20:00", "sunday": "8:00-18:00"}'::jsonb,
  true,
  true
) ON CONFLICT (location_id) DO NOTHING;

-- ============================================
-- 3. CREATE DEMO USERS (Customers)
-- ============================================
INSERT INTO users (
  user_id,
  tenant_id,
  email,
  full_name,
  phone,
  loyalty_points,
  loyalty_tier,
  preferred_location_id
) VALUES
(
  '33333333-3333-3333-3333-333333333331',
  '11111111-1111-1111-1111-111111111111',
  'sarah.chen@email.com',
  'Sarah Chen',
  '+1-555-0101',
  450,
  'gold',
  '22222222-2222-2222-2222-222222222221'
),
(
  '33333333-3333-3333-3333-333333333332',
  '11111111-1111-1111-1111-111111111111',
  'marcus.williams@email.com',
  'Marcus Williams',
  '+1-555-0102',
  180,
  'silver',
  '22222222-2222-2222-2222-222222222221'
),
(
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'emily.rodriguez@email.com',
  'Emily Rodriguez',
  '+1-555-0103',
  820,
  'platinum',
  '22222222-2222-2222-2222-222222222222'
),
(
  '33333333-3333-3333-3333-333333333334',
  '11111111-1111-1111-1111-111111111111',
  'james.patel@email.com',
  'James Patel',
  '+1-555-0104',
  50,
  'bronze',
  '22222222-2222-2222-2222-222222222221'
) ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 4. CREATE CATEGORIES
-- ============================================
INSERT INTO categories (
  category_id,
  tenant_id,
  name,
  description,
  display_order,
  is_active
) VALUES
(
  '44444444-4444-4444-4444-444444444441',
  '11111111-1111-1111-1111-111111111111',
  'Espresso Drinks',
  'Classic espresso-based beverages',
  1,
  true
),
(
  '44444444-4444-4444-4444-444444444442',
  '11111111-1111-1111-1111-111111111111',
  'Drip Coffee',
  'Fresh brewed coffee',
  2,
  true
),
(
  '44444444-4444-4444-4444-444444444443',
  '11111111-1111-1111-1111-111111111111',
  'Cold Brew & Iced',
  'Refreshing cold coffee drinks',
  3,
  true
),
(
  '44444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  'Pastries',
  'Fresh baked goods',
  4,
  true
),
(
  '44444444-4444-4444-4444-444444444445',
  '11111111-1111-1111-1111-111111111111',
  'Breakfast',
  'Morning favorites',
  5,
  true
) ON CONFLICT (category_id) DO NOTHING;

-- ============================================
-- 5. CREATE MENU ITEMS
-- ============================================
INSERT INTO menu_items (
  item_id,
  tenant_id,
  category_id,
  name,
  description,
  price,
  is_available,
  modifiers,
  tags,
  allergens,
  calories
) VALUES
-- Espresso Drinks
(
  '55555555-5555-5555-5555-555555555551',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444441',
  'Cappuccino',
  'Espresso with steamed milk and foam',
  4.50,
  true,
  '{"sizes": [{"name": "Small", "price": 0}, {"name": "Medium", "price": 0.75}, {"name": "Large", "price": 1.50}], "addons": [{"name": "Extra Shot", "price": 1.00}, {"name": "Oat Milk", "price": 0.75}, {"name": "Vanilla Syrup", "price": 0.50}]}'::jsonb,
  ARRAY['coffee', 'espresso', 'popular'],
  ARRAY['milk'],
  120
),
(
  '55555555-5555-5555-5555-555555555552',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444441',
  'Latte',
  'Smooth espresso with steamed milk',
  5.00,
  true,
  '{"sizes": [{"name": "Small", "price": 0}, {"name": "Medium", "price": 0.75}, {"name": "Large", "price": 1.50}], "addons": [{"name": "Extra Shot", "price": 1.00}, {"name": "Almond Milk", "price": 0.75}, {"name": "Caramel Syrup", "price": 0.50}, {"name": "Hazelnut Syrup", "price": 0.50}]}'::jsonb,
  ARRAY['coffee', 'espresso', 'bestseller'],
  ARRAY['milk'],
  150
),
(
  '55555555-5555-5555-5555-555555555553',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444441',
  'Americano',
  'Espresso with hot water',
  3.50,
  true,
  '{"sizes": [{"name": "Small", "price": 0}, {"name": "Medium", "price": 0.50}, {"name": "Large", "price": 1.00}], "addons": [{"name": "Extra Shot", "price": 1.00}]}'::jsonb,
  ARRAY['coffee', 'espresso', 'simple'],
  ARRAY[],
  10
),
(
  '55555555-5555-5555-5555-555555555554',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444441',
  'Mocha',
  'Espresso with chocolate and steamed milk',
  5.50,
  true,
  '{"sizes": [{"name": "Small", "price": 0}, {"name": "Medium", "price": 0.75}, {"name": "Large", "price": 1.50}], "addons": [{"name": "Whipped Cream", "price": 0.50}, {"name": "Extra Shot", "price": 1.00}, {"name": "Dark Chocolate", "price": 0.75}]}'::jsonb,
  ARRAY['coffee', 'chocolate', 'sweet'],
  ARRAY['milk', 'soy'],
  250
),
-- Drip Coffee
(
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444442',
  'House Blend',
  'Our signature medium roast',
  2.50,
  true,
  '{"sizes": [{"name": "Small", "price": 0}, {"name": "Medium", "price": 0.50}, {"name": "Large", "price": 1.00}]}'::jsonb,
  ARRAY['coffee', 'classic'],
  ARRAY[],
  5
),
(
  '55555555-5555-5555-5555-555555555556',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444442',
  'Dark Roast',
  'Bold and rich dark roast',
  2.75,
  true,
  '{"sizes": [{"name": "Small", "price": 0}, {"name": "Medium", "price": 0.50}, {"name": "Large", "price": 1.00}]}'::jsonb,
  ARRAY['coffee', 'strong'],
  ARRAY[],
  5
),
-- Cold Brew
(
  '55555555-5555-5555-5555-555555555557',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444443',
  'Cold Brew',
  'Smooth 16-hour steeped coffee',
  4.50,
  true,
  '{"sizes": [{"name": "Medium", "price": 0}, {"name": "Large", "price": 1.00}], "addons": [{"name": "Vanilla Sweet Cream", "price": 0.75}, {"name": "Oat Milk", "price": 0.75}]}'::jsonb,
  ARRAY['coffee', 'cold', 'popular'],
  ARRAY[],
  10
),
(
  '55555555-5555-5555-5555-555555555558',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444443',
  'Iced Latte',
  'Espresso over ice with cold milk',
  5.25,
  true,
  '{"sizes": [{"name": "Medium", "price": 0}, {"name": "Large", "price": 1.00}], "addons": [{"name": "Caramel Drizzle", "price": 0.50}, {"name": "Vanilla Syrup", "price": 0.50}]}'::jsonb,
  ARRAY['coffee', 'cold', 'iced'],
  ARRAY['milk'],
  180
),
-- Pastries
(
  '55555555-5555-5555-5555-555555555559',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',
  'Croissant',
  'Buttery French pastry',
  3.50,
  true,
  '{}'::jsonb,
  ARRAY['pastry', 'breakfast'],
  ARRAY['wheat', 'eggs', 'milk'],
  290
),
(
  '55555555-5555-5555-5555-555555555560',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',
  'Chocolate Chip Cookie',
  'Fresh baked cookie',
  2.50,
  true,
  '{}'::jsonb,
  ARRAY['dessert', 'sweet'],
  ARRAY['wheat', 'eggs', 'milk', 'soy'],
  350
),
(
  '55555555-5555-5555-5555-555555555561',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',
  'Blueberry Muffin',
  'Moist muffin bursting with blueberries',
  3.75,
  true,
  '{}'::jsonb,
  ARRAY['pastry', 'breakfast'],
  ARRAY['wheat', 'eggs', 'milk'],
  380
),
-- Breakfast
(
  '55555555-5555-5555-5555-555555555562',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444445',
  'Avocado Toast',
  'Smashed avocado on sourdough with everything bagel seasoning',
  8.50,
  true,
  '{"addons": [{"name": "Add Egg", "price": 2.00}, {"name": "Add Bacon", "price": 2.50}]}'::jsonb,
  ARRAY['breakfast', 'healthy', 'vegan'],
  ARRAY['wheat'],
  350
),
(
  '55555555-5555-5555-5555-555555555563',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444445',
  'Breakfast Burrito',
  'Eggs, cheese, potatoes, and your choice of meat',
  9.50,
  true,
  '{"options": [{"name": "Bacon", "price": 0}, {"name": "Sausage", "price": 0}, {"name": "Vegetarian", "price": -1.00}], "addons": [{"name": "Extra Egg", "price": 1.50}, {"name": "Guacamole", "price": 1.50}]}'::jsonb,
  ARRAY['breakfast', 'hearty'],
  ARRAY['wheat', 'eggs', 'milk'],
  620
)
ON CONFLICT (item_id) DO NOTHING;

-- ============================================
-- 6. CREATE COUPONS
-- ============================================
INSERT INTO coupons (
  coupon_id,
  tenant_id,
  code,
  discount_type,
  discount_value,
  min_order_amount,
  max_uses,
  times_used,
  expires_at,
  is_active
) VALUES
(
  '66666666-6666-6666-6666-666666666661',
  '11111111-1111-1111-1111-111111111111',
  'WELCOME10',
  'percentage',
  10.00,
  5.00,
  100,
  12,
  NOW() + INTERVAL '30 days',
  true
),
(
  '66666666-6666-6666-6666-666666666662',
  '11111111-1111-1111-1111-111111111111',
  'FREESHIP',
  'fixed',
  3.00,
  15.00,
  50,
  8,
  NOW() + INTERVAL '14 days',
  true
),
(
  '66666666-6666-6666-6666-666666666663',
  '11111111-1111-1111-1111-111111111111',
  'MORNING20',
  'percentage',
  20.00,
  10.00,
  NULL,
  45,
  NOW() + INTERVAL '60 days',
  true
)
ON CONFLICT (coupon_id) DO NOTHING;

-- ============================================
-- 7. CREATE REWARDS
-- ============================================
INSERT INTO rewards_catalog (
  reward_id,
  tenant_id,
  name,
  description,
  points_required,
  reward_type,
  reward_value,
  is_active
) VALUES
(
  '77777777-7777-7777-7777-777777777771',
  '11111111-1111-1111-1111-111111111111',
  'Free Small Coffee',
  'Redeem for any small drip coffee',
  100,
  'free_item',
  2.50,
  true
),
(
  '77777777-7777-7777-7777-777777777772',
  '11111111-1111-1111-1111-111111111111',
  'Free Pastry',
  'Choose any pastry on us',
  150,
  'free_item',
  3.50,
  true
),
(
  '77777777-7777-7777-7777-777777777773',
  '11111111-1111-1111-1111-111111111111',
  '$5 Off Your Order',
  'Discount on orders over $15',
  250,
  'discount',
  5.00,
  true
),
(
  '77777777-7777-7777-7777-777777777774',
  '11111111-1111-1111-1111-111111111111',
  'Free Specialty Drink',
  'Any size latte, cappuccino, or mocha',
  400,
  'free_item',
  5.50,
  true
)
ON CONFLICT (reward_id) DO NOTHING;

-- ============================================
-- 8. CREATE SAMPLE ORDERS
-- ============================================
INSERT INTO orders (
  order_id,
  order_number,
  tenant_id,
  location_id,
  user_id,
  status,
  order_type,
  payment_method,
  payment_status,
  subtotal,
  tax,
  discount,
  total,
  coupon_code_used,
  points_earned,
  special_instructions,
  created_at
) VALUES
-- Recent completed order
(
  '88888888-8888-8888-8888-888888888881',
  'ORD-001234',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222221',
  '33333333-3333-3333-3333-333333333331',
  'completed',
  'pickup',
  'cash',
  'paid',
  12.50,
  1.06,
  0.00,
  13.56,
  NULL,
  13,
  NULL,
  NOW() - INTERVAL '2 hours'
),
-- Order being prepared
(
  '88888888-8888-8888-8888-888888888882',
  'ORD-001235',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222221',
  '33333333-3333-3333-3333-333333333332',
  'preparing',
  'dine_in',
  'cash',
  'paid',
  18.75,
  1.59,
  0.00,
  20.34,
  NULL,
  20,
  'Extra hot, please',
  NOW() - INTERVAL '15 minutes'
),
-- Ready for pickup
(
  '88888888-8888-8888-8888-888888888883',
  'ORD-001236',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  'ready',
  'pickup',
  'cash',
  'paid',
  25.00,
  2.13,
  2.50,
  24.63,
  'WELCOME10',
  24,
  NULL,
  NOW() - INTERVAL '10 minutes'
),
-- Pending order
(
  '88888888-8888-8888-8888-888888888884',
  'ORD-001237',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222221',
  '33333333-3333-3333-3333-333333333334',
  'pending',
  'pickup',
  'cash',
  'pending',
  8.50,
  0.72,
  0.00,
  9.22,
  NULL,
  9,
  'No ice',
  NOW() - INTERVAL '2 minutes'
)
ON CONFLICT (order_id) DO NOTHING;

-- ============================================
-- 9. CREATE ORDER ITEMS
-- ============================================
INSERT INTO order_items (
  order_item_id,
  order_id,
  item_id,
  item_name,
  quantity,
  unit_price,
  modifiers,
  special_instructions,
  total_price
) VALUES
-- Order 1 items
(
  gen_random_uuid(),
  '88888888-8888-8888-8888-888888888881',
  '55555555-5555-5555-5555-555555555552',
  'Latte',
  1,
  5.75,
  '{"size": {"name": "Medium", "price": 0.75}}'::jsonb,
  NULL,
  5.75
),
(
  gen_random_uuid(),
  '88888888-8888-8888-8888-888888888881',
  '55555555-5555-5555-5555-555555555559',
  'Croissant',
  2,
  3.50,
  NULL,
  NULL,
  7.00
),
-- Order 2 items
(
  gen_random_uuid(),
  '88888888-8888-8888-8888-888888888882',
  '55555555-5555-5555-5555-555555555554',
  'Mocha',
  1,
  6.25,
  '{"size": {"name": "Large", "price": 1.50}, "addons": [{"name": "Whipped Cream", "price": 0.50}]}'::jsonb,
  'Extra hot',
  6.25
),
(
  gen_random_uuid(),
  '88888888-8888-8888-8888-888888888882',
  '55555555-5555-5555-5555-555555555562',
  'Avocado Toast',
  1,
  10.50,
  '{"addons": [{"name": "Add Egg", "price": 2.00}]}'::jsonb,
  NULL,
  10.50
),
-- Order 3 items
(
  gen_random_uuid(),
  '88888888-8888-8888-8888-888888888883',
  '55555555-5555-5555-5555-555555555557',
  'Cold Brew',
  2,
  5.50,
  '{"size": {"name": "Large", "price": 1.00}}'::jsonb,
  NULL,
  11.00
),
(
  gen_random_uuid(),
  '88888888-8888-8888-8888-888888888883',
  '55555555-5555-5555-5555-555555555563',
  'Breakfast Burrito',
  1,
  9.50,
  '{"options": [{"name": "Bacon", "price": 0}]}'::jsonb,
  NULL,
  9.50
),
-- Order 4 items
(
  gen_random_uuid(),
  '88888888-8888-8888-8888-888888888884',
  '55555555-5555-5555-5555-555555555558',
  'Iced Latte',
  1,
  5.25,
  NULL,
  'No ice',
  5.25
);

-- ============================================
-- 10. CREATE LOYALTY TRANSACTIONS
-- ============================================
INSERT INTO loyalty_transactions (
  transaction_id,
  tenant_id,
  user_id,
  order_id,
  points_change,
  transaction_type,
  description
) VALUES
(
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333331',
  '88888888-8888-8888-8888-888888888881',
  13,
  'earned',
  'Points earned from order'
),
(
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333332',
  '88888888-8888-8888-8888-888888888882',
  20,
  'earned',
  'Points earned from order'
),
(
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  '88888888-8888-8888-8888-888888888883',
  24,
  'earned',
  'Points earned from order'
);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ DEMO SEED DATA CREATED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '🏪 Tenant: Demo Coffee House (slug: demo-cafe)';
  RAISE NOTICE '📍 Locations: 2 (Downtown Branch, Mission District)';
  RAISE NOTICE '👥 Customers: 4 demo users';
  RAISE NOTICE '📂 Categories: 5 categories';
  RAISE NOTICE '☕ Menu Items: 13 items';
  RAISE NOTICE '🎟️ Coupons: 3 active coupons';
  RAISE NOTICE '🎁 Rewards: 4 loyalty rewards';
  RAISE NOTICE '📦 Orders: 4 sample orders';
  RAISE NOTICE '';
  RAISE NOTICE '🔗 Access the shop at:';
  RAISE NOTICE '   http://localhost:3000/shop/demo-cafe';
  RAISE NOTICE '';
  RAISE NOTICE '📧 Test customer accounts:';
  RAISE NOTICE '   - sarah.chen@email.com (450 points, Gold tier)';
  RAISE NOTICE '   - marcus.williams@email.com (180 points, Silver tier)';
  RAISE NOTICE '   - emily.rodriguez@email.com (820 points, Platinum tier)';
  RAISE NOTICE '   - james.patel@email.com (50 points, Bronze tier)';
  RAISE NOTICE '';
  RAISE NOTICE '🎟️ Test coupons:';
  RAISE NOTICE '   - WELCOME10 (10% off orders over $5)';
  RAISE NOTICE '   - FREESHIP ($3 off orders over $15)';
  RAISE NOTICE '   - MORNING20 (20% off orders over $10)';
  RAISE NOTICE '';
END $$;
