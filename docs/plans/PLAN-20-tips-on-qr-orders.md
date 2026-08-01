# PLAN-20 — Tips on QR Orders

> Executor: read `docs/plans/MASTER-PLAN-aro.md` FIRST (§4/§5 binding). Read
> `docs/plans/MASTER-PLAN-v2-operating-system.md` and
> `docs/plans/MASTER-PLAN-v2R-remastered.md` §5 (PLAN-10 schema) and §6 Lane
> B PLAN-20 before touching any file — this document is the lean spec those
> sections require, not a replacement for them. Lane B owns this work
> exclusively. Branch: `sonnet/lane-b-plan20-tips` off `origin/main`.
> Depends on: PLAN-10 (merged — `orders.tip_cents`, `orders.accepted_at`,
> `orders.ready_at`, and the widened total CHECK are already live).

## Ground truth (verified 2026-07-31)

- `orders.tip_cents INTEGER NOT NULL DEFAULT 0 CHECK (tip_cents >= 0)` and
  the CHECK `total_cents = subtotal_cents + delivery_fee_cents + tax_cents +
  tip_cents` are **already applied live** on `aro-platform`
  (`20260730040643_batch_schema_lanes_abc.sql`, confirmed via
  `information_schema.columns` and `pg_constraint`). PLAN-20 does not
  re-migrate this — it is consumer work on top of an existing column.
- `create_storefront_order` (`supabase/migrations/20260714100000_storefront_order_creation.sql`)
  computes `v_total := v_subtotal + v_delivery_fee + v_tax` with no tip
  parameter at all. It must gain a `p_tip_cents` argument, validate it, and
  fold it into the insert and the total.
- **Real bug found, must fix as part of this PR**:
  `transition_order_status` (`supabase/migrations/20260714110000_order_operations.sql:38`)
  awards loyalty points as `FLOOR(v_order.total_cents * v_rate / 100.0)`.
  Now that `total_cents` includes `tip_cents`, this silently inflates points
  on every tipped order — exactly the "slow, invisible leak in the loyalty
  economy" `MASTER-PLAN-v2R` §6 PLAN-20 warns against. Must become
  `FLOOR(v_order.subtotal_cents * v_rate / 100.0)`.
- `lib/payments/adapters/stripe.ts` charges `input.amountCents`, which the
  order route already sets to `order.total_cents` — once `total_cents`
  correctly includes the tip, the Stripe charge amount is correct with
  **zero adapter changes**.
- The counter-cancel refund path (`app/api/counter/orders/[id]/route.ts`)
  already refunds `payment.amount_cents` (= `order.total_cents`) as a new,
  negative, append-only `payments` row. Once `total_cents` includes the
  tip, refunds already refund the full amount including tip with **zero
  changes to that route**. (The Stripe-webhook-initiated refund path is a
  separate, pre-existing, explicitly-deferred gap — `app/api/webhooks/stripe/route.ts`
  returns `{ deferred: 'refund reconciliation' }` for `charge.refunded`
  today, unrelated to tips and out of scope here.)
- `venues.brand_kit JSONB` already exists and already carries a
  precedent namespaced-JSONB config pattern (`lib/site-profile.ts`'s
  `brand_kit.site_profile`). Tip settings reuse this pattern as
  `brand_kit.tip_config` — **zero migration** for venue-level config.
- Order display surfaces that need a tip line, all already reading
  `orders.*` or specific columns: `components/storefront/OrderStatus.tsx`
  + `app/api/orders/[id]/status/route.ts` (guest confirmation),
  `components/counter/OrdersQueue.tsx` + `app/api/counter/orders/route.ts`
  (`select('*')`, already returns `tip_cents`, only the TS interface + JSX
  need it), `app/(dashboard)/orders/page.tsx` + `app/api/orders/route.ts`
  GET (HQ view, column list needs `tip_cents` added).

## Non-goals

- Re-running or altering PLAN-10's migration. That schema is done.
- Tip payout / distribution to staff — that is Lane C's PLAN-36
  (tip allocation report), gated on this PR landing.
- Stripe-initiated refund webhook reconciliation — pre-existing gap,
  unrelated to tips, not touched here.
- A Google/vendor review-URL lookup or the review prompt itself — PLAN-21.

## Design

**Tip config** (`lib/orders/tip-config.ts`, pure functions, no Supabase
import, mirrors `lib/site-profile.ts`):

```ts
interface TipConfig {
  delivery_enabled: boolean // delivery defaults OFF; dine_in/pickup always prompt
  presets_pct: number[] // percentages of subtotal, e.g. [15, 18, 20]
}
```

Stored at `brand_kit.tip_config`. `shouldPromptTip(orderType, config)` is the
single source of truth both the checkout UI and (defensively) the server
consult.

**Guard bound on tip amount** — a sanity ceiling, not a business decision:
`0 <= tip_cents <= GREATEST(subtotal_cents * 3, 5000)`. Generous enough for
a genuine 100%+ tip, tight enough to catch a fat-fingered dollars-as-cents
entry. Enforced in the SQL function (source of truth) and mirrored
client-side for a friendly inline message instead of a round-trip error.

**RPC change** — `create_storefront_order` gains `p_tip_cents INTEGER
DEFAULT 0` as its 12th parameter (Postgres `CREATE OR REPLACE FUNCTION`
allows appending a defaulted parameter without breaking the existing
signature). Tip is validated after `v_subtotal` is known, inserted into
`orders.tip_cents`, and folds into `v_total`. The idempotent-replay branch
(existing `client_uuid` match) returns the already-stored `tip_cents`
unchanged — a tip cannot be added or changed by replaying order creation.

**Checkout UI** — preset percentage buttons (of subtotal only, never of
total-with-delivery-fee), a custom-amount field, and a "No tip" option
rendered with the same visual weight as the presets (no shaming). Hidden
entirely for delivery orders unless the venue's `tip_config.delivery_enabled`
is true. The order summary breaks out subtotal / delivery fee / tax / tip /
total as separate lines once a tip is selected.

**Owner setting** — a small "Tips" card in `components/orders/FulfilmentSettings.tsx`'s
neighborhood (own file, `components/orders/TipSettings.tsx`) with a single
toggle for `delivery_enabled`, backed by `app/api/orders/tip-settings/route.ts`
(GET/PATCH, owner/manager only, same `requireVenueRole` pattern as
`/api/fulfilment`).

## Phases

1. Migration: fix `transition_order_status` points bug; add `p_tip_cents`
   to `create_storefront_order`; mirror into `supabase/aro_schema.sql`.
   Apply via Supabase MCP, `get_advisors` clean.
2. `lib/orders/tip-config.ts` + `lib/money.ts`-based cents math (no new
   dependency).
3. Checkout UI (`CheckoutForm.tsx`), order route (`app/api/orders/route.ts`),
   checkout page fetching tip config.
4. Owner tip settings card + API route.
5. Tip line on guest confirmation, counter queue, HQ orders list.
6. `scripts/verify-live.mjs` — no new table, no new check required by this
   PLAN's own acceptance list; skipped.

## ✅ Acceptance

- [ ] A tipped order's `total_cents` equals `subtotal + delivery_fee + tax + tip`, enforced by the DB CHECK, proven by attempting an inconsistent insert (it must fail).
- [ ] Tax is computed on subtotal and is byte-identical with and without a tip.
- [ ] Points accrued on a tipped order equal points on the identical untipped order (regression test for the bug found above).
- [ ] The Stripe charge amount equals `total_cents` including tip.
- [ ] A refund refunds the full amount including tip, as a new `payments` row (already true via the counter-cancel path once `total_cents` is correct).
- [ ] "No tip" is one tap, visually equal in weight to the presets, and completes checkout with `tip_cents = 0`.
- [ ] Tip appears as its own line on the order confirmation, the counter order detail, and the HQ order view.
- [ ] With Stripe unkeyed, the tip UI still renders and the STUBBED badge behaviour is unchanged.
- [ ] Design bar: `aro` tokens only, ≥ 44px touch targets on the tip selector, 375/768/1280 verified, no horizontal scroll.
- [ ] `npm run build` + `tsc --noEmit` green.
