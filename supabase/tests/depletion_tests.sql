-- PLAN-24 perpetual depletion invariants. Safe on production: everything
-- rolls back. Mirrors ordering_core_tests.sql's harness.

BEGIN;

DO $$
DECLARE
    v_venue_id UUID := 'a0000000-0000-4000-3000-000000000001';
    v_milk_id UUID := uuid_generate_v4();
    v_beans_id UUID := uuid_generate_v4();
    v_item_a UUID := uuid_generate_v4();  -- uses milk + beans
    v_item_b UUID := uuid_generate_v4();  -- uses milk only (aggregation test)
    v_item_c UUID := uuid_generate_v4();  -- no recipe at all
    v_order_id UUID := uuid_generate_v4();
    v_no_recipe_order UUID := uuid_generate_v4();
    v_fail_order UUID := uuid_generate_v4();
    v_ref TEXT := 'depletion_test_' || uuid_generate_v4()::text;
    v_no_recipe_ref TEXT := 'depletion_test_' || uuid_generate_v4()::text;
    v_fail_ref TEXT := 'depletion_test_' || uuid_generate_v4()::text;
    v_result RECORD;
    v_rows INTEGER;
    v_milk_qty NUMERIC;
    v_beans_qty NUMERIC;
    v_status TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM venues WHERE venue_id = v_venue_id) THEN
        RAISE EXCEPTION 'Depletion test venue is missing';
    END IF;

    -- ------------------------------------------------------------------
    -- Setup: two inventory items, three menu items, two recipes sharing
    -- milk (item_a: milk+beans, item_b: milk only — the case that breaks
    -- a naive single-order-id unique index if aggregation is wrong).
    -- ------------------------------------------------------------------
    INSERT INTO inventory_items (item_id, venue_id, name, unit, cost_per_unit_cents)
    VALUES
        (v_milk_id, v_venue_id, 'Depletion Test Milk ' || v_milk_id::text, 'ml', 1),
        (v_beans_id, v_venue_id, 'Depletion Test Beans ' || v_beans_id::text, 'g', 5);

    INSERT INTO menu_items (item_id, venue_id, name, price_cents, is_active)
    VALUES
        (v_item_a, v_venue_id, 'Depletion Test Item A', 475, true),
        (v_item_b, v_venue_id, 'Depletion Test Item B', 500, true),
        (v_item_c, v_venue_id, 'Depletion Test Item C (no recipe)', 300, true);

    INSERT INTO menu_item_ingredients (venue_id, item_id, inventory_item_id, qty_per_unit)
    VALUES
        (v_venue_id, v_item_a, v_milk_id, 200),
        (v_venue_id, v_item_a, v_beans_id, 18),
        (v_venue_id, v_item_b, v_milk_id, 100);

    -- ------------------------------------------------------------------
    -- Test 1/2: replay three times, decrement once. Aggregation: item_a
    -- and item_b both use milk in the SAME order, so milk must sum into
    -- ONE row, not two.
    -- ------------------------------------------------------------------
    INSERT INTO orders (
        order_id, venue_id, client_uuid, order_type, status, guest_name,
        subtotal_cents, delivery_fee_cents, tax_cents, total_cents
    ) VALUES (
        v_order_id, v_venue_id, uuid_generate_v4(), 'pickup', 'pending',
        'Depletion Test Guest', 975, 0, 0, 975
    );
    INSERT INTO order_items (order_id, venue_id, item_id, name_snapshot, unit_price_cents, quantity)
    VALUES
        (v_order_id, v_venue_id, v_item_a, 'Depletion Test Item A', 475, 1),
        (v_order_id, v_venue_id, v_item_b, 'Depletion Test Item B', 500, 1);
    INSERT INTO payments (venue_id, order_id, provider, provider_ref, amount_cents, currency, status, idempotency_key)
    VALUES (v_venue_id, v_order_id, 'stripe', v_ref, 975, 'CAD', 'pending', uuid_generate_v4());

    SELECT * INTO v_result FROM record_order_payment_success('stripe', v_ref, 975, '{}'::jsonb);
    IF NOT v_result.applied THEN RAISE EXCEPTION 'First payment call was not applied'; END IF;

    SELECT * INTO v_result FROM record_order_payment_success('stripe', v_ref, 975, '{}'::jsonb);
    IF v_result.applied THEN RAISE EXCEPTION 'Second (replay) call should not be applied'; END IF;

    SELECT * INTO v_result FROM record_order_payment_success('stripe', v_ref, 975, '{}'::jsonb);
    IF v_result.applied THEN RAISE EXCEPTION 'Third (replay) call should not be applied'; END IF;

    SELECT count(*) INTO v_rows FROM inventory_movements
    WHERE order_id = v_order_id AND reason = 'sale';
    IF v_rows <> 2 THEN
        RAISE EXCEPTION 'Expected exactly 2 sale rows (one per ingredient), got %', v_rows;
    END IF;

    SELECT qty INTO v_milk_qty FROM inventory_movements
    WHERE order_id = v_order_id AND item_id = v_milk_id AND reason = 'sale';
    IF v_milk_qty <> -300 THEN
        RAISE EXCEPTION 'Milk should be summed to -300 (200 from A + 100 from B), got %', v_milk_qty;
    END IF;

    SELECT qty INTO v_beans_qty FROM inventory_movements
    WHERE order_id = v_order_id AND item_id = v_beans_id AND reason = 'sale';
    IF v_beans_qty <> -18 THEN
        RAISE EXCEPTION 'Beans should be -18 (only from item A), got %', v_beans_qty;
    END IF;

    -- ------------------------------------------------------------------
    -- Test: index-level idempotency, independent of the control-flow
    -- early return in record_order_payment_success.
    -- ------------------------------------------------------------------
    v_rows := deplete_order_stock(v_order_id);
    IF v_rows <> 0 THEN RAISE EXCEPTION 'Direct replay 1 should insert 0 rows, got %', v_rows; END IF;
    v_rows := deplete_order_stock(v_order_id);
    IF v_rows <> 0 THEN RAISE EXCEPTION 'Direct replay 2 should insert 0 rows, got %', v_rows; END IF;

    -- ------------------------------------------------------------------
    -- Test: no recipe -> no rows, no error.
    -- ------------------------------------------------------------------
    INSERT INTO orders (
        order_id, venue_id, client_uuid, order_type, status, guest_name,
        subtotal_cents, delivery_fee_cents, tax_cents, total_cents
    ) VALUES (
        v_no_recipe_order, v_venue_id, uuid_generate_v4(), 'pickup', 'pending',
        'Depletion Test No Recipe', 300, 0, 0, 300
    );
    INSERT INTO order_items (order_id, venue_id, item_id, name_snapshot, unit_price_cents, quantity)
    VALUES (v_no_recipe_order, v_venue_id, v_item_c, 'Depletion Test Item C', 300, 1);
    INSERT INTO payments (venue_id, order_id, provider, provider_ref, amount_cents, currency, status, idempotency_key)
    VALUES (v_venue_id, v_no_recipe_order, 'stripe', v_no_recipe_ref, 300, 'CAD', 'pending', uuid_generate_v4());

    SELECT * INTO v_result FROM record_order_payment_success('stripe', v_no_recipe_ref, 300, '{}'::jsonb);
    IF NOT v_result.applied THEN RAISE EXCEPTION 'No-recipe order payment should still apply'; END IF;

    SELECT count(*) INTO v_rows FROM inventory_movements WHERE order_id = v_no_recipe_order;
    IF v_rows <> 0 THEN RAISE EXCEPTION 'No-recipe order should write zero movements, got %', v_rows; END IF;

    -- ------------------------------------------------------------------
    -- Test: refund reverses exactly, preserves originals, is itself
    -- idempotent.
    -- ------------------------------------------------------------------
    PERFORM transition_order_status(v_order_id, v_venue_id, 'refunded', 'test');

    SELECT count(*) INTO v_rows FROM inventory_movements
    WHERE order_id = v_order_id AND reason = 'sale_reversal';
    IF v_rows <> 2 THEN RAISE EXCEPTION 'Expected 2 sale_reversal rows, got %', v_rows; END IF;

    SELECT qty INTO v_milk_qty FROM inventory_movements
    WHERE order_id = v_order_id AND item_id = v_milk_id AND reason = 'sale_reversal';
    IF v_milk_qty <> 300 THEN RAISE EXCEPTION 'Milk reversal should be +300, got %', v_milk_qty; END IF;

    SELECT count(*) INTO v_rows FROM inventory_movements
    WHERE order_id = v_order_id AND reason = 'sale';
    IF v_rows <> 2 THEN RAISE EXCEPTION 'Original sale rows must survive the refund, found %', v_rows; END IF;

    v_rows := reverse_order_stock_depletion(v_order_id);
    IF v_rows <> 0 THEN RAISE EXCEPTION 'Reversal replay should insert 0 rows, got %', v_rows; END IF;

    -- Net effect: SUM per item back to zero.
    SELECT COALESCE(SUM(qty), 0) INTO v_milk_qty FROM inventory_movements
    WHERE order_id = v_order_id AND item_id = v_milk_id;
    IF v_milk_qty <> 0 THEN RAISE EXCEPTION 'Milk net effect should be 0 after reversal, got %', v_milk_qty; END IF;

    -- ------------------------------------------------------------------
    -- Test: depletion failure never blocks or reverses the sale. The
    -- single most important test in this file — proves the savepoint
    -- boundary actually holds, not just that the code looks right.
    -- ------------------------------------------------------------------
    INSERT INTO orders (
        order_id, venue_id, client_uuid, order_type, status, guest_name,
        subtotal_cents, delivery_fee_cents, tax_cents, total_cents
    ) VALUES (
        v_fail_order, v_venue_id, uuid_generate_v4(), 'pickup', 'pending',
        'Depletion Test Failure', 475, 0, 0, 475
    );
    INSERT INTO order_items (order_id, venue_id, item_id, name_snapshot, unit_price_cents, quantity)
    VALUES (v_fail_order, v_venue_id, v_item_a, 'Depletion Test Item A', 475, 1);
    INSERT INTO payments (venue_id, order_id, provider, provider_ref, amount_cents, currency, status, idempotency_key)
    VALUES (v_venue_id, v_fail_order, 'stripe', v_fail_ref, 475, 'CAD', 'pending', uuid_generate_v4());

    ALTER TABLE inventory_movements ADD CONSTRAINT tmp_depletion_force_fail CHECK (reason <> 'sale') NOT VALID;

    SELECT * INTO v_result FROM record_order_payment_success('stripe', v_fail_ref, 475, '{}'::jsonb);
    IF NOT v_result.applied THEN
        RAISE EXCEPTION 'Payment must still apply even when depletion fails';
    END IF;

    ALTER TABLE inventory_movements DROP CONSTRAINT tmp_depletion_force_fail;

    SELECT status INTO v_status FROM orders WHERE order_id = v_fail_order;
    IF v_status <> 'paid' THEN RAISE EXCEPTION 'Order must be paid despite depletion failure, got %', v_status; END IF;

    SELECT status INTO v_status FROM payments WHERE provider = 'stripe' AND provider_ref = v_fail_ref;
    IF v_status <> 'succeeded' THEN RAISE EXCEPTION 'Payment must succeed despite depletion failure, got %', v_status; END IF;

    SELECT count(*) INTO v_rows FROM inventory_movements WHERE order_id = v_fail_order AND reason = 'sale';
    IF v_rows <> 0 THEN RAISE EXCEPTION 'Forced-failure order must have zero sale rows, got %', v_rows; END IF;

    IF NOT EXISTS (
        SELECT 1 FROM events
        WHERE type = 'inventory.depletion_failed' AND payload->>'order_id' = v_fail_order::text
    ) THEN
        RAISE EXCEPTION 'inventory.depletion_failed event was not recorded';
    END IF;

    -- ------------------------------------------------------------------
    -- Test: negative on-hand is permitted (no guard exists or should).
    -- item_a has TWO ingredients (milk + beans), so the retry after
    -- dropping the forced failure writes 2 rows, not 1. The order's
    -- milk/beans were never stocked via a 'receive', so depleting them
    -- proves a negative SUM is accepted without error.
    -- ------------------------------------------------------------------
    v_rows := deplete_order_stock(v_fail_order); -- constraint dropped above, should now succeed
    IF v_rows <> 2 THEN RAISE EXCEPTION 'Retry after dropping the forced failure should insert 2 rows (item_a has 2 ingredients), got %', v_rows; END IF;
    SELECT COALESCE(SUM(qty), 0) INTO v_milk_qty FROM inventory_movements WHERE item_id = v_beans_id;
    IF v_milk_qty >= 0 THEN
        RAISE EXCEPTION 'Expected negative on-hand for beans after depleting with no prior stock, got %', v_milk_qty;
    END IF;

    -- ------------------------------------------------------------------
    -- Test: cross-venue recipe link rejected at the DB layer.
    -- ------------------------------------------------------------------
    BEGIN
        INSERT INTO menu_item_ingredients (venue_id, item_id, inventory_item_id, qty_per_unit)
        VALUES (
            (SELECT venue_id FROM venues WHERE venue_id <> v_venue_id LIMIT 1),
            v_item_b, v_beans_id, 1
        );
        RAISE EXCEPTION 'Cross-venue recipe link was incorrectly allowed';
    EXCEPTION WHEN foreign_key_violation THEN
        NULL; -- expected
    END;

    RAISE NOTICE 'All depletion assertions passed.';
END;
$$;

ROLLBACK;

SELECT 'ALL DEPLETION TESTS PASSED' AS result;
