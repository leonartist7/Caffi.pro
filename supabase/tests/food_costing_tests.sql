-- PLAN-25 food costing report invariants. Safe on production: everything
-- rolls back. Mirrors ordering_core_tests.sql's harness.

BEGIN;

DO $$
DECLARE
    v_venue_id UUID := 'a0000000-0000-4000-3000-000000000001';
    v_milk_id UUID := uuid_generate_v4();
    v_beans_id UUID := uuid_generate_v4();
    v_sugar_no_cost_id UUID := uuid_generate_v4();
    v_item_complete UUID := uuid_generate_v4();
    v_item_partial UUID := uuid_generate_v4();
    v_item_none UUID := uuid_generate_v4();
    v_item_zero_price UUID := uuid_generate_v4();
    v_item_a UUID := uuid_generate_v4(); -- high margin %, zero sales
    v_item_b UUID := uuid_generate_v4(); -- low margin %, high volume
    v_order_id UUID := uuid_generate_v4();
    v_r RECORD;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM venues WHERE venue_id = v_venue_id) THEN
        RAISE EXCEPTION 'Costing test venue is missing';
    END IF;

    INSERT INTO inventory_items (item_id, venue_id, name, unit, cost_per_unit_cents) VALUES
        (v_milk_id, v_venue_id, 'Costing Test Milk', 'ml', 20),
        (v_beans_id, v_venue_id, 'Costing Test Beans', 'g', 10),
        (v_sugar_no_cost_id, v_venue_id, 'Costing Test Sugar (no cost)', 'g', NULL);

    INSERT INTO menu_items (item_id, venue_id, name, price_cents, is_active) VALUES
        (v_item_complete, v_venue_id, 'Costing Test Complete', 500, true),
        (v_item_partial, v_venue_id, 'Costing Test Partial', 400, true),
        (v_item_none, v_venue_id, 'Costing Test No Recipe', 350, true),
        (v_item_zero_price, v_venue_id, 'Costing Test Zero Price', 0, true),
        (v_item_a, v_venue_id, 'Costing Test High Margin No Sales', 1000, true),
        (v_item_b, v_venue_id, 'Costing Test Low Margin High Volume', 300, true);

    -- item_complete: milk 10*20c=200 + beans 5*10c=50 -> cost=250, margin=250, margin_pct=50.0
    -- item_partial: milk 10*20c=200 + sugar (no cost) -> excluded
    -- item_zero_price: beans 1*10c=10 -> cost=10, margin=-10, margin_pct NULL (price=0)
    -- item_a: beans 1*10c=10 -> cost=10, price=1000, margin=990 (99.0%), zero sales
    -- item_b: milk 10*20c=200 + beans 5*10c=50 -> cost=250, price=300, margin=50 (16.7%), 100 units sold
    INSERT INTO menu_item_ingredients (venue_id, item_id, inventory_item_id, qty_per_unit) VALUES
        (v_venue_id, v_item_complete, v_milk_id, 10),
        (v_venue_id, v_item_complete, v_beans_id, 5),
        (v_venue_id, v_item_partial, v_milk_id, 10),
        (v_venue_id, v_item_partial, v_sugar_no_cost_id, 5),
        (v_venue_id, v_item_zero_price, v_beans_id, 1),
        (v_venue_id, v_item_a, v_beans_id, 1),
        (v_venue_id, v_item_b, v_milk_id, 10),
        (v_venue_id, v_item_b, v_beans_id, 5);

    INSERT INTO orders (order_id, venue_id, client_uuid, order_type, status, guest_name, subtotal_cents, delivery_fee_cents, tax_cents, total_cents)
    VALUES (v_order_id, v_venue_id, uuid_generate_v4(), 'pickup', 'completed', 'Costing Test Guest', 30000, 0, 0, 30000);
    INSERT INTO order_items (order_id, venue_id, item_id, name_snapshot, unit_price_cents, quantity)
    VALUES (v_order_id, v_venue_id, v_item_b, 'Costing Test Low Margin High Volume', 300, 100);

    -- ------------------------------------------------------------------
    -- Test: per-item cost equals the hand-computed sum, on a complete recipe.
    -- ------------------------------------------------------------------
    SELECT * INTO v_r FROM get_food_costing_report(v_venue_id) WHERE item_id = v_item_complete;
    IF v_r.recipe_status <> 'complete' THEN RAISE EXCEPTION 'complete item wrong status: %', v_r.recipe_status; END IF;
    IF v_r.cost_cents <> 250 THEN RAISE EXCEPTION 'complete item cost wrong: %', v_r.cost_cents; END IF;
    IF v_r.margin_cents <> 250 THEN RAISE EXCEPTION 'complete item margin wrong: %', v_r.margin_cents; END IF;
    IF v_r.margin_pct <> 50.0 THEN RAISE EXCEPTION 'complete item margin_pct wrong: %', v_r.margin_pct; END IF;

    -- ------------------------------------------------------------------
    -- Test: partial recipe (missing cost on one ingredient) excluded.
    -- ------------------------------------------------------------------
    SELECT * INTO v_r FROM get_food_costing_report(v_venue_id) WHERE item_id = v_item_partial;
    IF v_r.recipe_status <> 'partial' THEN RAISE EXCEPTION 'partial item wrong status: %', v_r.recipe_status; END IF;
    IF v_r.cost_cents IS NOT NULL THEN RAISE EXCEPTION 'partial item should have NULL cost, got %', v_r.cost_cents; END IF;

    -- ------------------------------------------------------------------
    -- Test: no recipe at all.
    -- ------------------------------------------------------------------
    SELECT * INTO v_r FROM get_food_costing_report(v_venue_id) WHERE item_id = v_item_none;
    IF v_r.recipe_status <> 'none' THEN RAISE EXCEPTION 'none item wrong status: %', v_r.recipe_status; END IF;

    -- ------------------------------------------------------------------
    -- Test: zero-price item shows NULL margin_pct (never Infinity/NaN),
    -- but cost/margin in cents are still computed.
    -- ------------------------------------------------------------------
    SELECT * INTO v_r FROM get_food_costing_report(v_venue_id) WHERE item_id = v_item_zero_price;
    IF v_r.cost_cents <> 10 THEN RAISE EXCEPTION 'zero price item cost wrong: %', v_r.cost_cents; END IF;
    IF v_r.margin_cents <> -10 THEN RAISE EXCEPTION 'zero price item margin wrong: %', v_r.margin_cents; END IF;
    IF v_r.margin_pct IS NOT NULL THEN RAISE EXCEPTION 'zero price item margin_pct should be NULL, got %', v_r.margin_pct; END IF;

    -- ------------------------------------------------------------------
    -- Test: ranked by margin CONTRIBUTION, not margin % alone. item_b
    -- (16.7% margin, 100 units sold => 5000c contribution) must outrank
    -- item_a (99% margin, 0 units sold => 0c contribution).
    -- ------------------------------------------------------------------
    DECLARE
        v_rank_a INTEGER;
        v_rank_b INTEGER;
    BEGIN
        SELECT rn INTO v_rank_a FROM (
            SELECT item_id, row_number() OVER () AS rn FROM get_food_costing_report(v_venue_id)
        ) t WHERE item_id = v_item_a;
        SELECT rn INTO v_rank_b FROM (
            SELECT item_id, row_number() OVER () AS rn FROM get_food_costing_report(v_venue_id)
        ) t WHERE item_id = v_item_b;
        IF v_rank_b >= v_rank_a THEN
            RAISE EXCEPTION 'Ranking wrong: item_b (rank %) should outrank item_a (rank %) by margin contribution', v_rank_b, v_rank_a;
        END IF;
    END;

    RAISE NOTICE 'All costing assertions passed.';
END $$;

ROLLBACK;

SELECT 'ALL COSTING TESTS PASSED' AS result;
