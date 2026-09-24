---
id: spec-06-acceptance-2026-09-24
title: SPEC-06 acceptance evidence
status: verified-partial
updated: 2026-09-24
tags: [product-os, growth, evidence]
---

# SPEC-06 acceptance-to-test evidence

Draft [PR #89](https://github.com/leonartist7/Caffi.pro/pull/89) is stacked on unmerged #87. [CI 36002940033](https://github.com/leonartist7/Caffi.pro/actions/runs/36002940033) at reviewed code head `0e8eecc` passes TypeScript, strict lint, 53 Vitest tests, Product OS validation, isolated build, complete disposable migration replay, all nine required SQL suites and seven Chromium tests. These include explicit member history, same-name tenant isolation, interrupted/replayed referral recovery and guest-token review prompts. Aggregate CI fails solely on the inherited critical production dependency audit; that check was not weakened. The local parallel build stopped on disk exhaustion and is not claimed passed locally.

| Acceptance | Direct evidence | Open verification |
|---|---|---|
| SPEC-06-AC-01 | Disposable browser owner directory/history test counts exactly one same-name own-venue member, reads explicitly linked orders/reservations and denies the foreign member profile; SQL proves own-name visibility, foreign-name absence and anonymous denial | Revoked-owner route and linked-delivery display tests |
| SPEC-06-AC-02 | SQL replay, distinct-key overspend refusal, revoked counter and single refund reversal; append-only ledger RLS | Genuine simultaneous redemption/refund sessions and rounding boundary |
| SPEC-06-AC-03 | SQL paid-offer and referral outbox claim/finish, first-visit batch selection, tenant FK and lease guards; disposable browser/API exercises interrupted referral, replay without duplicate points, configuration snapshot, guest-token review prompts and duplicate analytics events | Genuine two-session referral race, offer-value recovery after crash, consent withdrawal and live scheduler |
| SPEC-06-AC-04 | Five mocked AI tests cover grounding and output validation; prompt uses same-venue facts | Route/provider spies, untrusted-content and cross-tenant browser/API tests |
| SPEC-06-AC-05 | SQL venue budget cap, cross-tenant settlement refusal and client-role denial; Gateway adapter checks catalogue | Paid provider sandbox/model, genuine concurrent reservations and usage settlement |
| SPEC-06-AC-06 | Review-only draft flow; guest review prompt browser path includes denied tokens, valid prompt and click; no send/publish capability added | Mobile/keyboard owner/guest browser and real-device push/consent checks |

Environment: GitHub Ubuntu disposable loopback PostgreSQL/Supabase and Chromium for SQL/browser; Windows local for type/lint/unit/docs. These are mocked AI and local-database results, not paid Gateway, messaging, vendor sandbox or live verification. [Independent static review](SPEC-06-SECURITY-REVIEW-2026-09-24.md) is separate from runtime acceptance.

Rollback: disable AI provider/budgets and follow-up processing, retain ledger, redemptions, offers, both outboxes and usage audit, then reconcile pending/unknown work before a history-preserving schema change. The additive `NOT VALID` visit/member tenant FK protects new visits while existing rows require an audit before validation. No real financial transaction or customer message occurred.
