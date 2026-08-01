-- PLAN-20: tips on QR orders. PLAN-10 already added orders.tip_cents,
-- orders.accepted_at, orders.ready_at, and the widened total CHECK
-- (total_cents = subtotal_cents + delivery_fee_cents + tax_cents +
-- tip_cents) — this migration is consumer work on top of that, not a
-- re-migration of it.

-- --------------------------------------------------------------------------
-- Fix: transition_order_status awarded loyalty points on total_cents, which
-- now includes tip_cents. That silently inflates points on every tipped
-- order. Points must be earned on subtotal_cents only — a guest who tips
-- 20% has not bought 20% more coffee.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transition_order_status(
    p_order_id UUID, p_venue_id UUID, p_new_status TEXT, p_actor TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_order public.orders%ROWTYPE;
    v_points INTEGER := 0;
    v_rate NUMERIC := 0;
BEGIN
    SELECT * INTO v_order FROM public.orders
    WHERE order_id = p_order_id AND venue_id = p_venue_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ORDER_NOT_FOUND'; END IF;
    IF v_order.status = p_new_status THEN
        RETURN jsonb_build_object('order_id', v_order.order_id, 'status', v_order.status, 'replayed', true);
    END IF;
    IF NOT (
        (v_order.status = 'paid' AND p_new_status = 'accepted') OR
        (v_order.status = 'accepted' AND p_new_status = 'preparing') OR
        (v_order.status = 'preparing' AND p_new_status = 'ready') OR
        (v_order.status = 'ready' AND p_new_status = 'completed' AND v_order.order_type <> 'delivery') OR
        (v_order.status = 'ready' AND p_new_status = 'out_for_delivery' AND v_order.order_type = 'delivery') OR
        (v_order.status = 'out_for_delivery' AND p_new_status = 'completed') OR
        (p_new_status = 'canceled' AND v_order.status IN ('pending','paid','accepted','preparing','ready','out_for_delivery')) OR
        (p_new_status = 'refunded' AND v_order.status IN ('paid','accepted','preparing','ready','out_for_delivery','canceled'))
    ) THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ILLEGAL_ORDER_TRANSITION'; END IF;

    -- Kitchen ticket-age timestamps (PLAN-22 reads these).
    UPDATE public.orders SET
        status = p_new_status,
        updated_at = NOW(),
        accepted_at = CASE WHEN p_new_status = 'accepted' THEN NOW() ELSE accepted_at END,
        ready_at = CASE WHEN p_new_status = 'ready' THEN NOW() ELSE ready_at END
    WHERE order_id = p_order_id;
    IF p_new_status = 'completed' AND v_order.member_id IS NOT NULL THEN
        SELECT COALESCE((loyalty_config->>'points_per_euro')::NUMERIC, 0) INTO v_rate
        FROM public.venues WHERE venue_id = p_venue_id;
        -- subtotal_cents only: tips and delivery/tax never earn points.
        v_points := FLOOR(v_order.subtotal_cents * v_rate / 100.0);
        IF v_points > 0 THEN
            INSERT INTO public.points_ledger (
                tenant_id, member_id, order_id, points_change, reason, description
            ) VALUES (
                p_venue_id, v_order.member_id, v_order.order_id, v_points, 'order',
                'Order ' || LEFT(v_order.order_id::TEXT, 8)
            ) ON CONFLICT (order_id) WHERE order_id IS NOT NULL AND reason = 'order' DO NOTHING;
        END IF;
    END IF;
    INSERT INTO public.events(actor, venue_id, type, payload) VALUES (
        COALESCE(p_actor, 'system'), p_venue_id, 'order.status_changed',
        jsonb_build_object('order_id', p_order_id, 'from', v_order.status, 'to', p_new_status)
    );
    RETURN jsonb_build_object('order_id', p_order_id, 'status', p_new_status, 'points_awarded', v_points, 'replayed', false);
END;
$$;

REVOKE ALL ON FUNCTION public.transition_order_status(UUID, UUID, TEXT, TEXT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transition_order_status(UUID, UUID, TEXT, TEXT) TO service_role;

-- --------------------------------------------------------------------------
-- create_storefront_order gains p_tip_cents as a 12th, defaulted parameter
-- (Postgres allows appending a defaulted parameter via CREATE OR REPLACE
-- without changing the function's identity for existing callers). Tip is
-- validated after the subtotal is known, folds into the total, and is
-- persisted on the order row.
--
-- Guard bound: 0 <= tip_cents <= GREATEST(subtotal_cents * 3, 5000). This is
-- a fat-finger sanity ceiling, not a business decision — generous enough
-- for a genuine 100%+ tip, tight enough to catch a dollars-entered-as-cents
-- mistake before it reaches Stripe.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_storefront_order(
    p_venue_slug TEXT, p_client_uuid UUID, p_order_type TEXT, p_items JSONB,
    p_guest JSONB, p_table_token UUID, p_zone_id UUID,
    p_delivery_address TEXT, p_delivery_postal_code TEXT, p_notes TEXT,
    p_member_pass_serial UUID, p_tip_cents INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_venue RECORD;
    v_existing public.orders%ROWTYPE;
    v_order_id UUID := extensions.uuid_generate_v4();
    v_member_id UUID;
    v_table_id UUID;
    v_zone RECORD;
    v_item JSONB;
    v_priced_item JSONB;
    v_catalog RECORD;
    v_group RECORD;
    v_modifier_ids UUID[];
    v_selected_count INTEGER;
    v_modifier_count INTEGER;
    v_modifier_total INTEGER;
    v_unit_price INTEGER;
    v_quantity INTEGER;
    v_subtotal INTEGER := 0;
    v_delivery_fee INTEGER := 0;
    v_tax INTEGER;
    v_tip INTEGER;
    v_total INTEGER;
    v_priced_items JSONB := '[]'::JSONB;
    v_order_item_id UUID;
    v_modifier JSONB;
    v_postal_prefix TEXT;
BEGIN
    SELECT venue_id, business_name, currency, tax_rate_bp
    INTO v_venue
    FROM public.venues
    WHERE slug = p_venue_slug AND COALESCE(kill_switch, false) = false;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'VENUE_NOT_FOUND';
    END IF;

    SELECT * INTO v_existing FROM public.orders
    WHERE venue_id = v_venue.venue_id AND client_uuid = p_client_uuid;
    IF FOUND THEN
        RETURN jsonb_build_object(
            'order_id', v_existing.order_id, 'venue_id', v_existing.venue_id,
            'status', v_existing.status, 'subtotal_cents', v_existing.subtotal_cents,
            'delivery_fee_cents', v_existing.delivery_fee_cents,
            'tax_cents', v_existing.tax_cents, 'tip_cents', v_existing.tip_cents,
            'total_cents', v_existing.total_cents,
            'currency', COALESCE(v_venue.currency, 'CAD'), 'replayed', true
        );
    END IF;

    IF p_order_type NOT IN ('dine_in', 'pickup', 'delivery') THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_ORDER_TYPE';
    END IF;
    IF NULLIF(BTRIM(COALESCE(p_guest->>'name', '')), '') IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'GUEST_NAME_REQUIRED';
    END IF;
    IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) < 1
       OR jsonb_array_length(p_items) > 50 THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_CART';
    END IF;

    IF p_order_type = 'dine_in' THEN
        SELECT table_id INTO v_table_id FROM public.venue_tables
        WHERE venue_id = v_venue.venue_id AND qr_token = p_table_token AND is_active = true;
        IF NOT FOUND THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_TABLE';
        END IF;
    END IF;

    IF p_member_pass_serial IS NOT NULL THEN
        SELECT member_id INTO v_member_id FROM public.members
        WHERE tenant_id = v_venue.venue_id AND pass_serial = p_member_pass_serial;
    END IF;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
        BEGIN
            v_quantity := (v_item->>'quantity')::INTEGER;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_QUANTITY';
        END;
        IF v_quantity < 1 OR v_quantity > 99 THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_QUANTITY';
        END IF;

        SELECT item_id, name, price_cents INTO v_catalog FROM public.menu_items
        WHERE item_id = (v_item->>'item_id')::UUID
          AND venue_id = v_venue.venue_id AND is_active = true;
        IF NOT FOUND THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ITEM_UNAVAILABLE';
        END IF;

        SELECT COALESCE(array_agg(DISTINCT value::UUID), ARRAY[]::UUID[])
        INTO v_modifier_ids
        FROM jsonb_array_elements_text(COALESCE(v_item->'modifier_ids', '[]'::JSONB));

        SELECT COUNT(*) INTO v_modifier_count FROM public.modifiers m
        JOIN public.modifier_groups g ON g.group_id = m.group_id
        WHERE m.modifier_id = ANY(v_modifier_ids) AND m.venue_id = v_venue.venue_id
          AND m.is_active = true AND g.item_id = v_catalog.item_id;
        IF v_modifier_count <> cardinality(v_modifier_ids) THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_MODIFIERS';
        END IF;

        FOR v_group IN SELECT group_id, name, min_select, max_select
            FROM public.modifier_groups
            WHERE item_id = v_catalog.item_id AND venue_id = v_venue.venue_id
        LOOP
            SELECT COUNT(*) INTO v_selected_count FROM public.modifiers
            WHERE group_id = v_group.group_id AND modifier_id = ANY(v_modifier_ids);
            IF v_selected_count < v_group.min_select OR v_selected_count > v_group.max_select THEN
                RAISE EXCEPTION USING ERRCODE = 'P0001',
                    MESSAGE = 'MODIFIER_SELECTION_INVALID:' || v_group.name;
            END IF;
        END LOOP;

        SELECT COALESCE(SUM(price_delta_cents), 0) INTO v_modifier_total
        FROM public.modifiers WHERE modifier_id = ANY(v_modifier_ids);
        v_unit_price := v_catalog.price_cents + v_modifier_total;
        IF v_unit_price < 0 THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_ITEM_PRICE';
        END IF;
        v_subtotal := v_subtotal + (v_unit_price * v_quantity);
        v_priced_items := v_priced_items || jsonb_build_array(jsonb_build_object(
            'item_id', v_catalog.item_id, 'name', v_catalog.name,
            'unit_price_cents', v_unit_price, 'quantity', v_quantity,
            'notes', NULLIF(BTRIM(COALESCE(v_item->>'notes', '')), ''),
            'modifiers', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'name', m.name, 'price_delta_cents', m.price_delta_cents
            ) ORDER BY m.sort_order, m.name) FROM public.modifiers m
            WHERE m.modifier_id = ANY(v_modifier_ids)), '[]'::JSONB)
        ));
    END LOOP;

    IF p_order_type = 'delivery' THEN
        SELECT zone_id, fee_cents, min_order_cents, postal_prefixes INTO v_zone
        FROM public.delivery_zones WHERE zone_id = p_zone_id
          AND venue_id = v_venue.venue_id AND is_active = true;
        IF NOT FOUND THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'DELIVERY_ZONE_REQUIRED';
        END IF;
        IF NULLIF(BTRIM(COALESCE(p_delivery_address, '')), '') IS NULL THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'DELIVERY_ADDRESS_REQUIRED';
        END IF;
        v_postal_prefix := LEFT(UPPER(REPLACE(COALESCE(p_delivery_postal_code, ''), ' ', '')), 3);
        IF cardinality(v_zone.postal_prefixes) > 0 AND NOT (v_postal_prefix = ANY(ARRAY(
            SELECT UPPER(REPLACE(prefix, ' ', '')) FROM unnest(v_zone.postal_prefixes) prefix
        ))) THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'OUTSIDE_DELIVERY_ZONE';
        END IF;
        IF v_subtotal < v_zone.min_order_cents THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'DELIVERY_MINIMUM_NOT_MET';
        END IF;
        v_delivery_fee := v_zone.fee_cents;
    END IF;

    v_tip := COALESCE(p_tip_cents, 0);
    IF v_tip < 0 OR v_tip > GREATEST(v_subtotal * 3, 5000) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_TIP';
    END IF;

    v_tax := ROUND((v_subtotal + v_delivery_fee) * v_venue.tax_rate_bp / 10000.0);
    v_total := v_subtotal + v_delivery_fee + v_tax + v_tip;
    INSERT INTO public.orders (
        order_id, venue_id, member_id, client_uuid, order_type, table_id, zone_id,
        guest_name, guest_phone, guest_email, delivery_address, notes,
        subtotal_cents, delivery_fee_cents, tax_cents, tip_cents, total_cents
    ) VALUES (
        v_order_id, v_venue.venue_id, v_member_id, p_client_uuid, p_order_type,
        v_table_id, CASE WHEN p_order_type = 'delivery' THEN p_zone_id ELSE NULL END,
        BTRIM(p_guest->>'name'), NULLIF(BTRIM(COALESCE(p_guest->>'phone', '')), ''),
        NULLIF(BTRIM(COALESCE(p_guest->>'email', '')), ''),
        CASE WHEN p_order_type = 'delivery' THEN BTRIM(p_delivery_address) ELSE NULL END,
        NULLIF(BTRIM(COALESCE(p_notes, '')), ''),
        v_subtotal, v_delivery_fee, v_tax, v_tip, v_total
    );

    FOR v_priced_item IN SELECT value FROM jsonb_array_elements(v_priced_items)
    LOOP
        INSERT INTO public.order_items (
            order_id, venue_id, item_id, name_snapshot, unit_price_cents, quantity, notes
        ) VALUES (
            v_order_id, v_venue.venue_id, (v_priced_item->>'item_id')::UUID,
            v_priced_item->>'name', (v_priced_item->>'unit_price_cents')::INTEGER,
            (v_priced_item->>'quantity')::INTEGER, v_priced_item->>'notes'
        ) RETURNING order_item_id INTO v_order_item_id;
        FOR v_modifier IN SELECT value FROM jsonb_array_elements(v_priced_item->'modifiers')
        LOOP
            INSERT INTO public.order_item_modifiers (order_item_id, name_snapshot, price_delta_cents)
            VALUES (v_order_item_id, v_modifier->>'name',
                (v_modifier->>'price_delta_cents')::INTEGER);
        END LOOP;
    END LOOP;

    INSERT INTO public.events (actor, venue_id, type, payload) VALUES (
        CASE WHEN v_member_id IS NULL THEN 'guest' ELSE 'member:' || v_member_id::TEXT END,
        v_venue.venue_id, 'order.placed', jsonb_build_object(
            'order_id', v_order_id, 'order_type', p_order_type, 'total_cents', v_total,
            'tip_cents', v_tip
        )
    );
    RETURN jsonb_build_object(
        'order_id', v_order_id, 'venue_id', v_venue.venue_id, 'status', 'pending',
        'subtotal_cents', v_subtotal, 'delivery_fee_cents', v_delivery_fee,
        'tax_cents', v_tax, 'tip_cents', v_tip, 'total_cents', v_total,
        'currency', COALESCE(v_venue.currency, 'CAD'), 'replayed', false
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_storefront_order(
    TEXT, UUID, TEXT, JSONB, JSONB, UUID, UUID, TEXT, TEXT, TEXT, UUID, INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_storefront_order(
    TEXT, UUID, TEXT, JSONB, JSONB, UUID, UUID, TEXT, TEXT, TEXT, UUID, INTEGER
) TO service_role;

-- The old 11-arg overload some callers may still reference during a partial
-- deploy: drop it explicitly so there is exactly one create_storefront_order
-- and no ambiguity about which one runs.
DROP FUNCTION IF EXISTS public.create_storefront_order(
    TEXT, UUID, TEXT, JSONB, JSONB, UUID, UUID, TEXT, TEXT, TEXT, UUID
);
