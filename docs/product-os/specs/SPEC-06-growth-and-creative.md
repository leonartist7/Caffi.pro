---
id: SPEC-06
title: Loyalty qualification and grounded creative growth
status: ready-spec
updated: 2026-09-20
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

## Dependencies, risk and release gate
**Dependencies:** SPEC-01/02; Gateway contract review and safe model configuration; optional push device/account access.

**Risks:** Existing best-effort bounce-back call can log failure without durable retry; PII in prompts/logs; duplicate incentives; stale marketing consent.

**Release gate:** SPEC-01/02 tests plus independent Astra xhigh review for identity/AI boundaries. F-06 gates sends, approved budget gates paid model calls. Mock tests never imply provider verification.

**Lead:** GPT-5.6 Terra high. Sensitive changes require independent GPT-6 Astra xhigh review. Bounded non-sensitive subwork may use Sol high or Luna medium–high under the worker protocol.

## Ready-to-paste worker prompt
> Implement SPEC-06 in bounded PRs: qualify loyalty idempotency/recovery first, then guest history, then Gateway-backed approved drafts. Use mocks until paid calls are explicitly approved. Keep messaging disabled until sender/consent/vendor gates are resolved. Record exact tests, current model evidence and verification levels in the ledger.
