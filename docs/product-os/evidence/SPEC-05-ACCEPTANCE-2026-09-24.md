---
id: spec-05-acceptance-2026-09-24
title: SPEC-05 acceptance evidence
status: verified-partial
updated: 2026-09-24
tags: [product-os, pos, evidence]
---

# SPEC-05 acceptance-to-test evidence

Draft [PR #88](https://github.com/leonartist7/Caffi.pro/pull/88) is stacked on unmerged #87. [CI 35996033354](https://github.com/leonartist7/Caffi.pro/actions/runs/35996033354) at 7d2de96 passes TypeScript, strict lint, 53 Vitest tests, Product OS validation, isolated build, complete disposable migration replay, all nine SQL suites (including spec05_pos_tests.sql), and four existing Playwright ordering/delivery tests. An earlier code-head [CI 35995828564](https://github.com/leonartist7/Caffi.pro/actions/runs/35995828564) reports the same results. Both aggregate runs fail solely on the existing critical production dependency audit; the check was not weakened. The local parallel build stopped on disk exhaustion and is not claimed passed locally.

| Acceptance | Direct evidence | Open verification |
|---|---|---|
| SPEC-05-AC-01 | Disposable SQL service-only privileges and pos_manager revoked/cross-tenant assertions; static Astra xhigh review | Dedicated POS API authorization/browser test |
| SPEC-05-AC-02 | SQL import/reimport, currency/partial rollback, exact modifier mapping and imported-field guard; five POS simulator unit assertions | Vendor menu import and availability race |
| SPEC-05-AC-03 | SQL single ticket after ambiguous timeout, same-key lookup and never-sent reconnect recovery; simulator unit replay | Genuine simultaneous workers, crash and stale-lease test |
| SPEC-05-AC-04 | SQL connected-order acknowledgement guard; earlier ordering/delivery browser regression passes | Connected POS order browser/API journey, cancellation race |
| SPEC-05-AC-05 | Responsive queue and reasoned recovery code, static authorization review | Mobile/keyboard/browser and error-state exercise |
| SPEC-05-AC-06 | F-04 record names Square/Clover as candidates only | Named client, authorized API/sandbox scope and real adapter |

Environment: GitHub Ubuntu disposable loopback PostgreSQL/Supabase and Chromium for SQL/browser; Windows local for type/lint/unit/docs. This is simulator/local-database evidence, not Square/Clover sandbox or live verification. Production dependency audit, Phase 1 OpenCode finding and unmerged dependency stack remain release blockers. [Independent static review](SPEC-05-SECURITY-REVIEW-2026-09-24.md) is separate from runtime acceptance.

Rollback: disable the POS connection and worker, retain all submissions, outbox, ticket, attempt and event records. Lookup possible sends before any manual recovery; do not delete history or create another vendor order to clear a failure.