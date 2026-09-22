---
id: SPEC-03-contract-review
title: Phase 3 concrete delivery contract review
status: review
updated: 2026-09-22
tags: [product-os, delivery, security]
---

# SPEC-03 contract packet, revision 2

## Objective and scope

Freeze the delivery safety contract before implementation. **Lead:** implementation owner with independent GPT-6 Astra ultra approval.

## Ownership and constraints

SPEC-03 owns this packet and shared delivery contracts. SPEC-04 consumes only an accepted revision; no provider access is presumed.

## Acceptance and test plan

Approval must identify the reviewed commit/revision and disposition of each blocking finding. Behavioral acceptance is specified below.

## Dependencies, risk and release gate

Unmerged SPEC-01/02 dependencies, unknown external effects and tenant isolation require independent review. Architecture approval is not execution evidence.

## Ready-to-paste worker prompt

> Review this concrete contract against Phase 2 implementation, report blocking findings, and explicitly approve only a revision that resolves them. Do not implement dependent contracts during review.

Back to [SPEC-03](SPEC-03-delivery-foundation.md), [delivery architecture](../DELIVERY-ARCHITECTURE.md), [ledger](../EXECUTION-LEDGER.md).

Gate: independent GPT-6 Astra ultra approval of this revision is REQUIRED before dependent implementation. No approval is claimed here. Base is unmerged PR #85 at ef3afe239aba282604670496675ea72e73250a99, inheriting #84 and #83. Phase 2 static security review was accepted; critical dependency audit, Phase 1 OpenCode supply chain, SQL/RLS and browser gates remain open.

## Persistence and authorization

All new tables have UUID primary keys, venue_id, created_at; tenant foreign keys use UNIQUE(venue_id,id) targets and composite relationships. orders receives UNIQUE(venue_id,order_id). RLS is enabled; anon/authenticated have NO direct grants or policies for these service-owned operational records. Only service_role can access tables and execute mutation RPCs; revoke EXECUTE from PUBLIC, anon, authenticated for every function. Functions use fixed empty search_path and schema qualification. API service-role access is always preceded by authenticated resource-first scope checks. SQL user-action RPCs also recheck active membership using a server-derived auth user UUID; clients cannot supply actor IDs.

| Table | Required fields and constraints |
|---|---|
| delivery_connections | id, venue_id, provider (simulator/own_driver/uber_direct), environment (simulation/sandbox/live), enabled=false default, credential_ref nullable, capabilities JSON, health. Unique venue/provider/environment. No secrets. |
| delivery_quotes | id, venue_id, connection_id, input_digest, priced_cart JSON, address JSON, zone_id, currency, guest_charge_minor, provider_cost_minor, provider_quote_ref, expires_at, consumed_order_id nullable; costs >=0; composite venue/connection and venue/order FKs. |
| delivery_jobs | id, venue_id, order_id, connection_id, quote_id, operation_key unique, external_ref nullable, state, version, approved_cost_minor, actual_cost_minor nullable, currency, driver_user_id nullable, last_event_at, exception nullable, cancellation_requested boolean, safe_tracking JSON. Unique venue/order for v1 (paid re-dispatch denied); unique connection/external_ref where nonnull. No replacement of history. |
| delivery_attempts | id, venue_id, job_id, effect key, lease token, action, request_digest, outcome, safe error; append-only operational history, composite job FK. |
| delivery_events | id, venue_id, connection_id, nullable job_id, external_ref, provider_event_id, provider_time, received_at, normalized state only, processed_at, outcome; UNIQUE(connection_id,provider_event_id). Composite nullable job FK and connection FK. Unmatched authenticated references persist as quarantined records; attachment by connection/external_ref applies them transactionally, or staff sees unresolved quarantine. No raw PII payloads. |
| delivery_outbox | id, venue_id, job_id, action(create/lookup/cancel), effect_key unique, available_at, lease_token UUID, lease_until, attempts, possible_send, done, safe_error; composite job FK; runnable/lease indexes. |
| delivery_driver_access | venue_id,user_id composite primary key, enabled; auth.users FK. Capability is granted only by owner/manager, and requires an active venue or same-org staff membership on every assignment/milestone. No owner privileges granted. |
| delivery_order_context | venue_id/order_id composite key and FK, connection_id, original_quote_id, current_quote_id, canonical input items, priced_cart, structured address, currency, guest_charge_minor, subtotal_minor, tax_minor, tip_minor, total_minor. Immutable financial/address/cart fields captured atomically at new delivery checkout. Only current_quote_id may change by authorized refresh. |
| delivery_simulator_bookings | venue_id/connection_id/operation_key unique, external_ref unique per connection, state, scenario, created_at. Service-only synthetic external-effect registry, separate transaction from worker completion. |
| delivery_quote_limits | venue_id/window_start primary key, count, limited to 30 quote requests per minute per venue. Service-only; prune old buckets. |

Quote creation is a bounded public storefront action (max 32KB, max 50 lines, integer quantities 1..99). A database rate bucket limits venue quote requests; no network-address trust assumptions. Database pricing helper validates active/non-86 menu items, modifiers/counts, active zone/postal/minimum, explicit venue currency, and returns canonical server-priced lines and amounts. Digest covers venue, connection, zone, normalized structured address, currency, ordered line identities/quantities/modifiers/notes and current prices. Address requires countryCode, postalCode, city, line1; line2 optional. No implicit country/currency. Public quote response exposes opaque ID, expiry, guest charge/currency and supported estimates, never provider cost/credentials.

Extend POST /api/orders with delivery_quote_id and delivery_address_structured. Existing pickup/dine-in and legacy own-driver zone checkout remain compatible. New delivery checkout wrapper locks quote and invokes the existing checked order RPC within the same transaction, verifies exact quote context and current repricing before payment, and consumes the quote once for that order. Idempotent recovery of the same checkout does not fail solely because its consumed quote has expired; no new booking follows from this exception. Changed checkout inputs still fail the inherited fingerprint contract. Dispatch rechecks expiry and requires a newly approved replacement quote if expired after payment; replacement must match the immutable order lines/address/currency and cannot modify guest charge.

Exact money integration: original quote guest_charge_minor MUST equal the active zone fee; it is not the courier cost. Before new checkout, require non-null uppercase ISO currency from venue (no CAD fallback) and capture full priced cart, zone fee, tax and tip; after inherited RPC, compare stored order_items including modifiers/quantity/notes, subtotal, delivery_fee, tax, tip and total against this quote/current pricing within the same transaction or roll back. Capture delivery_order_context currency; return that currency for EVERY replay instead of inherited mutable venue currency. Extend the existing checkout fingerprint with structured address, quote ID, connection/mode context; quote changes cannot reuse a client checkout key. Existing orders without context remain legacy and cannot dispatch through the new engine until explicitly migrated; no inferred address/currency.

POST /api/orders/[id]/delivery/quote is owner/manager-only quote refresh: use immutable delivery_order_context rather than current menu prices, exact original connection, original address/currency/guest charge. Quote binds this order, cannot be used by another order, and requires an explicit approve_cost_minor equal to returned quote cost during dispatch/update. If no job exists, refresh only updates current_quote_id. For an existing job, refresh is allowed only while dispatch_pending and no attempt/outbox possible_send has ever occurred; lock order/job/outbox, replace quote/approved cost and reuse original create effect. After possible_send, no input/key/quote replacement, even if lookup reports absence. An expired unsent quote surfaces QUOTE_EXPIRED without claim/send and is recoverable through this refresh; no permanent ambiguous state is manufactured for work proven never sent.

## Provider interface (server-only)

DeliveryProvider has capabilities(), quote(input), create(input,operationKey), lookup({externalRef?,operationKey}), cancel({externalRef,operationKey}), authenticateAndNormalizeEvent(rawBody,headers). All I/O is validated. Effect results are discriminated unions: confirmed(reference,state,cost?,tracking?), rejected(code), unknown(code). Lookup additionally supports authoritative_absent only when provider documents proof of absence. Unknown is never rejected. Quote returns serviceable or unavailable; serviceable requires currency, integer cost and expiry. Normalized event has provider event ID, external reference, state, occurredAt; connection resolution is server-owned, not a trusted venue from payload.

Simulator requires explicit simulation enable flag, loopback Supabase URL, no VERCEL environment and exact synthetic venue ID. It performs no network calls. Its simulated external booking registry is persisted separately from worker completion so timeout-after-create and process restart can recover the same external reference. Simulator scenarios are connection/test-fixture configuration, never public guest input. Own-driver has milestone-only tracking and no external spend. External provider factory fails closed in this PR; Uber implementation waits for SPEC-04 sandbox access.

## HTTP and permissions

| Endpoint | Permission and contract |
|---|---|
| POST /api/delivery/quotes | Public bounded/rate-limited request: venue_slug, items, address, zone_id, mode. Resolves allowed enabled connection server-side. 201 safe quote, 400 invalid, 409 unavailable, 429 limited. |
| POST /api/orders/[id]/delivery/dispatch | Active owner/manager, resolve order venue first. quote_id and Idempotency-Key UUID. DB rechecks payment, acceptance, current quote, connection. 202 existing/new job. |
| GET /api/deliveries?venue_id=... | Active owner/manager sees queue and exception details. Staff MUST have enabled driver capability and receives only jobs assigned to self, minimal PII needed to fulfill; staff without capability denied. |
| GET /api/deliveries/[id] | Same owner/manager or assigned active driver+capability predicate as list; or existing order tracking token with explicit expiry (placed_at + 7 days), guest minimal projection. |
| POST /api/deliveries/[id]/cancel | Owner/manager, reason required. Durable cancellation intent; never equate request with completion. 409 terminal/unsupported. |
| POST /api/deliveries/[id]/reconcile | Owner/manager, reason required, queues deduplicated lookup. No manual override of provider truth. |
| POST /api/deliveries/[id]/assignment | Owner/manager; active explicitly enabled same-venue driver; own-driver mode only. Cannot reassign after pickup. |
| POST /api/deliveries/[id]/milestones | Assigned active driver with capability only; own-driver; pickup requires preparation ready, delivery requires picked_up. No provider-state overrides. |
| POST /api/webhooks/delivery/[provider]/[connectionId] | Untrusted connection ID selects bounded stored signing config; verify raw payload before parsing; compare authenticated external ref against stored connection/job; persist and apply in one DB transaction before 2xx. |
| POST /api/delivery/worker | Server bearer secret, bounded batch; local CLI invokes same worker. No scheduler activation. |

Owner/manager excludes implicit aro_admin bypass for effectful actions. Cancellation has no refund side effect. Refund and paid re-dispatch always 409 POLICY_NOT_APPROVED in v1, including owner/manager; UI explains separate payment reconciliation. No customer messages.

## State transitions and separate truths

Job states: dispatch_pending, booked, assigned, picked_up, delivered, reconciliation_required, cancellation_pending, cancelled, failed, returned. Quotes are separate records, not jobs. Order payment state remains payments; acceptance/preparation remain existing orders status and timestamps. Courier events never mark an order paid, accepted or prepared. Do not reuse order out_for_delivery/completed for courier state; guest combines independent projections.

Normal forward progression: dispatch_pending -> booked -> assigned -> picked_up -> delivered. Confirmed provider snapshots may skip forward intermediate milestones. Pre-pickup cancellation transitions nonterminal -> cancellation_pending -> cancelled; if provider reports pickup/delivery during cancellation, retain provider milestone and exception until lookup resolves cancellation. Failure/return require confirmed provider state. Terminal state repeats are no-ops; conflicting terminal facts or older events are retained with exception and lookup, never silently overwrite delivered. reconciliation_required retains last confirmed milestone separately in safe_tracking; lookup resolves confirmed state without erasing prior truth. Own-driver assignment advances booked -> assigned; pickup/delivery require sequential authorized confirmations and ready preparation.

Dispatch requires order_type=delivery, accepted_at set and orders.status in accepted/preparing/ready, a succeeded payment matching order total/currency, no pending/reconciliation/refund event, enabled compatible connection, and valid quote. A quote refresh after payment is explicit owner/manager approval of provider cost; guest charge remains fixed. v1 refuses creation of a second job for the same order even after cancellation/failure.

## Durable effects and races

Dispatch transaction locks order then quote, rechecks all prerequisites, inserts one job and unique create outbox effect before returning. Concurrent requests return that job, but a conflicting request cannot alter its quote/provider. Every worker uses the same lock order (order, job, outbox) for final validation. Claim sets random fencing token, 60-second lease and possible_send=true BEFORE leaving transaction; commit before network. Every completion requires matching unexpired token. Expired possible_send create becomes lookup, never another blind create. A stale response may be retained as evidence but must not overwrite current job state.

Before create send, worker rechecks order/payment/connection/quote and cancellation intent transactionally. Cancellation before any claim finishes locally; cancellation after possible send persists intent and resolves original booking before cancelling it. Never create on a disabled/revoked connection. Reconciliation may continue with existing credentials while new dispatch is disabled; revoked credentials produce visible manual exception.

Unknown result changes job to reconciliation_required and schedules lookup using original operation key/reference. V1 NEVER repeats create after possible_send, even following authoritative absence: a paused original worker may still send, and database fencing cannot cancel an authorized network request. Retain manual exception if no booking is found. Never change create inputs/key after possible send or switch providers. Only lookup/cancel effects are retried; cancel retries require provider-supported idempotency or reconcile instead. Reconciliation retries use exponential delay min(300s, 2^attempt seconds); after five unsuccessful processing attempts surface exception and stop automatic rapid retry. Operator can schedule further lookup. Successful booked/nonterminal external jobs schedule bounded periodic lookup to recover missing webhooks. A confirmed late result from a stale worker is retained in attempts and schedules lookup; it never directly changes the job.

All job updates compare version/current state while locked; webhook and worker updates use the same transition function. Event uniqueness, event time and state precedence prevent replay/regression. An event arriving before external reference attachment is durably quarantined by connection/reference and reconciled, not acknowledged and discarded. Cancellation intent survives webhook updates. Cost corrections never change guest charge or authorize extra effects.

## Acceptance IDs, evidence and rollback

SPEC-03-AC-01 tenant persistence; AC-02 provider contract; AC-03 bound quotes/checkout; AC-04 payment/acceptance dispatch; AC-05 durable processing/reconciliation; AC-06 deterministic simulator; AC-07 queue/recovery; AC-08 drivers; AC-09 guest tracking. Each ID maps to named Vitest, SQL and/or Playwright cases before its slice. Required adversarial cases: cross-tenant IDs, revoked owner/driver, invalid/out-of-area address, changed/expired quote, concurrent dispatch, crash before/after provider effect, stale lease completion, timeout-after-create, replay/out-of-order/conflicting terminal events, cancellation versus create/pickup, unavailable/failed delivery.

Use isolated GitHub CI with pinned actions/CLI, disposable Supabase/Postgres and synthetic Auth users; no hosted credentials. Run all existing SQL suites as SQL via psql ON_ERROR_STOP, not pretend pgTAP. Browser journey proves order -> local synthetic payment -> acceptance -> preparation -> dispatch -> handoff -> delivery with API/DB assertions. Keep failing dependency audit separate and visible. No success-by-skip. Generate migration filenames through Supabase CLI, replay from empty DB, add non-destructive indexes/tables/functions before dependent code. Rollback disables delivery flags/worker, retains history and reconciliation; schema reversal requires reviewed forward migration, never dropping financial/audit records.

Live and sandbox remain not run. Post-implementation independent Astra xhigh review is separate from this architecture gate. No merge/deploy, live DB change, account activation, real courier/refund/message is authorized.
