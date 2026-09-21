---
id: SPEC-02
title: Connected sales journey and payment recovery
status: ready-spec
updated: 2026-09-20
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
