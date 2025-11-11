-- Caffi.pro Database Schema
-- Multi-tenant Coffee Shop Platform
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TENANTS (Coffee Shop Businesses)
-- ============================================================================
CREATE TABLE tenants (
  tenant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  business_name TEXT NOT NULL,
  app_name TEXT NOT NULL,
  bundle_id TEXT,
  owner_email TEXT NOT NULL,
  owner_phone TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'pro', 'enterprise')),
  setup_status TEXT DEFAULT 'pending' CHECK (setup_status IN ('pending', 'active', 'suspended', 'cancelled')),
  internal_notes TEXT,
  onboarding_checklist JSONB DEFAULT '{"menu_setup": false, "location_setup": false, "payment_setup": false, "staff_setup": false}'::jsonb,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_owner_email ON tenants(owner_email);

-- ============================================================================
-- LOCATIONS (Physical Cafe Locations)
-- ============================================================================
CREATE TABLE locations (
  location_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  postal_code TEXT NOT NULL,
  country TEXT DEFAULT 'Ireland',
  phone TEXT,
  email TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  hours JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  accepts_mobile_orders BOOLEAN DEFAULT true,
  accepts_dine_in_orders BOOLEAN DEFAULT true,
  estimated_prep_time INTEGER DEFAULT 15, -- minutes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_locations_tenant ON locations(tenant_id);
CREATE INDEX idx_locations_active ON locations(is_active);

-- ============================================================================
-- MENU CATEGORIES
-- ============================================================================
CREATE TABLE categories (
  category_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  icon_name TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

CREATE INDEX idx_categories_tenant ON categories(tenant_id);
CREATE INDEX idx_categories_active ON categories(is_active);
CREATE INDEX idx_categories_order ON categories(display_order);

-- ============================================================================
-- MENU ITEMS
-- ============================================================================
CREATE TABLE menu_items (
  item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  modifiers JSONB DEFAULT '{"sizes": [], "addons": []}'::jsonb,
  tags TEXT[] DEFAULT '{}',
  allergens TEXT[] DEFAULT '{}',
  calories INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_menu_items_tenant ON menu_items(tenant_id);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_available ON menu_items(is_available);
CREATE INDEX idx_menu_items_featured ON menu_items(is_featured);

-- ============================================================================
-- CUSTOMERS (User Accounts)
-- ============================================================================
CREATE TABLE customers (
  customer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  points INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_customers_user ON customers(user_id);
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_email ON customers(email);

-- ============================================================================
-- ORDERS
-- ============================================================================
CREATE TABLE orders (
  order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(location_id) ON DELETE RESTRICT,
  user_id UUID REFERENCES customers(customer_id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  order_type TEXT DEFAULT 'pickup' CHECK (order_type IN ('pickup', 'dine_in', 'delivery')),
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  payment_method TEXT,
  payment_intent_id TEXT,
  coupon_code_used TEXT,
  points_earned INTEGER DEFAULT 0,
  points_redeemed INTEGER DEFAULT 0,
  special_instructions TEXT,
  preparation_started_at TIMESTAMPTZ,
  estimated_ready_time TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  assigned_to_staff_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_location ON orders(location_id);
CREATE INDEX idx_orders_customer ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_number ON orders(order_number);

-- ============================================================================
-- ORDER ITEMS
-- ============================================================================
CREATE TABLE order_items (
  order_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  item_id UUID REFERENCES menu_items(item_id) ON DELETE SET NULL,
  item_snapshot JSONB NOT NULL, -- Store item details at time of order
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_item ON order_items(item_id);

-- ============================================================================
-- STAFF USERS
-- ============================================================================
CREATE TABLE staff_users (
  staff_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'barista' CHECK (role IN ('owner', 'manager', 'barista', 'kitchen', 'cashier')),
  assigned_location_id UUID REFERENCES locations(location_id) ON DELETE SET NULL,
  can_manage_orders BOOLEAN DEFAULT true,
  can_manage_inventory BOOLEAN DEFAULT false,
  can_manage_staff BOOLEAN DEFAULT false,
  can_view_reports BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_staff_tenant ON staff_users(tenant_id);
CREATE INDEX idx_staff_user ON staff_users(user_id);
CREATE INDEX idx_staff_location ON staff_users(assigned_location_id);
CREATE INDEX idx_staff_active ON staff_users(is_active);

-- ============================================================================
-- REWARDS (Loyalty Program)
-- ============================================================================
CREATE TABLE rewards (
  reward_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  image_url TEXT,
  reward_type TEXT DEFAULT 'free_item' CHECK (reward_type IN ('coupon', 'free_item', 'discount')),
  reward_value JSONB NOT NULL, -- {item_id, discount_percentage, discount_amount}
  stock_limit INTEGER,
  stock_remaining INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rewards_tenant ON rewards(tenant_id);
CREATE INDEX idx_rewards_active ON rewards(is_active);

-- ============================================================================
-- REWARD REDEMPTIONS
-- ============================================================================
CREATE TABLE reward_redemptions (
  redemption_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES rewards(reward_id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'expired', 'cancelled')),
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  order_id UUID REFERENCES orders(order_id) ON DELETE SET NULL
);

CREATE INDEX idx_redemptions_tenant ON reward_redemptions(tenant_id);
CREATE INDEX idx_redemptions_customer ON reward_redemptions(customer_id);
CREATE INDEX idx_redemptions_reward ON reward_redemptions(reward_id);
CREATE INDEX idx_redemptions_status ON reward_redemptions(status);

-- ============================================================================
-- COUPONS
-- ============================================================================
CREATE TABLE coupons (
  coupon_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value DECIMAL(10, 2) NOT NULL,
  min_order_amount DECIMAL(10, 2) DEFAULT 0,
  max_discount DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

CREATE INDEX idx_coupons_tenant ON coupons(tenant_id);
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active);

-- ============================================================================
-- INVENTORY ITEMS
-- ============================================================================
CREATE TABLE inventory_items (
  inventory_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(location_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'other' CHECK (category IN ('coffee_beans', 'milk', 'syrups', 'cups', 'food', 'supplies', 'other')),
  sku TEXT,
  current_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'units',
  min_stock_level DECIMAL(10, 2) DEFAULT 0,
  max_stock_level DECIMAL(10, 2),
  unit_cost DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT true,
  last_restocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_tenant ON inventory_items(tenant_id);
CREATE INDEX idx_inventory_location ON inventory_items(location_id);
CREATE INDEX idx_inventory_category ON inventory_items(category);

-- ============================================================================
-- INVENTORY TRANSACTIONS
-- ============================================================================
CREATE TABLE inventory_transactions (
  transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(inventory_item_id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff_users(staff_id) ON DELETE SET NULL,
  transaction_type TEXT CHECK (transaction_type IN ('restock', 'usage', 'waste', 'adjustment')),
  quantity DECIMAL(10, 2) NOT NULL, -- Positive for add, negative for subtract
  unit TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_tenant ON inventory_transactions(tenant_id);
CREATE INDEX idx_transactions_item ON inventory_transactions(inventory_item_id);
CREATE INDEX idx_transactions_staff ON inventory_transactions(staff_id);
CREATE INDEX idx_transactions_created ON inventory_transactions(created_at DESC);

-- ============================================================================
-- PUSH NOTIFICATIONS CAMPAIGNS
-- ============================================================================
CREATE TABLE push_campaigns (
  campaign_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  audience_filter JSONB DEFAULT '{}'::jsonb, -- {type, location_ids, user_segments, min_orders}
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
  recipients_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_tenant ON push_campaigns(tenant_id);
CREATE INDEX idx_campaigns_status ON push_campaigns(status);
CREATE INDEX idx_campaigns_scheduled ON push_campaigns(scheduled_at);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_users_updated_at BEFORE UPDATE ON staff_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rewards_updated_at BEFORE UPDATE ON rewards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_push_campaigns_updated_at BEFORE UPDATE ON push_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  order_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO order_count FROM orders WHERE tenant_id = NEW.tenant_id;
  NEW.order_number = 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((order_count + 1)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_order_number_trigger
BEFORE INSERT ON orders
FOR EACH ROW
WHEN (NEW.order_number IS NULL)
EXECUTE FUNCTION generate_order_number();

-- Update customer stats after order
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE customers
    SET
      total_orders = total_orders + 1,
      total_spent = total_spent + NEW.total,
      last_order_at = NEW.completed_at
    WHERE customer_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_stats_trigger
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW
WHEN (NEW.user_id IS NOT NULL)
EXECUTE FUNCTION update_customer_stats();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Enable for production
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_campaigns ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (customize based on your needs)
-- Allow service role full access (for API routes)
CREATE POLICY "Service role has full access" ON tenants FOR ALL USING (true);
CREATE POLICY "Service role has full access" ON locations FOR ALL USING (true);
CREATE POLICY "Service role has full access" ON categories FOR ALL USING (true);
CREATE POLICY "Service role has full access" ON menu_items FOR ALL USING (true);
CREATE POLICY "Service role has full access" ON customers FOR ALL USING (true);
CREATE POLICY "Service role has full access" ON orders FOR ALL USING (true);
CREATE POLICY "Service role has full access" ON order_items FOR ALL USING (true);
CREATE POLICY "Service role has full access" ON staff_users FOR ALL USING (true);
CREATE POLICY "Service role has full access" ON rewards FOR ALL USING (true);
CREATE POLICY "Service role has full access" ON reward_redemptions FOR ALL USING (true);
CREATE POLICY "Service role has full access" ON coupons FOR ALL USING (true);
CREATE POLICY "Service role has full access" ON inventory_items FOR ALL USING (true);
CREATE POLICY "Service role has full access" ON inventory_transactions FOR ALL USING (true);
CREATE POLICY "Service role has full access" ON push_campaigns FOR ALL USING (true);

-- ============================================================================
-- SEED DATA (Optional - for testing)
-- ============================================================================

-- Insert a demo tenant
INSERT INTO tenants (slug, business_name, app_name, owner_email, subscription_tier, setup_status)
VALUES ('demo-cafe', 'Demo Coffee Shop', 'Demo Café', 'demo@example.com', 'pro', 'active');

-- Get the tenant_id for demo cafe
DO $$
DECLARE
  demo_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO demo_tenant_id FROM tenants WHERE slug = 'demo-cafe';

  -- Insert a demo location
  INSERT INTO locations (tenant_id, name, address, city, postal_code, country, phone)
  VALUES (demo_tenant_id, 'Main Street Location', '123 Main St', 'Dublin', 'D01 F5P2', 'Ireland', '+353 1 234 5678');

  -- Insert demo categories
  INSERT INTO categories (tenant_id, name, slug, description, display_order)
  VALUES
    (demo_tenant_id, 'Coffee', 'coffee', 'Fresh brewed coffee', 1),
    (demo_tenant_id, 'Pastries', 'pastries', 'Fresh baked goods', 2),
    (demo_tenant_id, 'Breakfast', 'breakfast', 'Morning meals', 3);
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Database schema created successfully!';
  RAISE NOTICE 'Demo tenant created with slug: demo-cafe';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Configure storage buckets for images';
  RAISE NOTICE '2. Update .env.local with your Supabase credentials';
  RAISE NOTICE '3. Start the Next.js development server';
END $$;
