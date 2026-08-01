-- PLAN-26 86-ing/stock-out invariants. Safe on production: everything
-- rolls back. Mirrors depletion_tests.sql's harness.

BEGIN;

DO $$
DECLARE
    v_venue_id UUID := 'a0000000-0000-4000-3000-000000000001';
    v_milk_id UUID := uuid_generate_v4();
    v_beans_id UUID := uuid_generate_v4();
    v_water_id UUID := uuid_generate_v4();
    v_item_a UUID := uuid_generate_v4();  -- milk + beans (2-ingredient item)
    v_item_b UUID := uuid_generate_v4();  -- water only (single-ingredient item)
    v_item_c UUID := uuid_generate_v4();  -- water only, for the manual-outranks-auto test
    v_is_86ed BOOLEAN;
    v_auto_86ed BOOLEAN;
    v_error_caught BOOLEAN;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM venues WHERE venue_id = v_venue_id) THEN
        RAISE EXCEPTION 'Test venue is missing';
    END IF;

    INSERT INTO inventory_items (item_id, venue_id, name, unit, cost_per_unit_cents)
    VALUES
        (v_milk_id, v_venue_id, 'Eighty-Six Test Milk ' || v_milk_id::text, 'ml', 1),
        (v_beans_id, v_venue_id, 'Eighty-Six Test Beans ' || v_beans_id::text, 'g', 5),
        (v_water_id, v_venue_id, 'Eighty-Six Test Water ' || v_water_id::text, 'ml', 0);

    INSERT INTO menu_items (item_id, venue_id, name, price_cents, is_active)
    VALUES
        (v_item_a, v_venue_id, 'Eighty-Six Test Item A', 475, true),
        (v_item_b, v_venue_id, 'Eighty-Six Test Item B', 300, true),
        (v_item_c, v_venue_id, 'Eighty-Six Test Item C', 350, true);

    -- Item A depends on BOTH milk and beans; item B and C depend on water only.
    INSERT INTO menu_item_ingredients (venue_id, item_id, inventory_item_id, qty_per_unit)
    VALUES
        (v_venue_id, v_item_a, v_milk_id, 200),
        (v_venue_id, v_item_a, v_beans_id, 18),
        (v_venue_id, v_item_b, v_water_id, 50),
        (v_venue_id, v_item_c, v_water_id, 50);

    -- Freshly linked, zero on-hand everywhere -> ingredient-link trigger
    -- should have already auto-86'd all three immediately (no movement
    -- needed at all).
    SELECT is_86ed, auto_86ed INTO v_is_86ed, v_auto_86ed FROM menu_items WHERE item_id = v_item_a;
    IF NOT (v_is_86ed AND v_auto_86ed) THEN
        RAISE EXCEPTION 'Item A should be auto-86ed immediately on ingredient link, got is_86ed=%, auto_86ed=%', v_is_86ed, v_auto_86ed;
    END IF;

    -- ------------------------------------------------------------------
    -- Test: receiving stock for BOTH ingredients restores a 2-ingredient
    -- item; receiving only ONE of two does not.
    -- ------------------------------------------------------------------
    INSERT INTO inventory_movements (venue_id, item_id, qty, reason)
    VALUES (v_venue_id, v_milk_id, 1000, 'receive');

    SELECT is_86ed, auto_86ed INTO v_is_86ed, v_auto_86ed FROM menu_items WHERE item_id = v_item_a;
    IF NOT v_is_86ed THEN
        RAISE EXCEPTION 'Item A must stay 86ed with only milk restocked (beans still at zero)';
    END IF;

    INSERT INTO inventory_movements (venue_id, item_id, qty, reason)
    VALUES (v_venue_id, v_beans_id, 500, 'receive');

    SELECT is_86ed, auto_86ed INTO v_is_86ed, v_auto_86ed FROM menu_items WHERE item_id = v_item_a;
    IF v_is_86ed OR v_auto_86ed THEN
        RAISE EXCEPTION 'Item A should auto-restore once both ingredients are above zero, got is_86ed=%, auto_86ed=%', v_is_86ed, v_auto_86ed;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM events WHERE type = 'menu.item_restored' AND payload->>'item_id' = v_item_a::text
    ) THEN
        RAISE EXCEPTION 'menu.item_restored event was not recorded for item A';
    END IF;

    -- ------------------------------------------------------------------
    -- Test: manual 86 outranks automatic restock. Manually 86 item B
    -- (auto_86ed stays false), then restock water above zero — item B
    -- must stay 86ed because it was a MANUAL decision, not an automatic
    -- one. Item C (also water-dependent, never manually touched) must
    -- auto-restore from the same restock.
    -- ------------------------------------------------------------------
    UPDATE menu_items SET is_86ed = true, auto_86ed = false WHERE item_id = v_item_b;

    INSERT INTO inventory_movements (venue_id, item_id, qty, reason)
    VALUES (v_venue_id, v_water_id, 1000, 'receive');

    SELECT is_86ed, auto_86ed INTO v_is_86ed, v_auto_86ed FROM menu_items WHERE item_id = v_item_b;
    IF NOT (v_is_86ed AND NOT v_auto_86ed) THEN
        RAISE EXCEPTION 'Manually-86ed item B must stay 86ed after an unrelated restock, got is_86ed=%, auto_86ed=%', v_is_86ed, v_auto_86ed;
    END IF;

    SELECT is_86ed INTO v_is_86ed FROM menu_items WHERE item_id = v_item_c;
    IF v_is_86ed THEN
        RAISE EXCEPTION 'Auto-86ed item C should have auto-restored from the same restock as item B';
    END IF;

    -- ------------------------------------------------------------------
    -- Test: checkout rejects an 86'd item with ITEM_86ED, not a silent
    -- cart mutation and not the generic ITEM_UNAVAILABLE.
    -- ------------------------------------------------------------------
    v_error_caught := false;
    BEGIN
        PERFORM create_storefront_order(
            (SELECT slug FROM venues WHERE venue_id = v_venue_id),
            uuid_generate_v4(), 'pickup',
            jsonb_build_array(jsonb_build_object('item_id', v_item_b, 'quantity', 1)),
            jsonb_build_object('name', 'Eighty-Six Test Guest'),
            NULL, NULL, NULL, NULL, NULL, NULL, 0
        );
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
        IF SQLERRM NOT LIKE 'ITEM_86ED:%' THEN
            RAISE EXCEPTION 'Expected ITEM_86ED:<name>, got %', SQLERRM;
        END IF;
    END;
    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'Ordering an 86ed item should have raised ITEM_86ED';
    END IF;

    -- ------------------------------------------------------------------
    -- Test: un-86 (manual restore) clears both flags.
    -- ------------------------------------------------------------------
    UPDATE menu_items SET is_86ed = false, auto_86ed = false WHERE item_id = v_item_b;
    SELECT is_86ed, auto_86ed INTO v_is_86ed, v_auto_86ed FROM menu_items WHERE item_id = v_item_b;
    IF v_is_86ed OR v_auto_86ed THEN
        RAISE EXCEPTION 'Un-86 should clear both flags';
    END IF;

    RAISE NOTICE 'All 86-ing assertions passed.';
END;
$$;

ROLLBACK;

SELECT 'ALL EIGHTY-SIX TESTS PASSED' AS result;
