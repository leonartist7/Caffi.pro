-- ============================================================================
-- ORDERING CORE ADVISOR CLEANUP
--
-- The membership helper functions must be SECURITY DEFINER to read the
-- memberships table without recursive RLS, but they do not need to be exposed
-- as public Data API RPCs. Move them behind a non-exposed schema while keeping
-- explicit execution for RLS evaluation. Also cache auth.uid() once in the
-- memberships policy instead of evaluating it for every candidate row.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.aro_my_venue_ids() SET SCHEMA private;
ALTER FUNCTION public.aro_my_managed_venue_ids() SET SCHEMA private;
ALTER FUNCTION public.aro_is_aro_admin() SET SCHEMA private;

REVOKE ALL ON FUNCTION private.aro_my_venue_ids() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.aro_my_managed_venue_ids() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.aro_is_aro_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.aro_my_venue_ids(),
    private.aro_my_managed_venue_ids(), private.aro_is_aro_admin()
    TO authenticated, service_role;

DROP POLICY memberships_own_read ON memberships;
CREATE POLICY memberships_own_read ON memberships
    FOR SELECT TO authenticated
    USING (
        user_id = (SELECT auth.uid())
        OR venue_id IN (SELECT private.aro_my_managed_venue_ids())
        OR private.aro_is_aro_admin()
    );
