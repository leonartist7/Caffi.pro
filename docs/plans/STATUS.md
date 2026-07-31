# aro — project status

Living document. Tracks what's actually done vs. missing against
`MASTER-PLAN-v2-operating-system.md`'s sequence, kept current as work
lands — update this file in the same PR as any status-changing work,
don't let it drift. Last updated: 2026-07-29.

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

- **Why it exists**: found while trying to actually test R4 live — an
  `aro_admin` account has no path into a venue's real owner console
  (`/home`, `/creative`) without a separate owner-role login per venue.
  Full rationale and spec: `PLAN-09-admin-venue-impersonation.md`.
- **Status**: ✅ **Merged to main** (PR #56, 2026-07-29). `lib/impersonation.ts`,
  the `/api/admin/impersonate` route, the `(owner)` layout wiring, the owner
  shell banner, the HQ "Operate as this venue" entry point. `tsc`/`build`
  green. **Still not verified live** — needs `IMPERSONATION_SECRET` set in
  Vercel and a real click-through, same as R3/R4's live-verification gaps.
  See `BUILD-LOG-admin-impersonation.md`.

## MASTER-PLAN-v2R — three parallel lanes (new, 2026-07-29)

`docs/plans/MASTER-PLAN-v2R-remastered.md` extends `MASTER-PLAN-v2` with a
larger backlog (loyalty strategy library, commerce/kitchen ops, team
management, delivery integrations, etc.), partitioned into three lanes
executed by separate autonomous sessions. Real state as verified directly
against `main`, the live `aro-platform` Supabase project, and remote
branches — not self-reported:

### Lane A — Loyalty & member growth: **active, 2 items in**

- **PLAN-10** (shared schema migration — loyalty/inventory/shifts tables
  for all three lanes): ✅ **applied live** to `aro-platform`
  (`batch_schema_lanes_abc`, confirmed via `list_migrations`). All 9 new
  tables (`loyalty_programs`, `member_offers`, `survey_responses`,
  `push_subscriptions`, `inventory_items`, `inventory_movements`,
  `menu_item_ingredients`, `staff_shifts`, `tip_allocations`) exist with
  RLS enabled. `get_advisors` (security): no ERROR/CRITICAL findings — 2
  tables show an informational "RLS enabled, no policy" note (safe
  default: zero anon/authenticated access, service-role code unaffected),
  the other 7 have real policies. The build log itself claimed this was
  "not live-applied" — that was true when written; someone applied it
  afterward. This entry reflects the live database, not the stale log.
- **PLAN-11** (Members directory rebuild): ✅ code-complete on `main`.
  Real pagination/search replacing a hard-capped client-filtered list;
  self-review caught and fixed 3 genuine bugs (a `postgrest-js` embedded-
  relation sort bug, a two-round-trip count race between the header total
  and pagination math, silent error-swallowing on `/regulars`). `aro`
  token refit, zero legacy classes (grep-verified). **Not verified live**
  — no Supabase MCP access in that execution session; verified by
  code-reading and local `tsc`/`build` only. See `BUILD-LOG-PLAN-11.md`'s
  own "Verification gap" section for the exact list of unexercised
  scenarios (pagination walk past 200+ members, live count cross-checks,
  actual browser responsive check).
- **Process deviation, both items**: pushed as direct commits to `main`
  (via a `claude/import-lane-a-work-branches-*` session), not through a
  draft PR — no CI check actually ran on either. Original branches
  (`sonnet/lane-a-plan10-schema-batch`, `sonnet/lane-a-plan11-members-directory`)
  still exist remotely if that history is needed.
- **Next**: PLAN-12 through PLAN-18 (Lane A's remaining v2R items) are
  unblocked now that PLAN-10 is confirmed live.

### Lane B — Commerce & kitchen ops: **no trace found**

No branch, no commit, no PR anywhere in the remote repo as of this check.
Either never fired, still queued, or errored before writing anything that
got pushed — indistinguishable from here. Check the Routine's run history
directly.

### Lane C — Team & platform polish: **no trace found**

Same as Lane B — nothing in the remote repo. Check the Routine directly.

### A likely root cause for both Lane A's verification gaps and B/C's silence

Lane A's own build logs state the Supabase MCP connector was not available
to that execution session (`enabledInChat: false` at the org level). If
Lanes B and C hit the same gap immediately on a schema-dependent first
item, that would explain silence rather than partial output — but this is
inference, not confirmed; only the Routine's own run log can say for sure.

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
4. **Set `IMPERSONATION_SECRET`** (PLAN-09, now merged) to enable the
   "Operate as this venue" flow.
5. Decide the fate of the legacy `Caffi.pro` Supabase project (see above).
6. **Check the Lane B and Lane C Routines directly** — neither has produced
   any commit, branch, or PR. Confirm whether they fired and errored, are
   still queued, or were never actually created, then re-fire or fix as
   needed.
7. **Grant the Supabase MCP connector to any future lane Routines** —
   Lane A's own build logs record it was missing, which is why PLAN-10/11
   are code-complete but not live-verified, and is the leading suspect for
   B/C's silence.
