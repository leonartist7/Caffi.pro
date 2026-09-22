---
id: uber-direct-feasibility-2026-09-22
title: Uber Direct feasibility and access dossier
status: blocked-access
updated: 2026-09-22
tags: [product-os, spec-04, integration, evidence]
---

# Uber Direct feasibility: 2026-09-22

Back to [SPEC-04](../specs/SPEC-04-first-courier.md), [registry](../INTEGRATION-REGISTRY.md) and [handoff](../handoffs/HANDOFF-2026-09-22-spec-04.md).

**Conclusion:** a documented direct-delivery API is a feasible candidate, but Caffi.pro has no verified authorized sandbox credentials, chosen service area, approved account/billing arrangement or commercial eligibility. No account was created, API called, courier booked or customer contacted. AC-01 research and AC-02 offline fixtures can proceed; AC-03 adapter and AC-04 sandbox verification remain blocked. This dossier does not select a vendor.

## Dated official evidence

Sources were read on 2026-09-22. These are evolving web documents, not a pinned API schema release. Keep customer-scoped DaaS `/v1/customers/{customer_id}` separate from the distinct `/v1/eats/deliveries` surface, marketplace ingestion and POS integration.

| Source | Supported observation | Boundary |
|---|---|---|
| [Getting started](https://developer.uber.com/docs/deliveries/get-started) | Self-service is available only in selected regions; managed accounts should consult their account manager. Dashboard test credentials use Customer ID, Client ID and Client Secret. Production access requires billing and approval. OAuth client credentials uses `eats.deliveries`. | No Caffi.pro approval or coverage established. Test credentials, not a guessed sandbox hostname, select test behavior. |
| [Getting started](https://developer.uber.com/docs/deliveries/get-started) | Quote response includes explicit `expires`, `fee`, `currency`, quote ID and estimates; create accepts `quote_id`. Returned tracking URL should be used unchanged. | Do not hardcode the sample's fifteen-minute expiry, fee or currency. Region-specific address/coordinate requirements need confirmation. |
| [Webhook guide](https://developer.uber.com/docs/deliveries/guides/webhooks) | Dedicated webhook signing secret; `x-uber-signature` is hex HMAC-SHA256 over original payload bytes. Unicode escapes must remain unchanged. Some network/server failures retry; lookup repairs missed updates. | HMAC provides neither freshness nor tenant authorization. No timestamp-signature protocol was documented here. |
| [Delivery status reference](https://developer.uber.com/docs/deliveries/daas/references/api/webhooks/delivery-status-webhook) | Statuses include pending, pickup, pickup_complete, dropoff, delivered, canceled and returned. Event/customer/delivery IDs and test/live flag are present. Return legs have separate references. | Pending is accepted by provider, not courier assigned. Unsupported shopping status must remain unmapped pending explicit capability review. |
| [Robo Courier](https://developer.uber.com/docs/deliveries/guides/robocourier) | Test specification supports automated progress and customer-unavailable/address/access/rejection cancellation scenarios. Sample create payload includes `idempotency_key` and `external_id`. | Field presence does not prove retention window, concurrency behavior or lookup-by-operation-key support. Robo Courier is provider sandbox, distinct from our local simulator. |
| [Changelog](https://developer.uber.com/docs/deliveries/changelog) | 2025 entries mention list filters for store/time and organization onboarding; July 2026 documents tax-form-related customer blocking. | No negative-proof-by-operation-reference guarantee established. Never turn an empty list page into proof that create did not book. |
| [DaaS reference](https://developer.uber.com/docs/deliveries/api-reference/daas) | Official create/get/cancel links resolve here. The research reader returned only a JavaScript shell. | Full request constraints, cancel charges, pagination and idempotency lifetime were not verified; obtain the current schema and sandbox evidence before adapter implementation. |

## Proposed adapter boundaries, pending SPEC-03 approval

These are requirements for later implementation, not implemented interfaces.

- Bind credentials, customer ID, environment and venue to a server-held connection. Resolve tenant from stored connection/job; never from a webhook's untrusted venue field. Verify signature before parsing, then verify customer ID, delivery ID and test/live mode. Deduplicate event ID within connection and persist before acknowledgement. Unknown mappings and conflicting terminal events go to reconciliation.
- OAuth tokens stay server-only with expiry-aware refresh. Authentication failure disables new effects and alerts staff; do not repeatedly book while refreshing after an uncertain response.
- Quote inputs use explicit country, address, cart and currency; consume the provider's actual expiry. Provider fee is courier cost, not the guest's charged delivery fee. Refresh after input changes; changed cost never silently increases guest payment.
- Persist the create intent, exact request digest and stable operation key before sending. Use the documented create key only after its scope and retention are confirmed. `external_id` is correlation, not proven deduplication. With a known delivery reference, lookup is the recovery path. With no reference after a possible send, retain reconciliation-required/manual review; do not switch providers, generate a new key or assert failure.
- Keep provider `pending` distinct from assigned; map pickup to assigned, pickup_complete/dropoff to picked-up, delivered to delivered, canceled to cancelled and returned to returned only through reviewed legal transitions. Capture raw unsupported status safely for diagnosis; no arbitrary fallback to success. Return delivery references do not authorize a new paid dispatch.
- Cancellation request, confirmed cancellation, food cancellation and refund are separate. Charges and post-pickup return support are unresolved; paid re-dispatch/refund default denied. Staff must reconcile races rather than assume an HTTP acknowledgement cancels a delivery.
- Show provider estimates as estimates with observation time. No inferred precision, continuous location or guaranteed ETA. Own drivers use confirmed milestones. Drop unsupported/stale tracking rather than fabricate it.

## Commercial, privacy and support gates

Founder F-01 must choose the first city/country; vendor then confirms address coverage and product eligibility. F-03 must settle merchant versus platform account ownership, customer-ID isolation, billing party, contract, spend cap and cancellation/return fees. Public documentation alone does not establish a permitted multi-tenant resale arrangement. No public sample fee is a commercial quote.

Required delivery data is limited to pickup/dropoff address/contact and fulfillment manifest. Exclude payment tokens, loyalty data and unrelated order history. Send contact/instructions only when needed. Store normalized operational data; do not log raw PII-bearing events or expose provider secret/reference material in guest responses. Contractual retention/deletion, subprocessor and service-area privacy terms remain unverified and must be recorded before activation; do not invent a retention duration. Support escalation goes through the approved account manager/provider support arrangement once established; no support request was sent.

Second-adapter discovery remains non-selected: [DoorDash Drive getting started](https://developer.doordash.com/en-US/docs/drive/overview/about_drive/) and [Stuart developer portal](https://stuart.com/developers/) are candidate entry points already in the registry. No second adapter or coverage claim is made by this slice.

## Fixtures and future qualification

`tests/fixtures/uber-direct/protocol.json` is authored synthetic partial data, not recorded provider output. It contains explicit provenance and fault assumptions. `tests/spec-04-protocol.test.mjs` tests raw-byte signature behavior, replay limitations, quote boundary and fault corpus integrity. They exercise no app route, database, shared delivery interface or network.

After authorized sandbox access and approved SPEC-03 contract: retrieve the complete DaaS schema; pin evidence; verify quote/create/get/cancel, credential expiry, duplicate concurrent create, unknown outcomes, webhook duplicate/out-of-order/forgery and cancellation races with Robo Courier. Capture sanitized evidence with account environment, timestamps and code commit. Confirm idempotency retention, reference lookup and absence guarantees with vendor; unresolved guarantees keep manual recovery enabled. Run no sandbox load tests. A controlled separately authorized real delivery and independent Astra xhigh safeguards review remain necessary for live readiness.
