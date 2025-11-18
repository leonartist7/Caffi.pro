-- Migration: Fix RLS policies causing 400 errors
-- This fixes tenant_manifests and menu_items queries

-- FIX 1: Allow reading tenant_manifests (for logos)
DROP POLICY IF EXISTS "Allow read access to tenant manifests" ON tenant_manifests;

CREATE POLICY "Allow authenticated users to read tenant manifests"
ON tenant_manifests
FOR SELECT
TO authenticated
USING (true);  -- Allow all authenticated users to read (logos are not sensitive)

-- FIX 2: Ensure categories table has proper RLS for joins
DROP POLICY IF EXISTS "Allow read access to categories" ON categories;

CREATE POLICY "Allow authenticated users to read categories"
ON categories
FOR SELECT
TO authenticated
USING (true);  -- Allow reading for joins to work

-- FIX 3: Verify menu_items has proper RLS
DROP POLICY IF EXISTS "Allow read access to menu items" ON menu_items;

CREATE POLICY "Allow authenticated users to read menu items"
ON menu_items
FOR SELECT
TO authenticated
USING (true);  -- Allow reading all menu items (needed for joins)

-- FIX 4: Add public read access for customer-facing shop
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Allow public to read active items (for shop)
CREATE POLICY "Allow public to read active categories"
ON categories
FOR SELECT
TO anon
USING (is_active = true);

CREATE POLICY "Allow public to read active menu items"
ON menu_items
FOR SELECT
TO anon
USING (is_active = true);

-- Verify policies
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies updated for tenant_manifests, categories, and menu_items';
END $$;
