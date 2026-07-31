# BUILD-LOG — PLAN-25: Food Costing & Margin Report

## What shipped

- **`get_food_costing_report(p_venue_id UUID)`** — a `LANGUAGE sql STABLE`
  read-only function (service-role only). All cost/margin arithmetic
  happens here in Postgres `NUMERIC` (exact decimal) math, never in
  JavaScript — this is what makes "no float arithmetic anywhere" true by
  construction, not by careful avoidance in application code.
- **Three-state recipe completeness**, not two: `'none'` (zero ingredient
  links), `'partial'` (has links, but at least one linked inventory item
  has `cost_per_unit_cents IS NULL`), `'complete'` (every linked
  ingredient priced). `cost_cents`/`margin_cents`/`margin_pct`/
  `margin_contribution_cents` are all `NULL` unless `'complete'` — a
  partial number that looks like a real cost is worse than an honest gap.
- **"Units sold" reuses PLAN-24's own definition of a real sale**
  (`orders.status NOT IN ('pending', 'canceled', 'refunded')`) — the
  costing report and the depletion trigger can never quietly disagree
  about what counts as sold.
- Ranked by `margin_contribution_cents` (`margin × units_sold`)
  descending, not `margin_pct` alone.
- `app/api/menu/costing/route.ts` (GET, owner/manager) calls the RPC and
  sums venue totals from `'complete'` rows only — plain integer addition
  in JS, which is safe (the "no float" doctrine targets division/
  percentage math on money, not summing already-integer cents).
- New page `app/(dashboard)/menu/costing/page.tsx`; nav entry appended to
  `lib/modules.ts`.
- **`supabase/tests/food_costing_tests.sql`** — transactional, rolls back,
  mirrors `ordering_core_tests.sql`'s harness.

## Verified live (Supabase MCP, `jjgccfrwjkwknyjtbtxa`)

All in a single transaction that rolled back — **zero permanent
residue**, unlike PLAN-20/23/24's manual verification passes (this PR
adopted the fully-transactional test pattern from the start, which those
established as the safer approach for exactly this kind of live
verification):

- **Hand-computed per-item cost**: an item with milk (10 units × 20¢) +
  beans (5 units × 10¢) computed to exactly **250¢** cost, **250¢**
  margin on a 500¢ price, **50.0%** margin — matching the hand calculation
  exactly, not approximately.
- **Partial recipe excluded**: an item with one priced ingredient and one
  ingredient missing `cost_per_unit_cents` returned `recipe_status =
'partial'` and `cost_cents = NULL` — never a number computed from only
  the priced half.
- **No recipe**: an item with zero ingredient links returned
  `recipe_status = 'none'`.
- **Zero-price item**: cost and margin (in cents) were still computed
  correctly (10¢ cost → -10¢ margin), but `margin_pct` was `NULL` — never
  `Infinity` or `NaN` from a division by a zero price.
- **The central ranking proof**: an item at 99% margin with **zero**
  sales ranked _below_ an item at 16.7% margin with **100** units sold
  (margin contribution 5,000¢ vs 0¢) — proving the report ranks by actual
  earned margin, not the percentage alone, on the exact case where those
  two signals disagree.
- All of the above re-run via the permanent `food_costing_tests.sql` file:
  `ALL COSTING TESTS PASSED`.
- `npx tsc --noEmit`, `npm run build`, `npm run lint` all green (`.next`
  cleared first). `aro` token grep clean. A targeted grep for JS
  arithmetic operators on `*_cents` fields in the new files found none —
  the only cents-field operation in application code is the API route's
  plain `+` summation over already-integer values.
- No RLS/advisor changes needed — this migration only adds a
  `SECURITY DEFINER` function with an explicit service-role-only grant,
  no new table.

## Branch-dependency note (same shape as PLAN-24 had on PLAN-23)

This branch predates PLAN-24's merge (PR #64). The schema/function
dependency (`menu_item_ingredients`, `inventory_items.cost_per_unit_cents`)
was already live regardless of PLAN-24's PR status — PLAN-10 created the
tables, and this report doesn't call any PLAN-24 function directly, so
there was no need to recreate any PLAN-23/24 application file here. This
PR's own files (`lib/costing/types.ts`, the costing route, the costing
page) are all genuinely new paths with no overlap.

## Verification gap — honest about what was NOT checked

- **No live browser check.** Same environment gap as every prior PR in
  this lane: no `SUPABASE_SERVICE_ROLE_KEY`/`.env.local`, so the actual
  rendered report page (badges, totals header, responsive table scroll)
  was not exercised in a browser — verified by reading the code and the
  existing menu/inventory page patterns it mirrors.
