---
id: handoff-2026-09-21-spec-01
title: Handoff: SPEC-01 quality and active access
status: review
updated: 2026-09-21
tags: [product-os, handoff, spec-01]
---

# Handoff: SPEC-01 quality and active access

Back to [SPEC-01](../specs/SPEC-01-quality-and-access.md), [ledger](../EXECUTION-LEDGER.md), [local test environment](../local-test-environment.md) and [DEC-004](../decisions/DEC-004-quality-access-boundary.md).

## Dependency and ownership

- Base dependency: draft PR #83 Product OS strategy at `2e24f4164d61a4d48b2046c3750429e5f94f506a`; it remains open, clean and unmerged.
- Branch: `codex/spec-01-quality-access`.
- Implementation commit: `e4cf496c72e60a718668afc69c9a636f450bccc1`; workflow hardening commit: `2379707`.
- Owned paths: `lib/authz.ts`, `components/owner/CreativeStudio.tsx`, quality/test configuration, local fixture scripts, workflows and Product OS records.

## Completed scope and acceptance evidence

| Acceptance ID | Evidence | Environment |
|---|---|---|
| SPEC-01-AC-01 | `npm run test:unit` passed 13 tests. It first failed with inactive owner, manager and `aro_admin` memberships receiving `ok: true`; the repaired query and fail-closed match deny them. Session, missing venue and database failure response paths are also covered. | Mocked Node/Vitest; no database contacted. |
| SPEC-01-AC-02 | Same suite permits same-venue/org-wide active memberships, permits only active platform admins globally, denies unrelated venue/org/disallowed roles, and exercises stored-resource-first guessed row behavior. | Mocked Node/Vitest; does not prove RLS. |
| SPEC-01-AC-03 | `npm run type-check`, `npm run lint:strict`, `npm run test:unit`, and `node docs/product-os/check.mjs` pass. `.github/workflows/quality.yml` runs type, lint, unit, docs and isolated build independently. | Local Windows checkout; CI not yet run. |
| SPEC-01-AC-04 | `npm run lint:strict` reports zero warnings after replacing invalid region `aria-disabled` usage with semantic static status content. | Local Windows checkout. |
| SPEC-01-AC-05 | `supabase/seed.sql`, `npm run db:reset`, `npm run test:db` and [runbook](../local-test-environment.md) provide an isolated two-org/three-venue synthetic fixture design. | Not run: Supabase CLI, Docker and `psql` absent. |

## Unresolved checks and blockers

- `npm run build:isolated` starts an isolated build and compiles through a long Next/Webpack/Sentry phase, but this workstation's command wrapper did not capture a terminal success/failure. Treat the build gate as **not run**, not passed. The CI workflow has a 20-minute limit and is the next repeatable check.
- `npm run audit:dependencies` fails as intended on one critical Next.js advisory (plus lower-severity production dependency findings). Its available automatic fix requires a breaking Next 16 upgrade, which is outside SPEC-01; the failing CI audit remains enabled rather than weakened.
- Migration replay, all six SQL suites and RLS cross-tenant denial are **blocked** by missing local Supabase CLI/Docker/`psql`; no hosted or live database was queried.
- Playwright browser/fixture journey is **not run** because the disposable database and browser install are unavailable. The test configuration is present and does not silently mark absence as success.
- Provider sandbox and live verification are **not run**. No provider account, paid service, live configuration, database, deployment or customer communication changed.
- Authorization and tenant-isolation gates require an independent Astra xhigh security review. This review is requested in the draft PR and remains incomplete.

## Migration, rollback and next action

No migration changed. Roll back application behavior by reverting `e4cf496`; this restores the prior unsafe revoked-access behavior, so only use it for an emergency compatibility investigation and preserve audit evidence. Revert `2379707` independently only if the agent workflow must be restored; it is security-hardening-only.

Exact next action: have an independent security reviewer inspect `lib/authz.ts`, `tests/authz.test.ts`, and the workflow diff; then run the draft PR's `quality` workflow. Triage the critical Next.js advisory in a separately scoped framework-upgrade/security patch. On a machine with Docker, Supabase CLI and `psql`, run `npm run db:reset`, set the local loopback `SUPABASE_TEST_DATABASE_URL`, and run `npm run test:db` before adding Playwright fixture navigation coverage.
