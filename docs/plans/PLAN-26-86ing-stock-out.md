# PLAN-26 — 86-ing / stock-out

Lane B, `MASTER-PLAN-v2R-remastered.md` §6. Design already resolved in
that doc (marked "done, this doc") — no architect-tier pass needed here,
unlike PLAN-24.

## Ground truth (verified live, `jjgccfrwjkwknyjtbtxa`, before writing code)

- `menu_items` has no availability-beyond-`is_active` column yet.
- `inventory_movements(item_id → inventory_items.item_id, qty NUMERIC,
reason, order_id, venue_id)` and `menu_item_ingredients(item_id →
menu_items.item_id, inventory_item_id → inventory_items.item_id,
qty_per_unit)` are live (PLAN-10 + PLAN-24's migrations, independent of
  those PRs' merge state).
- `create_storefront_order`'s existing catalog lookup already rejects an
  order line with `is_active = false` via `ITEM_UNAVAILABLE`, mapped to a
  friendly message client-side (`app/api/orders/route.ts`) and rendered
  inline in `CheckoutForm.tsx` (never a toast that silently disappears,
  never a route to payment). The 86-ing checkout rejection reuses this
  exact mechanism rather than inventing a parallel path.
- Branch-dependency gap (same shape PLAN-24 hit on PLAN-23): this branch
  is fresh off `origin/main`, and `app/kitchen/**` (PLAN-22) doesn't exist
  there yet — that PR is still unmerged. Kitchen has no menu-browsing
  surface today, only an order-ticket queue, so a "kitchen shows 86'd"
  affordance is deferred to a follow-up once PLAN-22 merges (see Non-goals).
  `app/counter/**`'s order queue (`components/counter/OrdersQueue.tsx`)
  _does_ exist on `main` and is Lane B's — that's where the counter-side
  86'd indicator actually lands in this PR.

## Design

- Two columns on `menu_items`: `is_86ed BOOLEAN DEFAULT false` (hidden
  right now) and `auto_86ed BOOLEAN DEFAULT false` (whether the _current_
  hidden state was set by the system, not a person). `CHECK (NOT
auto_86ed OR is_86ed)` — auto_86ed can't be true while is_86ed is false.
- **A manual decision always outranks an automatic one**: any owner/manager
  toggle sets `auto_86ed = false` regardless of direction. Automatic
  recompute only ever touches a row where `auto_86ed = true` (to 86 it
  further is a no-op; to restore it checks every linked ingredient is back
  above zero) or a row that is fully un-86'd (`is_86ed = false`) — it never
  overwrites a manually-86'd row.
- `recompute_menu_item_stock_status(p_menu_item_ids UUID[])`: for each menu
  item, true if it has _any_ linked ingredient whose on-hand
  (`SUM(inventory_movements.qty)`) is `<= 0`. Auto-86 if short and not
  already `is_86ed`; auto-restore if not short and `auto_86ed = true`.
  Emits `menu.item_86ed` / `menu.item_restored` (`actor = 'system'`) only
  on an actual transition, not on every call — idempotent, safe to call
  redundantly.
- Two triggers call it: `AFTER INSERT ON inventory_movements` (covers both
  a manual waste/adjust entry and an automatic sale depletion — both are
  just rows in this table, so one hook covers "within one order cycle" for
  the whole surface) and `AFTER INSERT OR UPDATE OR DELETE ON
menu_item_ingredients` (a newly-linked or unlinked ingredient changes an
  item's status immediately, not on the next unrelated movement).
- A one-time backfill recompute runs in the same migration so existing
  venues start in a correct state, not just newly-changed ones.
- Manual toggle: `POST /api/menu/items/[id]/toggle-86` (owner/manager),
  a dedicated action distinct from the general item-edit `PATCH` — 86-ing
  is a single-tap operational action, not a form field.
- Checkout rejection: `create_storefront_order`'s existing per-line
  catalog lookup gains `AND is_86ed = false` in the same `WHERE` it already
  checks `is_active = true`; on miss it now checks _why_ — still-active
  item that's specifically 86'd raises `'ITEM_86ED:' || name` (mirrors the
  existing `MODIFIER_SELECTION_INVALID:<name>` convention), everything
  else keeps raising the existing `ITEM_UNAVAILABLE`. Both map to a plain,
  non-blaming message in `app/api/orders/route.ts`, shown inline, never a
  silent cart mutation and never a charge attempt.

## Non-goals

- Kitchen-side 86'd indicator — `app/kitchen/**` doesn't exist on this
  branch (PLAN-22 unmerged); building it now means recreating an entire
  screen for one badge. Deferred, flagged in `STATUS.md`, straightforward
  to add once PLAN-22 merges.
- No change to `is_active` semantics or the existing `Hidden` badge on the
  dashboard menu grid — 86-ing is an operational, hopefully-temporary
  state, distinct from an owner permanently retiring an item.
- No UI for viewing _why_ something auto-86'd (which ingredient) beyond
  what the existing inventory pages already show — out of scope here.

## Acceptance (from the master plan, verbatim)

- [ ] An ingredient at or below zero marks every dependent menu item
      unavailable within one order cycle.
- [ ] Manual 86 hides the item from the storefront immediately and shows
      it as 86'd on counter (kitchen deferred — see Non-goals).
- [ ] Un-86 restores it; a restock movement crossing above zero
      auto-restores only items that were auto-86'd, never ones manually
      86'd.
- [ ] An 86'd item already in a guest's cart is rejected at checkout with
      a clear, warm message — never a silent removal, never a failed
      payment.
- [ ] Events emitted + labelled: `menu.item_86ed`, `menu.item_restored`.
- [ ] `aro` design bar. `npm run build` + `tsc --noEmit` green.
