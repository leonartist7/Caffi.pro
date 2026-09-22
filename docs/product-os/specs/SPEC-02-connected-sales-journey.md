---
id: SPEC-02
title: Connected sales journey and payment recovery
status: active-spec
updated: 2026-09-22
tags: [product-os, execution-packet]
---

# SPEC-02: Connected sales journey and payment recovery

Back to [worker protocol](../WORKER-PROTOCOL.md), [ledger](../EXECUTION-LEDGER.md) and [roadmap](../ROADMAP.md).

## Objective and scope
Build a resettable synthetic café journey across site/menu, test checkout, counter/kitchen, order status, reservation and loyalty entry. Unify effective owner venue resolution for home/creative/regulars. Resolve concurrent Checkout creation with stable provider idempotency and stored attempts; implement durable refund-event reconciliation and a recoverable cancelled checkout.

**Non-goals:** No live charges/refunds, native app, terminal POS replacement or broad redesign. Do not select a merchant-of-record model.

## Ownership and constraints
**Owned modules:** components/storefront, app/shop, app/(owner) venue resolution, app/api/orders and app/api/webhooks/stripe, lib/payments, synthetic fixtures and journey tests. Coordinate shared files with SPEC-03.

Server recalculates money and enforces current menu availability. No public DEMO_MODE authorization bypass. Use fixture-only account/data boundaries; reset rejects any non-demo target. Keep existing pickup/dine-in API compatibility. Explicitly distinguish payment provider test mode from internal simulation.

## Acceptance contract

The following identifiers are stable for implementation, review and evidence. A mocked unit or route test is **not** provider sandbox evidence.

| ID | Acceptance criterion | Required evidence |
|---|---|---|
| SPEC-02-AC-01 | A guest can browse a venue-branded, mobile-friendly storefront, select valid modifiers, and choose pickup, delivery, or QR-bound dine-in. A delivery selection only records restaurant fulfillment intent; it never creates a courier job. | Unit/UI tests plus Playwright against resettable synthetic fixtures. |
| SPEC-02-AC-02 | The server is authoritative for venue, menu, modifier, availability, tax, delivery fee and total. A changed cart, 86'd item, unavailable modifier, invalid QR table, closed venue, invalid zone, or cross-tenant identifier is rejected without an order/payment side effect. | Route and local SQL/RLS tests. |
| SPEC-02-AC-03 | Repeated or concurrent checkout requests for the same client operation produce one order and one provider checkout operation. A provider response lost before the browser navigates is recoverable from the stored checkout reference. | Deterministic unit/route tests and local SQL test; provider sandbox separately blocked until credentials exist. |
| SPEC-02-AC-04 | Signed Stripe events and fixture-only internal test completions are bound to the stored provider reference/order/tenant/amount, deduplicated, and cannot regress a terminal payment/order state. Failed, replayed, out-of-order and mismatched events leave an auditable truthful state. | Payment adapter/route unit tests and local SQL test. |
| SPEC-02-AC-05 | After payment, restaurant acceptance, kitchen preparation and handoff follow allowed transitions. Staff requests use an active, venue-scoped session; revoked staff and another venue's order ID receive no order data or mutation. | Unit/route tests and local RLS/session tests. |
| SPEC-02-AC-06 | A guest can resume a paid order after an interrupted browser navigation through a scoped tracking credential. The status surface reports payment, restaurant preparation and delivery separately, without exposing staff-only data or claiming a courier is booked. | Route/UI tests and Playwright journey. |
| SPEC-02-AC-07 | Synthetic fixtures provide two isolated restaurant tenants, menu/modifier/availability/hours/QR scenarios, staff states and deterministic internal test payment events. Reset and SQL tests refuse non-local targets. | Fixture inspection, reset/runbook evidence, local SQL checks when Docker/CLI/psql are available. |

## Lifecycle, contracts and failures

### State transitions

`order.status` remains restaurant-owned: `pending → paid → accepted → preparing → ready → completed`, with `pending → canceled`. Paid-order cancellation/refund requires a dedicated, reconciled operator flow and is deliberately unavailable in this packet. `payment.status` is independent: `pending → succeeded | failed | refunded | reconciliation_required`; a refund never means that a preparation transition succeeded. A delivery selection remains `order_type = delivery` and a delivery-zone fee only. It creates no `delivery_job`, assignment, courier ETA, or `out_for_delivery` claim; those transitions belong to SPEC-03 after explicit staff dispatch and acceptance.

Events carry a monotonic provider event identity and are terminal-safe: duplicate success is a no-op; a failure after success, or a success after a terminal refund/cancellation, is recorded for reconciliation rather than silently regressing state. An amount mismatch marks the payment exception and never advances the order.

### Server contracts

`POST /api/orders` accepts a public venue slug, opaque client operation UUID, fulfillment selection, QR table token where applicable, guest contact, delivery-zone/address fields and item/modifier IDs. It returns only server-calculated amounts and either a recoverable checkout URL, a confirmation URL for a paid replay, or a categorized safe error. It never trusts client prices, venue IDs, fulfillment fees or item metadata.

`POST /api/orders` reserves the operation before calling the provider. The persisted operation key is derived from the order, is unique per provider effect, and is supplied to the payment adapter as its idempotency key. A repeated request finds the stored payment/checkout result. A crash after provider success but before browser redirect remains resumable by the order's scoped guest tracking credential.

`POST /api/webhooks/stripe` receives raw signed payloads only. Its normalized event must match the stored provider reference and order; each provider event ID is persisted in a service-only ledger before its terminal outcome is acknowledged. Unknown or invalid events do not mutate operational state; signed amount/state inconsistencies remain in that ledger for reconciliation. Internal test payment simulation is a separate network-disabled adapter and clearly labelled `test-mode simulator`; it is not Stripe sandbox verification.

Staff mutations resolve the stored order venue first and require an active counter session/membership for that venue. Guest status takes both order ID and its scoped tracking credential; a UUID alone is never sufficient. Responses contain fulfillment/status/total/timestamps only and omit address, phone, email, staff actor and payment raw data.

### Failure behavior

Checkout keeps the cart and operation key after a recoverable payment/setup/navigation failure, shows an accessible error and retry action, and never clears the cart before a durable checkout reference is returned. A venue that is unavailable due to its kill switch or configured closed-hours state refuses checkout and reports a retryable storefront message. Kitchen/staff loading or mutation failures retain the last visible data, show a recovery/reload path, and do not optimistically claim a status change.

## Test matrix

| Scenario | Acceptance IDs | Method / environment |
|---|---|---|
| Valid modifier, pickup/delivery/QR dine-in, 375px and keyboard flow | AC-01, AC-06 | Playwright + local fixture database |
| Client price/tenant spoof, changed cart, 86'd item, inactive modifier, closed venue, invalid table/zone | AC-02 | Vitest route tests + local SQL/RLS |
| Double-submit, concurrent checkout, provider retry, provider success then interrupted navigation | AC-03 | Network-disabled adapter/route tests + local SQL |
| Forged, replayed, failure-after-success, success-after-failure, out-of-order and mismatch events | AC-04 | Adapter/route tests + local SQL |
| Revoked staff, unrelated venue order, acceptance/preparation/ready/cancel recovery | AC-05 | Route/session tests + local RLS |
| Guest → test payment → accepted → kitchen → ready → guest polling | AC-01, AC-04, AC-05, AC-06 | Playwright + local fixture database |
| Synthetic two-tenant fixture reset and host refusal | AC-07 | Local fixture command and SQL suites |

## Acceptance and test plan
Guest completes one order visible once in kitchen and guest status; invalid/sold-out modifier selection is rejected. Concurrent retries produce one intended payment session/effect. Cancelling payment returns to a recoverable cart. Refund events have an auditable applied/pending state rather than silently deferred success. Operator can enter all intended owner pages with actor attribution.

**Tests:** Playwright mobile guest→kitchen→status and reservation journeys; concurrent checkout, crash-after-provider-response, payment mismatch and refund replay tests; role/impersonation revocation checks; fixture reset protection; keyboard/200% zoom checks.

## Dependencies, risk and release gate
**Dependencies:** SPEC-01 test/access contract; existing merged ordering and reservations. Share payment/acceptance contract with SPEC-03 before its integration.

**Risks:** Database unique keys alone do not prevent duplicate external checkout creation. Cart clearing before completed payment may lose retry context. Public demo paths can leak access if mixed with live data.

**Release gate:** SPEC-01 gates and independent Astra xhigh payment review. No live refund capability until F-05 approved. Hosted demo requires F-02.

**Lead:** GPT-5.6 Terra high. Sensitive changes require independent GPT-6 Astra xhigh review. Bounded non-sensitive subwork may use Sol high or Luna medium–high under the worker protocol.

## Ready-to-paste worker prompt
> Implement SPEC-02 as a connected synthetic sales journey. Preserve existing working modules. Own checkout/payment recovery and effective venue resolution; coordinate with delivery owner before editing shared order/webhook paths. Prove concurrent payment idempotency and refund event reconciliation with tests. Never call live payment APIs. Record mobile evidence and remaining gates in the ledger; open a draft PR.
