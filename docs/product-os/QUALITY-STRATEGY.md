---
id: quality-strategy
title: Quality and release strategy
status: accepted-strategy
updated: 2026-09-20
baseline: 05022ffd797bea8149a44bcac3959c648158b594
tags: [product-os]
---

# Quality and release strategy

Back to [Product OS](README.md). Implement through [SPEC-01](specs/SPEC-01-quality-and-access.md); see current [verification results](evidence/VERIFICATION-2026-09-20.md).

## Test architecture
Use Vitest for pure domain and route tests, Playwright for guest/owner/staff journeys, and disposable local Supabase/Postgres for SQL and RLS integration. Preserve the six existing SQL scripts and execute with psql ON_ERROR_STOP against disposable fixtures; they are not automatically pgTAP suites merely because they are SQL tests.

Fixtures include two organizations, two venues in one organization, unrelated venue, owner, manager, staff, inactive memberships, operator, guest and expired tracking session. Provider fakes are deterministic and network-disabled. Sandbox provider tests are opt-in and never run on untrusted PRs.

## Required pipeline
Lockfile install; type-check; lint:strict; unit/API tests; migration replay and SQL/RLS tests; build with isolated fixture configuration; Playwright smoke journeys; dependency and secret scanning; documentation-link/ledger validation. Run checks separately because next.config.js skips lint during ordinary build. Audit all severities explicitly; .npmrc currently sets audit-level=critical.

A test job must fail on assertion failure or absent required fixtures. No success-by-skip for release-critical checks. GitHub branch rules need founder configuration approval; documented policy alone does not enforce them.

## Journey acceptance
1. Guest browses, selects valid modifiers, pays in test mode, sees status; kitchen receives once.
2. Courier quote expires or cart changes: revalidate before payment; no silent price increase.
3. Dispatch timeout: reconcile, never book a second courier blindly.
4. Webhook replay/out-of-order/forged event: no duplicate or regressed state.
5. Delivery failure: visible staff exception and supported recovery; refund status reconciles.
6. POS rejected/unknown submission: reconcile external reference before retry; no duplicate ticket.
7. Revoked staff or another venue's identifier: denied with no data leak.
8. Concurrent loyalty redemption/referral: one intended credit; retry does not lose promised work.
9. Real iOS/Android push permission, delivery, unsubscribe and stale subscription cleanup before push is called live.
10. Keyboard, screen-reader labels, contrast, reduced motion and 375/768/1440px layouts.

## Release evidence and monitoring
A release record identifies commit, migration version, environment, tests, known gaps, rollback and approval. READY deployment is infrastructure evidence only. Track order failure, webhook age, pending payment age, dispatch lag, reconciliation backlog, POS acknowledgement lag, tenant access denials and per-tenant AI spend.

Before production: preview/staging verification, environment identity checks without logging secrets, founder approval, then controlled end-to-end real delivery. Before the first 90-day programme is called complete: no unresolved critical cross-tenant or duplicate-money-side-effect findings.

Production rollback disables new effects and preserves audit data; reconciliation continues under operator control.
