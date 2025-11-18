-- FIX RLS POLICY FOR TENANTS TABLE
-- This allows creating tenants in dev mode

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON tenants;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON tenants;
DROP POLICY IF EXISTS "Enable update for users based on tenant_id" ON tenants;
DROP POLICY IF EXISTS "Enable delete for users based on tenant_id" ON tenants;

-- Create permissive dev mode policy
CREATE POLICY "Dev mode: Allow all operations on tenants" ON tenants
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Verify it's enabled
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
