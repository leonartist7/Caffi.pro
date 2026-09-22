---
id: delivery-architecture
title: Delivery architecture and interface contract
status: accepted-strategy
updated: 2026-09-22
tags: [product-os]
---

# Delivery architecture and interface contract

## 2026-09-22 implementation contract

The [revision 2 concrete packet](specs/SPEC-03-contract-review.md) supersedes the illustrative proposal below where more specific. [Independent Astra ultra approval](evidence/SPEC-03-CONTRACT-REVIEW-2026-09-22.md) precedes the SPEC-03 implementation in draft PR #87. The initial engine supports isolated simulator and own-driver workflows only; external provider selection fails closed. There is no live readiness claim.

Operational job states include booked; quote is a separate record. Once a create may have been sent, v1 never repeats it, even after an absence lookup. The immutable delivery_order_context freezes guest charges, cart, structured destination and currency for replay. Owner/manager can approve a fresh provider quote only for a never-sent job with matching version. Post-implementation review and executed SQL/browser evidence remain separate gates.

Back to [architecture](ARCHITECTURE.md), [registry](INTEGRATION-REGISTRY.md); implemented by [SPEC-03](specs/SPEC-03-delivery-foundation.md) and [SPEC-04](specs/SPEC-04-first-courier.md). This is a proposed contract, not existing code.

## Domain boundary
Existing orders remain the purchase record. Preparation state remains restaurant-owned. A delivery job references the order and venue but has its own lifecycle. POS acknowledgement is separate again. Customer delivery fees, provider costs, restaurant tips and courier tips are distinct amounts with explicit currency and recipient.

## Proposed server-only TypeScript interface
DeliveryProvider exposes:
- capabilities(): supported regions/modes, scheduled delivery, cancellation, tracking and proof-of-delivery support.
- quote(input): normalized serviceability, providerQuoteRef, expiresAt, costMinor, currency, pickup/dropoff estimates.
- create(input, operationKey): confirmed job reference, definite rejection, or unknown outcome.
- lookup(referenceOrOperationKey): current provider state or unknown.
- cancel(reference, operationKey): confirmed cancellation, rejection, or unknown.
- authenticateAndNormalizeEvent(rawBody, headers): verified normalized event. Never JSON-parse before signature verification where raw-body signatures apply.

Use structured address {countryCode, postalCode, city, line1, line2}; no implicit CAD/country default in provider requests. Adapter schemas validate provider payloads. Missing capabilities fail explicitly rather than fabricating ETA/location.

## Proposed persistence
- delivery_connections: venue, provider, environment, credential reference, enabled capabilities and health; no plaintext credentials.
- delivery_quotes: venue, connection, cart/address digest, provider reference, currency/cost, expiry and consumed order.
- delivery_jobs: venue/order/connection, operation key, external reference, state, version, approved quoted cost, actual cost and safe tracking data.
- delivery_attempts: job, operation, attempt, request digest, outcome and sanitized error category.
- delivery_events: connection/provider event ID (or stable event digest), job, provider time, received time and normalized payload.
- delivery_outbox: effect key, job, availability time, lease expiry, attempts and result.

Composite venue/resource keys prevent cross-tenant relationships. Unique effect keys and a partial uniqueness constraint permit at most one active/unknown dispatch for an order. Store cancelled attempts rather than replacing their history.

## Proposed HTTP boundaries
- POST /api/delivery/quotes: public storefront request, venue slug resolved server-side; rate-limited and server-priced cart/address. Return opaque quote ID and safe breakdown.
- POST /api/orders: optional delivery_quote_id for courier mode; preserve existing pickup/dine-in behavior and own-driver zones during migration.
- POST /api/orders/[id]/delivery/dispatch: active owner/manager, row-scoped; idempotency key; 202 for queued or reconciliation-pending.
- POST /api/deliveries/[id]/cancel: same authorization and audited reason; 409 for unsupported terminal state.
- POST /api/webhooks/delivery/[provider]: vendor-authenticated; deduplicate before state application; no trusted client venue.
- GET /api/deliveries/[id]: role-scoped staff details or separately verified guest tracking credential with a minimal response.
- POST /api/deliveries/[id]/milestones: assigned active driver/staff within venue; own-driver mode only; reject arbitrary provider-state overrides.

First UI exposes explicit staff dispatch after payment success and restaurant acceptance. Automatic dispatch is off until separately qualified.

## State machine and durable processing
quoted → dispatch_pending → assigned → picked_up → delivered.
Branches include reconciliation_required, cancellation_pending, cancelled, failed and returned. “Unknown” is never silently treated as failed. Legal transitions are validated transactionally against version/current state. Provider corrections or conflicting terminal events create exceptions and a lookup; they do not regress delivered to assigned.

Persist intent before contacting provider. Claim jobs with a lease; commit the claim, call provider outside the transaction, then record the result. On lease expiry after a possible send, reconcile by stable external reference/operation key before retrying. If the provider cannot prove absence, retain manual-review state. This provides at-least-once processing with deduplicated effects; never promise network-wide exactly-once delivery.

Webhook receipt and dedup persist before acknowledging. Apply asynchronously or in the same transaction, but never acknowledge unpersisted required work. Retries use capped exponential backoff. After 5 failed processing attempts, surface an exception while scheduled reconciliation remains available. Scheduling cadence is an operational config verified against hosting limits; tests control time directly.

## Quotes, payment and failure policy
Before checkout, validate address, cart, hours, minimum and quote expiry server-side. Changed inputs invalidate the quote. After payment, if quote no longer applies, staff obtains a new quote; no extra guest charge or paid re-dispatch without approved policy. Customer payment does not imply courier booking succeeded.

Cancellation of food order, courier cancellation and refund are separate operations. Display each result. Prevent new dispatch after cancellation. If a courier is already picked up, follow vendor return/support capability; never show a success message merely because ARO requested cancellation.

## Own-driver and rollout
Use the same job timeline, assignment and milestone API without external provider spend. Driver access is an explicit scoped capability, not a grant of owner/manager. No continuous GPS tracking in v1.

Ship simulator-only and globally disabled external adapters first. Simulator permits deterministic success, unavailable, expiry, delayed/out-of-order events, timeout-after-create, cancellation rejection and failure. Enable one sandbox venue after contract tests; enable live only after F-01/F-03/F-05 and controlled delivery approval.

Delivery is live-verified only after an actual approved delivery, not after simulator or sandbox success.
