-- ============================================
-- COMPLETE FIX: Disable RLS + Grant Permissions
-- ============================================
-- This is the nuclear option that fixes everything

-- Step 1: Disable RLS on all tables
ALTER TABLE public.tenant_manifests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;

-- Step 2: Grant read permissions to authenticated and anon users
GRANT SELECT ON public.tenant_manifests TO authenticated, anon;
GRANT SELECT ON public.tenants TO authenticated, anon;
GRANT SELECT ON public.categories TO authenticated, anon;
GRANT SELECT ON public.menu_items TO authenticated, anon;
GRANT SELECT ON public.locations TO authenticated, anon;

-- Step 3: Grant all permissions to authenticated users for data modification
GRANT ALL ON public.tenant_manifests TO authenticated;
GRANT ALL ON public.tenants TO authenticated;
GRANT ALL ON public.categories TO authenticated;
GRANT ALL ON public.menu_items TO authenticated;
GRANT ALL ON public.locations TO authenticated;
GRANT ALL ON public.orders TO authenticated;
GRANT ALL ON public.order_items TO authenticated;

-- Step 4: Verify RLS is disabled
SELECT
    tablename,
    rowsecurity,
    CASE
        WHEN rowsecurity = false THEN '✅ DISABLED'
        ELSE '❌ STILL ENABLED'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('tenant_manifests', 'tenants', 'categories', 'menu_items')
ORDER BY tablename;

-- Expected: All should show ✅ DISABLED
