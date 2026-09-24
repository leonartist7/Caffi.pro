---
id: SPEC-06
title: Loyalty qualification and grounded creative growth
status: ready-spec
updated: 2026-09-24
tags: [product-os, execution-packet]
---

# SPEC-06: Loyalty qualification and grounded creative growth

Back to [worker protocol](../WORKER-PROTOCOL.md), [ledger](../EXECUTION-LEDGER.md) and [roadmap](../ROADMAP.md).

## Objective and scope
Qualify existing offers/referrals/surveys/mystery rewards and push, connect guest history to orders/reservations, migrate the AI boundary to Gateway behind configuration, add per-tenant generation budget/audit and approved draft flows. Build campaign draft/consent/suppression behavior without enabling outbound sends.

**Non-goals:** No silent contact merging across venues, autonomous discounts/bookings/messages, voice vendor, stored-value gift cards or assumed image-model availability.

## Ownership and constraints
**Owned modules:** lib/loyalty, lib/ai, lib/consent, owner creative/regulars/loyalty UI, related tests and additive audit/usage data. Coordinate guest identity with SPEC-02.

Preserve tenant boundaries and append-only reward history. Retryable issuance must be durably recorded; payment success cannot silently lose follow-up offers. AI reads scoped facts and validates outputs; application budgets reserve before paid requests and settle actual usage. Model IDs come from current supported catalogue, not worker display names.

## Acceptance and test plan
Concurrent redemption/referral has one intended value effect; interrupted issuance is recoverable. Guest activity has clear provenance. Drafts are reviewable with generation identity/cost. Missing Gateway config is honest. Consent withdrawal suppresses future promotional sends. Push is only live-verified after real-device subscribe/receive/revoke tests.

**Tests:** Concurrent redemption and first visit; scheduler timezone and duplicate run; retry after paid event; injection attempts through venue content; cross-tenant retrieval; quota exhaustion/fallback; unsubscribe race; real Android/iOS PWA loop when approved.

### Phase 4 acceptance contract (2026-09-24)

| ID | Contract, ownership and failure behavior | Required evidence |
|---|---|---|
| SPEC-06-AC-01 | A guest's order/reservation/delivery history is linked only by an explicit venue-scoped member identifier or verified account binding. Name, phone and email resemblance never merge identities across venues. | SQL/API two-tenant and identity-boundary tests |
| SPEC-06-AC-02 | Points earn, redeem and reverse through append-only tenant-scoped transactions. An operation key is unique; concurrent redemption cannot overspend; cancellation/refund reverses an earlier earn once, including replay and integer rounding. | SQL concurrency and replay tests |
| SPEC-06-AC-03 | Offers, referrals, review prompts and scheduled issuance are idempotent and truthful. Failed paid-event follow-up persists recoverable work. Consent withdrawal suppresses future promotional sends. | SQL/API and scheduler tests |
| SPEC-06-AC-04 | Creative drafts and owner summaries use bounded, sourced facts from the same venue's menu, brand, offers and operations. Untrusted text cannot become an instruction or cross-tenant lookup. Output is validated before storage. | Prompt/provider/route tests |
| SPEC-06-AC-05 | Server-only Gateway configuration uses a currently listed model and explicit paid-call budget reservation/settlement with sanitized audit. Missing configuration or quota fails closed. AI cannot publish, send, book, discount or perform money actions. | Mocked provider, budget and permission tests; sandbox separate |
| SPEC-06-AC-06 | Owner and guest mobile/keyboard flows show loading/errors and draft approval clearly; no outbound send or live push claim without F-06 and device evidence. | Browser accessibility and device checks |

The initial implementation owns lib/loyalty, lib/ai, consent and owner growth surfaces, with additive audit data. Shared order identity remains explicit: no inferred contact matching. Rollback disables new generation/issuance, preserves financial and generation audit rows, and reconciles reserved work before schema removal.

### 2026-09-24 verification checkpoint

The owner member view now retrieves only same-venue orders and reservations bearing the verified member ID, then reads delivery jobs through those order IDs. A matching name, phone or email never creates a link. [Acceptance evidence](../evidence/SPEC-06-ACCEPTANCE-2026-09-24.md) separates CI-tested ledger/budget SQL and previous ordering/delivery browser regressions from the still-unverified new member view, concurrent requests, dedicated API/keyboard paths and paid Gateway sandbox.
## Dependencies, risk and release gate
**Dependencies:** SPEC-01/02; Gateway contract review and safe model configuration; optional push device/account access.

**Risks:** Existing best-effort bounce-back call can log failure without durable retry; PII in prompts/logs; duplicate incentives; stale marketing consent.

**Release gate:** SPEC-01/02 tests plus independent Astra xhigh review for identity/AI boundaries. F-06 gates sends, approved budget gates paid model calls. Mock tests never imply provider verification.

**Lead:** GPT-5.6 Terra high. Sensitive changes require independent GPT-6 Astra xhigh review. Bounded non-sensitive subwork may use Sol high or Luna medium–high under the worker protocol.

## Ready-to-paste worker prompt
> Implement SPEC-06 in bounded PRs: qualify loyalty idempotency/recovery first, then guest history, then Gateway-backed approved drafts. Use mocks until paid calls are explicitly approved. Keep messaging disabled until sender/consent/vendor gates are resolved. Record exact tests, current model evidence and verification levels in the ledger.
