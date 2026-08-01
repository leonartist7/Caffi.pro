# PLAN-25 — Food Costing & Margin Report

> Executor: read `docs/plans/MASTER-PLAN-aro.md` FIRST (§4/§5 binding). Read
> `docs/plans/MASTER-PLAN-v2-operating-system.md` and
> `docs/plans/MASTER-PLAN-v2R-remastered.md` §6 Lane B PLAN-25 before
> touching any file. Lane B owns this work exclusively. Branch:
> `sonnet/lane-b-plan25-food-costing` off `origin/main`. Depends on:
> PLAN-24 (schema/functions live; PLAN-24's own PR #64 pending merge —
> same branch-dependency shape as PLAN-24 had on PLAN-23, see below).

## Ground truth

- Read-model only. **No new tables** — `menu_item_ingredients.qty_per_unit`
  and `inventory_items.cost_per_unit_cents` already carry everything
  needed; `order_items`/`orders` already carry sales history.
- A **new read-only SQL function**, not a table, does the aggregation in
  Postgres NUMERIC (exact decimal) arithmetic rather than in JavaScript —
  this is what makes "no float arithmetic anywhere" true by construction
  rather than by careful avoidance in application code.
- **Recipe completeness, three states, not two**: an item can have zero
  ingredient links at all (`'none'`), some links but at least one pointing
  at an inventory item with `cost_per_unit_cents IS NULL` (`'partial'`),
  or every linked ingredient priced (`'complete'`). Both `'none'` and
  `'partial'` are excluded from cost/margin numbers **and** from venue
  totals — a partial number that looks like a real cost is worse than an
  honest gap, per the master plan's own words for this item.
- **"Units sold"** uses the same status filter `deplete_order_stock`
  (PLAN-24) already uses to decide whether an order counts as a real sale:
  `orders.status NOT IN ('pending', 'canceled', 'refunded')`. One
  definition of "sold," shared by the depletion trigger and the costing
  report, so they can never quietly disagree.

## Non-goals

- Any change to `inventory_items`/`menu_item_ingredients`/`orders` schema.
- 86-ing (PLAN-26) — stock-out logic reads different fields.
- A trend-over-time view — this is a current-state report.

## Design

- **`get_food_costing_report(p_venue_id UUID)`** — a `LANGUAGE sql STABLE`
  function (service-role only, same grant pattern as every other
  money-adjacent RPC in this codebase) returning one row per menu item:
  `item_id, name, price_cents, recipe_status, cost_cents, margin_cents,
margin_pct, units_sold, margin_contribution_cents`. All of
  `cost_cents`/`margin_cents`/`margin_pct`/`margin_contribution_cents` are
  `NULL` unless `recipe_status = 'complete'`. `margin_pct` is additionally
  `NULL` when `price_cents = 0` (division by zero avoided in SQL, not
  papered over in the client as `Infinity`/`NaN`).
- Ranked by `margin_contribution_cents` (`margin_cents × units_sold`)
  descending, **not** `margin_pct` alone — a high-margin-percent item that
  never sells is not the operator's actual opportunity.
- **Venue totals** (`total_cost_cents`, `total_margin_cents`) are summed
  in the API route from only the `'complete'` rows — pure integer
  addition in JS (safe; the doctrine's "no float" concern is about
  division/percentage math, not summing already-integer cents), never
  from the whole item set.
- New page `app/(dashboard)/menu/costing/page.tsx` (static route under
  Lane B's existing `app/(dashboard)/menu/**`), nav entry appended to
  `lib/modules.ts`.

## ✅ Acceptance

- [ ] Per-item cost equals the hand-computed sum of `qty_per_unit × cost_per_unit_cents` — verified on three items by hand, live.
- [ ] Margin % and margin currency both shown; a zero-price item shows "—", never `Infinity` or `NaN`.
- [ ] Items with incomplete recipes are labelled "partial recipe" (or "no recipe") and excluded from venue totals.
- [ ] Report ranks by margin contribution, not margin % alone — verified with a low-margin-%-but-high-volume item outranking a high-margin-%-but-zero-sales item.
- [ ] All money via `lib/money.ts` for display; no float arithmetic in the cost/margin computation path (grep-verifiable — the computation lives in SQL, not JS).
- [ ] Design bar. `npm run build` + `tsc --noEmit` green.
