-- ============================================
-- PROPER FIX: Enable RLS with Correct Policies
-- ============================================
-- Use this if you want to keep RLS enabled (more secure)

-- Step 1: Drop ALL existing policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE tablename IN ('tenant_manifests', 'tenants')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Step 2: Create simple, permissive policies
CREATE POLICY "allow_all_tenant_manifests"
ON tenant_manifests
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "allow_all_tenants"
ON tenants
FOR ALL
USING (true)
WITH CHECK (true);

-- Step 3: Verify policies exist
SELECT
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('tenant_manifests', 'tenants')
ORDER BY tablename;

-- Expected output:
-- tenant_manifests | allow_all_tenant_manifests | ALL
-- tenants          | allow_all_tenants          | ALL
