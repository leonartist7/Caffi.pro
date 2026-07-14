# Build log — Ordering Core

Tracks progress against `docs/plans/PLAN-01-ordering-core.md`. One section per
phase; no phase is marked live until its migration or runtime behavior has been
verified against the production project.

## Phase 1 — Schema: menu + orders + payments

- Added `20260714062310_ordering_core.sql`: fresh `venue_id`-scoped tables for
  menu categories/items, modifiers, QR tables, delivery zones, immutable order
  snapshots, and append-only payments. The order idempotency key is unique per
  venue; database totals must equal the component totals; tax is stored as a
  venue-level basis-points configuration.
- RLS is enabled on every new table in the same migration. Active menu and
  fulfilment configuration is publicly readable through explicit column grants;
  orders, line items, modifiers snapshots, and payments receive no browser-role
  grants or policies. Service-role grants are explicit because these tables are
  created after the baseline grant migration.
- The old `update_order_stats` / `award_order_loyalty_points` definitions were
  unattached and target an incompatible legacy order shape. The migration drops
  them with an explicit Phase-5 single-award-path comment, preventing a second
  loyalty-credit path when the new completion flow lands.
- Updated `supabase/aro_schema.sql` as the full paste-ready mirror. Review
  caught and repaired pre-existing mirror drift: the owner-stats volatile
  function fix had been listed in the header but its body was missing.
- Reconciled the live migration history from its earlier MCP-generated
  timestamps to the repository's canonical timestamps, then confirmed the CLI
  dry-run proposed only Ordering Core. Applied `20260714062310_ordering_core.sql`
  to `aro-platform` (`jjgccfrwjkwknyjtbtxa`).
- Live inspection caught two platform-default gaps and fixed them in tracked
  advisor follow-ups: `20260714075113_ordering_core_grant_hardening.sql`
  removes inherited browser CRUD grants and hardens future default privileges;
  `20260714075459_ordering_core_advisor_cleanup.sql` moves recursive RLS
  helpers behind the non-exposed `private` schema and optimizes `auth.uid()`.
- Verified live: all 26 public tables have RLS; public menu/config tables expose
  only their intended columns; orders, line items, and payments have no browser
  grants; payment reconciliation is service-role-only; every required table,
  column, constraint, index, and function exists. Database lint reports no
  schema errors and the performance advisor reports no warnings. The only
  remaining security warning is the project-level leaked-password-protection
  setting, not a schema issue.
- Added `supabase/tests/ordering_core_tests.sql`; its production-safe rolled-back
  transaction proves payment success, replay no-op, amount mismatch rejection,
  and zero persistent test data. Extended `npm run verify:live` to 11 checks;
  all pass against production.
- Verified locally: every migration is mirrored in order, the latest migration
  matches the consolidated-schema tail exactly, `git diff --check` passes,
  `npm run type-check` passes, and `npm run build` passes.

## Phase 2 — PaymentProvider abstraction + Stripe adapter

- Added a server-only `PaymentProvider` boundary with a Stripe Checkout
  adapter. `stripe` is pinned to `22.3.1`; no route or component imports the
  SDK directly.
- Added raw-body `/api/webhooks/stripe` verification. Checkout metadata carries
  the internal order and venue identifiers; the webhook compares the provider
  amount with the stored payment amount before calling the locked, service-only
  `record_order_payment_success` database function.
- Replay behavior is deliberate: an already-reconciled payment is a no-op,
  while an amount mismatch is marked failed and acknowledged for operator
  investigation rather than retried as a false success.
- Added and applied `20260714080519_ordering_payment_event_atomicity.sql` so
  payment success, order advancement, and the exactly-once `order.paid` event
  commit in the same locked transaction. The rolled-back production test now
  asserts one event after success and still one after webhook replay.
- Exercised the real Next.js webhook route with locally generated Stripe
  signatures: a valid signed unsupported event returns `200`/ignored, an
  invalid signature returns `400`, and a missing signature returns `400`.
- Confirmed the current Stripe Checkout documentation and current Supabase
  changelog before implementation. The live database reconciliation path and
  signed-webhook boundary are verified; only a Stripe-hosted Checkout payment
  remains deferred until owner-provided test credentials exist.

## Phase 3 — Menu management in HQ

- Added owner/manager-gated category, item, modifier-group, and modifier APIs.
  Row routes resolve their venue server-side, duplicate constraints return
  `409`, inputs are validated before writes, and every category/item mutation
  emits an activity event.
- Replaced the parked Menu screen with an aro-native management workspace:
  category filtering and CRUD, item search/grid and CRUD, active/hidden state,
  image URLs, dietary tags, display order, and modifier groups with min/max
  selection rules and priced options.
- Added shared integer-cents helpers. Operators enter decimal CAD amounts while
  the application stores cents; rendered prices use the monospace money style.
- Flipped the Menu module to `live` and redirected the obsolete `/menu/[slug]`
  placeholder to the canonical workspace.
- Negative-route testing found that the shared row authorization gate resolved
  rows with the service client before authenticating. The gate now returns
  `401` before any privileged lookup, preventing row-existence disclosure for
  all current and future ID-based APIs. The shared confirmation hook also now
  resolves canceled actions correctly.
- Verified locally: anonymous list/create/item/modifier requests are rejected;
  `npm run type-check`, `npm run lint:strict`, `npm run build`, and
  `git diff --check` pass. Re-ran the 11-check production Supabase verifier;
  all checks pass and no credentials were written to disk.

## Phase 4 — Guest storefront, atomic checkout, and QR dine-in

- Revived `/shop/[slug]` as a guest-first aro storefront with server-loaded
  catalog data, per-venue local carts, integer-cent pricing, modifier selection
  rules, pickup/table/delivery checkout, and device-local recent order links.
- Replaced the legacy login-required/browser-write ordering stack and removed
  its unused floating-point cart, dead table queries, and obsolete components.
  Login, signup, profile, and rewards routes now return to the storefront.
- Added and applied `20260714100000_storefront_order_creation.sql`. The locked,
  service-role-only function reprices live items and modifiers, validates every
  modifier group, table token, delivery zone, postal prefix, and minimum, then
  writes the order, immutable line snapshots, and `order.placed` event in one
  transaction. Client UUID replay returns the existing order.
- Added the public checkout route behind the provider abstraction. It reuses a
  pending Checkout URL on replay, records the pending payment server-side, and
  exposes a clear `STUBBED` state when Stripe owner credentials are absent.
- Added bearer-reference order status polling with only status, first name,
  fulfilment type, total, and timestamp returned; no contact/address data is
  exposed. `/t/[token]` resolves active table QR codes and pins dine-in checkout.
- Verified live that anonymous callers cannot execute the order-creation RPC,
  while service role can reach the function. The 11-check production verifier,
  strict lint, type-check, production build, and final browser-query grep pass.
