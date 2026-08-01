# BUILD-LOG — PLAN-26: 86-ing / Stock-out

## What shipped

- `menu_items` gains `is_86ed` (hidden right now) and `auto_86ed`
  (whether the _current_ state was set by the system, not a person),
  with `CHECK (NOT auto_86ed OR is_86ed)`.
- `recompute_menu_item_stock_status(p_menu_item_ids UUID[])` — for each
  item, checks whether _any_ linked ingredient's on-hand
  (`SUM(inventory_movements.qty)`) is `<= 0`. Auto-86 a short item that
  isn't already 86'd; auto-restore only a row the system itself 86'd,
  and only once **every** linked ingredient is back above zero. A row
  that's 86'd but `auto_86ed = false` (a manual decision) is never
  touched by this function — the manual-outranks-automatic guarantee is
  enforced structurally, not by convention. Idempotent: only emits
  `menu.item_86ed`/`menu.item_restored` on an actual transition.
- Two triggers call it: `AFTER INSERT ON inventory_movements` (covers
  every path that can change on-hand — manual waste/adjust/receive/count
  _and_ PLAN-24's automatic `sale`/`sale_reversal` rows, since both are
  just inserts into the same table) and `AFTER INSERT OR UPDATE OR DELETE
ON menu_item_ingredients` (a newly-linked or unlinked ingredient flips
  availability immediately, not on the next unrelated movement). A
  one-time backfill recompute ran in the same migration so existing
  venues started in a correct state.
- `create_storefront_order`'s existing per-line catalog lookup — which
  already rejected `is_active = false` with `ITEM_UNAVAILABLE` — gains
  `is_86ed` in the same `SELECT` and raises `'ITEM_86ED:' || name`
  (mirrors the existing `MODIFIER_SELECTION_INVALID:<name>` convention)
  when the item is specifically 86'd. Mapped in
  `app/api/orders/route.ts` to _"Sorry — `<item>` just sold out. Please
  remove it from your cart and refresh the menu."_, rendered inline in
  `CheckoutForm.tsx` (unchanged from PLAN-20/22 — it already displays
  `error` inline, never a toast that vanishes, and the 400 response never
  reaches Stripe checkout creation).
- `POST /api/menu/items/[id]/toggle-86` — dedicated manual-toggle action
  (owner/manager), always clears `auto_86ed` regardless of direction, so
  a manual decision permanently outranks the next automatic recompute
  until a person changes it again. Emits `menu.item_86ed` /
  `menu.item_restored` with `actor = user:<id>`.
- `lib/storefront.ts`'s menu query gains `.eq('is_86ed', false)` next to
  the existing `is_active` filter — hides an 86'd item from the
  storefront with no separate code path.
- Dashboard menu grid (`app/(dashboard)/menu/page.tsx`): a `Ban`-icon
  toggle button per item card (distinct from the destructive
  edit/delete pair — 86-ing is reversible, so no confirm dialog, matching
  its "single-tap operational action" nature) plus a red "86'd" badge
  (appends "· auto" when the state was system-set, so an owner can tell
  a "we're actually out" 86 apart from "I turned this off myself").
- Counter order queue (`components/counter/OrdersQueue.tsx` +
  `/api/counter/orders`): a compact banner listing currently-86'd item
  names, refreshed on the same 15s poll the queue already uses — staff
  running the counter see what's unavailable right now without needing a
  separate menu-browsing surface (there isn't one; guests only order via
  the storefront QR).

## Verified live (Supabase MCP, `jjgccfrwjkwknyjtbtxa`)

All inside a single transaction that rolled back — zero permanent
residue, continuing PLAN-25's fully-transactional verification approach:

- **Immediate auto-86 on ingredient link**: linking a fresh (zero
  on-hand) ingredient to a menu item auto-86'd it right away, with no
  movement needed at all — the `menu_item_ingredients` trigger, not just
  the `inventory_movements` one.
- **Partial restock does not restore a multi-ingredient item**:
  restocking only milk (not beans) on a 2-ingredient item left it 86'd;
  restocking beans too then restored it in the same transaction, with a
  real `menu.item_restored` event row.
- **Manual outranks automatic, proven side-by-side**: manually 86'd one
  water-dependent item, then restocked water. The manually-86'd item
  _stayed_ 86'd (`auto_86ed = false` the whole time); a second,
  auto-86'd item depending on the same ingredient _did_ auto-restore
  from the identical restock — same trigger firing, different outcome,
  proven in the same test.
- **Checkout rejection**: ordering an 86'd item through
  `create_storefront_order` raised `ITEM_86ED:<name>`, not the generic
  `ITEM_UNAVAILABLE` and not a silent success.
- **Un-86 clears both flags** cleanly.
- All of the above re-run via the permanent `eighty_six_tests.sql`:
  `ALL EIGHTY-SIX TESTS PASSED`.
- `get_advisors` (security): the migration's two trigger functions were
  initially flagged `anon_security_definer_function_executable` /
  `authenticated_security_definer_function_executable` (Postgres grants
  `EXECUTE` to `PUBLIC` by default on new functions) — fixed by an
  explicit `REVOKE ... FROM PUBLIC, anon, authenticated` + `GRANT ...
TO service_role` on both trigger functions and
  `recompute_menu_item_stock_status`, folded into the migration file
  before commit. Re-ran advisors after: clean of anything this PR
  introduced (only pre-existing, unrelated findings remain).
- `npx tsc --noEmit`, `npm run build`, `npm run lint` all green (`.next`
  cleared first). `aro` design-token grep on every changed file clean
  (no legacy `coffee-*`/`cream-*`/`dark-*` classes). No new table, so no
  new RLS policy needed; `menu_items` already RLS-covered by its
  pre-existing policies.

## Branch-dependency note

This branch is fresh off `origin/main`, and `app/kitchen/**` (PLAN-22)
doesn't exist there — that PR is still unmerged, and kitchen has no
menu-browsing surface today anyway (only an order-ticket queue for
already-placed orders). A kitchen-side 86'd indicator is deferred to a
follow-up once PLAN-22 merges rather than recreating an entire screen
for one badge — flagged in `PLAN-26-86ing-stock-out.md`'s Non-goals and
in `STATUS.md`. `app/counter/**` _does_ exist on `main` and got the real
banner described above.

`create_storefront_order` on this branch is still the pre-PLAN-20,
11-argument version (no `p_tip_cents`) — `aro_schema.sql` reflects
whatever's actually on `main` today, so the mirrored function here
matches that 11-arg signature. This is expected drift that will need a
straightforward reconciliation when PLAN-20/22/23/24/25/26 land in
sequence (each PR's `aro_schema.sql` diff was written against its own
branch's base), same shape as the `lib/inventory/types.ts` conflict
already flagged between PLAN-23 and PLAN-24.

## Verification gap — honest about what was NOT checked

- **No live browser check.** Same environment gap as every prior PR in
  this lane: the 86 toggle button's placement/styling on the dashboard
  grid, the red badge, and the counter banner were verified by reading
  the code and the existing patterns they mirror, not by clicking
  through them in a browser.
