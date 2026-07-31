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
(`jjgccfrwjkwknyjtbtxa`) before starting; PLAN-10's schema batch (already
merged by Lane A) confirmed live via `list_tables` before any Lane B work
began.

- **PLAN-20 (Tips on QR orders)**: ✅ built, migration applied live, **PR
  #61 open**. Also fixed a real bug in the same PR: `transition_order_status`
  was awarding loyalty points on `total_cents` instead of `subtotal_cents`,
  silently inflating points on every tipped order. See `BUILD-LOG-PLAN-20.md`.
- **PLAN-22 (Kitchen display)**: ✅ built, **PR #62 open**. Dedicated
  `/kitchen` route. **Real architectural finding, escalated rather than
  improvised**: true Supabase Realtime on `orders` isn't safely wireable
  today (`orders` RLS has zero policies, counter/kitchen auth is a custom
  cookie, not a Supabase session) — shipped a 3s poll instead, honestly
  labelled, and flagged the JWT/RLS architecture decision needed before
  real Realtime is attempted. See `BUILD-LOG-PLAN-22.md`.
- **PLAN-23 (Inventory foundation)**: ✅ built, PR pending. Items CRUD,
  receive/waste/count/adjust movements with server-side sign conventions,
  derived on-hand (never stored), below-par flagging. Verified live: the
  reconciling-delta math for physical counts, the append-only trigger
  (attempted a real `UPDATE`/`DELETE`, both correctly rejected), and the
  `ON DELETE RESTRICT` FK that blocks deleting an item with movement
  history (correctly caught and turned into a friendly message). New page
  at `/menu/inventory`; nav entry appended to `lib/modules.ts`. See
  `BUILD-LOG-PLAN-23.md`.
- Built out of dependency order deliberately: PLAN-21 (review prompt)
  depends on PLAN-20 merging first (both touch `OrderStatus.tsx`); PLAN-22
  and PLAN-23 needed only PR-0/PLAN-10 (both merged), so they were picked
  up while PLAN-20 was in review rather than idling, per the lane's own
  dependency graph (§10).
- **Next**: PLAN-21 once PLAN-20 merges; PLAN-24 (perpetual depletion —
  needs Fable-authored idempotency design per the master plan, since a
  double-fired Stripe webhook decrementing stock twice is silent and
  unrecoverable) → PLAN-25 (food costing) → PLAN-26 (86-ing).

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
