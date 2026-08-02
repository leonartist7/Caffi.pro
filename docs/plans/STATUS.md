# aro — project status

Living document. Tracks what's actually done vs. missing against
`MASTER-PLAN-v2-operating-system.md`'s sequence, kept current as work
lands — update this file in the same PR as any status-changing work,
don't let it drift. Last updated: 2026-08-01.

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

Tracks `MASTER-PLAN-v2R-remastered.md` §6 Lane C (`PLAN-30`–`PLAN-39`).
Preflight confirmed live Supabase MCP access to `aro-platform`
(`jjgccfrwjkwknyjtbtxa`); PLAN-10's schema batch (Lane A) and all of Lane B
(PLAN-20–26) confirmed merged before any Lane C work began. (PLAN-30
through PLAN-34 all landed as separate PRs in the same session — none had
merged to `main` by the time the next one branched, so this section is
duplicated verbatim in each of their PRs' `STATUS.md` diffs; the first one
to actually merge is the version of this section that sticks; whoever
merges the next should keep the merged version's entries and just append
its own, not silently drop an already-merged item's writeup.)

- **PLAN-30 (Owner shell nav unification)**: ✅ built (PR #68, draft). Nav
  derives from `lib/modules.ts`; `/rewards-admin`, `/campaigns`,
  `/venue-settings` all built (not literal `/settings` — route collision
  with the HQ dashboard's own route). Pre-existing impersonation gap on
  `/home`/`/creative`/`/regulars` found, flagged not fixed. Soon-badge
  contrast bug found and fixed post-review (4.38:1 → 6.63:1).
  `BUILD-LOG-PLAN-30.md`.
- **PLAN-31 (HQ aro refit, part 1 — shared components)**: ✅ built
  (PR #69, draft). 11 shared components refit, zero legacy tokens.
  Confirmed design finding: the aro palette has no dark-mode counterpart,
  so `dark:` classes are deleted repo-wide, not translated — `ThemeToggle`
  is now fully decorative on every aro page (pre-existing, not introduced
  here). Same Soon-badge bug independently caught and fixed; two
  hand-calculation transcription errors in its own contrast table
  corrected after switching to a verification script. `BUILD-LOG-PLAN-31.md`.
- **PLAN-32 (HQ aro refit, part 2 — dashboard/clients/activity/analytics)**:
  ✅ built (PR #70, draft). 4 pages refit including Recharts color props.
  A contrast bug in a new "New leads" tile caught and fixed _before_
  commit. `BUILD-LOG-PLAN-32.md`.
- **PLAN-33 (HQ aro refit, part 3 — settings/staff/rewards + sweep)**:
  ✅ built (PR #71, draft). Final 3 pages refit plus a real gap the
  repo-wide sweep found: `app/(dashboard)/layout-client.tsx` was never
  assigned to any of the three refit PRs' file lists despite being Lane
  C's own file — fixed (2 lines). The sweep itself required a temporary,
  never-pushed local merge of PLAN-31+32 to verify the true combined
  state (a sweep on a branch forked from unmerged `main` alone would
  falsely flag files those PRs already fixed). Final repo-wide result:
  only Lane B's `app/shop/[slug]/error.tsx` remains; Lane A's two members
  files already clean from PLAN-11. This closes the N8 HQ refit across
  all three PRs. `BUILD-LOG-PLAN-33.md`.
- **PLAN-34 (Team management suite)**: ✅ built (PR pending). Extends the
  existing `app/api/staff/**`, doesn't invent a new surface — read the
  routes in full before writing anything, since manager-escalation
  prevention and deactivation-history preservation were **already fully
  server-enforced** (confirmed live against `memberships`'s
  `role` CHECK constraint via Supabase MCP, matching the route's own
  `VALID_ROLES`). The one real gap: `/staff` had zero server-side role
  gating (like every other `(dashboard)` page except `/dashboard`
  itself) — a `staff`-role user hitting it got the full page shell then
  silently-failing API calls, a 403 wall by another name. Fixed: split
  into a server-gated wrapper (`page.tsx`) that wrong-door-redirects
  staff-only users to `/counter` before any client JS ships, plus the
  existing client component (`staff-client.tsx`, now `aro`-token from the
  start) with one new addition — an Edit modal for name/role, wired to
  the existing `PATCH` route (no new API surface, no new authorization
  logic). **Known merge friction, flagged not fixed**: PLAN-33 (#71,
  still open) refits the same page's tokens as a single file; this PR
  splits it into two — whichever merges second needs to manually combine
  both diffs, same class of friction as the `STATUS.md` duplication above.
  Not verified live (no service-role key in this sandbox) — the
  escalation-prevention and redirect claims are verified by reading the
  exact code paths and cross-checking the live schema, not a live
  session. `BUILD-LOG-PLAN-34.md`.

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
