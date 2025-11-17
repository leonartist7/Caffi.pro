-- FIX RLS POLICY FOR MENU_ITEMS TABLE
-- This allows creating and managing menu items in dev mode

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Service role has full access" ON menu_items;
DROP POLICY IF EXISTS "Super admin full access to menu_items" ON menu_items;
DROP POLICY IF EXISTS "Users can read available menu items" ON menu_items;
DROP POLICY IF EXISTS "Tenant owners can manage menu items" ON menu_items;
DROP POLICY IF EXISTS "Staff can read menu items" ON menu_items;
DROP POLICY IF EXISTS "Anyone can view active menu items" ON menu_items;
DROP POLICY IF EXISTS "Authenticated users can manage menu items" ON menu_items;
DROP POLICY IF EXISTS "DEV: Allow anyone to manage menu items" ON menu_items;
DROP POLICY IF EXISTS "Super admin can manage all menu items" ON menu_items;
DROP POLICY IF EXISTS "Tenant can manage their own menu items" ON menu_items;
DROP POLICY IF EXISTS "Public can view active menu items" ON menu_items;

-- Create single permissive dev mode policy
CREATE POLICY "Dev mode: Allow all operations on menu_items" ON menu_items
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Verify RLS is enabled
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
