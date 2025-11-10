-- Phase 5: Row-Level Security Policies for Staff Operations
-- Both production and dev mode policies

-- ============================================================================
-- STAFF USERS - RLS POLICIES
-- ============================================================================

ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;

-- DEV: Allow anyone to view staff (for development)
CREATE POLICY "DEV: Allow anyone to view staff users"
    ON staff_users FOR SELECT
    USING (true);

-- DEV: Allow anyone to insert staff (for development)
CREATE POLICY "DEV: Allow anyone to insert staff users"
    ON staff_users FOR INSERT
    WITH CHECK (true);

-- DEV: Allow anyone to update staff (for development)
CREATE POLICY "DEV: Allow anyone to update staff users"
    ON staff_users FOR UPDATE
    USING (true);

-- DEV: Allow anyone to delete staff (for development)
CREATE POLICY "DEV: Allow anyone to delete staff users"
    ON staff_users FOR DELETE
    USING (true);

-- PROD: Staff can view their own tenant's staff
-- CREATE POLICY "Staff can view own tenant staff"
--     ON staff_users FOR SELECT
--     USING (tenant_id = get_tenant_id());

-- PROD: Only managers can manage staff
-- CREATE POLICY "Managers can manage staff"
--     ON staff_users FOR ALL
--     USING (
--       tenant_id = get_tenant_id() AND
--       EXISTS (
--         SELECT 1 FROM staff_users s
--         WHERE s.staff_id = auth.uid()
--         AND s.role IN ('owner', 'manager')
--         AND s.can_manage_staff = true
--       )
--     );

-- ============================================================================
-- INVENTORY ITEMS - RLS POLICIES
-- ============================================================================

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- DEV: Allow anyone to view inventory
CREATE POLICY "DEV: Allow anyone to view inventory items"
    ON inventory_items FOR SELECT
    USING (true);

-- DEV: Allow anyone to insert inventory
CREATE POLICY "DEV: Allow anyone to insert inventory items"
    ON inventory_items FOR INSERT
    WITH CHECK (true);

-- DEV: Allow anyone to update inventory
CREATE POLICY "DEV: Allow anyone to update inventory items"
    ON inventory_items FOR UPDATE
    USING (true);

-- DEV: Allow anyone to delete inventory
CREATE POLICY "DEV: Allow anyone to delete inventory items"
    ON inventory_items FOR DELETE
    USING (true);

-- PROD: Staff with inventory permissions can manage
-- CREATE POLICY "Staff with inventory permissions can manage"
--     ON inventory_items FOR ALL
--     USING (
--       tenant_id = get_tenant_id() AND
--       EXISTS (
--         SELECT 1 FROM staff_users s
--         WHERE s.staff_id = auth.uid()
--         AND s.can_manage_inventory = true
--       )
--     );

-- ============================================================================
-- INVENTORY TRANSACTIONS - RLS POLICIES
-- ============================================================================

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- DEV: Allow anyone to view transactions
CREATE POLICY "DEV: Allow anyone to view inventory transactions"
    ON inventory_transactions FOR SELECT
    USING (true);

-- DEV: Allow anyone to insert transactions
CREATE POLICY "DEV: Allow anyone to insert inventory transactions"
    ON inventory_transactions FOR INSERT
    WITH CHECK (true);

-- DEV: Allow anyone to update transactions
CREATE POLICY "DEV: Allow anyone to update inventory transactions"
    ON inventory_transactions FOR UPDATE
    USING (true);

-- PROD: Staff can view transactions
-- CREATE POLICY "Staff can view inventory transactions"
--     ON inventory_transactions FOR SELECT
--     USING (tenant_id = get_tenant_id());

-- PROD: Staff with inventory permissions can create transactions
-- CREATE POLICY "Staff with inventory permissions can create transactions"
--     ON inventory_transactions FOR INSERT
--     WITH CHECK (
--       tenant_id = get_tenant_id() AND
--       EXISTS (
--         SELECT 1 FROM staff_users s
--         WHERE s.staff_id = auth.uid()
--         AND s.can_manage_inventory = true
--       )
--     );

-- ============================================================================
-- MENU ITEM INGREDIENTS - RLS POLICIES
-- ============================================================================

ALTER TABLE menu_item_ingredients ENABLE ROW LEVEL SECURITY;

-- DEV: Allow anyone to manage ingredients
CREATE POLICY "DEV: Allow anyone to view menu item ingredients"
    ON menu_item_ingredients FOR SELECT
    USING (true);

CREATE POLICY "DEV: Allow anyone to insert menu item ingredients"
    ON menu_item_ingredients FOR INSERT
    WITH CHECK (true);

CREATE POLICY "DEV: Allow anyone to update menu item ingredients"
    ON menu_item_ingredients FOR UPDATE
    USING (true);

CREATE POLICY "DEV: Allow anyone to delete menu item ingredients"
    ON menu_item_ingredients FOR DELETE
    USING (true);

-- PROD: Staff can view menu item ingredients
-- CREATE POLICY "Anyone can view menu item ingredients"
--     ON menu_item_ingredients FOR SELECT
--     USING (
--       EXISTS (
--         SELECT 1 FROM menu_items mi
--         WHERE mi.item_id = menu_item_ingredients.menu_item_id
--         AND mi.tenant_id = get_tenant_id()
--       )
--     );

-- ============================================================================
-- STAFF SHIFTS - RLS POLICIES
-- ============================================================================

ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;

-- DEV: Allow anyone to manage shifts
CREATE POLICY "DEV: Allow anyone to view staff shifts"
    ON staff_shifts FOR SELECT
    USING (true);

CREATE POLICY "DEV: Allow anyone to insert staff shifts"
    ON staff_shifts FOR INSERT
    WITH CHECK (true);

CREATE POLICY "DEV: Allow anyone to update staff shifts"
    ON staff_shifts FOR UPDATE
    USING (true);

CREATE POLICY "DEV: Allow anyone to delete staff shifts"
    ON staff_shifts FOR DELETE
    USING (true);

-- PROD: Staff can view their own shifts
-- CREATE POLICY "Staff can view own shifts"
--     ON staff_shifts FOR SELECT
--     USING (
--       staff_id = auth.uid() OR
--       EXISTS (
--         SELECT 1 FROM staff_users s
--         WHERE s.staff_id = auth.uid()
--         AND s.role IN ('owner', 'manager')
--       )
--     );

-- PROD: Staff can clock in/out (create and update own shifts)
-- CREATE POLICY "Staff can manage own shifts"
--     ON staff_shifts FOR INSERT
--     WITH CHECK (staff_id = auth.uid());

-- CREATE POLICY "Staff can update own shifts"
--     ON staff_shifts FOR UPDATE
--     USING (staff_id = auth.uid() OR is_manager());

-- ============================================================================
-- UPDATE ORDERS POLICIES FOR STAFF ACCESS
-- ============================================================================

-- DEV: Already covered by existing dev policies on orders table

-- PROD: Staff can view orders at their location
-- CREATE POLICY "Staff can view orders at their location"
--     ON orders FOR SELECT
--     USING (
--       tenant_id = get_tenant_id() AND
--       EXISTS (
--         SELECT 1 FROM staff_users s
--         WHERE s.staff_id = auth.uid()
--         AND (
--           s.assigned_location_id IS NULL OR
--           s.assigned_location_id = orders.location_id
--         )
--       )
--     );

-- PROD: Staff can update order status
-- CREATE POLICY "Staff can update order status"
--     ON orders FOR UPDATE
--     USING (
--       tenant_id = get_tenant_id() AND
--       EXISTS (
--         SELECT 1 FROM staff_users s
--         WHERE s.staff_id = auth.uid()
--         AND s.can_manage_orders = true
--         AND (
--           s.assigned_location_id IS NULL OR
--           s.assigned_location_id = orders.location_id
--         )
--       )
--     );

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Check if current user is a manager
CREATE OR REPLACE FUNCTION is_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff_users
    WHERE staff_id = auth.uid()
    AND role IN ('owner', 'manager')
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is staff
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff_users
    WHERE staff_id = auth.uid()
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get staff tenant ID
CREATE OR REPLACE FUNCTION get_staff_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT tenant_id FROM staff_users
    WHERE staff_id = auth.uid()
    AND is_active = true
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "DEV: Allow anyone to view staff users" ON staff_users IS 'Development mode: Remove in production';
COMMENT ON POLICY "DEV: Allow anyone to view inventory items" ON inventory_items IS 'Development mode: Remove in production';
COMMENT ON POLICY "DEV: Allow anyone to view inventory transactions" ON inventory_transactions IS 'Development mode: Remove in production';
COMMENT ON POLICY "DEV: Allow anyone to view staff shifts" ON staff_shifts IS 'Development mode: Remove in production';

COMMENT ON FUNCTION is_manager() IS 'Check if current authenticated user is a manager or owner';
COMMENT ON FUNCTION is_staff() IS 'Check if current authenticated user is active staff';
COMMENT ON FUNCTION get_staff_tenant_id() IS 'Get tenant_id for current staff user';
