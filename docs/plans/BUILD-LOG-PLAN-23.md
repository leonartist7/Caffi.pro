# BUILD-LOG — PLAN-23: Inventory Foundation

## What shipped

- **`lib/inventory/types.ts`** — `InventoryItem`, `InventoryItemWithStock`
  (item + derived `on_hand` + `below_par`), `InventoryMovement`, unit/reason
  enums matching the live CHECK constraints exactly.
- **`app/api/inventory/items/route.ts`** (GET list with derived on-hand +
  below-par flag, POST create) and **`[id]/route.ts`** (PATCH, DELETE).
  On-hand is computed server-side as `SUM(qty)` over every movement for
  the venue — never stored, same doctrine as `member_balances`.
- **`app/api/inventory/movements/route.ts`** — the sign-convention logic:
  `receive`/`waste` take a positive user-entered amount and sign it
  server-side; `adjust` passes through as entered; `count` takes the
  **observed physical total**, derives current on-hand itself, and stores
  the reconciling delta with a note recording both numbers.
- **UI**: `components/inventory/InventoryItemDialog.tsx`,
  `components/inventory/MovementDialog.tsx`, and the page itself at
  `app/(dashboard)/menu/inventory/page.tsx` (a static route under Lane B's
  existing `app/(dashboard)/menu/**`, so it takes priority over the
  sibling `[slug]` dynamic route with zero conflict). Nav entry appended
  to `lib/modules.ts`; new event types (`inventory.item_created/updated/
deleted`, `inventory.movement_recorded`) appended to `lib/events.ts`.
- **Delete handling**: `inventory_movements_venue_item_fk` is `ON DELETE
RESTRICT` (verified live) — deleting an item with movement history fails
  at the database with `23503`. The route catches that specific code and
  returns a friendly "mark it inactive instead" message rather than a raw 500.

## Verified live (Supabase MCP, `jjgccfrwjkwknyjtbtxa`)

All against a disposable test item on the seeded `the-roastery` venue,
exercising the exact arithmetic the API routes implement:

- `receive 10` → `waste -2` → on-hand derives to **8** (`SUM(qty)`
  matches the receive/waste sign convention exactly).
- `count`: with on-hand at 8, simulating a physical count of 6 computes
  `delta = 6 - 8 = -2`; after inserting that delta, on-hand derives to
  **6** — exactly the counted number, proving the reconciling-delta math
  is correct, not just plausible.
- A further `waste -2` drops on-hand to **4**, below the test item's
  `par_level = 5` — the `below_par` flag's condition (`on_hand <
par_level`) is correct at the boundary.
- **Append-only, proven from a real attempt, not cited from the migration
  file**: both an `UPDATE` and a `DELETE` against a real movement row
  raised `points_ledger`-style append-only errors (via
  `forbid_ledger_mutation`-equivalent trigger `inventory_movements_append_only`).
- **RESTRICT, proven from a real attempt**: `DELETE FROM inventory_items`
  on the test item (which has movement history) raised
  `foreign_key_violation` (`23503`) — exactly the code the API route
  branches on for its friendly message.
- `npx tsc --noEmit`, `npm run build`, `npm run lint` all green (`.next`
  cache cleared first). `grep -rE 'coffee-[0-9]|cream-[0-9]|\bdark-[0-9]'`
  clean on every touched file.
- No migration in this PR — `inventory_items`/`inventory_movements`
  schema, RLS policies, and the append-only trigger were all already live
  from PLAN-10. `get_advisors` was not re-run since no DDL changed.

## Known test residue (cannot be fully cleaned up — by design)

The disposable test item (`PLAN23 Verification Milk`) and its four
movement rows remain on the demo `the-roastery` venue. The movements
cannot be deleted (append-only, confirmed above), and the append-only
guarantee transitively blocks deleting the item too (`RESTRICT` FK) — the
same shape of residue as PLAN-20's points-ledger test row. Marked the item
`is_active = false` and renamed it to `"PLAN23 Verification Milk (test,
inactive)"` so it's unambiguous and stays out of any normal stock view.

## Verification gap — honest about what was NOT checked

- **No live browser check.** Same environment gap as PLAN-20/22: no
  `SUPABASE_SERVICE_ROLE_KEY`/`.env.local`, so the actual page, dialogs,
  and click-through (create item → receive → waste → count → below-par
  badge appearing) were **not exercised in a browser** — only the
  underlying SQL arithmetic was verified directly, and the UI was verified
  by code reading against the existing menu-page pattern it mirrors.
- Tenant isolation was verified at the RLS/schema level (PLAN-10's
  policies, confirmed present) but not via a live cross-venue API call
  attempt in this session — no second authenticated session available
  here to attempt it end-to-end.
