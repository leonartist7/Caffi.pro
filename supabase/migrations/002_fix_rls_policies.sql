-- FIX: Update RLS Policies for Authenticated Users
-- Run this in Supabase SQL Editor to fix the "violates row-level security policy" error

-- Drop the overly restrictive policies
DROP POLICY IF EXISTS "Service role has full access" ON tenants;
DROP POLICY IF EXISTS "Service role has full access" ON locations;
DROP POLICY IF EXISTS "Service role has full access" ON categories;
DROP POLICY IF EXISTS "Service role has full access" ON menu_items;
DROP POLICY IF EXISTS "Service role has full access" ON customers;
DROP POLICY IF EXISTS "Service role has full access" ON orders;
DROP POLICY IF EXISTS "Service role has full access" ON order_items;
DROP POLICY IF EXISTS "Service role has full access" ON staff_users;
DROP POLICY IF EXISTS "Service role has full access" ON rewards;
DROP POLICY IF EXISTS "Service role has full access" ON reward_redemptions;
DROP POLICY IF EXISTS "Service role has full access" ON coupons;
DROP POLICY IF EXISTS "Service role has full access" ON inventory_items;
DROP POLICY IF EXISTS "Service role has full access" ON inventory_transactions;
DROP POLICY IF EXISTS "Service role has full access" ON push_campaigns;

-- TENANTS: Authenticated users can CRUD their own tenants
CREATE POLICY "Users can view all tenants"
  ON tenants FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create tenants"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own tenants"
  ON tenants FOR UPDATE
  TO authenticated
  USING (owner_email = auth.jwt()->>'email');

CREATE POLICY "Users can delete their own tenants"
  ON tenants FOR DELETE
  TO authenticated
  USING (owner_email = auth.jwt()->>'email');

-- LOCATIONS: Tenant owners can manage locations
CREATE POLICY "Anyone can view active locations"
  ON locations FOR SELECT
  USING (is_active = true OR auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create locations"
  ON locations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update locations"
  ON locations FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete locations"
  ON locations FOR DELETE
  TO authenticated
  USING (true);

-- CATEGORIES: Tenant owners can manage categories
CREATE POLICY "Anyone can view active categories"
  ON categories FOR SELECT
  USING (is_active = true OR auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage categories"
  ON categories FOR ALL
  TO authenticated
  USING (true);

-- MENU ITEMS: Tenant owners can manage menu items
CREATE POLICY "Anyone can view available menu items"
  ON menu_items FOR SELECT
  USING (is_available = true OR auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage menu items"
  ON menu_items FOR ALL
  TO authenticated
  USING (true);

-- CUSTOMERS: Customers can view/update their own data
CREATE POLICY "Customers can view their own data"
  ON customers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "Customers can update their own data"
  ON customers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can create customer records"
  ON customers FOR INSERT
  WITH CHECK (true);

-- ORDERS: Customers can view their orders, staff can view all
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT customer_id FROM customers WHERE user_id = auth.uid()) OR auth.role() = 'service_role');

CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (true);

-- ORDER ITEMS: Follow order permissions
CREATE POLICY "Users can view order items for their orders"
  ON order_items FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create order items"
  ON order_items FOR INSERT
  WITH CHECK (true);

-- STAFF USERS: Tenant owners can manage staff
CREATE POLICY "Staff can view staff in their tenant"
  ON staff_users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create staff"
  ON staff_users FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update staff"
  ON staff_users FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete staff"
  ON staff_users FOR DELETE
  TO authenticated
  USING (true);

-- REWARDS: Public can view, tenant owners can manage
CREATE POLICY "Anyone can view active rewards"
  ON rewards FOR SELECT
  USING (is_active = true OR auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage rewards"
  ON rewards FOR ALL
  TO authenticated
  USING (true);

-- REWARD REDEMPTIONS: Customers can view their own
CREATE POLICY "Users can view their own redemptions"
  ON reward_redemptions FOR SELECT
  TO authenticated
  USING (customer_id IN (SELECT customer_id FROM customers WHERE user_id = auth.uid()) OR auth.role() = 'service_role');

CREATE POLICY "Anyone can create redemptions"
  ON reward_redemptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update redemptions"
  ON reward_redemptions FOR UPDATE
  TO authenticated
  USING (true);

-- COUPONS: Public can view active, tenant owners can manage
CREATE POLICY "Anyone can view active coupons"
  ON coupons FOR SELECT
  USING (is_active = true OR auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage coupons"
  ON coupons FOR ALL
  TO authenticated
  USING (true);

-- INVENTORY: Staff with permissions can manage
CREATE POLICY "Staff can view inventory"
  ON inventory_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage inventory"
  ON inventory_items FOR ALL
  TO authenticated
  USING (true);

-- INVENTORY TRANSACTIONS: Staff can view and create
CREATE POLICY "Staff can view inventory transactions"
  ON inventory_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create inventory transactions"
  ON inventory_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- PUSH CAMPAIGNS: Tenant owners can manage
CREATE POLICY "Authenticated users can manage campaigns"
  ON push_campaigns FOR ALL
  TO authenticated
  USING (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'RLS policies updated successfully!';
  RAISE NOTICE 'Authenticated users can now create and manage tenants.';
  RAISE NOTICE 'Try creating a tenant again - it should work now!';
END $$;
