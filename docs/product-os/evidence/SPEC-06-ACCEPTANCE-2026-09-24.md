---
id: spec-06-acceptance-2026-09-24
title: SPEC-06 acceptance evidence
status: verified-partial
updated: 2026-09-24
tags: [product-os, growth, evidence]
---

# SPEC-06 acceptance-to-test evidence

Draft [PR #89](https://github.com/leonartist7/Caffi.pro/pull/89) is stacked on unmerged #87. [CI 35996037621](https://github.com/leonartist7/Caffi.pro/actions/runs/35996037621) at 8b9059c passes TypeScript, strict lint, 53 Vitest tests, Product OS validation, isolated build, complete disposable migration replay, all nine SQL suites (including spec06_growth_tests.sql), and four existing Playwright ordering/delivery tests. An earlier code-head [CI 35995872126](https://github.com/leonartist7/Caffi.pro/actions/runs/35995872126) reports the same results. Both aggregate runs fail solely on the existing critical production dependency audit; the check was not weakened. The local parallel build stopped on disk exhaustion and is not claimed passed locally. The subsequent owner member-history view was not present in those CI runs and requires a fresh check.

| Acceptance | Direct evidence | Open verification |
|---|---|---|
| SPEC-06-AC-01 | Owner member view now reads only explicit same-venue member-linked orders, reservations and delivery jobs after profile authorization; no contact matching | New view build/browser, two-tenant and revoked-owner route tests |
| SPEC-06-AC-02 | SQL replay, distinct-key overspend refusal, revoked counter and single refund reversal; append-only ledger RLS | Genuine simultaneous redemption/refund sessions and rounding boundary |
| SPEC-06-AC-03 | SQL paid-offer outbox enqueue/claim/finish; webhook/cron retry and period-key code | Interrupted issue, replay after crash, referral/review-prompt and consent journeys |
| SPEC-06-AC-04 | Five mocked AI tests cover grounding and output validation; prompt uses same-venue facts | Route/provider spies, untrusted-content and cross-tenant browser/API tests |
| SPEC-06-AC-05 | SQL venue budget cap, cross-tenant settlement refusal and client-role denial; Gateway adapter checks catalogue | Paid provider sandbox/model, genuine concurrent reservations and usage settlement |
| SPEC-06-AC-06 | Review-only draft flow; no send/publish capability added | Mobile/keyboard owner/guest browser and real-device push/consent checks |

Environment: GitHub Ubuntu disposable loopback PostgreSQL/Supabase and Chromium for SQL/browser; Windows local for type/lint/unit/docs. These are mocked AI and local-database results, not paid Gateway, messaging, vendor sandbox or live verification. [Independent static review](SPEC-06-SECURITY-REVIEW-2026-09-24.md) is separate from runtime acceptance.

Rollback: disable AI provider/budgets and follow-up processing, retain ledger, redemptions, offers, outbox and usage audit, then reconcile pending/unknown work before a history-preserving schema change. No real financial transaction or customer message occurred.
