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
(`jjgccfrwjkwknyjtbtxa`); PLAN-10's schema batch confirmed live before any
Lane B work began.

- **PLAN-20 (Tips)**: ✅ built, migration applied live, **PR #61 open**.
  `BUILD-LOG-PLAN-20.md`.
- **PLAN-22 (Kitchen display)**: ✅ built, **PR #62 open**. True Supabase
  Realtime flagged as an open architecture decision. `BUILD-LOG-PLAN-22.md`.
- **PLAN-23 (Inventory foundation)**: ✅ built, **PR #63 open**.
  `BUILD-LOG-PLAN-23.md`.
- **PLAN-24 (Perpetual depletion)**: ✅ built, **PR #64 open**.
  Idempotency design authored by a dedicated Opus-5 architect pass; the
  savepoint-isolation guarantee proven live by forcing a real failure.
  `BUILD-LOG-PLAN-24.md`.
- **PLAN-25 (Food costing & margin report)**: ✅ built, **PR #65 open**.
- **PLAN-25 (Food costing & margin report)**: ✅ built, PR pending.
  Read-model only, no new tables — a `LANGUAGE sql STABLE` function doing
  all cost/margin arithmetic in Postgres NUMERIC (exact decimal), never
  JavaScript. Three-state recipe completeness (`none`/`partial`/`complete`)
  so a partial recipe never produces a number that looks like a real cost.
  **Verified live, fully transactional (zero residue)**: hand-computed
  per-item cost matched exactly; the central ranking proof (a 99%-margin,
  zero-sales item correctly ranked below a 16.7%-margin, 100-units-sold
  item) confirmed the report ranks by earned margin, not percentage alone;
  zero-price item showed `NULL` margin_pct, never `Infinity`/`NaN`.
  `BUILD-LOG-PLAN-25.md`.
- **PLAN-26 (86-ing / stock-out)**: ✅ built, PR pending. Two flags on
  `menu_items` (`is_86ed`, `auto_86ed`) with a `CHECK` enforcing
  auto-implies-86'd; a single recompute function driven by two triggers
  (`inventory_movements` insert — covers manual movements and PLAN-24's
  automatic sale depletion alike — and `menu_item_ingredients` insert/
  update/delete, for immediate effect on recipe changes). Manual-outranks-
  automatic is structural: the recompute function only ever touches a row
  it itself set `auto_86ed = true` on; the manual toggle endpoint always
  clears that flag. Checkout rejection reuses the existing
  `ITEM_UNAVAILABLE` catalog-lookup mechanism from `create_storefront_order`
  rather than a parallel path. **Verified live, fully transactional (zero
  residue)**: immediate auto-86 on a fresh ingredient link (no movement
  needed), a 2-ingredient item staying 86'd until _both_ ingredients are
  restocked, and the central proof — a manually-86'd item staying 86'd
  through a restock that, in the same transaction, auto-restored a
  different item depending on the identical ingredient. Two trigger
  functions were caught by `get_advisors` defaulting to `PUBLIC` EXECUTE
  grants and hardened to `service_role`-only before commit. **Deferred**:
  a kitchen-side 86'd indicator — `app/kitchen/**` (PLAN-22) doesn't exist
  on this branch yet and has no menu-browsing surface today regardless;
  the counter-side banner (which does have a real, existing surface) is
  built. `BUILD-LOG-PLAN-26.md`.
- Built out of dependency order deliberately, more than once: PLAN-21
  (review prompt) is waiting on PLAN-20 to merge (both touch
  `OrderStatus.tsx`); PLAN-22/23 needed only PR-0/PLAN-10; PLAN-24 needed
  PLAN-23's _schema_ (already live) but had to recreate two small
  application files from PLAN-23's unmerged PR (flagged in
  `BUILD-LOG-PLAN-24.md`, a straightforward union-merge conflict when both
  land). PLAN-25 needed no such recreation — it's a pure read-model with
  no overlapping files. PLAN-26 mirrored `create_storefront_order` against
  whatever's actually on `main` today (still the pre-tip 11-arg version) —
  expect a normal 3-way reconciliation of that function's `aro_schema.sql`
  entry once PLAN-20/22/23/24/25/26 land in sequence.
- **Next**: PLAN-21 once PLAN-20 merges. All items v2R assigns to Lane B
  (PLAN-20, 22–26) have now been built; remaining work is driving each PR
  to green and through review.
  no overlapping files.
- **Next**: PLAN-21 once PLAN-20 merges; PLAN-26 (86-ing / stock-out).
  Also fixed a real bug: `transition_order_status` awarded points on
  `total_cents` instead of `subtotal_cents`. `BUILD-LOG-PLAN-20.md`.
- **PLAN-22 (Kitchen display)**: ✅ built, **PR #62 open**. Dedicated
  `/kitchen` route; true Supabase Realtime flagged as an open architecture
  decision (custom-cookie auth + zero RLS policies on `orders`), shipped a
  3s poll instead, honestly labelled. `BUILD-LOG-PLAN-22.md`.
- **PLAN-23 (Inventory foundation)**: ✅ built, **PR #63 open**. Items
  CRUD, receive/waste/count/adjust movements, derived on-hand, below-par
  flag. Append-only trigger and `ON DELETE RESTRICT` both proven from real
  attempts, not cited. `BUILD-LOG-PLAN-23.md`.
- **PLAN-24 (Perpetual depletion)**: ✅ built, PR pending. **Idempotency
  design authored by a dedicated Opus-5 architect pass** before any code
  was written (per the master plan's own doctrine — this was the one Lane
  B item explicitly not pre-designed in the master plan document). Key
  decisions: depletion runs inside `record_order_payment_success`'s own
  transaction but inside a PL/pgSQL `BEGIN...EXCEPTION` sub-transaction
  (implicit savepoint) so a stock bug can never reverse a sale; the
  uniqueness guarantee is `(order_id, item_id)` paired with a `GROUP BY`
  aggregation (not a naive single-row-per-order index, which breaks when
  one order uses the same ingredient across two menu items); refund
  reversal negates the stored sale rows rather than re-deriving from a
  recipe that may have changed. **The central test — forcing a real
  depletion failure via a temporary constraint and proving the payment
  still commits with zero sale rows and a recorded `inventory.depletion_failed`
  event — passed live**, both manually and via a new automated,
  transactional `supabase/tests/depletion_tests.sql` (`ALL DEPLETION TESTS
PASSED`, zero residue). One acceptance item (an "Oversold" pill on the
  inventory list page) is deferred to a small follow-up PR once PLAN-23
  merges, since that page is itself a PLAN-23 file not present on this
  branch — the underlying data already supports it with zero further
  backend work. `BUILD-LOG-PLAN-24.md`.
- Built out of dependency order deliberately, twice: PLAN-21 (review
  prompt) is waiting on PLAN-20 to merge (both touch `OrderStatus.tsx`);
  PLAN-22/23 needed only PR-0/PLAN-10 and were picked up while PLAN-20 was
  in review. PLAN-24 depends on PLAN-23 for its application-layer files
  (not its DB schema, which was already live) — two small files
  (`lib/inventory/types.ts`, one `lib/events.ts` entry) were necessarily
  recreated on PLAN-24's branch and will need a straightforward
  union-merge conflict resolution when both PRs land; flagged in
  `BUILD-LOG-PLAN-24.md`.
- **Next**: PLAN-21 once PLAN-20 merges; PLAN-25 (food costing — read-model,
  no new tables) → PLAN-26 (86-ing).
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
merged by Lane A) confirmed live via `list_tables` — `inventory_items`,
`inventory_movements`, `menu_item_ingredients`, `tip_allocations`,
`orders.tip_cents`/`accepted_at`/`ready_at` all present before any Lane B
work began.

- **PLAN-20 (Tips on QR orders)**: ✅ built, migration applied live, **PR
  #61 open** (not yet merged as of this entry). `orders.tip_cents` flows
  end-to-end checkout → RPC → Stripe → confirmation/counter/HQ. Also fixed
  a real bug found in the same PR: `transition_order_status` was awarding
  loyalty points on `total_cents` instead of `subtotal_cents`, silently
  inflating points on every tipped order once PLAN-10 added `tip_cents`
  into `total_cents`. See `BUILD-LOG-PLAN-20.md`.
- **PLAN-22 (Kitchen display)**: ✅ built, PR open. Dedicated `/kitchen`
  route (same counter PIN session as `/counter`), ticket-age colour
  escalation, chime (muted by default, `AudioContext` primed inside the
  unmute click for autoplay-policy correctness), wake-lock always-on
  display mode. **Real architectural finding, escalated rather than
  improvised**: true Supabase Realtime on `orders` is not safely wireable
  today — `orders` RLS has zero policies (service-role only, verified
  live) and the counter/kitchen session is a custom HMAC cookie, never a
  Supabase Auth session, so a browser client has no legitimate way to
  subscribe to `postgres_changes` without either loosening `orders` RLS
  (tenant-isolation change) or minting a scoped custom JWT via a new
  `SUPABASE_JWT_SECRET` for Realtime Authorization (not configured
  anywhere in this env). Shipped a 3-second poll instead, honestly
  labelled as polling, never claiming to be realtime. **This needs a
  Fable-tier architecture decision before real Realtime is attempted** —
  see `BUILD-LOG-PLAN-22.md` for the full finding and a concrete
  recommendation for whoever picks it up.
- Built out of dependency order deliberately: PLAN-21 (review prompt)
  depends on PLAN-20 merging first (both touch `OrderStatus.tsx`); PLAN-22
  needed only PR-0, so it was picked up while PLAN-20 was in review rather
  than idling, per the lane's own dependency graph (§10).
- **Next**: PLAN-21 once PLAN-20 merges → PLAN-23/24/25/26 (inventory →
  depletion → costing/86-ing).
- **PLAN-20 (Tips on QR orders)**: ✅ **built, migration applied live**,
  PR open. `orders.tip_cents` flows end-to-end: checkout tip selector →
  `create_storefront_order` (now 12-arg, tip-validated) → Stripe charge
  (zero adapter changes needed — it already keyed off `total_cents`) →
  confirmation/counter/HQ tip lines. **Real bug found and fixed in the
  same PR**: `transition_order_status` was awarding loyalty points on
  `total_cents` instead of `subtotal_cents`, which — now that PLAN-10 added
  `tip_cents` into `total_cents` — was silently inflating points on every
  tipped order. Fixed and regression-tested live (85 points on an 850-cent
  subtotal with a 150-cent tip at a 10-point-per-euro rate, not the 100
  the bug would have produced). `tsc`/`build`/`lint` green,
  `get_advisors` clean (no new findings). See `BUILD-LOG-PLAN-20.md` for
  full detail, including one known verification gap: no live browser
  click-through was possible in this environment (no
  `SUPABASE_SERVICE_ROLE_KEY` / `.env.local` to run the dev server against
  Supabase) — verified instead by direct SQL against the live seeded
  `the-roastery` venue plus `tsc`/`build`/code reading. Left two harmless,
  clearly-labelled test rows (`PLAN20 Verification Member` + its
  points-ledger entry) on that demo venue — could not be deleted because
  `points_ledger` is genuinely append-only (proved this myself when my own
  cleanup attempt was rejected by the ledger trigger).
- **Next**: PLAN-21 (post-payment review prompt, depends on PLAN-20) →
  PLAN-22 (kitchen display, needs only PR-0) → PLAN-23/24/25/26
  (inventory → depletion → costing/86-ing).

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
