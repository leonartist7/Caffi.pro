---
id: handoff-2026-09-24-spec-05
title: SPEC-05 POS implementation handoff
status: active
updated: 2026-09-24
tags: [product-os, pos, handoff]
---

# SPEC-05 POS connection handoff

Back to [spec](../specs/SPEC-05-pos-connection.md), [ledger](../EXECUTION-LEDGER.md), [registry](../INTEGRATION-REGISTRY.md).

Branch codex/spec-05-pos-connection starts from b0c3052936ed78d02ada5fcb6d5a7494b11378c1, the verified open draft PR #87 head on 2026-09-24. PRs #83–#87 are open drafts, not merged. The original checkout was preserved. The branch disables Vercel Git deployment. SPEC-05 owns POS boundary, simulator, migration, queue and recovery API/UI. SPEC-06 is a separate branch from the same dependency.

AC-01: service-only tenant-scoped connection, mapping, submission, outbox and event data; stored-resource-first owner/manager route. AC-02: complete versioned import, category/item/modifier mapping and imported-field ownership guard. AC-03: paid-order trigger persists one operation key, worker lease and lookup after possible send. AC-04: acceptance and delivery readiness require POS acknowledgement; rejection/unknown/absent remain visible. AC-05: responsive staff queue and reasoned recovery action. AC-06: no vendor adapter or sandbox claim without F-04.

Local checks on Windows: TypeScript, strict lint and all 53 Vitest tests pass. POS-specific five tests are mocked simulator contracts. The SQL suite is written but not locally run because Supabase CLI, Docker and psql are unavailable. Genuine concurrency, RLS/API and browser proof await disposable CI. Provider sandbox and live checks are not run. Astra xhigh independent review found reconciliation and menu ownership issues; fixes are in this branch, final sign-off is pending exact-head re-review and runtime evidence.

The user named Square and Clover as common candidates, but did not identify a first client or grant authorized API/sandbox access. F-04 remains open. No vendor capability, certification or connectivity is claimed. The first approved adapter needs a named merchant, scope, environment, credential custody, webhook protocol and timeout/reconciliation evidence.

Migration is additive. Deploy schema before code only after approval. Rollback disables connection/worker and preserves submission, ticket, attempt and event history. Never drop unresolved work or create a second vendor order as a retry. No production deployment, hosted database mutation, vendor call, payment, message or courier effect occurred.

Next owner: PR reviewer and Astra xhigh security reviewer. Run disposable migration/SQL/browser/API and genuine concurrent-worker tests; resolve findings; then obtain F-04 and a vendor sandbox for a separately reviewable real adapter.