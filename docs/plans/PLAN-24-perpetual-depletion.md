# PLAN-24 — Perpetual Depletion

> Executor: read `docs/plans/MASTER-PLAN-aro.md` FIRST (§4/§5 binding). Read
> `docs/plans/MASTER-PLAN-v2-operating-system.md` and
> `docs/plans/MASTER-PLAN-v2R-remastered.md` §6 Lane B PLAN-24 before
> touching any file. Lane B owns this work exclusively. Branch:
> `sonnet/lane-b-plan24-perpetual-depletion` off `origin/main`. Depends on:
> PLAN-23 (merged in spirit — schema live; PR pending merge).
>
> **Idempotency design authored by an Opus-5 architect pass** (per the
> master plan's binding doctrine: "a double-decrement is silent and
> unrecoverable — Fable designs the guarantee," and this is the one item
> in Lane B's batch the master plan does NOT mark "(done, this doc)").
> This spec transcribes that design; the full architect rationale for
> every decision below lives in the PR description and is not repeated
> here in full.

## Ground truth (verified live, 2026-07-31, `jjgccfrwjkwknyjtbtxa`)

- **`transition_order_status`'s live definition has drifted from any
  migration file currently on `main`.** It already carries PLAN-22's
  `accepted_at`/`ready_at` stamping and PLAN-20's `subtotal_cents`-only
  points fix — both applied live by this same Lane B session in prior
  PRs (#61, #62) that have not yet merged. `record_order_payment_success`
  is **not** drifted — its live body matches
  `20260714080519_ordering_payment_event_atomicity.sql` byte for byte.
  Both were re-confirmed via `pg_get_functiondef` immediately before
  writing this migration — **the migration below embeds the exact live
  bodies**, not the stale versions in older migration files, to avoid
  silently regressing PLAN-20/22 when this eventually merges.
- `menu_item_ingredients` has zero rows and no CRUD UI yet — building it
  is in scope here (PLAN-24 is its first and only consumer).
- `inventory_movements_reason_check` CHECK currently allows
  `'receive','count','waste','sale','adjust'` — widened here, additively,
  to add `'sale_reversal'` (machine-written only, never exposed through
  the manual movements API).
- `supabase/aro_schema.sql`'s header comment lists migrations only through
  `20260714080519`, but its **content** already includes PLAN-10/11's
  batch migration (verified: `inventory_items`/`inventory_movements`/
  `menu_item_ingredients` table definitions are present). The header is
  stale documentation, not a signal the file is abandoned — it is mirrored
  here per house convention, same as every prior Lane B PR.

## Non-goals

- Modifier-driven depletion (an "extra shot" consuming beans) —
  `order_item_modifiers` has no recipe link. Flagged as a known gap.
- Retry/backfill tooling for a failed depletion — `deplete_order_stock`
  is idempotent and re-runnable by hand; no UI/cron here.
- Reversal on `canceled` (only `refunded` reverses) — a paid-and-canceled
  order usually means the food was already made; silently restocking it
  would overstate on-hand. A manual `waste`/`adjust` is the honest
  instrument if a venue wants that stock back.
- Changing `record_order_payment_success`'s return signature or touching
  `app/api/webhooks/stripe/route.ts` / `app/api/counter/orders/[id]/route.ts`
  at all — both call sites are unchanged files in this PR.
- Costing (PLAN-25) and 86-ing (PLAN-26) — `cost_per_unit_cents` is not
  read here.

## Design (decided, not open questions — see PR body for full rationale)

1. **Trigger point**: a new function `deplete_order_stock(order_id)`,
   called via `PERFORM` from inside `record_order_payment_success`,
   wrapped in a PL/pgSQL `BEGIN … EXCEPTION WHEN OTHERS` block. That block
   is an implicit savepoint — a depletion failure rolls back only the
   stock movements; the payment/order/event work that already ran before
   it stays committed. The failure-logging insert is itself
   double-guarded so it can never be the thing that reverses a sale.
2. **Idempotency key**: `UNIQUE(order_id, item_id) WHERE order_id IS NOT
NULL AND reason = 'sale'` — **not** a mirror of
   `uq_points_ledger_order_award`'s single-row-per-order shape, because one
   order can deplete N different inventory items. The depletion query
   `GROUP BY inventory_item_id` and sums across every order line first, so
   one order writes exactly one `'sale'` row per inventory item touched —
   the index and the aggregation are a matched pair; either alone is
   wrong.
3. **Refund reversal**: a new `'sale_reversal'` reason (CHECK widened,
   additive). Computed by **negating the stored `'sale'` rows**, never
   re-derived from the current recipe (which may have changed since the
   sale). Fires only on `→ refunded`, inside the same guarded-block
   pattern in `transition_order_status`.
4. **Recipe CRUD**: in scope, same PR — `menu_item_ingredients` is
   otherwise untestable. Tenant coherence is already a DB guarantee (both
   composite FKs make a cross-venue link physically unrepresentable); the
   app layer's only job is to never take `venue_id` from the request body.
5. **Negative on-hand**: no DB-layer guard exists or is added (on-hand is
   derived, never stored — nothing to constrain). "Flagged, not blocked"
   is a presentation-only "Oversold" pill on the inventory page,
   independent of the existing `below_par` flag (which is `false`, not
   true, when `par_level IS NULL` — folding the two would leave a
   par-less item silently oversold with no signal).

## Phases

1. Migration: widen the CHECK, add both partial unique indexes,
   `deplete_order_stock`, `reverse_order_stock_depletion`, `CREATE OR
REPLACE` both call-site functions with their exact live bodies plus the
   new guarded blocks. Apply live via Supabase MCP; mirror into
   `supabase/aro_schema.sql`.
2. Recipe-link CRUD: `app/api/menu/items/[id]/ingredients/route.ts` (GET,
   POST) + `app/api/menu/ingredients/[id]/route.ts` (PATCH, DELETE),
   mirroring the existing modifier-groups route pattern exactly.
3. UI: `components/menu/RecipeDialog.tsx`, opened from a new icon button
   on each menu item card in `app/(dashboard)/menu/page.tsx`. Does **not**
   extend `ItemDialog`'s draft-and-sync machinery — each add/edit/remove
   calls its route immediately.
4. "Oversold" pill on `app/(dashboard)/menu/inventory/page.tsx`.
5. `supabase/tests/depletion_tests.sql` (transactional, rolls back,
   mirrors `ordering_core_tests.sql`'s harness) covering all six
   acceptance criteria plus the aggregation and cross-venue cases.

## ✅ Acceptance

- [ ] A paid order decrements each linked ingredient by `qty_per_unit × quantity`.
- [ ] Replaying the same `order.paid` webhook three times decrements exactly once.
- [ ] A refunded order writes a compensating movement; it does not delete the original.
- [ ] An item with no recipe link decrements nothing and does not error.
- [ ] Depletion failure never blocks or reverses the order — logs, emits `inventory.depletion_failed`, the sale stands. Proven by forcing a real failure inside the transaction, not just cited.
- [ ] Negative on-hand is permitted and flagged (an "Oversold" pill), not blocked.
- [ ] An order with two lines sharing one ingredient writes one summed movement row, not two (the case that breaks a naive single-order-id unique index).
- [ ] Cross-venue recipe link rejected at the DB layer.
- [ ] `npm run build` + `tsc --noEmit` green.
