-- FIX RLS POLICY FOR CATEGORIES TABLE
-- This allows creating and managing categories in dev mode

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Super admin can manage all categories" ON categories;
DROP POLICY IF EXISTS "Tenant can manage their own categories" ON categories;
DROP POLICY IF EXISTS "Public can view active categories" ON categories;
DROP POLICY IF EXISTS "DEV: Allow anyone to manage categories" ON categories;
DROP POLICY IF EXISTS "Super admin full access to categories" ON categories;
DROP POLICY IF EXISTS "Users can read categories" ON categories;
DROP POLICY IF EXISTS "Tenant owners can manage categories" ON categories;
DROP POLICY IF EXISTS "Anyone can view active categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON categories;
DROP POLICY IF EXISTS "Service role has full access" ON categories;

-- Create single permissive dev mode policy
CREATE POLICY "Dev mode: Allow all operations on categories" ON categories
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Verify RLS is enabled
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
