-- PLAN-25: food costing & margin report. Read-model only — no new tables.
-- All cost/margin arithmetic lives in this SQL function using Postgres
-- NUMERIC (exact decimal) math, never in JavaScript, so "no float
-- arithmetic anywhere" is true by construction rather than by careful
-- avoidance in application code.

CREATE OR REPLACE FUNCTION public.get_food_costing_report(p_venue_id UUID)
RETURNS TABLE (
    item_id UUID,
    name TEXT,
    price_cents INTEGER,
    recipe_status TEXT,
    cost_cents INTEGER,
    margin_cents INTEGER,
    margin_pct NUMERIC,
    units_sold BIGINT,
    margin_contribution_cents BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    WITH recipe AS (
        SELECT
            mii.item_id,
            COUNT(*) FILTER (WHERE ii.cost_per_unit_cents IS NULL) AS missing_cost_count,
            SUM(mii.qty_per_unit * ii.cost_per_unit_cents) AS raw_cost
        FROM menu_item_ingredients mii
        JOIN inventory_items ii ON ii.item_id = mii.inventory_item_id
        WHERE mii.venue_id = p_venue_id
        GROUP BY mii.item_id
    ),
    -- "Sold" mirrors deplete_order_stock's own definition of a real sale
    -- (PLAN-24) — the costing report and the depletion trigger can never
    -- quietly disagree about what counts.
    sales AS (
        SELECT oi.item_id, SUM(oi.quantity) AS units_sold
        FROM order_items oi
        JOIN orders o ON o.order_id = oi.order_id
        WHERE o.venue_id = p_venue_id
          AND o.status NOT IN ('pending', 'canceled', 'refunded')
        GROUP BY oi.item_id
    )
    SELECT
        mi.item_id,
        mi.name,
        mi.price_cents,
        CASE
            WHEN r.item_id IS NULL THEN 'none'
            WHEN r.missing_cost_count > 0 THEN 'partial'
            ELSE 'complete'
        END AS recipe_status,
        CASE WHEN r.item_id IS NOT NULL AND r.missing_cost_count = 0
             THEN ROUND(r.raw_cost)::INTEGER END AS cost_cents,
        CASE WHEN r.item_id IS NOT NULL AND r.missing_cost_count = 0
             THEN mi.price_cents - ROUND(r.raw_cost)::INTEGER END AS margin_cents,
        CASE WHEN r.item_id IS NOT NULL AND r.missing_cost_count = 0 AND mi.price_cents > 0
             THEN ROUND((mi.price_cents - r.raw_cost) / mi.price_cents * 100, 1) END AS margin_pct,
        COALESCE(s.units_sold, 0) AS units_sold,
        CASE WHEN r.item_id IS NOT NULL AND r.missing_cost_count = 0
             THEN (mi.price_cents - ROUND(r.raw_cost)::INTEGER) * COALESCE(s.units_sold, 0) END
             AS margin_contribution_cents
    FROM menu_items mi
    LEFT JOIN recipe r ON r.item_id = mi.item_id
    LEFT JOIN sales s ON s.item_id = mi.item_id
    WHERE mi.venue_id = p_venue_id
    ORDER BY margin_contribution_cents DESC NULLS LAST, mi.name;
$$;

REVOKE ALL ON FUNCTION public.get_food_costing_report(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_food_costing_report(UUID) TO service_role;
