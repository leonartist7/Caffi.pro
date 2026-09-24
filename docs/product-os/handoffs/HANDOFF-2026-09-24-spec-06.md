---
id: handoff-2026-09-24-spec-06
title: SPEC-06 growth implementation handoff
status: active
updated: 2026-09-24
tags: [product-os, growth, handoff]
---

# SPEC-06 growth and creative handoff

Back to [spec](../specs/SPEC-06-growth-and-creative.md), [ledger](../EXECUTION-LEDGER.md), [registry](../INTEGRATION-REGISTRY.md).

Draft [PR #89](https://github.com/leonartist7/Caffi.pro/pull/89) at 969b09fa4a055653d95237bd0103d27d8080137e targets open #87. Branch codex/spec-06-growth-creative starts from b0c3052936ed78d02ada5fcb6d5a7494b11378c1, the verified open draft PR #87 head on 2026-09-24. PRs #83–#87 are unmerged. SPEC-05 is independent [PR #88](https://github.com/leonartist7/Caffi.pro/pull/88) from the same base. The original checkout was preserved and this branch disables Vercel Git deployment.

AC-01: the owner member page reads explicitly linked same-venue orders, reservations and delivery jobs; no contact-based identity merge was introduced. AC-02: refunded completed-order earn reverses once in an append-only ledger; counter redemption checks active membership and a venue-scoped operation key while locking the member row. AC-03: paid orders create durable offer follow-up work; webhook replays and the existing authenticated daily cron retry with per-program period-key dedup. AC-04: bounded menu/program/stats facts enter draft prompts as untrusted venue data; output is validated. AC-05: Gateway has an explicit server-only provider choice and model catalogue check, with disabled-by-default per-venue token reservation/audit. AC-06: draft flow remains review-only with no customer sends or campaign publication.

Local Windows checks: TypeScript, strict lint and all 53 Vitest tests pass. Five new AI tests use mocked provider/facts. New SQL is not run locally: Supabase CLI, Docker and psql are absent. The local isolated build stopped on ENOSPC. [CI 35996037621](https://github.com/leonartist7/Caffi.pro/actions/runs/35996037621) passes isolated build, nine SQL suites and four existing ordering/delivery browser tests at the pre-history-view head; the new view needs a fresh CI/browser check. No provider sandbox, paid Gateway call, mobile device or live check occurred. Genuine concurrent redemption/budget sessions and dedicated revoked/cross-tenant route assertions remain pending. The in-memory counter retry key does not survive a page reload; the API still deduplicates any replay that supplies the original key. Independent Astra xhigh [static review](../evidence/SPEC-06-SECURITY-REVIEW-2026-09-24.md) approved 8b9059c; the owner history view requires re-review. See [acceptance evidence](../evidence/SPEC-06-ACCEPTANCE-2026-09-24.md).

The outbox is additive. If rollout must stop, disable generation/provider configuration and cron/webhook follow-up calls, preserve points, redemptions, offer work and AI usage rows, then reconcile unknown work before schema removal. No production deployment, hosted database mutation, real financial effect, paid AI call, customer message or campaign publication occurred.

External gates: F-06 sender/consent and real-device push qualification; explicit model/budget approval for paid Gateway; critical dependency audit and OpenCode supply-chain finding; upstream PR review/merge. Next owner: CI and Astra xhigh reviewer, then Phase 5 owner for onboarding and release qualification. Do not mark growth/live gates complete from mocked tests.
