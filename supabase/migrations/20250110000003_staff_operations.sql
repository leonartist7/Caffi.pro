-- Phase 5: Staff & Operations - Database Schema
-- This migration adds tables and features for staff operations, kitchen management, and inventory

-- ============================================================================
-- STAFF USERS & ROLES
-- ============================================================================

-- Staff roles enum
CREATE TYPE staff_role AS ENUM ('owner', 'manager', 'barista', 'kitchen', 'cashier');

-- Staff users table (separate from customer users)
CREATE TABLE staff_users (
  staff_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role staff_role NOT NULL DEFAULT 'barista',

  -- Location assignment
  assigned_location_id UUID REFERENCES locations(location_id) ON DELETE SET NULL,

  -- Permissions
  can_manage_orders BOOLEAN DEFAULT true,
  can_manage_inventory BOOLEAN DEFAULT false,
  can_manage_staff BOOLEAN DEFAULT false,
  can_view_reports BOOLEAN DEFAULT false,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_staff_email_per_tenant UNIQUE(tenant_id, email)
);

-- Indexes for staff_users
CREATE INDEX idx_staff_users_tenant_id ON staff_users(tenant_id);
CREATE INDEX idx_staff_users_location_id ON staff_users(assigned_location_id);
CREATE INDEX idx_staff_users_role ON staff_users(role);
CREATE INDEX idx_staff_users_active ON staff_users(is_active) WHERE is_active = true;

-- ============================================================================
-- ORDER ENHANCEMENTS FOR STAFF
-- ============================================================================

-- Add staff assignment to orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS assigned_to_staff_id UUID REFERENCES staff_users(staff_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS preparation_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ready_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS estimated_ready_time TIMESTAMP WITH TIME ZONE;

-- Create index for staff assignment
CREATE INDEX IF NOT EXISTS idx_orders_assigned_staff ON orders(assigned_to_staff_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_location ON orders(status, location_id) WHERE status IN ('pending', 'confirmed', 'preparing');

-- ============================================================================
-- INVENTORY MANAGEMENT
-- ============================================================================

-- Inventory items (ingredients, supplies)
CREATE TABLE inventory_items (
  inventory_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(location_id) ON DELETE CASCADE,

  -- Item details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'coffee_beans', 'milk', 'syrups', 'cups', 'food'
  sku VARCHAR(100),

  -- Stock tracking
  current_stock DECIMAL(10,2) DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'units', -- 'kg', 'liters', 'units', 'bags'
  min_stock_level DECIMAL(10,2) DEFAULT 0, -- Alert when below this
  max_stock_level DECIMAL(10,2),

  -- Pricing
  unit_cost DECIMAL(10,2),

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_restocked_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_sku_per_tenant UNIQUE(tenant_id, sku)
);

-- Indexes for inventory_items
CREATE INDEX idx_inventory_items_tenant_id ON inventory_items(tenant_id);
CREATE INDEX idx_inventory_items_location_id ON inventory_items(location_id);
CREATE INDEX idx_inventory_items_category ON inventory_items(category);
CREATE INDEX idx_inventory_items_low_stock ON inventory_items(current_stock, min_stock_level)
  WHERE current_stock <= min_stock_level AND is_active = true;

-- Inventory transactions (stock movements)
CREATE TABLE inventory_transactions (
  transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(inventory_item_id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff_users(staff_id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(order_id) ON DELETE SET NULL,

  -- Transaction details
  transaction_type VARCHAR(50) NOT NULL, -- 'restock', 'usage', 'adjustment', 'waste'
  quantity DECIMAL(10,2) NOT NULL, -- Positive for restock, negative for usage
  unit VARCHAR(50),

  -- Metadata
  notes TEXT,
  reference_number VARCHAR(100), -- Purchase order number, etc.

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('restock', 'usage', 'adjustment', 'waste', 'transfer'))
);

-- Indexes for inventory_transactions
CREATE INDEX idx_inventory_transactions_tenant_id ON inventory_transactions(tenant_id);
CREATE INDEX idx_inventory_transactions_item_id ON inventory_transactions(inventory_item_id);
CREATE INDEX idx_inventory_transactions_order_id ON inventory_transactions(order_id);
CREATE INDEX idx_inventory_transactions_created_at ON inventory_transactions(created_at DESC);

-- ============================================================================
-- MENU ITEM - INVENTORY RELATIONSHIPS
-- ============================================================================

-- Link menu items to inventory items (recipes)
CREATE TABLE menu_item_ingredients (
  ingredient_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(item_id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(inventory_item_id) ON DELETE CASCADE,

  -- Quantity per serving
  quantity_per_serving DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50),

  -- Optional: modifier-specific ingredients
  modifier_id VARCHAR(255), -- JSON path to specific modifier option

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_menu_item_ingredient UNIQUE(menu_item_id, inventory_item_id, modifier_id)
);

-- Indexes
CREATE INDEX idx_menu_item_ingredients_menu_item ON menu_item_ingredients(menu_item_id);
CREATE INDEX idx_menu_item_ingredients_inventory ON menu_item_ingredients(inventory_item_id);

-- ============================================================================
-- STAFF SHIFTS & TIME TRACKING
-- ============================================================================

CREATE TABLE staff_shifts (
  shift_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_users(staff_id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(location_id) ON DELETE SET NULL,

  -- Shift details
  shift_date DATE NOT NULL,
  clock_in TIMESTAMP WITH TIME ZONE,
  clock_out TIMESTAMP WITH TIME ZONE,
  break_duration_minutes INTEGER DEFAULT 0,

  -- Performance metrics
  orders_completed INTEGER DEFAULT 0,
  total_sales DECIMAL(10,2) DEFAULT 0,

  -- Notes
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_staff_shifts_staff_id ON staff_shifts(staff_id);
CREATE INDEX idx_staff_shifts_date ON staff_shifts(shift_date DESC);
CREATE INDEX idx_staff_shifts_location ON staff_shifts(location_id, shift_date);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update inventory on order completion
CREATE OR REPLACE FUNCTION deduct_inventory_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Only deduct when order moves to 'completed' status
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Insert inventory transactions for each order item
    -- This would need to be expanded based on actual menu_item_ingredients
    -- For now, just log that order was completed
    RAISE NOTICE 'Order % completed, inventory deduction needed', NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for inventory deduction
DROP TRIGGER IF EXISTS trigger_deduct_inventory ON orders;
CREATE TRIGGER trigger_deduct_inventory
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION deduct_inventory_on_order();

-- Function to check low stock items
CREATE OR REPLACE FUNCTION get_low_stock_items(p_tenant_id UUID, p_location_id UUID DEFAULT NULL)
RETURNS TABLE (
  item_id UUID,
  item_name VARCHAR,
  current_stock DECIMAL,
  min_stock_level DECIMAL,
  unit VARCHAR,
  category VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    inventory_item_id,
    name,
    inventory_items.current_stock,
    inventory_items.min_stock_level,
    inventory_items.unit,
    inventory_items.category
  FROM inventory_items
  WHERE tenant_id = p_tenant_id
    AND (p_location_id IS NULL OR location_id = p_location_id)
    AND inventory_items.current_stock <= inventory_items.min_stock_level
    AND is_active = true
  ORDER BY (inventory_items.current_stock / NULLIF(inventory_items.min_stock_level, 0));
END;
$$ LANGUAGE plpgsql;

-- Function to update staff last_login
CREATE OR REPLACE FUNCTION update_staff_last_login()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_login = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE staff_users IS 'Staff members who operate the café (baristas, managers, etc.)';
COMMENT ON TABLE inventory_items IS 'Inventory items tracked at each location (ingredients, supplies)';
COMMENT ON TABLE inventory_transactions IS 'All inventory movements (restocks, usage, waste)';
COMMENT ON TABLE menu_item_ingredients IS 'Links menu items to inventory items with quantities';
COMMENT ON TABLE staff_shifts IS 'Staff shift tracking for time and performance';

COMMENT ON COLUMN staff_users.role IS 'Staff role: owner, manager, barista, kitchen, cashier';
COMMENT ON COLUMN orders.assigned_to_staff_id IS 'Staff member assigned to prepare this order';
COMMENT ON COLUMN orders.preparation_started_at IS 'When staff started preparing the order';
COMMENT ON COLUMN orders.ready_at IS 'When order was marked as ready for pickup';
COMMENT ON COLUMN inventory_items.current_stock IS 'Current stock level in specified unit';
COMMENT ON COLUMN inventory_items.min_stock_level IS 'Alert threshold for low stock';
COMMENT ON COLUMN inventory_transactions.quantity IS 'Positive for additions, negative for usage';
