---
id: handoff-2026-09-22-spec-03
title: SPEC-03 delivery implementation handoff
status: active
updated: 2026-09-22
tags: [product-os, delivery, handoff]
---

# SPEC-03 delivery foundation

Back to [spec](../specs/SPEC-03-delivery-foundation.md), [contract packet](../specs/SPEC-03-contract-review.md), [ledger](../EXECUTION-LEDGER.md).

## Verified dependency and ownership

Working branch: codex/spec-03-delivery-foundation. Base: ef3afe239aba282604670496675ea72e73250a99, open draft PR #85, verified against GitHub and clean local checkout on 2026-09-22. Its ancestors are open drafts #84 at c1b51d998eec961b00830d17bb5662737d4d5366 and #83 at 2e24f4164d61a4d48b2046c3750429e5f94f506a. Phase 1/2 implemented, still in review. #85 current application CI passes; dependency audit fails. Phase 2 Astra xhigh static review accepted, without SQL/browser proof. OpenCode supply-chain finding remains open.

Root implementation owner owns delivery core, shared migrations, API, checkout integration and this ledger. Independent CI worker owns quality workflow/config/support. SPEC-04 worker owns its separate Caffi-spec04 worktree and codex/spec-04-first-courier branch, initially sharing the same #85 base. No competing migration writer.

## First gate

No independent Astra ultra delivery approval found in inspected Product OS, #83-85 review evidence or relevant roadmap task history. Concrete packet revision 1 committed as 5cb5b63; independent Astra ultra review is active. Shared implementation waits for its disposition. Standalone simulator scenario fixtures, CI preparation and Uber research are eligible in parallel.

## Evidence and external boundaries

Stable SPEC-03-AC-01 through AC-09 are defined in the spec. Initial packet Product OS validation passes. No delivery implementation, database, browser, provider-sandbox or live success is claimed at this checkpoint. This Windows host lacks Docker and psql; user selected disposable GitHub CI for database/browser verification. User confirmed no Uber sandbox access.

Both delivery branches must carry explicit Vercel git.deploymentEnabled=false branch entries before their first push, following the official Vercel Git configuration documentation. No deployment command, hosted SQL, provider activation, courier, refund or customer message is authorized.

## Resume

Resolve contract review findings; record approval of exact revision; implement and test bounded slices. Publish separate draft PRs with deployment exclusions verified. Schema rollout is additive and local/CI only. Rollback disables new delivery effects and preserves financial/operational history; never erase jobs to retry a courier.

## Implementation checkpoint (PR #87)

Revision 2 of the contract packet at ad4b16d786eeee59409dc0cbfe52d22f5580da23 received independent GPT-6 Astra ultra approval before dependent implementation. See the [review evidence](../evidence/SPEC-03-CONTRACT-REVIEW-2026-09-22.md). The earlier pending checkpoint above is historical.

All nine slices now have code: additive tenant-scoped SQL and privileged RPCs, quote-bound checkout, durable fenced outbox processing, persistent deterministic simulator effects, authenticated event inbox, staff queue, own-driver capability/assignment/milestones, and minimal guest tracking. External provider construction fails closed. Simulation requires explicit flags, the exact synthetic venue and loopback Supabase, and is disabled on Vercel and in production.

Independent Astra xhigh implementation review found driver response overexposure, stranded ambiguous cancellation, browser-key-dependent quote recovery, own-driver reconciliation regression, missing assignment reason/destination, replay affected by mutable tip policy and incorrect quote rate-limit status. Fixes and regression coverage are present; final re-review and CI execution remain pending at this checkpoint.

Acceptance mapping: AC-01/03/04/05/08 exercise SQL in supabase/tests/spec03_delivery_tests.sql; AC-02/05/06/09 exercise tests/spec-03-delivery.test.ts; AC-08 adds tests/spec-03-driver-response.test.ts; AC-03/04/07/08/09 exercise real browser/API/database journeys in tests/e2e/delivery-journey.spec.ts. Test presence is not an execution result.

Initial isolated CI exposed an older demo migration requiring an absent venue. Its demo inserts now run only when that optional venue exists; five legacy suites use the seeded synthetic venue. No assertions are skipped. Full migration replay, SQL/RLS and browser results remain pending. Local unit, type, lint and documentation checks are recorded separately from CI.

## Operations and rollback

Run workers through the authenticated delivery worker endpoint. Unknown create outcomes remain reconciliation-required with the original operation key; never create again or fail over after possible-send. Operators use a reasoned reconcile action, inspect the persisted attempts/events and leave unresolved absence for manual confirmation. Never delete history to unlock a second booking. Cancellation and delivery can race; lookup establishes the resulting state. Refund and paid re-dispatch are denied by default.

Owner/manager grants or revokes venue-specific driver capability and assigns an eligible driver. Every confirmation rechecks membership, capability and assignment. Guests see only confirmed own-driver milestones; no GPS or invented ETA.

Migration 20260922190224_spec03_delivery_foundation.sql is additive. Replay only on disposable infrastructure for this PR. Rollback first disables CAFFI_DELIVERY_MODE and worker invocation, while retaining tables, attempts, event history and controlled reconciliation access. Do not drop tables with outstanding or unresolved effects; schema reversal requires a separately reviewed history-preserving migration. Both scoped branches disable Vercel Git deployment; no deployment checks were emitted on their initial published commits.

SPEC-04 remains separate in draft PR #86. No credentials, commercial eligibility, provider-sandbox lifecycle or live results exist. Critical dependency audit, prior OpenCode finding, sandbox access and separately authorized controlled real delivery remain external gates.

## Independent implementation review resolution

Astra xhigh approved `51773223293e049b258b8d4f545e0e1770d6146a` after all ten findings were resolved. See [review evidence](../evidence/SPEC-03-IMPLEMENTATION-REVIEW-2026-09-22.md). Local suite now passes 48 tests. CI `35773987675` passed migration replay and eight legacy RLS checks but failed the outdated ordering amount-mismatch expectation. That expectation now asserts Phase 2 reconciliation and blocks further payable attempts. Run `35774596919` owns the subsequent full SQL/browser result; pending at this checkpoint. No runtime success is inferred from static approval.

## Runtime failure checkpoint

CI `35774596919` passed disposable migration replay and six of eight SQL suites (RLS, ordering, reservations, costing, 86-ing and SPEC-02). The depletion suite attempted a refund that SPEC-02 deliberately denies; its regression must assert that denial and exercise reversal with an explicit synthetic database fixture. SPEC-03 exposed a PL/pgSQL record/table-alias collision in cart pricing. The local Auth preparation also exposed the installed Supabase client requiring native WebSocket, unavailable under the prior Node 20 CI runtime; quality jobs now select Node 22. Browser tests did not execute in this failed run. These observed failures are preserved rather than described as passing from static review.

## Isolated database acceptance checkpoint

CI `35775213367` at `47b8573450a70b5863ea9bb2c29c388b9b0c0aa7` passed all eight required SQL suites, including SPEC-03 address/quote invariants, dispatch uniqueness, fenced worker recovery, event reconciliation, cancellation and driver safeguards. Six synthetic Auth identities sign in. The existing local Auth browser test passed; the first full delivery journey timed out and its cleanup error obscured the failing action, causing two serial tests not to run. The aggregate correctly failed. Next revision uses independent journeys and bounded action timeouts with redacted synthetic DOM diagnostics. Full browser acceptance remains incomplete.

CI `35776319568` repeats all eight SQL passes and passes genuine webhook/API/database/owner-driver quarantine assertions plus local Auth. Both checkout journeys stop at a test locator: the DOM snapshot exposes the named Delivery service combobox, while exact getByLabel cannot resolve the nested select label. The next revision uses its observed accessible combobox role. No product assertion is weakened.

## Final synthetic acceptance evidence

Tested application head: `3b07268948e04e79dfaddf45df3e83c7c32eb25c`, draft [PR #87](https://github.com/leonartist7/Caffi.pro/pull/87). [CI 35777014123](https://github.com/leonartist7/Caffi.pro/actions/runs/35777014123) passes types, strict lint, 48 unit tests, docs, isolated build, complete disposable migration replay, all eight SQL suites and all four browser tests. Browser journeys verify own-driver and simulator delivery from checkout through guest delivered status, concurrent dispatch yielding one booking, and authenticated/replayed webhook quarantine with owner/driver isolation. Auth uses six ephemeral local synthetic identities. No route mocks are used in these browser journeys.

The failed checkpoints above are retained. The final selector correction targets the observed accessible combobox; no assertion was removed. Simulator milestones use persisted synthetic state and a controlled SQL clock for failure scenarios; the browser simulator journey observes real elapsed time, only bringing scheduled outbox work due. These results are isolated-database/simulator evidence, not Uber sandbox or live evidence.

Environment: Ubuntu 24.04, Node 22.23.2, checksum-pinned Supabase CLI 2.117.0, disposable loopback PostgreSQL and Chromium. This workstation still lacks Docker/psql; it did not run the database checks itself. External gates: critical Next.js dependency audit, Phase 1 OpenCode supply-chain finding, authorized courier sandbox/account/service-area access and separately authorized controlled real delivery. SPEC-04 remains its own draft PR #86. No merge, deployment, hosted database mutation, paid activation, real courier/refund or customer message.

Resume: review the two scoped drafts and dependency stack. Do not reopen completed synthetic gates merely because external credentials remain absent. Before adapter implementation, rebase SPEC-04 onto the accepted SPEC-03 implementation contract, target its branch while unmerged, and add opt-in sandbox evidence. Keep effects disabled pending the documented external gates.
