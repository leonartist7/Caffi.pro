# BUILD-LOG — PLAN-36 (Tip allocation report)

Branch `sonnet/lane-c-plan36-tip-allocation`, fresh off `origin/main`.
Money-adjacent — architect-tier pass required and done before any code
(see `docs/plans/PLAN-36-tip-allocation.md`'s Design section for the full
authored spec). Fable 5 was unavailable in this environment (requires
usage credits not provisioned here); Opus 5 stood in for the architect
pass, per this lane's own contingency plan.

## Escalation — asked, no answer, resolved per the architect's own fallback

The architect pass flagged one genuine non-arithmetic question: should
`owner`/`manager` memberships participate in the tip-pool roster by
default? This moves a whole share of the pool (not cents) and turns on
jurisdiction-varying legal restrictions on supervisor tip-pool
participation — explicitly not an engineering default to pick. I asked
the user via `AskUserQuestion`; no answer came back.

**Resolution**: no default anywhere in the system. `include_owner_manager`
is a required boolean on both `GET`/`POST /api/tips/allocation` — a
missing value is a 400, never silently defaulted true or false. The UI
(`app/(dashboard)/tips/page.tsx`) has two explicit buttons (Include /
Exclude), neither pre-selected, and "Compute" stays disabled until one is
chosen. This is the exact fallback the architect pass itself specified for
this situation ("do not ship a hard-coded default... until this is
answered") — refusing to let the system pick silently, not me picking the
real policy answer myself.

## What shipped

- `lib/tips/allocate.ts` — the pure allocation core, **zero Supabase
  imports, zero floats**: `allocate(poolCents, units)` (largest-remainder/
  Hamilton apportionment, `BigInt` throughout, proven never to divide by
  zero or leave a zero-weight unit with a nonzero result — see the proof
  sketch in the design doc and the module's own comments), `buildCountedShifts`
  (clips shifts to the period, separates open shifts as warnings, never
  silently drops them), `findOverlappingShifts` (manual-entry-error
  detection, never auto-merges), `computeAllocation` (the two-level
  hours/equal/manual orchestration).
- `lib/tips/report.ts` — data-fetching orchestration (Supabase-aware,
  everything else is Supabase-free): pool computation from `orders`
  (eligible statuses only, excluded canceled/refunded amounts tracked and
  surfaced, never silently dropped), shift fetch + role-toggle filtering,
  the `ROSTER_NEEDED` two-step flow for the `manual` basis (compute the
  roster first so the UI can render weight inputs for exactly the people
  eligible), `saveTipReport` (blocks saving a historical period with
  unclosed open shifts, per the design).
- `app/api/tips/allocation/route.ts` — owner-only
  (`requireVenueRole(venueId, ['owner'])`, `aro_admin` still passes per
  that helper's standing rule). `GET` computes a preview, never persists.
  `POST` **recomputes server-side from the request's own inputs** rather
  than trusting any client-sent amount, then persists via the atomic RPC.
  Emits `tip_allocation.saved`.
- `supabase/migrations/20260802210000_plan36_save_tip_allocation.sql` —
  one new function, `save_tip_allocation`, `SECURITY DEFINER`,
  `service_role`-only grant (matches the `set_venue_review_url` precedent).
  Atomically deletes any existing rows for the whole `(venue_id,
period_start, period_end)` triple — across all bases, not just the one
  being saved — then inserts the fresh row set, so repeated saves can
  never accumulate duplicates and exactly one basis is ever "the" answer
  for a period. **Zero new tables** — populates `tip_allocations` exactly
  as PLAN-10 already shipped it.
- `app/(dashboard)/tips/page.tsx` — new `aro`-token-only owner surface:
  period picker, basis selector, the forced owner/manager choice, the
  manual-weights roster flow, a non-dismissible "calculation aid, not a
  payroll record" notice always rendered above any result, visible
  excluded-order amounts, open-shift/overlap warnings, and the explicit
  "Save this allocation" action (never a side effect of viewing). Linked
  from `staff/page.tsx`.
- `lib/events.ts` — `// --- Lane C ---` append block: `tip_allocation.saved`
  - label.

## Verified live (`jjgccfrwjkwknyjtbtxa`)

- **Ground truth gathered before any design work**: read `tip_allocations`'
  full schema/constraints (the `shift_id NOT NULL` composite FK is the
  load-bearing fact the whole two-level design responds to), confirmed
  zero RLS policies (service-role only, same shape as `tip_allocations`'
  existing anon-denied + authenticated-non-owner-denied checks in
  `scripts/verify-live.mjs` from PLAN-35's session — no new check needed,
  this PR adds no new table), confirmed `orders.placed_at`/`status`
  columns and the full status `CHECK` list independently (not just taking
  the architect pass's word for it).
- **`save_tip_allocation` grants**: confirmed via `information_schema.routine_privileges`
  that only `postgres` and `service_role` hold `EXECUTE` — `anon`/`authenticated`
  correctly excluded.
- **Atomicity of the save RPC, proven with a real call**: inserted a real
  shift for seed data (`Milo Manager`), called `save_tip_allocation` with
  an `hours`-basis row, then called it again for the _same period_ with a
  different `equal`-basis row. Re-read `tip_allocations` for that period:
  exactly **one** row, the new one — confirming the whole-period
  delete-then-insert replaces rather than accumulates. All test rows
  deleted after.
- **The allocation core itself**: `lib/tips/allocate.ts` was exercised
  against 16 scenarios via a standalone script (not committed — no test
  framework exists in this repo, matching the "no new dependency without
  checking twice" bar; ad hoc via `npx tsx`, output captured below), all
  passing:
  - **The deliberately indivisible amount the acceptance line names**:
    $100.00 / 3 equal-weight units → `3333/3333/3334`, sums to exactly
    `10000`.
  - Zero-weight unit → exactly `0`, never `NaN`, in the presence of
    nonzero siblings.
  - Zero pool, and separately zero total weight with a nonzero pool → both
    resolve to all-zero without throwing.
  - Determinism: identical inputs called twice produce byte-identical
    `Map` contents.
  - Large-scale (`BigInt` safety): 37 units × 31-day-in-ms weights against
    a $10,000 pool sums exactly — the scale where the naive
    `Number`-multiplication product would exceed `MAX_SAFE_INTEGER`.
  - Two-level correctness: a member with two shifts of different duration
    gets shift-level amounts that (a) sum exactly to their own Level-1
    total and (b) split proportional to duration (the longer shift gets
    more).
  - Zero-hours member on `hours` basis → exactly `0`; all-zero-hours
    roster → clean `NO_MEASURABLE_HOURS` refusal, never silently
    substituting `equal`.
  - `manual` basis: all-zero weights refuses (`NO_MANUAL_WEIGHTS`); a
    present member with weight `0` gets exactly `0`, others still sum
    exactly.
  - `equal` basis: a 20-minute shift and a 19-day shift produce identical
    per-member totals — the semantics the design doc pins down explicitly.
  - `buildCountedShifts`: a shift crossing the period boundary is clipped
    to the intersection, not counted whole or excluded; an open shift
    overlapping the period is separated into `excludedOpen`, not silently
    dropped from the raw list.
  - `findOverlappingShifts`: detects two overlapping closed shifts for the
    same membership, does not false-positive on a different membership's
    non-overlapping shift.
- Grep gate: zero `coffee-*`/`cream-*`/`dark-*` on every new file. Zero
  forbidden float operations (`parseFloat`, `.toFixed(`, `* 0.01`,
  `/ 100`, `Math.round`) anywhere in `lib/tips/*.ts`.

## Not verified here (honest gaps)

- **"manager and staff are denied and the denial is tested"**: verified by
  code-reading, not a live click-through — `requireVenueRole(venueId,
['owner'])` only allows the `owner` role (plus `aro_admin`, that helper's
  standing bypass), so `manager`/`staff` structurally 403. This is the
  same helper every other owner-only route in the codebase already uses
  correctly; no new authz logic was written for this PR. A live
  multi-role login pass would still be the stronger proof, and this
  sandbox can't do one (no populated service-role key for a real browser
  session, same constraint every build log in this lane has noted).
- **`scripts/verify-live.mjs`**: not extended and not re-run end-to-end —
  this PR adds no new table and no new RLS-relevant surface (the RPC is
  `service_role`-only by grant, already confirmed above via
  `information_schema`), so there's no new anon/authenticated-denied fact
  for that script to assert that it doesn't already cover via the existing
  `tip_allocations` checks.
- **Currency**: the report page renders amounts via `formatCents()`'s CAD
  default rather than the venue's actual configured currency — `useTenant()`'s
  `Tenant` type doesn't currently carry a currency field to thread through.
  A real simplification, not hidden: flagged here rather than silently
  shipped as if currency-correct. Low-risk for now (all seeded venues are
  CAD) but worth a follow-up if a non-CAD venue is onboarded before this
  is fixed.
- No live browser click-through of the UI flow (period picker → basis →
  forced owner/manager choice → manual roster → save) — `tsc`, `eslint`,
  and `npm run build` are green and the component logic was traced by hand
  against `lib/tips/report.ts`'s exact response shapes, but that is not
  the same as watching it render.

## Design notes not obvious from the diff

- The two-level allocation (Level 1: pool → membership; Level 2: membership
  total → their own shifts, by duration) is why a member with multiple
  shifts never has their total split unevenly across those shifts by
  accident — both levels use the identical `allocate()` primitive, so
  "sums exactly" holds at both levels simultaneously, by construction, not
  by two implementations agreeing.
- `manual` basis takes integer **weights** (shares), not owner-typed dollar
  amounts — deliberately, so "sums exactly" is a theorem instead of a
  validation rule fighting the owner's arithmetic, and so a late-settling
  order or refund doesn't silently invalidate numbers the owner already
  typed.
- Saving is a distinct, explicit action from computing — viewing a report
  never writes anything. The atomic RPC's whole-period delete-then-insert
  means switching basis and re-saving replaces the prior snapshot rather
  than leaving two conflicting row sets for the same period.
