-- =====================================================
-- FIX RLS POLICIES FOR TENANT CREATION
-- =====================================================
-- Allows authenticated users to create and manage tenants
-- This is needed for the admin dashboard to create new clients

-- First, enable RLS on tenants table (if not already enabled)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON tenants;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON tenants;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON tenants;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON tenants;
DROP POLICY IF EXISTS "Tenants are viewable by authenticated users" ON tenants;
DROP POLICY IF EXISTS "Tenants can be created by authenticated users" ON tenants;
DROP POLICY IF EXISTS "Tenants can be updated by authenticated users" ON tenants;
DROP POLICY IF EXISTS "Tenants can be deleted by authenticated users" ON tenants;

-- Create permissive policies for authenticated users
-- For production, you'll want to restrict these based on user roles

-- Policy 1: Authenticated users can view all tenants
CREATE POLICY "Authenticated users can view all tenants"
ON tenants FOR SELECT
TO authenticated
USING (true);

-- Policy 2: Authenticated users can create tenants
CREATE POLICY "Authenticated users can create tenants"
ON tenants FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 3: Authenticated users can update tenants
CREATE POLICY "Authenticated users can update tenants"
ON tenants FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy 4: Authenticated users can delete tenants
CREATE POLICY "Authenticated users can delete tenants"
ON tenants FOR DELETE
TO authenticated
USING (true);

-- Also allow service role full access (for migrations, scripts, etc.)
CREATE POLICY "Service role has full access to tenants"
ON tenants FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- OPTIONAL: For public access (if you want anonymous users to see tenant info)
-- Uncomment if needed:
-- CREATE POLICY "Public can view active tenants"
-- ON tenants FOR SELECT
-- TO public
-- USING (true);

-- Verify policies were created
SELECT
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'tenants'
ORDER BY policyname;
