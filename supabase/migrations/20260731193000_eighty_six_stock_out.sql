-- PLAN-26: 86-ing / stock-out.
--
-- Two columns on menu_items: is_86ed (hidden right now) and auto_86ed
-- (whether the *current* hidden state was set by the system, not a
-- person). A manual toggle always clears auto_86ed regardless of
-- direction, so automatic recompute can never undo a human decision.

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_86ed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS auto_86ed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_auto_86_implies_86;
ALTER TABLE menu_items ADD CONSTRAINT menu_items_auto_86_implies_86
    CHECK (NOT auto_86ed OR is_86ed);

-- Recompute stock-derived availability for a set of menu items. Auto-86 a
-- short item (any linked ingredient at/below zero on-hand) that isn't
-- already 86'd; auto-restore only a row the system itself 86'd, once
-- every linked ingredient is back above zero. Never touches a row that's
-- 86'd but not auto_86ed (a manual decision outranks an automatic one).
-- Idempotent — only emits an event when a row actually transitions.
CREATE OR REPLACE FUNCTION public.recompute_menu_item_stock_status(p_menu_item_ids UUID[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item RECORD;
    v_short BOOLEAN;
BEGIN
    FOR v_item IN
        SELECT item_id, venue_id, name, is_86ed, auto_86ed
        FROM menu_items
        WHERE item_id = ANY(p_menu_item_ids)
    LOOP
        SELECT EXISTS (
            SELECT 1
            FROM menu_item_ingredients mii
            LEFT JOIN (
                SELECT item_id, SUM(qty) AS on_hand
                FROM inventory_movements
                GROUP BY item_id
            ) stock ON stock.item_id = mii.inventory_item_id
            WHERE mii.item_id = v_item.item_id
              AND COALESCE(stock.on_hand, 0) <= 0
        ) INTO v_short;

        IF v_short AND NOT v_item.is_86ed THEN
            UPDATE menu_items SET is_86ed = true, auto_86ed = true
            WHERE menu_items.item_id = v_item.item_id;
            INSERT INTO events (actor, venue_id, type, payload)
            VALUES ('system', v_item.venue_id, 'menu.item_86ed',
                jsonb_build_object('item_id', v_item.item_id, 'name', v_item.name, 'auto', true));
        ELSIF NOT v_short AND v_item.auto_86ed THEN
            UPDATE menu_items SET is_86ed = false, auto_86ed = false
            WHERE menu_items.item_id = v_item.item_id;
            INSERT INTO events (actor, venue_id, type, payload)
            VALUES ('system', v_item.venue_id, 'menu.item_restored',
                jsonb_build_object('item_id', v_item.item_id, 'name', v_item.name, 'auto', true));
        END IF;
    END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_menu_item_stock_status(UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_menu_item_stock_status(UUID[]) TO service_role;

-- Every inventory_movements insert (manual waste/adjust/receive/count, or
-- the automatic 'sale'/'sale_reversal' rows PLAN-24 writes) can flip a
-- dependent menu item's availability within the same transaction.
CREATE OR REPLACE FUNCTION public.trg_menu_availability_after_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ids UUID[];
BEGIN
    SELECT COALESCE(array_agg(DISTINCT item_id), ARRAY[]::UUID[])
    INTO v_ids
    FROM menu_item_ingredients
    WHERE inventory_item_id = NEW.item_id;

    IF array_length(v_ids, 1) > 0 THEN
        PERFORM public.recompute_menu_item_stock_status(v_ids);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_menu_availability_after_movement ON inventory_movements;
CREATE TRIGGER trg_menu_availability_after_movement
AFTER INSERT ON inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.trg_menu_availability_after_movement();

REVOKE ALL ON FUNCTION public.trg_menu_availability_after_movement() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trg_menu_availability_after_movement() TO service_role;

-- Linking/unlinking a recipe ingredient (or changing which inventory item
-- it points to) can also flip availability immediately, without waiting
-- for the next unrelated movement.
CREATE OR REPLACE FUNCTION public.trg_menu_availability_after_ingredient_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.recompute_menu_item_stock_status(ARRAY[OLD.item_id]);
        RETURN OLD;
    ELSE
        PERFORM public.recompute_menu_item_stock_status(ARRAY[NEW.item_id]);
        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_menu_availability_after_ingredient_change ON menu_item_ingredients;
CREATE TRIGGER trg_menu_availability_after_ingredient_change
AFTER INSERT OR UPDATE OR DELETE ON menu_item_ingredients
FOR EACH ROW EXECUTE FUNCTION public.trg_menu_availability_after_ingredient_change();

REVOKE ALL ON FUNCTION public.trg_menu_availability_after_ingredient_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trg_menu_availability_after_ingredient_change() TO service_role;

-- One-time backfill so existing venues start in a correct state, not just
-- items touched by a future movement/ingredient change.
DO $$
DECLARE
    v_ids UUID[];
BEGIN
    SELECT COALESCE(array_agg(DISTINCT item_id), ARRAY[]::UUID[]) INTO v_ids
    FROM menu_item_ingredients;
    IF array_length(v_ids, 1) > 0 THEN
        PERFORM public.recompute_menu_item_stock_status(v_ids);
    END IF;
END;
$$;

-- Checkout must reject an 86'd item with a specific, warm reason instead
-- of the generic ITEM_UNAVAILABLE (mirrors the existing
-- MODIFIER_SELECTION_INVALID:<name> convention for a named-item failure).
CREATE OR REPLACE FUNCTION public.create_storefront_order(p_venue_slug text, p_client_uuid uuid, p_order_type text, p_items jsonb, p_guest jsonb, p_table_token uuid, p_zone_id uuid, p_delivery_address text, p_delivery_postal_code text, p_notes text, p_member_pass_serial uuid, p_tip_cents integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

        SELECT item_id, name, price_cents, is_86ed INTO v_catalog FROM public.menu_items
        WHERE item_id = (v_item->>'item_id')::UUID
          AND venue_id = v_venue.venue_id AND is_active = true;
        IF NOT FOUND THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ITEM_UNAVAILABLE';
        END IF;
        IF v_catalog.is_86ed THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ITEM_86ED:' || v_catalog.name;
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
$function$;
