# BUILD-LOG — PLAN-24: Perpetual Depletion

## Idempotency design: architect pass, not improvised

Per the master plan's binding doctrine ("a double-decrement is silent and
unrecoverable — Fable designs the guarantee," and this is the one Lane B
item not marked "(done, this doc)" in the master plan), the full
idempotency design was authored by a dedicated Opus-5 architect pass before
any code was written. Every decision below (trigger point, the exact
partial unique index shape, the refund-reversal semantics, the
failure-isolation mechanism, the recipe-CRUD scope, negative on-hand
handling) came from that design, not from my own judgment call. The full
design document is preserved in this session's record; this log
transcribes the decisions and the verification against them.

## What shipped

- **Migration** (`supabase/migrations/20260731185507_perpetual_depletion.sql`,
  applied live, mirrored into `supabase/aro_schema.sql`):
  - `inventory_movements_reason_check` widened to add `'sale_reversal'`
    (additive; machine-written only, never exposed through the manual
    movements API, which keeps its `receive|waste|adjust|count` whitelist).
  - Two partial unique indexes: `uq_inventory_movements_order_sale` and
    `..._sale_reversal`, both on `(order_id, item_id)` — **not** a
    single-row-per-order shape, because one order can deplete N different
    inventory items. The guarantee only holds paired with `deplete_order_stock`'s
    `GROUP BY inventory_item_id` aggregation across every order line first.
  - `deplete_order_stock(order_id)` — idempotent, callable any number of
    times; `reverse_order_stock_depletion(order_id)` — negates the stored
    `'sale'` rows (never re-derives from the current recipe, which may
    have changed since the sale).
  - `record_order_payment_success` gains a guarded call to
    `deplete_order_stock` **inside its own transaction**, wrapped in a
    PL/pgSQL `BEGIN...EXCEPTION` block (an implicit savepoint) so a
    depletion failure rolls back only the stock movements — the payment,
    order status, and `order.paid` event that already ran stay committed.
    The failure-logging insert is itself guarded so it can't be the thing
    that reverses a sale.
  - `transition_order_status` gains the mirror-image guarded call to
    `reverse_order_stock_depletion` on `→ refunded`.
  - **Both replaced functions use their exact live bodies**, re-confirmed
    via `pg_get_functiondef` immediately before writing the migration —
    not the stale versions in older migration files on `main`.
    `transition_order_status`'s live body already carries PLAN-20's
    `subtotal_cents` points fix and PLAN-22's `accepted_at`/`ready_at`
    stamping (both applied live in this session's prior unmerged PRs);
    pasting an older migration's body would have silently regressed both.
- **Recipe-link CRUD**: `app/api/menu/items/[id]/ingredients/route.ts`
  (GET/POST) + `app/api/menu/ingredients/[id]/route.ts` (PATCH/DELETE),
  mirroring the existing modifier-groups route pattern exactly. Tenant
  coherence is a DB guarantee (composite FKs make a cross-venue link
  physically unrepresentable); the routes' only job is to never take
  `venue_id` from the request body.
- **UI**: `components/menu/RecipeDialog.tsx`, opened from a new icon
  button on each menu item card in `app/(dashboard)/menu/page.tsx`. Calls
  its route immediately on add/remove — does not extend `ItemDialog`'s
  draft-and-sync machinery.
- **`supabase/tests/depletion_tests.sql`** — a transactional, rolls-back
  test suite (mirrors `ordering_core_tests.sql`'s harness) covering every
  acceptance criterion, safe to re-run against production.

## Verified live (Supabase MCP, `jjgccfrwjkwknyjtbtxa`)

Two passes: manual step-by-step verification first (to build confidence
incrementally), then the full automated `depletion_tests.sql` suite
(which passed outright: `ALL DEPLETION TESTS PASSED`), safely rolled back
with zero residue.

Manual pass findings (all against a disposable test order on `the-roastery`):

- `receive`-equivalent aggregation: an order with two menu items (Flat
  White using milk+beans, Cold Brew using milk only) depleted to exactly
  **2** movement rows — milk summed to **-300** (200 from Flat White + 100
  from Cold Brew), beans to **-18** — after **3** webhook calls to
  `record_order_payment_success` (`applied: true` then `false`, `false`).
  This is the case that breaks a naive single-row-per-order unique index;
  confirmed correct.
- Calling `deplete_order_stock` directly 2 more times after that: **0**
  rows inserted each time — index-level idempotency, independent of
  `record_order_payment_success`'s own early-return control flow.
- Refund: `transition_order_status(..., 'refunded', ...)` wrote exactly 2
  `sale_reversal` rows, exact negation of the stored `sale` rows (+300
  milk, +18 beans), **originals preserved, not deleted**. A second direct
  call to `reverse_order_stock_depletion` inserted 0 rows.
- **The central proof of this PR**: a fresh order was paid with a
  `NOT VALID` `CHECK (reason <> 'sale')` constraint temporarily forcing
  the depletion insert to fail. Result: `record_order_payment_success`
  still returned `applied: true`; the order was `'paid'`; the payment was
  `'succeeded'`; **zero** `'sale'` rows existed for that order; and an
  `inventory.depletion_failed` event was recorded with the real
  `SQLSTATE`/message (`23514`, the CHECK violation). The savepoint
  boundary holds exactly as designed — a stock bug cannot reverse a sale.
- Cross-venue recipe link: rejected with `foreign_key_violation`.
- `get_advisors` (security): no new findings attributable to this
  migration; unchanged from before this PR.

Automated pass: `supabase/tests/depletion_tests.sql` run in full (wrapped
in `BEGIN`/`ROLLBACK`) — covers all of the above plus the no-recipe case
(zero rows, no error) and negative on-hand (unguarded, confirmed) — result:
`ALL DEPLETION TESTS PASSED`, with zero permanent residue since everything
rolled back.

## Known test residue (from the manual pass only — the automated suite left none)

The manual verification pass (before the automated test file existed)
created two disposable inventory items (`PLAN24 Verification Milk`,
`PLAN24 Verification Beans`) and two test orders on `the-roastery`. The
recipe links were deleted afterward (to avoid contaminating future
costing/86-ing work on the real Flat White/Cold Brew menu items), and the
two inventory items were marked `is_active = false` and renamed to `(test,
inactive)`. The order rows and their `sale`/`sale_reversal` movements
remain permanently — append-only movements plus the `ON DELETE RESTRICT`
FK from movements to orders make them undeletable, the same shape of
residue documented in PLAN-20/22/23's build logs.

## Branch-dependency note — honest about what this PR builds on top of

This branch was cut fresh from `origin/main`, which does **not** yet have
PLAN-23 (inventory foundation, PR #63) merged. PLAN-24 depends on PLAN-23
in the master plan's dependency graph. The **database schema** dependency
is satisfied regardless (PLAN-10 created the tables; PLAN-23 only added
application code on top), so the migration and its live verification are
unaffected. But two `lib`/app files that PLAN-23's PR created had to be
**recreated on this branch** to build PLAN-24's application layer:

- `lib/inventory/types.ts` — recreated with PLAN-23's original shape plus
  PLAN-24's additions (`'sale_reversal'` in `MovementReason`, the new
  `MenuItemIngredient` interface). This **will** produce a merge conflict
  when both PRs land; the resolution is a straightforward union (both
  PRs' additions kept), not a real disagreement.
- `lib/events.ts` — this PR appends only its own one new entry
  (`inventory.depletion_failed`) to the _current_ (pre-PLAN-23) version of
  the file, per the append-only convention. PLAN-23's own additions
  (`inventory.item_created` etc.) live on its branch. Same expected,
  trivial merge-conflict-resolved-by-union situation.

One acceptance item from the original PLAN-24 spec is **explicitly
deferred, not silently dropped**: the "Oversold" pill on the inventory
list page. That page (`app/(dashboard)/menu/inventory/page.tsx`) is
itself a PLAN-23 file that doesn't exist on this branch, and duplicating
PLAN-23's ~250-line page just to add one pill would create a much larger,
noisier merge conflict than the small win justifies. The underlying data
already supports it with zero further backend work — `on_hand` can already
go negative today, unguarded, exactly as designed — this is purely a
presentational follow-up to land in a small PR once PLAN-23 merges.
Flagged here and in `STATUS.md` so it isn't lost.

## Verification gap — honest about what was NOT checked

- **No live browser check.** Same environment gap as PLAN-20/22/23: no
  `SUPABASE_SERVICE_ROLE_KEY`/`.env.local`. The `RecipeDialog` UI (adding/
  removing ingredients from a real menu item card) was verified by reading
  the code and the existing modifier-groups pattern it mirrors — not by a
  rendered click-through.
- A real Stripe webhook retry (as opposed to three direct RPC calls with
  the same `provider_ref`) was not exercised — the RPC-level replay test is
  the correct unit of verification for this guarantee (the webhook route
  itself is unchanged in this PR), but a true end-to-end Stripe test-mode
  retry was not attempted.

## Non-goals honored (from the architect design, not re-decided)

- No modifier-driven depletion (an "extra shot" consuming beans) —
  `order_item_modifiers` has no recipe link; flagged as a known gap for a
  future item, not built here.
- No reversal on `canceled` — only `refunded` reverses stock. A
  paid-and-canceled order usually means the food was already made; a
  manual `waste`/`adjust` is the honest instrument if a venue wants that
  stock back.
- `record_order_payment_success`'s return signature is unchanged; neither
  `app/api/webhooks/stripe/route.ts` nor
  `app/api/counter/orders/[id]/route.ts` were touched.
