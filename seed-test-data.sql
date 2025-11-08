-- =====================================================
-- SEED TEST DATA FOR ANALYTICS DASHBOARD
-- Run this in Supabase SQL Editor if you have no data
-- =====================================================

-- Check if we already have data
DO $$
DECLARE
  tenant_count INTEGER;
  user_count INTEGER;
  order_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tenant_count FROM tenants;
  SELECT COUNT(*) INTO user_count FROM users;
  SELECT COUNT(*) INTO order_count FROM orders;
  
  RAISE NOTICE 'Current data: % tenants, % users, % orders', tenant_count, user_count, order_count;
END $$;

-- Only proceed if we have tenants
DO $$
DECLARE
  v_tenant_id UUID;
  v_location_id UUID;
  v_user_id UUID;
  v_category_id UUID;
  v_item_id UUID;
  i INTEGER;
BEGIN
  -- Get or create a test tenant
  SELECT tenant_id INTO v_tenant_id FROM tenants LIMIT 1;
  
  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'Creating test tenant...';
    INSERT INTO tenants (business_name, slug, owner_email, app_name, bundle_id)
    VALUES ('Test Coffee Shop', 'test-coffee-shop', 'test@example.com', 'Test Coffee App', 'com.test.coffee')
    RETURNING tenant_id INTO v_tenant_id;
  END IF;
  
  RAISE NOTICE 'Using tenant: %', v_tenant_id;
  
  -- Get or create a location
  SELECT location_id INTO v_location_id FROM locations WHERE tenant_id = v_tenant_id LIMIT 1;
  
  IF v_location_id IS NULL THEN
    RAISE NOTICE 'Creating test location...';
    INSERT INTO locations (tenant_id, name, address, city, country)
    VALUES (v_tenant_id, 'Main Street Location', '123 Main St', 'Paris', 'France')
    RETURNING location_id INTO v_location_id;
  END IF;
  
  -- Get or create a category
  SELECT category_id INTO v_category_id FROM categories WHERE tenant_id = v_tenant_id LIMIT 1;
  
  IF v_category_id IS NULL THEN
    RAISE NOTICE 'Creating test category...';
    INSERT INTO categories (tenant_id, name, description)
    VALUES (v_tenant_id, 'Coffee', 'Hot and cold coffee drinks')
    RETURNING category_id INTO v_category_id;
  END IF;
  
  -- Get or create a menu item
  SELECT item_id INTO v_item_id FROM menu_items WHERE tenant_id = v_tenant_id LIMIT 1;
  
  IF v_item_id IS NULL THEN
    RAISE NOTICE 'Creating test menu item...';
    INSERT INTO menu_items (tenant_id, category_id, name, description, price)
    VALUES (v_tenant_id, v_category_id, 'Cappuccino', 'Classic Italian coffee', 4.50)
    RETURNING item_id INTO v_item_id;
  END IF;
  
  -- Create test users (10 users over the last 30 days)
  RAISE NOTICE 'Creating test users...';
  FOR i IN 1..10 LOOP
    INSERT INTO users (tenant_id, phone, email, full_name, loyalty_points, created_at)
    VALUES (
      v_tenant_id,
      '+33600000' || LPAD(i::TEXT, 3, '0'),
      'user' || i || '@test.com',
      'Test User ' || i,
      (random() * 100)::INTEGER,
      NOW() - (random() * interval '30 days')
    )
    ON CONFLICT (tenant_id, phone) DO NOTHING;
  END LOOP;
  
  -- Get a user ID for orders
  SELECT user_id INTO v_user_id FROM users WHERE tenant_id = v_tenant_id LIMIT 1;
  
  -- Create test orders (50 orders over the last 30 days)
  RAISE NOTICE 'Creating test orders...';
  FOR i IN 1..50 LOOP
    DECLARE
      v_order_id UUID;
      v_subtotal DECIMAL(10,2);
      v_status TEXT;
      v_created_at TIMESTAMPTZ;
    BEGIN
      v_subtotal := (random() * 50 + 10)::DECIMAL(10,2);
      v_created_at := NOW() - (random() * interval '30 days');
      
      -- Random status (80% completed, 10% preparing, 5% pending, 5% cancelled)
      CASE 
        WHEN random() < 0.80 THEN v_status := 'completed';
        WHEN random() < 0.90 THEN v_status := 'preparing';
        WHEN random() < 0.95 THEN v_status := 'pending';
        ELSE v_status := 'cancelled';
      END CASE;
      
      INSERT INTO orders (
        tenant_id,
        user_id,
        location_id,
        order_number,
        status,
        subtotal,
        tax,
        total,
        payment_status,
        created_at
      )
      VALUES (
        v_tenant_id,
        v_user_id,
        v_location_id,
        '#' || LPAD(i::TEXT, 4, '0'),
        v_status::order_status,
        v_subtotal,
        v_subtotal * 0.20,
        v_subtotal * 1.20,
        CASE WHEN v_status = 'completed' THEN 'paid'::payment_status ELSE 'pending'::payment_status END,
        v_created_at
      )
      RETURNING order_id INTO v_order_id;
      
      -- Add order items
      INSERT INTO order_items (
        order_id,
        item_id,
        item_name,
        quantity,
        unit_price,
        subtotal
      )
      VALUES (
        v_order_id,
        v_item_id,
        'Cappuccino',
        (random() * 3 + 1)::INTEGER,
        4.50,
        v_subtotal
      );
    END;
  END LOOP;
  
  RAISE NOTICE 'Test data created successfully!';
  RAISE NOTICE 'You can now view the analytics dashboard';
END $$;

-- Verify the data
SELECT 
  (SELECT COUNT(*) FROM tenants) as tenants,
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM orders) as orders,
  (SELECT COUNT(*) FROM orders WHERE status = 'completed') as completed_orders,
  (SELECT SUM(total) FROM orders WHERE status = 'completed') as total_revenue;



