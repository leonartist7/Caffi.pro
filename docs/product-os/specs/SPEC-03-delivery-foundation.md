---
id: SPEC-03
title: Delivery lifecycle, simulator and restaurant drivers
status: review
updated: 2026-09-22
tags: [product-os, execution-packet]
---

# SPEC-03: Delivery lifecycle, simulator and restaurant drivers

Back to [worker protocol](../WORKER-PROTOCOL.md), [ledger](../EXECUTION-LEDGER.md) and [roadmap](../ROADMAP.md).

## Objective and scope
Implement DELIVERY-ARCHITECTURE.md in a sequence of reviewed commits: types/state machine and simulator; local migrations/RLS/outbox; quote/order integration; worker and webhook inbox; owner exceptions, guest timeline and own-driver task. Implement explicit staff dispatch after verified payment and restaurant acceptance.

**Non-goals:** No paid courier call, continuous GPS, automatic cross-provider failover, production migration or default-on auto-dispatch.

## Ownership and constraints
**Owned modules:** New lib/delivery, app/api/delivery and app/api/deliveries routes, delivery webhook routes, delivery UI, local migrations/tests. Only touch app/api/orders under an agreed handoff from SPEC-02.

Use the specified provider interface and separate payment/preparation/delivery state. Durable outbox with leases; unknown result forces reconciliation. Composite tenant/resource relationships and one active/unknown dispatch per order. Credentials referenced server-side. Simulator network access disabled.

## Acceptance and test plan

The [concrete contract packet](SPEC-03-contract-review.md) must receive independent Astra ultra approval before shared contract implementation. Stable slice IDs:

| ID | Acceptance |
|---|---|
| SPEC-03-AC-01 | Tenant-scoped persistence, composite relationships and service-only grants |
| SPEC-03-AC-02 | Server-only provider interface with explicit unknown outcomes |
| SPEC-03-AC-03 | Bound, expiring, server-priced quotes and atomic checkout consumption |
| SPEC-03-AC-04 | Payment/acceptance prerequisites and one booking per order |
| SPEC-03-AC-05 | Durable leases, retries, cancellation and reconciliation |
| SPEC-03-AC-06 | Deterministic network-disabled simulator with failure scenarios |
| SPEC-03-AC-07 | Authorized staff queue, exceptions and recovery actions |
| SPEC-03-AC-08 | Explicit driver capability, assignment and authorized milestones |
| SPEC-03-AC-09 | Scoped guest timeline and honest tracking accuracy |
Quote is bound to server-priced cart/address/venue and expiry; duplicate dispatch requests return the same job. Timeout-after-create never causes a second courier. Verified events cannot cross tenants or regress terminal status. Authorized driver assignment and pickup/delivery milestones work without granting manager powers. Guest page shows honest status without exposing staff/PII data.

**Tests:** Pure transition tests, concurrent dispatch SQL tests, expired/changed quote tests, forged/replayed/out-of-order webhook tests, worker crash and lease expiry tests, cancellation races, driver revocation and scoped guest tracking tests; Playwright quote→paid fixture→accepted→dispatch→delivered.

## Dependencies, risk and release gate
**Dependencies:** SPEC-01 auth/tests and SPEC-02 payment/acceptance contract. No external credentials required. Schema owner serializes migrations.

**Risks:** Duplicate paid booking, quote changes after payment, outbox acknowledgement loss, guest IDOR and courier status conflicting with restaurant cancellation.

**Release gate:** Local full journey plus SQL/RLS pass; independent Astra ultra contract approval and Astra xhigh implementation review; simulator enabled only for synthetic venues. Live state remains blocked.

**Lead:** GPT-5.6 Terra high. Sensitive changes require independent GPT-6 Astra xhigh review. Bounded non-sensitive subwork may use Sol high or Luna medium–high under the worker protocol.

## Ready-to-paste worker prompt
> Implement SPEC-03 using DELIVERY-ARCHITECTURE.md as the contract. Begin with deterministic simulator and state-machine tests, then durable persistence and scoped routes. Demonstrate timeout-after-create reconciliation and two-tenant denial before UI completion. Do not wire live courier credentials or apply remote migrations. Update ledger and publish a draft PR with full simulator journey evidence.

## Acceptance evidence mapping

The [dated handoff](../handoffs/HANDOFF-2026-09-22-spec-03.md) preserves each failed run and resolution. All eight SQL suites pass in disposable Ubuntu/PostgreSQL CI at 47b8573 and 721dfb3. The latter also passes the real authenticated webhook/API/inbox/owner-driver visibility browser journey and local Auth test. Full checkout-to-delivery browser journeys subsequently pass in [CI 35777014123](https://github.com/leonartist7/Caffi.pro/actions/runs/35777014123) at `3b07268948e04e79dfaddf45df3e83c7c32eb25c`; the executed browser/API/database evidence closes these synthetic journey checks.

| Acceptance | Executed evidence / remaining check |
|---|---|
| AC-01 | SQL public grant denial, tenant relationships and cross-tenant references; unit scope/projection boundaries pass |
| AC-02 | Unit unknown outcomes/signatures and real browser webhook authentication, durable inbox and replay pass |
| AC-03 | SQL invalid/out-of-area, expired/changed quotes, immutable replay and versioned refresh; four route tip-replay tests pass; full checkout browser passes |
| AC-04 | SQL payment/acceptance and stable booking keys pass; concurrent HTTP dispatch browser passes with one persisted booking |
| AC-05 | SQL fenced leases, lost completion, unknown send, cancellation retry/races and operator recovery pass |
| AC-06 | SQL deterministic rejection/unavailable/timeout/cancellation/failure and pure provider tests pass |
| AC-07 | Manager quarantine browser isolation passes; staff dispatch and own-driver journey passes (exception recovery also covered by SQL) |
| AC-08 | SQL capability/assignment/revocation plus driver mutation projection unit pass; browser pickup/delivery journey passes |
| AC-09 | Minimal guest/driver projections pass unit checks; final guest delivered browser assertions pass |

Sources: [delivery SQL](../../../supabase/tests/spec03_delivery_tests.sql), [unit safeguards](../../../tests/spec-03-delivery.test.ts), [tip replay](../../../tests/spec-03-checkout-tip-replay.test.ts), [queue access](../../../tests/spec-03-queue-access.test.ts), [driver response](../../../tests/spec-03-driver-response.test.ts), [browser/API/database journeys](../../../tests/e2e/delivery-journey.spec.ts). Independent [Astra xhigh approval](../evidence/SPEC-03-IMPLEMENTATION-REVIEW-2026-09-22.md) is static evidence. Provider sandbox and live results remain absent.
