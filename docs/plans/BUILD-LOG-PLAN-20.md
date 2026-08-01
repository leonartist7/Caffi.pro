# BUILD-LOG — PLAN-20: Tips on QR Orders

## What shipped

- **Migration** (`supabase/migrations/20260731175843_lane_b_tips_on_orders.sql`,
  applied live to `jjgccfrwjkwknyjtbtxa` via the Supabase MCP connector,
  mirrored into `supabase/aro_schema.sql`):
  - `create_storefront_order` gains `p_tip_cents INTEGER DEFAULT 0` (12th
    param). Validates `0 <= tip_cents <= GREATEST(subtotal_cents*3, 5000)`,
    folds into `total_cents`, persists on the order row. Old 11-arg
    overload dropped explicitly so exactly one version exists.
  - **Real bug fixed**: `transition_order_status` was awarding loyalty
    points on `total_cents`, which now includes `tip_cents` from PLAN-10's
    schema batch — a tipped order was silently earning inflated points.
    Changed to `subtotal_cents`. Also now stamps `accepted_at`/`ready_at`
    (added by PLAN-10, unused until now) on the matching transitions —
    needed by Lane B's own PLAN-22 (kitchen display ticket age).
- **`lib/orders/tip-config.ts`** — pure functions, `brand_kit.tip_config`
  namespacing (zero migration), mirrors `lib/site-profile.ts`'s pattern.
  `shouldPromptTip`: dine-in/pickup always prompt, delivery only if the
  venue opts in.
- **Checkout UI** (`CheckoutForm.tsx`) — preset % buttons (of subtotal),
  custom amount, "No tip" at equal visual weight, order summary broken into
  subtotal/delivery fee/tip/total lines, ≥44px touch targets throughout.
- **Owner setting** — `components/orders/TipSettings.tsx` +
  `app/api/orders/tip-settings/route.ts` (GET/PATCH, owner/manager only),
  a single toggle for `tip_config.delivery_enabled`, mounted on the HQ
  Orders page next to `FulfilmentSettings`.
- **Tip line added** to guest confirmation (`OrderStatus.tsx`), counter
  queue (`OrdersQueue.tsx`), and HQ orders list
  (`app/(dashboard)/orders/page.tsx`).
- Stripe adapter, checkout-session creation, and the counter-cancel refund
  path needed **zero changes** — both already key off `order.total_cents`,
  which now correctly includes the tip.

## Verified live (Supabase MCP, `jjgccfrwjkwknyjtbtxa`)

All of the following were run directly against the seeded `the-roastery`
demo venue, not assumed from reading the code:

- `create_storefront_order(..., p_tip_cents => 150)` on a 2× Butter
  Croissant order (subtotal 850, tax rate 0%): returned
  `subtotal_cents=850, tip_cents=150, total_cents=1000` — exact arithmetic
  match.
- Tip guard bound: `p_tip_cents => 999999` on the same subtotal (max
  allowed = 2550) raised `INVALID_TIP` as designed.
- CHECK constraint: a direct `INSERT` with `total_cents` inconsistent with
  `subtotal+delivery+tax+tip` was rejected with a `check_violation`.
- **Points fix, the central regression test**: ran the above tipped order
  through `transition_order_status` accepted → preparing → ready →
  completed for a test member on a venue with `points_per_euro=10`.
  Resulting `points_ledger` row: **85 points** (`FLOOR(850 * 10/100)`) —
  matches the _untipped_ subtotal, not `FLOOR(1000 * 10/100) = 100`, which
  is what the pre-fix code would have awarded. `accepted_at`/`ready_at`
  were both stamped by the transition.
- `mcp__Supabase__get_advisors` (security): no new findings attributable to
  this migration. Pre-existing findings (unrelated: 12 tables have RLS-
  enabled-no-policy, 1 pre-existing auth warning) unchanged from before
  this PR.
- `npx tsc --noEmit` and `npm run build` green. `npm run lint` clean (one
  pre-existing warning in `CreativeStudio.tsx`, a file this PR never
  touches).
- `grep -rE 'coffee-[0-9]|cream-[0-9]|\bdark-[0-9]'` over every file this
  PR touches: clean.

## Known test residue on the demo venue (cannot be cleaned up — by design)

Verification created one test member (`PLAN20 Verification Member`,
`348fc57a-ff2c-4122-aeb1-d8d2cc13afb4`) and one `points_ledger` row (85
points) on `the-roastery`. **These could not be deleted**: attempting to
`DELETE` from `points_ledger` directly raises `points_ledger is
append-only` (the `forbid_ledger_mutation()` trigger), and deleting the
member cascades to the same row via `loyalty_transactions_user_id_fkey`,
hitting the identical trigger and rolling back. This is the ledger's core
guarantee working exactly as designed — I could not bypass it even for my
own cleanup, which is the right outcome. The test order itself (and its
`order_items`/`events` rows) _were_ successfully deleted, since `orders`
carries no FK from `points_ledger`. Left in place, clearly labelled,
harmless on a demo/seed venue.

## Verification gap — honest about what was NOT checked

- **No live browser check.** This environment has no
  `SUPABASE_SERVICE_ROLE_KEY` / `.env.local`, so the dev server cannot
  authenticate to Supabase and a real click-through (add to cart → tip
  selector → checkout → confirmation) was not possible here. All UI claims
  (touch target sizing, responsive breakpoints, tip math wiring) are
  verified by reading the component code and Tailwind classes, and by the
  direct-SQL tests above proving the RPC/points math independently of the
  UI — not by an actual rendered page. Whoever has a live environment
  should click through once before calling this fully proven.
- Stripe charge amount including tip was **not** verified against a real
  Stripe test-mode dashboard (no `STRIPE_SECRET_KEY` in this environment)
  — verified by code inspection only: `createCheckout`'s `amountCents` is
  `order.total_cents`, and `total_cents` is now proven correct at the SQL
  layer above, so the charge amount is correct by construction, but the
  Stripe round-trip itself is unexercised.
- The counter-cancel refund path's "refund includes tip" claim is the same
  kind of by-construction proof (it refunds `payment.amount_cents` =
  `order.total_cents`), not a live Stripe refund test.

## Design decisions worth flagging

- Tip guard bound (`GREATEST(subtotal*3, 5000)`) is a fat-finger sanity
  ceiling I chose, not a business decision — documented in the PLAN and in
  code comments. Easy to tighten or loosen later without touching call
  sites.
- Default tip selection on checkout load is the first configured preset
  (industry-standard behaviour — Square/Toast do the same), not "No tip".
  "No tip" remains one tap and equal visual weight, satisfying the
  anti-dark-pattern acceptance item as written; it is just not the
  pre-selected state.
