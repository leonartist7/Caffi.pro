-- ============================================================================
-- ORDERING CORE — menus, QR tables, delivery zones, orders, payments
--
-- New ordering tables use `venue_id`; legacy loyalty tables retain
-- `tenant_id`. Public diner reads are limited to active menu/configuration
-- rows. Orders, order line items, and payments are service-role only.
-- ============================================================================

SET search_path = public, extensions;

-- Close two baseline gaps found by the current Supabase security advisor.
-- status_snapshots was created after the original all-table RLS sweep, and
-- the three RLS helpers still inherited PostgreSQL's default PUBLIC execute
-- grant even though anon had been revoked explicitly.
ALTER TABLE status_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON status_snapshots FROM PUBLIC, anon, authenticated;
GRANT ALL ON status_snapshots TO service_role;

REVOKE EXECUTE ON FUNCTION aro_my_venue_ids() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION aro_my_managed_venue_ids() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION aro_is_aro_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION aro_my_venue_ids(), aro_my_managed_venue_ids(),
    aro_is_aro_admin() TO authenticated, service_role;

-- Release-one tax configuration. Totals are computed server-side in Phase 4
-- from this basis-points rate; it is deliberately not client supplied.
ALTER TABLE venues
    ADD COLUMN IF NOT EXISTS tax_rate_bp INTEGER NOT NULL DEFAULT 0
        CHECK (tax_rate_bp >= 0 AND tax_rate_bp <= 10000);

-- --------------------------------------------------------------------------
-- 1 · Menu catalog
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS menu_categories (
    category_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    available_from TIME,
    available_until TIME,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
    item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    category_id UUID REFERENCES menu_categories(category_id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    dietary_tags TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modifier_groups (
    group_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES menu_items(item_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    min_select INTEGER NOT NULL DEFAULT 0 CHECK (min_select >= 0),
    max_select INTEGER NOT NULL DEFAULT 1 CHECK (max_select >= min_select),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modifiers (
    modifier_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES modifier_groups(group_id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_delta_cents INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- --------------------------------------------------------------------------
-- 2 · Fulfilment configuration
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS venue_tables (
    table_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    qr_token UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (venue_id, label)
);

CREATE TABLE IF NOT EXISTS delivery_zones (
    zone_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (fee_cents >= 0),
    min_order_cents INTEGER NOT NULL DEFAULT 0 CHECK (min_order_cents >= 0),
    postal_prefixes TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- --------------------------------------------------------------------------
-- 3 · Order and payment history
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(member_id) ON DELETE SET NULL,
    client_uuid UUID NOT NULL,
    order_type TEXT NOT NULL CHECK (order_type IN ('dine_in', 'pickup', 'delivery')),
    table_id UUID REFERENCES venue_tables(table_id) ON DELETE SET NULL,
    zone_id UUID REFERENCES delivery_zones(zone_id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'paid', 'accepted', 'preparing', 'ready',
        'out_for_delivery', 'completed', 'canceled', 'refunded'
    )),
    guest_name TEXT,
    guest_phone TEXT,
    guest_email TEXT,
    delivery_address TEXT,
    notes TEXT,
    subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
    delivery_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (delivery_fee_cents >= 0),
    tax_cents INTEGER NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
    total_cents INTEGER NOT NULL CHECK (
        total_cents >= 0
        AND total_cents = subtotal_cents + delivery_fee_cents + tax_cents
    ),
    placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (venue_id, client_uuid)
);

CREATE TABLE IF NOT EXISTS order_items (
    order_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    item_id UUID REFERENCES menu_items(item_id) ON DELETE SET NULL,
    name_snapshot TEXT NOT NULL,
    unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS order_item_modifiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID NOT NULL REFERENCES order_items(order_item_id) ON DELETE CASCADE,
    name_snapshot TEXT NOT NULL,
    price_delta_cents INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payments (
    payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE RESTRICT,
    provider TEXT NOT NULL,
    provider_ref TEXT,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CAD',
    status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    idempotency_key UUID UNIQUE,
    raw JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_categories_venue_display_order
    ON menu_categories(venue_id, display_order);
CREATE INDEX IF NOT EXISTS idx_menu_items_venue_category
    ON menu_items(venue_id, category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_modifier_groups_item ON modifier_groups(item_id);
CREATE INDEX IF NOT EXISTS idx_modifier_groups_venue ON modifier_groups(venue_id);
CREATE INDEX IF NOT EXISTS idx_modifiers_group ON modifiers(group_id);
CREATE INDEX IF NOT EXISTS idx_modifiers_venue ON modifiers(venue_id);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_venue ON delivery_zones(venue_id);
CREATE INDEX IF NOT EXISTS idx_orders_venue_status_placed_at
    ON orders(venue_id, status, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_venue_placed_at ON orders(venue_id, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_member ON orders(member_id);
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_zone ON orders(zone_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_venue ON order_items(venue_id);
CREATE INDEX IF NOT EXISTS idx_order_items_item ON order_items(item_id);
CREATE INDEX IF NOT EXISTS idx_order_item_modifiers_order_item
    ON order_item_modifiers(order_item_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_venue ON payments(venue_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_provider_ref
    ON payments(provider, provider_ref)
    WHERE provider_ref IS NOT NULL;

-- Keep the tables that expose updated_at accurate with the hardened shared
-- trigger created by the platform schema.
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['menu_categories', 'menu_items', 'orders'] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I_touch ON %I', t, t);
        EXECUTE format(
            'CREATE TRIGGER %I_touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',
            t, t
        );
    END LOOP;
END $$;

-- The prior rebuild left two *unattached* legacy trigger functions that
-- reference a different orders shape (tenant_id/user_id/total). This schema
-- intentionally supersedes them: Phase 5 is the sole order-completion path
-- and will append one ledger entry itself, preventing double point awards.
DROP FUNCTION IF EXISTS public.update_order_stats();
DROP FUNCTION IF EXISTS public.award_order_loyalty_points();

-- Stripe webhook success must move payment + order together. This function is
-- intentionally small and service-role-only: it locks the payment row, checks
-- the server-stored amount, then advances pending -> succeeded / paid in one
-- transaction. A replay is a no-op; a mismatched amount is conspicuously
-- flagged as failed without ever trusting the provider payload as pricing.
CREATE OR REPLACE FUNCTION record_order_payment_success(
    p_provider TEXT,
    p_provider_ref TEXT,
    p_amount_cents INTEGER,
    p_raw JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    order_id UUID,
    venue_id UUID,
    applied BOOLEAN,
    amount_mismatch BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_payment payments%ROWTYPE;
BEGIN
    SELECT * INTO v_payment
    FROM payments
    WHERE provider = p_provider AND provider_ref = p_provider_ref
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'payment_not_found' USING ERRCODE = 'P0002';
    END IF;

    IF v_payment.amount_cents <> p_amount_cents THEN
        UPDATE payments
        SET status = 'failed', raw = p_raw
        WHERE payment_id = v_payment.payment_id AND status = 'pending';

        RETURN QUERY SELECT v_payment.order_id, v_payment.venue_id, false, true;
        RETURN;
    END IF;

    IF v_payment.status <> 'pending' THEN
        RETURN QUERY SELECT v_payment.order_id, v_payment.venue_id, false, false;
        RETURN;
    END IF;

    UPDATE payments
    SET status = 'succeeded', raw = p_raw
    WHERE payment_id = v_payment.payment_id;

    UPDATE orders
    SET status = 'paid', updated_at = NOW()
    WHERE orders.order_id = v_payment.order_id AND orders.status = 'pending';

    RETURN QUERY SELECT v_payment.order_id, v_payment.venue_id, true, false;
END;
$$;

REVOKE ALL ON FUNCTION record_order_payment_success(TEXT, TEXT, INTEGER, JSONB)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_order_payment_success(TEXT, TEXT, INTEGER, JSONB)
    TO service_role;

-- --------------------------------------------------------------------------
-- 4 · RLS and grants
-- --------------------------------------------------------------------------
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- These tables are created after the baseline GRANT ALL ON ALL TABLES
-- statement, so service-role access is declared explicitly.
GRANT ALL ON menu_categories, menu_items, modifier_groups, modifiers,
    venue_tables, delivery_zones, orders, order_items, order_item_modifiers,
    payments TO service_role;

-- Diner-facing menu/configuration rows are readable through the Data API.
-- Column grants prevent accidental future expansion into private fields.
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

CREATE POLICY menu_categories_public_read ON menu_categories
    FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY menu_items_public_read ON menu_items
    FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY modifier_groups_public_read ON modifier_groups
    FOR SELECT TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM menu_items item
            WHERE item.item_id = modifier_groups.item_id
              AND item.venue_id = modifier_groups.venue_id
              AND item.is_active
        )
    );
CREATE POLICY modifiers_public_read ON modifiers
    FOR SELECT TO anon, authenticated
    USING (
        is_active
        AND EXISTS (
            SELECT 1
            FROM modifier_groups grp
            JOIN menu_items item ON item.item_id = grp.item_id
            WHERE grp.group_id = modifiers.group_id
              AND grp.venue_id = modifiers.venue_id
              AND item.venue_id = modifiers.venue_id
              AND item.is_active
        )
    );
CREATE POLICY venue_tables_public_read ON venue_tables
    FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY delivery_zones_public_read ON delivery_zones
    FOR SELECT TO anon, authenticated USING (is_active);

-- Orders and money are intentionally service-role only: no anon/authenticated
-- grants or policies are created for orders, order_items,
-- order_item_modifiers, or payments.
