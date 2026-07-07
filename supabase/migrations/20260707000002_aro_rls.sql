-- ============================================================================
-- aro RLS — rebuilt from ZERO (Phase 2.1)
--
-- Drops EVERY existing policy in public (including all `DEV:` USING(true)
-- policies from 20250110000001_dev_mode_rls.sql), revokes the default broad
-- grants from anon/authenticated, then grants back the minimum.
--
-- Principles (Blueprint §8 / ARCHITECTURE §3):
--   · Browser = anon key + these policies. Server = service role.
--   · Venue isolation: every policy scopes through memberships.
--   · Staff never reads member contact info (column-level grants: email,
--     phone, tokens are NOT granted to authenticated at all — owner screens
--     read contact info through server API routes with role checks).
--   · anon can read only what public pages need: venues' public identity
--     columns + tenant_manifests (brand). Nothing else. Diner join POSTs to
--     /api/join (server) — anon never inserts.
--   · No client policy at all on: organizations, leads, zones, super_admins,
--     events(select), memberships(write) — server-only surfaces.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0 · Drop every existing policy in public; enable RLS everywhere
-- ----------------------------------------------------------------------------
DO $$
DECLARE p RECORD;
BEGIN
    FOR p IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    END LOOP;
END $$;

DO $$
DECLARE t RECORD;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    END LOOP;
END $$;

-- Reset grants: nothing for anon/authenticated until granted below.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
-- Server (service role) keeps full access — Supabase default, restated here
-- so a fresh database behaves identically.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
REVOKE EXECUTE ON FUNCTION set_counter_pin(UUID, TEXT) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION verify_counter_pin(UUID, TEXT) FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- 1 · Membership helper functions (SECURITY DEFINER: they read memberships
--     without recursing into its own policies)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION aro_my_venue_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT m.venue_id FROM memberships m
    WHERE m.user_id = auth.uid() AND m.is_active AND m.venue_id IS NOT NULL
    UNION
    SELECT v.venue_id FROM venues v
    JOIN memberships m ON m.org_id = v.org_id AND m.venue_id IS NULL
    WHERE m.user_id = auth.uid() AND m.is_active
$$;

CREATE OR REPLACE FUNCTION aro_my_managed_venue_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT m.venue_id FROM memberships m
    WHERE m.user_id = auth.uid() AND m.is_active AND m.venue_id IS NOT NULL
      AND m.role IN ('owner', 'manager')
    UNION
    SELECT v.venue_id FROM venues v
    JOIN memberships m ON m.org_id = v.org_id AND m.venue_id IS NULL
    WHERE m.user_id = auth.uid() AND m.is_active AND m.role IN ('owner', 'manager')
$$;

CREATE OR REPLACE FUNCTION aro_is_aro_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM memberships m
        WHERE m.user_id = auth.uid() AND m.is_active AND m.role = 'aro_admin'
    )
$$;

GRANT EXECUTE ON FUNCTION aro_my_venue_ids(), aro_my_managed_venue_ids(), aro_is_aro_admin()
    TO authenticated;

-- ----------------------------------------------------------------------------
-- 2 · VENUES — public identity readable by anyone (join page / shop / domain
--     routing); contact + billing columns are NOT granted to anon or
--     authenticated. Owners/managers may update their venue's public fields.
-- ----------------------------------------------------------------------------
GRANT SELECT (venue_id, org_id, business_name, slug, app_name, custom_domain,
              features_enabled, loyalty_config, timezone, currency, language,
              brand_kit, kill_switch, zone_id, created_at, updated_at)
    ON venues TO anon, authenticated;
GRANT UPDATE (business_name, app_name, features_enabled, loyalty_config,
              timezone, currency, language, brand_kit)
    ON venues TO authenticated;

CREATE POLICY venues_public_read ON venues
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY venues_manage_update ON venues
    FOR UPDATE TO authenticated
    USING (venue_id IN (SELECT aro_my_managed_venue_ids()) OR aro_is_aro_admin())
    WITH CHECK (venue_id IN (SELECT aro_my_managed_venue_ids()) OR aro_is_aro_admin());
-- venue INSERT/DELETE: HQ server-side only (service role)

-- tenant_manifests: brand kit for public pages
GRANT SELECT ON tenant_manifests TO anon, authenticated;
GRANT INSERT, UPDATE ON tenant_manifests TO authenticated;
CREATE POLICY manifests_public_read ON tenant_manifests
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY manifests_manage_write ON tenant_manifests
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id IN (SELECT aro_my_managed_venue_ids()) OR aro_is_aro_admin());
CREATE POLICY manifests_manage_update ON tenant_manifests
    FOR UPDATE TO authenticated
    USING (tenant_id IN (SELECT aro_my_managed_venue_ids()) OR aro_is_aro_admin())
    WITH CHECK (tenant_id IN (SELECT aro_my_managed_venue_ids()) OR aro_is_aro_admin());

-- ----------------------------------------------------------------------------
-- 3 · MEMBERS — venue-scoped; contact columns (email/phone/tokens) are never
--     granted to authenticated. Staff sees name/usual/points only (§8).
--     All writes go through server APIs (/api/join, counter) — no client
--     INSERT/UPDATE/DELETE.
-- ----------------------------------------------------------------------------
GRANT SELECT (member_id, tenant_id, full_name, birthday, loyalty_tier,
              total_orders, total_spent, last_order_at, preferred_location_id,
              favorite_items, consent_ts, consent_source, created_at, updated_at)
    ON members TO authenticated;

CREATE POLICY members_venue_read ON members
    FOR SELECT TO authenticated
    USING (tenant_id IN (SELECT aro_my_venue_ids()) OR aro_is_aro_admin());

-- ----------------------------------------------------------------------------
-- 4 · MEMBERSHIPS — read own rows; managers read their venue's team.
--     counter_pin_hash / invite_token are never granted. Writes server-only.
-- ----------------------------------------------------------------------------
GRANT SELECT (membership_id, user_id, org_id, venue_id, role, full_name,
              invite_email, invite_accepted_at, is_active, pin_updated_at,
              created_at, updated_at)
    ON memberships TO authenticated;

CREATE POLICY memberships_own_read ON memberships
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR venue_id IN (SELECT aro_my_managed_venue_ids())
        OR aro_is_aro_admin()
    );

-- ----------------------------------------------------------------------------
-- 5 · VISITS — venue members read + record (counter flow)
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT ON visits TO authenticated;
CREATE POLICY visits_venue_read ON visits
    FOR SELECT TO authenticated
    USING (venue_id IN (SELECT aro_my_venue_ids()) OR aro_is_aro_admin());
CREATE POLICY visits_venue_insert ON visits
    FOR INSERT TO authenticated
    WITH CHECK (venue_id IN (SELECT aro_my_venue_ids()));

-- ----------------------------------------------------------------------------
-- 6 · POINTS_LEDGER — append-only; venue members read + insert
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT ON points_ledger TO authenticated;
CREATE POLICY ledger_venue_read ON points_ledger
    FOR SELECT TO authenticated
    USING (tenant_id IN (SELECT aro_my_venue_ids()) OR aro_is_aro_admin());
CREATE POLICY ledger_venue_insert ON points_ledger
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id IN (SELECT aro_my_venue_ids()));
-- UPDATE/DELETE: no grant, no policy, and a trigger raises anyway.

-- ----------------------------------------------------------------------------
-- 7 · REWARDS + REDEMPTIONS
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON rewards TO authenticated;
CREATE POLICY rewards_venue_read ON rewards
    FOR SELECT TO authenticated
    USING (tenant_id IN (SELECT aro_my_venue_ids()) OR aro_is_aro_admin());
CREATE POLICY rewards_manage_insert ON rewards
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id IN (SELECT aro_my_managed_venue_ids()));
CREATE POLICY rewards_manage_update ON rewards
    FOR UPDATE TO authenticated
    USING (tenant_id IN (SELECT aro_my_managed_venue_ids()))
    WITH CHECK (tenant_id IN (SELECT aro_my_managed_venue_ids()));
CREATE POLICY rewards_manage_delete ON rewards
    FOR DELETE TO authenticated
    USING (tenant_id IN (SELECT aro_my_managed_venue_ids()));

GRANT SELECT, INSERT ON redemptions TO authenticated;
CREATE POLICY redemptions_venue_read ON redemptions
    FOR SELECT TO authenticated
    USING (venue_id IN (SELECT aro_my_venue_ids()) OR aro_is_aro_admin());
CREATE POLICY redemptions_venue_insert ON redemptions
    FOR INSERT TO authenticated
    WITH CHECK (venue_id IN (SELECT aro_my_venue_ids()));

-- ----------------------------------------------------------------------------
-- 8 · CAMPAIGNS / AI_DRAFTS / MESSAGES — owner/manager only (messages carry
--     outreach content; staff has no business here)
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON campaigns TO authenticated;
CREATE POLICY campaigns_manage_all ON campaigns
    FOR ALL TO authenticated
    USING (venue_id IN (SELECT aro_my_managed_venue_ids()) OR aro_is_aro_admin())
    WITH CHECK (venue_id IN (SELECT aro_my_managed_venue_ids()));

GRANT SELECT, UPDATE ON ai_drafts TO authenticated;
CREATE POLICY ai_drafts_manage_read ON ai_drafts
    FOR SELECT TO authenticated
    USING (venue_id IN (SELECT aro_my_managed_venue_ids()) OR aro_is_aro_admin());
CREATE POLICY ai_drafts_manage_update ON ai_drafts
    FOR UPDATE TO authenticated
    USING (venue_id IN (SELECT aro_my_managed_venue_ids()))
    WITH CHECK (venue_id IN (SELECT aro_my_managed_venue_ids()));
-- ai_drafts INSERT: server only (lib/ai.ts)

GRANT SELECT ON messages TO authenticated;
CREATE POLICY messages_manage_read ON messages
    FOR SELECT TO authenticated
    USING (venue_id IN (SELECT aro_my_managed_venue_ids()) OR aro_is_aro_admin());
-- messages INSERT/UPDATE: server send-pipeline only

-- ----------------------------------------------------------------------------
-- 9 · EVENTS — venue members append; managers read their venues
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT ON events TO authenticated;
CREATE POLICY events_venue_insert ON events
    FOR INSERT TO authenticated
    WITH CHECK (venue_id IN (SELECT aro_my_venue_ids()));
CREATE POLICY events_manage_read ON events
    FOR SELECT TO authenticated
    USING (venue_id IN (SELECT aro_my_managed_venue_ids()) OR aro_is_aro_admin());

-- ----------------------------------------------------------------------------
-- 10 · LEGACY OPERATIONAL TABLES (menu/orders/coupons/inventory/…) — venue
--      members read, owner/manager write. Shop PWA is parked behind
--      ORDERING_ENABLED=false; revisit anon needs if/when it revives.
-- ----------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'categories', 'menu_items', 'locations', 'orders', 'order_items',
        'coupons', 'coupon_usage', 'push_campaigns',
        'inventory_items', 'inventory_transactions', 'staff_shifts',
        'menu_item_ingredients'
    ] LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO authenticated', t);
            IF EXISTS (SELECT FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id') THEN
                EXECUTE format(
                    'CREATE POLICY %I_venue_read ON %I FOR SELECT TO authenticated
                     USING (tenant_id IN (SELECT aro_my_venue_ids()) OR aro_is_aro_admin())', t, t);
                EXECUTE format(
                    'CREATE POLICY %I_manage_write ON %I FOR INSERT TO authenticated
                     WITH CHECK (tenant_id IN (SELECT aro_my_managed_venue_ids()))', t, t);
                EXECUTE format(
                    'CREATE POLICY %I_manage_update ON %I FOR UPDATE TO authenticated
                     USING (tenant_id IN (SELECT aro_my_managed_venue_ids()))
                     WITH CHECK (tenant_id IN (SELECT aro_my_managed_venue_ids()))', t, t);
                EXECUTE format(
                    'CREATE POLICY %I_manage_delete ON %I FOR DELETE TO authenticated
                     USING (tenant_id IN (SELECT aro_my_managed_venue_ids()))', t, t);
            END IF;
        END IF;
    END LOOP;
END $$;

-- Tables WITHOUT tenant_id get no generic policies above; scope them here.
-- order_items / coupon_usage / inventory rows are reachable via their parent;
-- for simplicity Phase 2 leaves them server-only if they lack tenant_id.

-- ----------------------------------------------------------------------------
-- 11 · Server-only tables: RLS on, ZERO client policies, zero grants.
--      organizations, leads, zones, super_admins, staff_users (deprecated)
-- ----------------------------------------------------------------------------
-- (nothing to do — no grants, no policies = deny all for anon/authenticated)

-- ----------------------------------------------------------------------------
-- 12 · Views (security_invoker): grant SELECT; underlying table grants +
--      policies still apply to the querying role.
-- ----------------------------------------------------------------------------
GRANT SELECT ON tenants TO anon, authenticated;
GRANT SELECT ON member_balances, member_status, users, loyalty_transactions, rewards_catalog
    TO authenticated;
GRANT EXECUTE ON FUNCTION member_cadence_days(UUID) TO authenticated;
