---
id: SPEC-01
title: Quality foundation and active access
status: ready-spec
updated: 2026-09-20
tags: [product-os, execution-packet]
---

# SPEC-01: Quality foundation and active access

Back to [worker protocol](../WORKER-PROTOCOL.md), [ledger](../EXECUTION-LEDGER.md) and [roadmap](../ROADMAP.md).

## Objective and scope
Add Vitest route/domain tests and Playwright fixture journeys; wire separate CI checks. Reproduce and fix requireVenueRole accepting inactive memberships. Audit all callers touched, active org-wide roles and platform admins. Pin/restrict the existing comment-triggered workflow in a separate commit. Fix the baseline CreativeStudio aria-disabled lint warning using valid interaction semantics.

**Non-goals:** No provider activation, live RLS edits, framework upgrade or cosmetic redesign.

## Ownership and constraints
**Owned modules:** lib/authz.ts, authorization callers, test configuration/fixtures, package scripts/lockfile, .github/workflows, the bounded CreativeStudio accessibility correction.

Authentication first; stored resource tenant before privileged access; active membership is required for venue, org-wide and platform roles. Preserve anonymous 401, authenticated forbidden 403 and non-leaking resource handling. CI runs without production credentials.

## Acceptance and test plan
An inactive owner, manager or aro_admin cannot pass the venue gate. Active same-venue and active same-org permitted roles pass; unrelated org/venue roles fail. A real failing assertion makes CI red. Strict lint has zero warnings. Documentation tests cannot substitute for application tests.

**Tests:** Vitest matrix for session failure, database failure, inactive roles and guessed row IDs; two-tenant SQL deny tests; Playwright login/role navigation; fresh disposable migration replay and all six SQL scripts.

## Dependencies, risk and release gate
**Dependencies:** Product OS accepted; local dependency installation. Hosted fixture environment remains F-02; local-only test work is ready.

**Risks:** Overbroad aro_admin bypass, legacy tenant_id/venue_id mismatch, false-positive mocked tests and tests accidentally pointed at live databases.

**Release gate:** Type-check, strict lint, tests and isolated build pass; Astra xhigh reviews authorization and workflow trust. Production rule changes require founder approval.

**Lead:** GPT-5.6 Terra high. Sensitive changes require independent GPT-6 Astra xhigh review. Bounded non-sensitive subwork may use Sol high or Luna medium–high under the worker protocol.

## Ready-to-paste worker prompt
> Implement SPEC-01 on a new codex branch from current main. First reproduce inactive-membership authorization with a failing test; repair it without expanding role access. Add the documented repeatable quality checks and fix the existing aria-disabled lint warning. Use disposable data only. Run tests, update EXECUTION-LEDGER.md with exact results, and open a draft PR; do not merge or change production.
