-- ============================================================================
-- ORDERING CORE GRANT HARDENING
--
-- Supabase's postgres default privileges grant new public-schema tables to
-- anon/authenticated. RLS prevented row reads, but Ordering Core requires the
-- stronger boundary: private order/payment tables have no browser grants, and
-- storefront tables expose only an explicit public column set.
-- ============================================================================

SET search_path = public, extensions;

REVOKE ALL ON menu_categories, menu_items, modifier_groups, modifiers,
    venue_tables, delivery_zones, orders, order_items, order_item_modifiers,
    payments FROM PUBLIC, anon, authenticated;

GRANT ALL ON menu_categories, menu_items, modifier_groups, modifiers,
    venue_tables, delivery_zones, orders, order_items, order_item_modifiers,
    payments TO service_role;

GRANT SELECT (category_id, venue_id, name, display_order, is_active,
              available_from, available_until, created_at, updated_at)
    ON menu_categories TO anon, authenticated;
GRANT SELECT (item_id, venue_id, category_id, name, description, price_cents,
              image_url, is_active, sort_order, dietary_tags, created_at, updated_at)
    ON menu_items TO anon, authenticated;
GRANT SELECT (group_id, venue_id, item_id, name, min_select, max_select, created_at)
    ON modifier_groups TO anon, authenticated;
GRANT SELECT (modifier_id, group_id, venue_id, name, price_delta_cents, is_active, sort_order)
    ON modifiers TO anon, authenticated;
GRANT SELECT (table_id, venue_id, label, qr_token, is_active)
    ON venue_tables TO anon, authenticated;
GRANT SELECT (zone_id, venue_id, name, fee_cents, min_order_cents, postal_prefixes, is_active)
    ON delivery_zones TO anon, authenticated;

-- Require future migrations to opt browser roles and RPC callers in
-- explicitly instead of inheriting broad public-schema defaults.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
