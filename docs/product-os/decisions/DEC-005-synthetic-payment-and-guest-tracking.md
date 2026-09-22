---
id: dec-005-synthetic-payment-and-guest-tracking
title: DEC-005: Synthetic payment and scoped guest tracking
status: documented
updated: 2026-09-22
tags: [product-os, decision, payment, security]
---

# DEC-005: Synthetic payment and scoped guest tracking

Back to [architecture](../ARCHITECTURE.md), [security](../SECURITY-AND-COMPLIANCE.md) and [SPEC-02](../specs/SPEC-02-connected-sales-journey.md).

## Context

SPEC-02 needs a complete synthetic restaurant journey while payment credentials, a hosted isolated environment and a merchant-of-record decision remain unavailable. The prior guest status route accepted an order UUID alone, and retrying a checkout had no provider idempotency key.

## Decision

Use a network-disabled internal payment adapter only when `CAFFI_PAYMENT_MODE=test`, `CAFFI_SYNTHETIC_FIXTURES=1`, and `CAFFI_SYNTHETIC_VENUE_ID` match the order venue in a non-production process whose `NEXT_PUBLIC_SUPABASE_URL` resolves to loopback. It is a local-fixture simulator, never a public demo bypass and never Stripe sandbox evidence. The real Stripe adapter receives a stable per-order idempotency key on every checkout retry.

Give each order a generated `guest_tracking_token`. The browser must present that token with the order ID to read guest status; the order creation route obtains it only after proving the original venue slug and client operation UUID. The guest page exposes only status and guest-safe totals. Payment, preparation and delivery remain separate lifecycles; selecting delivery records restaurant fulfillment only and does not create a courier job.

## Consequences

The schema migration must land before the app code. Preview/local environments must not set the synthetic controls unless their database contains only resettable fixtures and the configured fixture venue ID. Checkout recovery resumes a stored provider URL only after the server re-locks its pending order/payment attempt; browser local storage cannot authorize a checkout URL. Provider events are durably keyed by provider and event ID; signed inconsistencies quarantine all order payment attempts for reconciliation.

This decision does not prove provider sandbox, real payments, courier dispatch or local RLS behavior. An independent Astra xhigh review remains required before payment, authorization and tenant-isolation gates can close.
