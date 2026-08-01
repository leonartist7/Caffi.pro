# PLAN-23 — Inventory Foundation

> Executor: read `docs/plans/MASTER-PLAN-aro.md` FIRST (§4/§5 binding). Read
> `docs/plans/MASTER-PLAN-v2-operating-system.md` and
> `docs/plans/MASTER-PLAN-v2R-remastered.md` §5 (PLAN-10 schema) and §6 Lane
> B PLAN-23 before touching any file. Lane B owns this work exclusively.
> Branch: `sonnet/lane-b-plan23-inventory-foundation` off `origin/main`.
> Depends on: PLAN-10 (merged — `inventory_items`, `inventory_movements`,
> `menu_item_ingredients` all live with RLS + the append-only trigger
> already in place).

## Ground truth (verified 2026-07-31, live against `jjgccfrwjkwknyjtbtxa`)

- `inventory_items`, `inventory_movements` already exist with real RLS
  policies (`_venue_read`, `_manage_insert`/`_update`/`_delete` — owner/
  manager write, no anon grants) — **not** the "RLS enabled, no policy"
  state some other new tables are still in. PLAN-23 is consumer work on an
  already-correct schema.
- `inventory_movements` carries a real `BEFORE UPDATE OR DELETE` trigger
  (`inventory_movements_append_only`) — confirmed live, not just documented.
  No UPDATE/DELETE RLS policy exists either (defence in depth).
- `inventory_movements_venue_item_fk` is `ON DELETE RESTRICT` — the
  database itself refuses to delete an `inventory_items` row that has any
  movement history. A "delete item" action must handle this as an expected
  outcome (friendly message), not a bug.
- `reason` CHECK: `'receive' | 'count' | 'waste' | 'sale' | 'adjust'`.
  This PR's UI writes `receive`, `waste`, `count`, and `adjust`; `sale` is
  system-written by PLAN-24's depletion trigger, not built here.

## Non-goals

- Recipe linking (`menu_item_ingredients` CRUD) — that belongs to PLAN-24,
  which is the first consumer of the recipe link and needs it built
  alongside the depletion trigger it powers, not built speculatively here
  ahead of its actual use.
- Perpetual depletion itself (auto-decrement on `order.paid`) — PLAN-24.
- Food costing — PLAN-25.

## Design

- **On-hand is always derived**, never stored: `SUM(qty)` over
  `inventory_movements` grouped by `item_id`, computed server-side on every
  list request. Same doctrine as `member_balances`.
- **Sign convention**, applied server-side so the UI never has to reason
  about negative numbers for `receive`/`waste`:
  - `receive`: stored `qty = +abs(input)`.
  - `waste`: stored `qty = -abs(input)`.
  - `adjust`: stored `qty = input` as entered (a manual correction can go
    either direction).
  - `count`: the user enters the **observed physical total**, not a delta.
    The server computes `delta = counted_total - current_on_hand` and
    writes that delta as the movement's `qty`, with a `note` recording
    both numbers (`"Physical count: 42 (was 47)"`) — the reconciling delta
    is what's stored, but the history shows what actually happened.
- **Par level flag**: an item is "below par" when derived on-hand `<
par_level` (par_level nullable — no flag when unset).
- New owner-facing page at `app/(dashboard)/menu/inventory/page.tsx`
  (inside Lane B's existing `app/(dashboard)/menu/**` ownership — a static
  route, so it takes priority over the sibling `[slug]` dynamic route with
  no conflict). Nav entry appended to `lib/modules.ts` (append-only).

## Phases

1. `lib/inventory/types.ts` + `app/api/inventory/items/route.ts` (GET with
   derived on-hand + par flag, POST create) + `[id]/route.ts` (PATCH,
   DELETE with a friendly message on the expected RESTRICT case).
2. `app/api/inventory/movements/route.ts` (POST, all four sign
   conventions above).
3. `components/inventory/InventoryItemDialog.tsx` +
   `components/inventory/MovementDialog.tsx` + the page itself.
4. `lib/modules.ts` append; tenant-isolation test run live.

## ✅ Acceptance

- [ ] Receive, count, and waste each write exactly one movement row; on-hand recomputes correctly after each.
- [ ] `UPDATE`/`DELETE` on `inventory_movements` both raise, proven from the app path (attempt a raw call, not just cite the trigger).
- [ ] A physical count that disagrees with derived on-hand writes a reconciling delta and preserves both numbers in the note.
- [ ] Items below par level are visibly flagged.
- [ ] Cross-venue read denied (tenant-isolation test, run explicitly against live data).
- [ ] Design bar: inventory tables scroll in their own container at 375px; the page body does not. `aro` tokens only.
- [ ] `npm run build` + `tsc --noEmit` green.
