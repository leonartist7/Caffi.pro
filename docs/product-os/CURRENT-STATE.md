---
id: current-state
title: Executive diagnosis
status: accepted-strategy
updated: 2026-09-22
baseline: 05022ffd797bea8149a44bcac3959c648158b594
tags: [product-os]
---

# Executive diagnosis

Baseline: [main at 05022ff](https://github.com/leonartist7/Caffi.pro/tree/05022ffd797bea8149a44bcac3959c648158b594/). See [evidence and limitations](EVIDENCE.md), [GitHub inventory](evidence/GITHUB-2026-09-20.md), and [capability map](CAPABILITY-MAP.md).

Caffi.pro is a Next.js 14 / React 18 application with ARO HQ, venue-owner, counter/kitchen, customer ordering, loyalty pass and venue website surfaces. It has substantive ordering, reservations, loyalty, inventory and team code. It is not an empty prototype, but neither code breadth nor deployment success proves operational readiness. [Package](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/package.json), [route inventory](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/app), [module registry](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/lib/modules.ts).

## What is established
- All 82 historical PRs were inventoried: 79 merged, 3 closed unmerged (#9, #53, #60), none open at snapshot. PLAN-10–18, PLAN-20–26 and PLAN-30–37 have merged PR evidence. This does not mean nonexistent PLAN-19 or PLAN-27–29 were implemented.
- Six SQL suites exist under [supabase/tests](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/tests). No package-level test script or application unit/browser test suite was found in app/lib/components. Historical JS connection checks are not a regression suite.
- No root AGENTS.md or CLAUDE.md existed. The vendored [Spec Kit AGENTS](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/spec-kit-main/AGENTS.md) governs that toolkit, not the application.
- Vercel lists a READY production deployment for this exact main SHA. The GitHub status agrees. Both relevant Supabase projects report INACTIVE in a read-only project inventory on 2026-09-20. No database was resumed.
- A server-side AI abstraction exists, but selects direct OpenAI, not Gateway. Apple/Google wallet endpoints and owner campaigns are explicitly stubbed/coming soon. [AI provider](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/lib/ai/provider.ts), [wallet](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/app/api/wallet), [modules](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/lib/modules.ts).

## 2026-09-21 SPEC-01 update
- `requireVenueRole` now constrains membership lookup to `is_active = true` and fails closed when returned membership data is incomplete. Its Vitest matrix records the pre-fix revoked owner/manager/admin failure and now passes 13 mocked gate tests, including same-org access and guessed cross-tenant resource IDs. This is application-boundary evidence, not an RLS or live proof.
- Type check and zero-warning lint pass. The Creative Studio informational section no longer applies unsupported `aria-disabled` semantics. A production-equivalent build command now supplies fixture-only environment values and is wired into CI; local completion remains pending because this workstation's Next/Webpack compilation outlasted the command wrapper before emitting a terminal result.
- Resettable fixture definitions and local-only `db:reset`/`test:db` commands exist. Local migration/RLS/SQL/browser verification is blocked here because Supabase CLI, Docker and `psql` are unavailable; no hosted project was contacted.

## 2026-09-22 SPEC-02 update
- Connected-ordering code now reserves a fingerprinted checkout operation before any provider effect, uses a stable Stripe provider idempotency key, a strict local-only fixture-venue test payment adapter, server-generated guest tracking tokens, opening-hour checkout refusal and active-membership rechecks on kitchen requests. Signed provider events have a durable service-only reconciliation ledger. Delivery selection remains a restaurant fulfillment selection; it does not book or represent a courier.
- 27 Vitest assertions cover opening hours, synthetic-provider isolation, provider retry key/recovery, payment event ordering, safe paid-order cancellation refusal, revoked counter access, cross-tenant counter IDs and guest tracking status. The fixture-only SQL suite adds server price, changed-cart operation rejection, invalid modifier, duplicate operation, cross-tenant item and dispatch-boundary checks, but local replay remains blocked by absent Supabase CLI/Docker/psql.
- `npm run build:isolated` passes with network access. The restricted sandbox cannot fetch the app's Google Fonts, which causes a local-only font-fetch failure before compilation; this is recorded separately from the successful build. Provider sandbox, Playwright journey and live checks are not run.

## Ten highest-leverage issues
| Priority | Finding and evidence | Next action |
|---|---|---|
| 1 | Relevant database projects INACTIVE; current runtime parity unknown. [Service evidence](evidence/SERVICES-2026-09-20.md) | Prepare isolated demo environment; founder decides restoration, never silently resume production |
| 2 | `requireVenueRole` now filters active memberships and has mocked revoked-access/cross-tenant regression coverage. Independent security review and local RLS replay remain pending. | Review [SPEC-01](specs/SPEC-01-quality-and-access.md) evidence; complete local DB verification before closing the authorization gate |
| 3 | Delivery checkout supports postal-prefix zones, not courier dispatch. [Storefront](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/lib/storefront.ts), [checkout](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/components/storefront/CheckoutForm.tsx) | SPEC-03: durable delivery foundation and simulator |
| 4 | Stripe session creation lacks an explicit provider idempotency option; refund webhook reconciliation is deferred. [Adapter](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/lib/payments/adapters/stripe.ts), [webhook](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/app/api/webhooks/stripe/route.ts) | SPEC-02: prove concurrent checkout/recovery behavior and reconcile refunds before live delivery |
| 5 | Vitest, strict lint, type, documentation and isolated build commands are now separately wired in PR CI. Local DB/browser checks remain blocked and `next build` still requires a terminal local/CI result. | Use the new quality workflow and local fixture runbook; do not treat unavailable DB/browser checks as passed |
| 6 | Historical loyalty/browser verification is incomplete, even where PRs merged. [PLAN-12 log](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-12.md), [PLAN-18 log](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-18.md) | SPEC-06: concurrent redemption/referral, scheduler and real-device push qualification |
| 7 | HQ impersonation is inconsistent across owner pages. [Home](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/app/(owner)/home/page.tsx), [helper](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/lib/impersonation.ts) | SPEC-02: one effective venue resolution and audited operator journey |
| 8 | Courier/POS access, first market and payment account model are undecided. [Founder gates](FOUNDER-DECISIONS.md) | Parallel feasibility evidence; no vendor promises |
| 9 | Workflow is comment-triggered and uses a moving third-party action reference; caller trust needs review. [Workflow](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/.github/workflows/opencode.yml) | SPEC-01: document trust boundary, pin dependency, restrict trusted triggers in separate code PR |
| 10 | Old entry points conflict: stale PR status, outdated setup file, unsafe blanket dev-RLS advice, AI provider assumptions. [Old README](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/README.md), [status](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/STATUS.md) | Canonical Product OS links, targeted corrections, preserve historical logs |

These are static findings unless specifically marked verified by a test. They are not a penetration test or proof of exploitation.

## Preserved, uncertain and obsolete
Keep merged modules and current schema. Do not replay historical branches onto main; inventory ancestry separately and review candidate changes by diff. Historical build logs sometimes report live SQL checks, but those checks have not been reproduced against today's environment. Do not promote those reports to current live verification.

The old assertion that the legacy database is “unrecoverable” is unsupported; INACTIVE does not establish recoverability or present RLS. Historical RLS exposure needs a fresh metadata review after authorized restoration.

No percentage-complete estimate is defensible. The useful maturity measure is the [execution ledger](EXECUTION-LEDGER.md).

## 2026-09-22 Phase 3 review checkpoint

The baseline delivery gaps above now have implementation in draft [PR #87](https://github.com/leonartist7/Caffi.pro/pull/87): quote-bound checkout, durable simulator dispatch/reconciliation, own-driver authorization and milestones, staff recovery and minimal guest tracking. [Independent contract and implementation review](evidence/SPEC-03-IMPLEMENTATION-REVIEW-2026-09-22.md) is accepted for its exact recorded revisions. Simulator-only operation remains restricted to disposable synthetic infrastructure. Full synthetic SQL/browser acceptance now passes at `3b07268` in [CI 35777014123](https://github.com/leonartist7/Caffi.pro/actions/runs/35777014123); the [ledger](EXECUTION-LEDGER.md) records passing and failed runs separately. [PR #86](https://github.com/leonartist7/Caffi.pro/pull/86) contains independent Uber Direct feasibility and offline fixtures; no external courier adapter or sandbox/live coverage exists. Critical dependency audit and OpenCode findings remain unresolved.
