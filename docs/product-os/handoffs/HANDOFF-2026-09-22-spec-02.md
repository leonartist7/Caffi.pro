---
id: handoff-2026-09-22-spec-02
title: Handoff: SPEC-02 connected ordering journey
status: review
updated: 2026-09-22
tags: [product-os, handoff, spec-02]
---

# Handoff: SPEC-02 connected ordering journey

Back to [SPEC-02](../specs/SPEC-02-connected-sales-journey.md), [execution ledger](../EXECUTION-LEDGER.md), [DEC-005](../decisions/DEC-005-synthetic-payment-and-guest-tracking.md) and [delivery contract](../DELIVERY-ARCHITECTURE.md).

## Dependency and ownership

- Base dependency: unmerged Phase 1 implementation at `c1b51d998eec961b00830d17bb5662737d4d5366`, draft PR [#84](https://github.com/leonartist7/Caffi.pro/pull/84). Phase 1 application checks passed, but its production dependency audit fails and its review found an OpenCode supply-chain issue; do not treat Phase 1 gates as closed.
- Branch: `codex/phase-02-connected-ordering`.
- Owned paths: storefront checkout/status, payment adapters/webhook, counter/kitchen authorization and recovery UI, local migration/fixtures/SQL suites, SPEC-02 evidence.
- No shared delivery job, courier adapter, dispatch route or live service was created. Delivery selection remains a restaurant fulfillment choice only.

## Implemented contract

- Checkout passes `order:<order-id>:checkout` to Stripe as its provider idempotency key and recovers an existing stored checkout URL before starting another provider operation.
- A network-disabled `test` adapter is reachable only with both explicit local synthetic flags. It completes a test payment through the existing reconciliation RPC; it accepts no card data and is not provider sandbox verification.
- New orders receive a server-generated guest tracking token. Guest status requires both order ID and that token; confirmation URLs carry the scoped token for recovery after a browser interruption.
- Kitchen/counter reads and updates re-check active membership and the cookie venue on every request. A revoked cookie receives 403; another venue's order ID receives no data.
- The guest storefront displays configured ordering hours; checkout refuses a closed venue. Kitchen updates preserve the ticket and show a retryable error/reload state.
- Resettable local fixtures now include two tenant boundaries, valid/inactive modifiers, an 86'd item, QR tables, delivery zone, active/revoked counter staff and deterministic hours. The new SQL suite rolls back all writes.

## Acceptance-to-evidence map

| Acceptance ID | Evidence | Environment / status |
|---|---|---|
| SPEC-02-AC-01 | `tests/spec-02-payment-and-access.test.ts` opening-hours cases; storefront and checkout use mobile-sized controls and keyboard-native form controls. | Mocked Node/Vitest; browser test not run. |
| SPEC-02-AC-02 | `supabase/tests/spec02_connected_journey_tests.sql` asserts server modifier pricing, inactive modifier rejection and cross-tenant item rejection; `tests/spec-02-routes.test.ts` exercises scoped guest lookup. | SQL not run: local Supabase CLI/Docker/psql absent. Route tests mocked. |
| SPEC-02-AC-03 | Same Vitest suite asserts stable Stripe idempotency key, explicit test-provider flags and persisted checkout recovery. | Mocked Node/Vitest; no Stripe sandbox account. |
| SPEC-02-AC-04 | Payment-event contract tests cover success replay, order/amount mismatch and out-of-order failure/refund reconciliation. Webhook verifies raw Stripe signatures in existing adapter. | Mocked Node/Vitest; no provider sandbox. |
| SPEC-02-AC-05 | Revoked counter membership and cross-tenant counter-order route tests pass. | Mocked Node/Vitest; local RLS replay blocked. |
| SPEC-02-AC-06 | Scoped status route test passes; status UI retains retrying feedback after a network refresh failure. | Mocked Node/Vitest; Playwright end-to-end blocked by local fixture/browser setup. |
| SPEC-02-AC-07 | `supabase/seed.sql` and `spec02_connected_journey_tests.sql` added; `db:reset` and `test:db` reject missing/nonlocal setup. | Fixture execution blocked locally; no hosted database touched. |

## Checks, limits and blockers

- Passed locally: `npm run type-check`, `npm run lint:strict`, `npm run test:unit` (27 tests), `node docs/product-os/check.mjs`, and `git diff --check`. GitHub Actions run `35697491599` also passed type, strict lint, unit, docs, and the isolated build on this commit.
- The first isolated build failed only because the restricted local sandbox could not fetch the app's configured public Google Fonts. The same isolated build completed after approved network access. It emitted the existing Supabase Edge Runtime and Sentry deprecation warnings; no build error remained.
- `npm run db:reset` is blocked because Supabase CLI/Docker are absent. `npm run test:db` is blocked because `SUPABASE_TEST_DATABASE_URL` is unset (and would then require `psql`). Browser tests are not run because no disposable database/browser environment is available.
- Provider sandbox, live payment, live database, courier, deployment and customer-message checks are not run. No external side effect was initiated.
- The Phase 1 dependency remains unmerged with a failing critical dependency audit and a blocking mutable OpenCode action supply-chain finding. It must be reconciled before Phase 2 is rebased to main.
- The same CI run's production dependency audit remains failed on the existing critical Next.js advisory; checks were not weakened to hide it.
- An independent Astra xhigh static review found and drove fixes for payment concurrency, terminal-state, refund-binding, tenant isolation and fixture SQL defects. Its final late-success quarantine finding was corrected after that pass; one more independent confirmation and local migration replay are required before these gates can close.

## Migration, rollback and exact next action

Apply `20260921090000_spec02_guest_tracking.sql` before code that requires tracking tokens. It adds a nullable-backfilled-then-required UUID with a default and a server-only lookup function; it does not modify historical orders beyond assigning a token. Roll back application code by disabling the new routes/UI and reverting the migration only through a reviewed forward migration; do not delete payment/order history or tokens. The synthetic adapter is disabled by removing either explicit flag.

**Exact next action:** obtain a final independent confirmation of the late-success payment quarantine, then start a disposable local Supabase stack, run `npm run db:reset` and `npm run test:db`, and add Playwright guest → test-payment → kitchen → guest status coverage. Hand the accepted/ready `order` and separate `payment` contracts to SPEC-03 so it can add an explicit staff dispatch action and delivery job lifecycle without treating delivery selection as a courier booking.
