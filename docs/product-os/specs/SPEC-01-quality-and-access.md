---
id: SPEC-01
title: Quality foundation and active access
status: ready-spec
updated: 2026-09-21
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

| ID | Contract and observable result | Failure cases | Verification method |
|---|---|---|---|
| SPEC-01-AC-01 | `requireVenueRole(venueId, roles)` authenticates before service-role access, resolves the stored venue/org, and only returns `{ ok: true, ctx }` for an **active** membership with an allowed role. | Missing/failed session is 401; absent venue is 404; membership query failure is 500; inactive owner, manager or `aro_admin` is 403. | Vitest mock matrix with a deliberate failing inactive-owner assertion captured before the fix. |
| SPEC-01-AC-02 | Venue access is scoped to the stored venue: active same-venue roles and active org-wide roles in the same org pass; a different venue or organization fails. Active `aro_admin` has the documented platform-wide venue gate. | Guessed row ID never authorizes from a caller-supplied venue; unrelated membership returns a non-leaking 403. | Vitest unit/route-gate tests; two-tenant SQL deny fixture test when a local database is available. |
| SPEC-01-AC-03 | Quality commands are independently invocable and assertion failures fail their job: type check, zero-warning lint, unit tests, build, database checks and browser smoke. | Build must not hide lint failure; missing fixture/database/browser is reported as blocked, never success-by-skip. | `package.json` scripts and PR workflow; local command evidence. |
| SPEC-01-AC-04 | The Creative Studio "coming soon" content is non-interactive semantic content and has no unsupported ARIA state. | Strict lint reports the existing `role-supports-aria-props` warning. | `npm run lint:strict`. |
| SPEC-01-AC-05 | Local test data is isolated and resettable: synthetic two-org/two-venue fixtures and an explicit reset/replay procedure never use production credentials. | Missing Docker/Supabase CLI/fixture database blocks SQL and Playwright verification with an exact reason. | Versioned local fixture/readme and `db:reset`/`test:db` scripts where supported. |

### Authorization contract

`requireVenueRole` remains a server-only API boundary. Its membership query must constrain `user_id` and `is_active = true`; authorization also treats an absent or false `is_active` value as denied. The venue record supplies the only authoritative `venue_id` and `org_id`. Venue-scoped memberships match that venue; org-wide memberships match the venue's org; `aro_admin` remains a platform role only when active. The function preserves its existing response contract: 400 invalid venue input, 401 unauthenticated, 404 unavailable venue/resource, 403 authenticated-but-forbidden and 500 authorization dependency failure.

`requireRowVenueRole` first resolves the stored `tenant_id`/`venue_id` from the resource then delegates to this contract. Callers continue to scope their service-role queries with `gate.ctx.venueId`; no route may trust a body/query venue ID after authorization.

### Test environments

Mocked Vitest tests prove route-gate branching and query shape; they do not prove RLS. Local database checks replay migrations into an isolated disposable Supabase/Postgres instance, seed synthetic organizations/venues/memberships, then run all six SQL suites plus a two-tenant denial assertion. Playwright uses the same local fixture environment and never receives a production service-role key. Provider sandbox and live checks are out of scope and remain separately recorded as not run.

## Dependencies, risk and release gate
**Dependencies:** Product OS accepted; local dependency installation. Hosted fixture environment remains F-02; local-only test work is ready.

**Risks:** Overbroad aro_admin bypass, legacy tenant_id/venue_id mismatch, false-positive mocked tests and tests accidentally pointed at live databases.

**Release gate:** Type-check, strict lint, tests and isolated build pass; Astra xhigh reviews authorization and workflow trust. Production rule changes require founder approval.

**Lead:** GPT-5.6 Terra high. Sensitive changes require independent GPT-6 Astra xhigh review. Bounded non-sensitive subwork may use Sol high or Luna medium–high under the worker protocol.

## Ready-to-paste worker prompt
> Implement SPEC-01 on a new codex branch from current main. First reproduce inactive-membership authorization with a failing test; repair it without expanding role access. Add the documented repeatable quality checks and fix the existing aria-disabled lint warning. Use disposable data only. Run tests, update EXECUTION-LEDGER.md with exact results, and open a draft PR; do not merge or change production.
