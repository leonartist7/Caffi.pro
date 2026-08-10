# aro — project status

Living document. Tracks what's actually done vs. missing against
`MASTER-PLAN-v2-operating-system.md`'s sequence, kept current as work
lands — update this file in the same PR as any status-changing work,
don't let it drift. Last updated: 2026-08-10.

## 🔴 NOW tier

| #   | Item                      | Status                | Notes                                                                                                                                                                                                                     |
| --- | ------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | AURA lead-forwarding fix  | ❌ **Not done**       | Owner-action-only (Vercel env parity check on the AURA project). No code change needed; nobody has run the runbook in `MASTER-PLAN-v2` §R1 yet.                                                                           |
| R2  | Stripe production keys    | ❌ **Not done**       | Owner-action-only (paste live keys, run the test-mode-then-live verification in §R2). Checkout still shows STUBBED.                                                                                                       |
| R3  | Client websites (PLAN-05) | ✅ **Merged to main** | PR #55, merged 2026-07-29. Verified live against the real `aro-platform` Supabase project: `/site/the-roastery` renders real seeded data, hero/about/gallery/JSON-LD all confirmed via direct fetch.                      |
| R4  | Creative Studio CS-1/CS-2 | ✅ **Merged to main** | PR #54, merged 2026-07-29. Code verified live (login, DB connectivity), but the actual generation path is unverified — `OPENAI_API_KEY` is not yet set in Vercel, so every generate call still returns the STUBBED state. |

## 🟡 NEXT tier

All nine items (N1–N9) remain **not started**. R3+R4 landing unblocks N2
(site-copy assist) and N5's prerequisite (R4 "proven" — not yet, pending
the OpenAI key). Everything else is exactly as gated as `MASTER-PLAN-v2`
already describes (N1/N6 on vendor decisions, N7 on pricing decision,
N3/N4/N9 unblocked-but-unstarted).

## ⚪ LATER tier

Unchanged — nothing started, all correctly deferred.

## PLAN-09 — Admin venue impersonation (new, not in MASTER-PLAN-v2)

- **Why it exists**: found today while trying to actually test R4 live —
  an `aro_admin` account has no path into a venue's real owner console
  (`/home`, `/creative`) without a separate owner-role login per venue.
  Full rationale and spec: `PLAN-09-admin-venue-impersonation.md`.
- **Status**: built this session (`lib/impersonation.ts`, the
  `/api/admin/impersonate` route, the `(owner)` layout wiring, the owner
  shell banner, the HQ "Operate as this venue" entry point). `tsc`/`build`
  green. **Not yet verified live** — needs `IMPERSONATION_SECRET` set in
  Vercel and a real click-through, same as R3/R4's live-verification gaps.
  See `BUILD-LOG-admin-impersonation.md`.

## Lane A — Loyalty & member growth

Tracks `MASTER-PLAN-v2R-remastered.md` §6 Lane A (`PLAN-10`–`PLAN-19`).
This section didn't exist until now — Lane A's first two items landed via
direct commits to `main` before `STATUS.md`'s per-lane sections were
established (PR #60 backfilled the fact of their completion; this is the
first PR to give Lane A its own section, matching Lane B's and Lane C's).

- **PLAN-10 (Batch schema migration)**: ✅ **merged**. The schema
  foundation every Lane A/B/C item since has built on —
  `loyalty_programs`, `member_offers`, `survey_responses`,
  `push_subscriptions`, `members.birthday_month`/`birthday_day`, plus
  Lane B/C's tables in the same batch. Confirmed live via `list_tables`
  by every subsequent lane's preflight.
- **PLAN-11 (Members directory rebuild)**: ✅ **merged**. Real
  server-side pagination + search, replacing the silent 100-row cap that
  was quietly losing a venue's own customer graph past that count.
- **PLAN-12 through PLAN-18**: ❌ **not started** — no branches, no PRs,
  no spec docs existed anywhere in this repo as of this session
  (confirmed via `git ls-remote`, a full PR-history search, and a
  file/content grep across `app/`, `lib/`, `components/` on `main` for
  every Lane A table PLAN-10 already created — `push_subscriptions`,
  `member_offers`, `survey_responses` all have zero application code
  reading or writing them). This is offer engine core, bounce-back +
  appreciation, birthday + anniversary, referrals, surveys, mystery
  rewards, and the web push channel. **PLAN-12 (this PR)** is the first
  of the seven — see below.
- **PLAN-12 (Offer engine core)**: 🟡 **built, PR open**. The library's
  foundation every later program type configures rather than
  reimplements. `redeem_member_offer()` RPC mirrors the existing
  `redeem_reward()` exactly (row-lock + typed `ERRCODE`s +
  `service_role`-only), so the once-only redemption guarantee reuses an
  already-proven pattern rather than inventing a new one. Owner surface
  at `/loyalty` (program CRUD + issue-offer flow), counter redemption
  (`/api/counter/redeem-offer`, new "Have a code?" UI phase), member
  pass shows active offers. **Deliberate scope cut, stated with teeth
  same as PLAN-12's own master-plan framing**: only `points_value`
  credits anything in this PR (via `points_ledger`, the same mechanism
  the existing rewards system uses) — `value_cents`-type programs are
  schema-supported and redemption marks them used, but nothing wires a
  dollar value into checkout as an automatic discount, since no
  store-credit/discount mechanism exists anywhere in this codebase yet.
  The owner UI says so explicitly wherever a dollar value is entered.
  **Not verified live** — the Supabase MCP connector for `aro-platform`
  disconnected mid-session; every design claim was checked by reading
  the actual migration SQL and the existing `redeem_reward()` function
  directly, not assumed, but the three-concurrent-redemption race, the
  cross-venue rejection, and the three new `scripts/verify-live.mjs`
  checks are all unrun against a real database. `BUILD-LOG-PLAN-12.md`.

## Lane B — Commerce & kitchen ops

Tracks `MASTER-PLAN-v2R-remastered.md` §6 Lane B (`PLAN-20`–`PLAN-29`).
Preflight confirmed live Supabase MCP access to `aro-platform`
(`jjgccfrwjkwknyjtbtxa`); PLAN-10's schema batch (already merged by Lane A)
confirmed live via `list_tables` — `inventory_items`, `inventory_movements`,
`menu_item_ingredients`, `tip_allocations`, `orders.tip_cents`/
`accepted_at`/`ready_at` all present before any Lane B work began. (This
section has been rewritten clean more than once to collapse duplicate
entries left behind by several PRs' STATUS.md diffs conflicting with each
other as they landed back-to-back on `main` — see git history for each
PR's own original wording if needed. If you're resolving a STATUS.md
conflict on a future Lane B PR: replace the whole section, don't try to
union the prose.)

- **PLAN-20 (Tips on QR orders)**: ✅ **merged** (PR #61). `orders.tip_cents`
  flows end-to-end: checkout tip selector → `create_storefront_order`
  (12-arg, tip-validated) → Stripe charge → confirmation/counter/HQ tip
  lines. Real bug found and fixed in the same PR:
  `transition_order_status` was awarding loyalty points on `total_cents`
  instead of `subtotal_cents`, silently inflating points on every tipped
  order once PLAN-10 added `tip_cents` into `total_cents`. Post-merge
  review (Codex + CodeRabbit) caught 4 real issues, all fixed in a
  follow-up commit before merge: malformed custom-tip input silently
  submitting a $0 tip, counter tips always labelled CAD regardless of
  venue currency, the tip-settings toggle racing another writer of
  `brand_kit`, and server-side `tip_cents` not being validated/enforced
  against the delivery-tip setting. `BUILD-LOG-PLAN-20.md`.
- **PLAN-21 (Post-payment review prompt)**: ✅ **merged** (PR #67). Owner
  pastes a review URL into `brand_kit.review_profile.url` (same
  zero-migration namespacing as `tip_config`), saved atomically via
  `set_venue_review_url` — same single-statement JSONB-merge pattern
  PLAN-20 had to retrofit after a real race-condition finding, built in
  from the start here. Prompt shows once per order per browser profile
  (`localStorage` flag checked before first render, no migration needed;
  a `storage` listener re-syncs it across tabs on the same order),
  anti-gating enforced structurally (no rating input exists in the
  component at all). Verified live, fully transactional, including the
  atomicity proof (an unrelated `brand_kit` key and `tip_config` both
  survive a review-URL save untouched). Post-review hardening before
  merge fixed a real 🟠 cross-venue data leak (the confirmation page
  now verifies the order's own `venue_id` matches `params.slug`, 404ing
  on mismatch) and a real 🔴 unbounded-replay gap on the review-event
  endpoint (now gated on order-settled status + a DB-level unique index
  deduplicating per order/event-type). One pre-existing, out-of-scope
  gap flagged, not fixed: `kitchen-settings`/`clients` routes still do a
  whole-object `brand_kit` read-modify-write, so either can still clobber
  a review URL saved mid-race — same systemic gap `tip_config` already
  has since PLAN-20, needs its own pass across all `brand_kit` writers.
  `BUILD-LOG-PLAN-21.md`.
- **PLAN-22 (Kitchen display)**: ✅ **merged** (PR #62). Dedicated
  `/kitchen` route (same counter PIN session as `/counter`), ticket-age
  colour escalation, chime (muted by default, `AudioContext` primed
  inside the unmute click for autoplay-policy correctness), wake-lock
  always-on display mode. **Real architectural finding, escalated rather
  than improvised**: true Supabase Realtime on `orders` is not safely
  wireable today — `orders` RLS has zero policies (service-role only) and
  the counter/kitchen session is a custom HMAC cookie, never a Supabase
  Auth session, so a browser client has no legitimate way to subscribe to
  `postgres_changes` without either loosening `orders` RLS (tenant-
  isolation change) or minting a scoped custom JWT via a new
  `SUPABASE_JWT_SECRET` (not configured anywhere in this env). Shipped a
  3-second poll instead, honestly labelled as polling. **Still needs a
  Fable-tier architecture decision before real Realtime is attempted** —
  see `BUILD-LOG-PLAN-22.md`.
- **PLAN-23 (Inventory foundation)**: ✅ **merged** (PR #63). Items CRUD,
  receive/waste/count/adjust movements, derived on-hand, below-par
  flagging. `BUILD-LOG-PLAN-23.md`.
- **PLAN-24 (Perpetual depletion)**: ✅ **merged** (PR #64). Idempotency
  design authored by a dedicated Opus-5 architect pass; the savepoint-
  isolation guarantee (a depletion failure never rolls back the payment)
  proven live by forcing a real failure. `BUILD-LOG-PLAN-24.md`.
- **PLAN-25 (Food costing & margin report)**: ✅ **merged** (PR #65).
  Read-model only — cost/margin arithmetic entirely in Postgres NUMERIC,
  three-state recipe completeness so a partial recipe never produces a
  number that looks like a real cost. `BUILD-LOG-PLAN-25.md`.
- **PLAN-26 (86-ing / stock-out)**: ✅ **merged** (PR #66). Two flags on
  `menu_items` (`is_86ed`, `auto_86ed`) with structural manual-outranks-
  automatic enforcement; checkout rejection reuses the existing
  `ITEM_UNAVAILABLE` catalog-lookup mechanism. `BUILD-LOG-PLAN-26.md`.
- **All seven Lane B items (PLAN-20 through PLAN-26) are now built and
  merged.** Remaining Lane B work is the small deferred follow-ups each
  build log already flags: a kitchen-side 86'd indicator (PLAN-26's build
  log), an "Oversold" pill on the inventory page (PLAN-24's build log),
  and the open Realtime architecture decision from PLAN-22 (needs a
  Fable-tier call before anyone attempts it).

## Lane C — Team & platform polish

Tracks `MASTER-PLAN-v2R-remastered.md` §6 Lane C (`PLAN-30`–`PLAN-37`, the
range v2R's file-ownership header nominally extends to `PLAN-39` but only
enumerates concrete items through `PLAN-37`). Preflight confirmed live
Supabase MCP access to `aro-platform` (`jjgccfrwjkwknyjtbtxa`);
`staff_shifts`/`tip_allocations` (PLAN-10) both live before any Lane C
work began. Each item is its own branch off fresh `origin/main` (never
stacked), so these show up as separate open PRs until they merge; resolve
a STATUS.md conflict here by replacing this whole section, not unioning
prose, same rule as Lane B's note above.

- **PLAN-30 (Owner shell nav unification)**: ✅ **merged** (PR #68).
  `owner-shell.tsx`'s hardcoded `NAV` array now derives from
  `lib/modules.ts` (`OWNER_ITEMS` + a new `ownerModules()` helper) — Lanes
  A/B never need to touch `owner-shell.tsx` again to add an owner nav entry,
  just append a `surface: 'owner'` module row. The three previously-dead
  links now resolve to real pages: `/rewards-admin` (full CRUD against the
  existing `/api/rewards` routes), `/campaigns` (honest `ComingSoon` state —
  marketing sends are blocked on a vendor decision, v2R §8, not Lane C's to
  build), `/venue-settings` (tip delivery-prompt toggle + review-URL field,
  both live against PLAN-20/21's existing routes).
  **Real architectural finding, resolved rather than improvised**: the
  owner's Settings page could not live at literal path `/settings` —
  `app/(dashboard)/settings/page.tsx` already owns that URL, and Next.js
  route groups don't affect the URL, so a second `page.tsx` at the same path
  in a different route group is a build-time collision, not just a style
  clash. Confirmed via a clean `npm run build` with both `/settings` and
  `/venue-settings` as distinct routes. **Real pre-existing gap found, not
  fixed** (out of this PR's file ownership): `/home`, `/creative`, and
  `/regulars` each re-derive their venue via `resolveOwnerVenueId` directly
  with no impersonation check, so an `aro_admin` impersonating a venue
  (PLAN-09) gets a blank page on all three today. The three new pages this
  PR owns use a new `resolveEffectiveOwnerVenueId` helper
  (`lib/impersonation.ts`) so the gap doesn't grow; the existing three pages
  are Lane A's/unowned and were left alone. **Not verified live**: this
  sandbox has no `SUPABASE_SERVICE_ROLE_KEY` (only the anon key is
  obtainable via the MCP connector), so no interactive click-through as a
  real owner or impersonating admin was possible — `tsc`/`build`/`eslint`
  are green, the two tables the new pages depend on (`rewards`,
  `venues.brand_kit`) were confirmed live via a direct MCP query, and the
  new routes were smoke-checked (no crash) against a local dev server.
  `BUILD-LOG-PLAN-30.md`.
- **PLAN-31 (HQ aro refit, part 1 — shared components)**: ✅ **merged**
  (PR #69). Style-only token refit of the 11 shared components v2R names
  (`Sidebar`, `MobileNav`, `StatCard`, `SkeletonLoader`, `ThemeToggle`,
  `TenantSelector`, `ConfirmDialog`, `ComingSoon`, `LiveClock`,
  `app/error.tsx`, `app/(dashboard)/error.tsx`) — zero
  `coffee-*`/`cream-*`/`dark-*` remaining, zero logic/prop/structure
  changes (full diff read end-to-end before commit). **Real, confirmed
  design finding**: zero of the ~46 files already on the aro token system
  anywhere in the repo use a `dark:` variant class — the aro palette has no
  dark counterpart, it's one warm palette. This PR's refit follows that
  precedent (deletes `dark:` rather than inventing a token that doesn't
  exist), which means `ThemeToggle.tsx`'s toggle is now fully decorative on
  every aro-token page (a pre-existing condition this PR extends to three
  more files, not one it introduces) — whether to retire dark-mode support
  outright is a product call above a style-only refit PR, flagged here.
  Contrast for every new text/background pairing measured against the
  W3C relative-luminance formula and tabulated in the PLAN file — all pass
  WCAG AA; one candidate (white on solid `aro-rose`, 2.61:1) was computed,
  rejected, and replaced with `aro-ink` on the same background (6.15:1)
  before it reached any component. `BUILD-LOG-PLAN-31.md`.
- **PLAN-32 (HQ aro refit, part 2 — dashboard/clients/activity/analytics)**:
  ✅ **merged** (PR #70). Style-only refit of the 4 pages, including
  `analytics/page.tsx`'s Recharts color props (treated as in-scope style
  values, same category as PLAN-31's `iconBgColor` default — Recharts has
  no className-based way to color an SVG line/bar/pie segment). A
  contrast bug was caught **before** it shipped this time: a first pass at
  the dashboard's "New leads" tile measured 4.03:1 and was fixed to
  14.24:1 before ever being committed, by keeping the accent color on the
  icon only and moving text to `aro-ink`. `BUILD-LOG-PLAN-32.md`.
- **PLAN-33 (HQ aro refit, part 3 — settings/staff/rewards + sweep)**:
  ✅ **merged** (PR #71). Refit the final 3 pages plus a real gap the
  repo-wide sweep found: `app/(dashboard)/layout-client.tsx` was never
  assigned to any of PLAN-31/32/33's file lists despite being Lane C's own
  file and in this document's own refit inventory — fixed here (2 lines).
  **The sweep itself required a temporary local merge** of the still-open
  PLAN-31/32 branches to verify the true combined repo-wide state (a sweep
  on a branch forked from unmerged `main` alone would falsely flag every
  file those two PRs already fixed) — merge was verification-only, never
  pushed, reset away before the real commit. Final repo-wide result:
  only `app/shop/[slug]/error.tsx` (Lane B) remains; Lane A's two members
  files are already clean (PLAN-11), not merely excused. This closes out
  the N8 HQ refit across all three PRs: 18 files, zero
  `coffee-*`/`cream-*`/`dark-*` left except the one Lane B file, three
  real accessibility bugs found and fixed across the three PRs.
  `BUILD-LOG-PLAN-33.md`.
- **PLAN-34 (Team management suite)**: ✅ **merged** (PR #72). Extends the
  existing `app/api/staff/**`, doesn't invent a new surface — manager-
  escalation prevention and deactivation-history preservation were already
  fully server-enforced (confirmed live against `memberships`'s `role`
  CHECK constraint via Supabase MCP, matching the route's own
  `VALID_ROLES`). The one real gap: `/staff` had zero server-side role
  gating (like every other `(dashboard)` page except `/dashboard` itself)
  — a `staff`-role user hitting it got the full page shell then
  silently-failing API calls, a 403 wall by another name. Fixed: split
  into a server-gated wrapper (`page.tsx`) that wrong-door-redirects
  staff-only users to `/counter` before any client JS ships, plus a new
  `staff-client.tsx` (independently already on `aro` tokens) with one new
  addition — an Edit modal for name/role, wired to the existing `PATCH`
  route (no new API surface, no new authorization logic). The merge
  friction this PR originally flagged against PLAN-33's parallel refit of
  the same page was resolved at merge time: PLAN-33's monolithic
  `page.tsx` was superseded by this PR's server/client split, which had
  already independently converged on the same `aro` tokens. Not verified
  live (no service-role key in this sandbox) — the escalation-prevention
  and redirect claims are verified by reading the exact code paths and
  cross-checking the live schema, not a live session. `BUILD-LOG-PLAN-34.md`.
- **PLAN-35 (Time clock)**: ✅ **merged** (PR #73). Clock in/out through
  the counter PIN session (`app/api/counter/shift`), backed entirely by
  PLAN-10's `staff_shifts` — zero new migrations. The DB's partial unique
  index (`uq_staff_shifts_open_per_membership`) is the actual "one open
  shift" guarantee, proven live with a real insert that hit `23505`, not
  reimplemented in application code. Owner-facing shift list + two
  distinct correction actions at `app/(dashboard)/staff/shifts`: "close a
  stuck shift" (in-place `ended_at` on the original `source='counter'`
  row — proven live to preserve `shift_id`/`started_at`/`source`
  untouched) vs. "add a missed shift" (a wholly separate `source='manual'`
  row) — these are two different real-world situations, not one design
  with two names; see `BUILD-LOG-PLAN-35.md` for why collapsing them into
  one action would either double-count hours or leave a person unable to
  clock in again. Duration is computed at read time everywhere, never
  stored. `scripts/verify-live.mjs` gained the authenticated-non-owner
  -denied check for `staff_shifts` (couldn't execute the full script
  live in this sandbox — no populated env keys — so the underlying RLS
  fact it asserts was verified directly via `pg_policies` instead, see
  build log). **Merge note**: this PR's own "Shifts" nav link originally
  targeted PLAN-34's since-superseded monolithic `staff/page.tsx`; at
  merge time it was re-applied onto PLAN-34's `staff-client.tsx` split
  instead, using that file's already-`aro`-token button styling — no
  functional change, same route (`/staff/shifts`), same icon. `tsc`/
  build/eslint green, grep gate clean.
- **PLAN-36 (Tip allocation report)**: ✅ **merged** (PR #74). Money-
  adjacent — an Opus-5 architect pass (Fable 5 unavailable in this
  environment) authored the full allocation design before any code:
  two-level apportionment (pool → membership → their own shifts),
  largest-remainder/`BigInt` arithmetic proven exact on a deliberately
  indivisible amount ($100.00 / 3 → `3333/3333/3334`), zero floats
  anywhere in `lib/tips/allocate.ts` (grep-verifiable). **One genuine
  policy question was escalated** — whether owner/manager memberships
  share in the tip pool by default. Asked the user directly; no answer
  came back. Resolved via the architect's own explicit fallback: **no
  stored or pre-selected default anywhere** — the report requires an
  explicit include/exclude choice every run. Zero new tables — populates
  the already-live `tip_allocations` (PLAN-10) via one new
  `SECURITY DEFINER`, `service_role`-only RPC, serialized on
  `(venue_id, period_start, period_end)` via a transaction-scoped advisory
  lock. Owner-only (`requireVenueRole(['owner'])`).

  **Mandatory architect-tier pre-merge math review: done.** An independent
  pass (no context from the design/build session) ran a property-based
  harness — 20k+ randomized trials plus every named edge case — and found
  one real bug (`findOverlappingShifts` missed containment overlaps) plus
  a docstring correction, both fixed. A separate Codex/CodeRabbit
  post-draft review then found the original page was **structurally
  unreachable for a real solo owner** — it lived only under `(dashboard)`,
  whose venue selector is aro_admin-only. Fixed by extracting the UI into
  `components/tips/TipsReportClient.tsx` (parameterized by `venueId`) and
  adding a real `app/(owner)/tips` registered as an `owner_tips` module in
  `lib/modules.ts` (the admin-only path moved to `/tips-admin` to resolve
  the resulting route collision — same class PLAN-30 hit for `/settings`
  vs `/venue-settings`). Also fixed: venue-timezone-aware period parsing
  (never the browser's), a 1000-row pagination cap on the orders/shifts
  queries that could silently undercount a busy venue's pool, a raw-RPC-
  error leak, and a stale-preview-after-save bug. Full detail:
  `docs/plans/PLAN-36-tip-allocation.md`, `docs/plans/BUILD-LOG-PLAN-36.md`
  (see its "Post-review pass" section for the complete finding-by-finding
  list, including two flagged-not-fixed items with reasoning).

- **PLAN-37 (Hours + tips CSV export)**: ⚪ **spec only, PR #75 open
  (draft).** No implementation yet — deliberately parked behind PLAN-36's
  math review and route-shape changes so it wasn't building against a
  contract that might still move. Now that PLAN-36 is merged with its
  final `/tips-admin` + `/tips` route shapes, PLAN-37 is unblocked.

## Recommendation folded in today: HQ ↔ venue-console unification

Raised by the owner after seeing the visual/structural gap between the
`(dashboard)` HQ shell (leads/clients, coffee/cream skin) and the
`(owner)` venue console (`/home`/`/creative`, new `aro`-token skin).
Decision, recorded here so it isn't re-litigated:

- **One tenant product, not two.** The venue console stays the single
  product every café owner uses — never a separate, lesser "admin preview"
  clone. PLAN-09's impersonation is the correct way for the operator to
  enter it, not a parallel UI.
- **N8 (HQ refit, `MASTER-PLAN-v2` §N8) is re-prioritized.** It was
  scheduled as low-priority "filler work" in the original sequencing;
  given the mismatch is now visibly undermining the product's perceived
  polish to its own operator, it should move up the 🟡 tier rather than
  wait. `MASTER-PLAN-v2` itself is not being edited to reflect this
  re-prioritization yet — that's a call for whoever sequences the next
  batch of work, flagged here so it isn't lost.
- **Client-tier feature cuts are explicitly parked** (owner's own
  instruction, 2026-07-29) — not decided, not blocking anything above.

## Known doc inaccuracies found this session (not yet fixed)

- `.env.example`'s Supabase section states the original `Caffi.pro`
  Supabase project (`ugppbaavzevmdkblniim`) "was paused >90 days and is
  unrecoverable." **This is false as of 2026-07-29** — queried directly
  via the Supabase MCP connector; the project is `ACTIVE_HEALTHY` with its
  original legacy schema intact (`tenants`, `users`, `menu_items`, etc.,
  all 0 rows). It also has **RLS disabled on 4 tables**
  (`tenants`, `categories`, `menu_items`, `tenant_manifests`) — a real
  exposure if that project's anon key is ever used anywhere, though
  nothing in the current codebase appears to reference it. Left as-is
  pending an explicit owner decision (pause it, lock down its RLS, or
  decommission outright) rather than touched unilaterally.
- This was also the root cause of two separate production incidents today:
  Vercel's `NEXT_PUBLIC_SUPABASE_ANON_KEY` and (suspected)
  `SUPABASE_SERVICE_ROLE_KEY` had been pasted from this old project
  instead of `aro-platform`, causing silent auth failures with no useful
  error message. Fixed for the anon key (confirmed via decoding the JWT
  baked into the production bundle); the service-role key fix was
  in-progress with the owner as of this document's last update — confirm
  current state before assuming it's resolved.

## What actually needs a human right now

1. **R1, R2** — owner-only env/dashboard actions, zero code.
2. **Confirm `SUPABASE_SERVICE_ROLE_KEY`** in Vercel is the `aro-platform`
   project's key, not the legacy `Caffi.pro` project's — this was mid-fix
   when this document was last updated.
3. **Set `OPENAI_API_KEY`** to unstub Creative Studio generation.
4. **Set `IMPERSONATION_SECRET`** (PLAN-09) to enable the new "Operate as
   this venue" flow.
5. Decide the fate of the legacy `Caffi.pro` Supabase project (see above).
