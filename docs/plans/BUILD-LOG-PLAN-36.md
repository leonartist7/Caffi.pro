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

## Post-review pass (Codex + CodeRabbit, commit `abd12f7` onward)

Both an independent math review (this PR's own draft gate — see the PR
description) and the automated reviewers ran once the PR left draft.
Every finding checked against the actual code before acting; several
converged from both reviewers independently, which is itself a signal
they were real.

**Fixed:**

- **Owner venue access was structurally broken (Codex, P1 — the most
  consequential finding here).** The original page lived only under
  `(dashboard)`, whose venue selector (`useTenant()` → `/api/clients`) is
  `requireAroAdmin()`-gated — confirmed by reading that route, not
  assumed. A real solo owner has no path to a `selectedTenant` there at
  all (`TenantContext.setSelectedTenant` is only ever called from
  `/clients` and `TenantSelector`, both admin-only), so the page rendered
  "No client selected" permanently for its actual intended user. Fixed by
  extracting the UI into `components/tips/TipsReportClient.tsx`
  (parameterized by `venueId`, no `useTenant()` dependency) and adding a
  real owner-facing `app/(owner)/tips/page.tsx` that resolves `venueId`
  the same way the `(owner)` layout itself does — impersonation first,
  then `resolveOwnerVenueId` — plus a nav entry in `owner-shell.tsx`. The
  original page becomes a thin `(dashboard)`-only wrapper. Both routes
  resolving to literal `/tips` is a build-time collision (route groups
  don't affect the URL — same class of issue PLAN-30 hit and resolved for
  `/settings` vs `/venue-settings`); resolved the same way, moving the
  admin-only path to `/tips-admin` since the owner path is the real
  primary surface. A manager following the new owner-shell "Tips" link
  still gets a clean 403 → error-toast on first action, same as any other
  owner-only action reachable from an owner+manager-shared surface — not
  a crash, not silently wrong figures, so left as-is rather than also
  plumbing per-role nav visibility through the shell.
- **Venue-local timezone, not the browser's or this server's (Codex,
  P1).** `new Date(datetime-local-string)` parses in whichever timezone
  the _reader_ happens to be in — a real bug for a period boundary, which
  must mean the same instant regardless of who's typing it in or where.
  Added `localDateTimeStringToUtc` + exported `tzOffsetMs` to
  `lib/owner-stats.ts` (generalizing the existing `mondayStartInTz`
  offset trick to arbitrary wall-clock time, not just midnight) and
  `getVenueTimezone`. `period_start`/`period_end` are now sent as bare
  `datetime-local` strings with no client-side conversion at all; the
  server looks up the venue's own `timezone` column and interprets them
  there. Verified against real DST boundaries (Toronto Aug/Jan, Edmonton)
  — see `verify-tz.mjs` in the review scratchpad.
- **Concurrent saves could double-count (Codex P1 + CodeRabbit, both
  independently).** `save_tip_allocation`'s delete-then-insert had no
  lock — two overlapping saves for a never-before-saved period could each
  find nothing to delete and both insert. Added a transaction-scoped
  `pg_advisory_xact_lock` keyed on `(venue_id, period_start, period_end)`
  before the delete; auto-releases at the function's own implicit
  transaction end, so it can't leak. Re-applied live and sanity-checked
  (a real call against a live venue completes without error).
- **`saveTipReport`'s raw RPC error leaked to the client (CodeRabbit,
  Major).** `admin.rpc(...)`'s `error.message` was returned verbatim as
  the client-facing error string — a Postgres/RPC failure could leak
  internal schema/constraint detail. Now logged server-side, generic
  message returned. Also wrapped the `saveTipReport` call itself in
  try/catch in the route (a rejected promise, not just an `{error}`
  tuple, previously escaped unhandled).
- **The saved allocation could silently differ from what's on screen
  (Codex, P1).** `POST` correctly recomputes from live data before
  saving, but the client discarded that response and kept showing the
  `GET` preview. If an order or shift changed between preview and save,
  the owner could copy figures that don't match what was persisted. Now
  `setResult(data)` on a successful save.
- **1000-row silent undercount (Codex, P1).** Both the `orders` and
  `staff_shifts` queries in `runTipReport` were unpaginated single
  `.select()` calls; PostgREST caps rows per request at this project's
  configured `max_rows` (1000). A period with more matching rows than
  that would silently undercount the pool/hours with no error. Both
  queries now page via `.range()` until a short page confirms the end,
  with an explicit `.order()` added for stable, deterministic row
  presentation (the CodeRabbit nitpick on `shiftRows` ordering, fixed for
  free by the same change).
- **Role not shown in the results table despite being on every row
  (Codex, P2).** The report's whole design point for `include_owner_manager`
  is that every row visibly carries who it is — the table just wasn't
  rendering it. Added.
- **Accessibility: toggle buttons had no `aria-pressed` (CodeRabbit,
  Major).** The basis and owner/manager toggles conveyed selection by
  background color alone. Added `aria-pressed` to both groups.
- **Save button stayed enabled when saving was already guaranteed to
  409 (CodeRabbit, Minor).** A historical period with open-shift warnings
  blocks saving (`saveTipReport`'s own check) but the button didn't
  reflect that, so the only feedback was an avoidable failed request.
  Now disabled in that state too.
- **Duplicated manual-weights validation between GET and POST
  (CodeRabbit, nitpick).** Two independent loops validating "non-negative
  safe integer" could drift apart. Extracted `parseManualWeights`, used
  by both.

**Checked and not applicable — skipped with reason:**

- **"Managers see the Tips link and hit a dead end" (Codex, P2, on
  `staff/page.tsx`).** Traced the actual mechanics rather than trusting
  the premise: this specific page (`(dashboard)/staff`, function name
  `AdminStaffPage`) is gated behind the same admin-only `selectedTenant`
  as the original bug above — a manager reaches "No client selected"
  here too, Tips link included, never the link itself. This is the same
  root cause as the P1 fix above, not a separate manifestation of it;
  nothing further to fix on this specific file.

**Flagged, not fixed — real, disproportionate to fix here:**

- **No persisted marker for a validly-empty allocation (Codex, P2).** A
  period with zero shifts and zero pool is a real, valid save
  (`p_rows` legitimately empty) — but `tip_allocations` has no row
  representing "explicitly saved as empty," so it's indistinguishable
  from "never saved." Fixing this cleanly needs a period-level marker
  (a new table or column), which is in real tension with this PR's own
  stated design constraint ("Zero new tables — populates the
  already-live `tip_allocations`"). Given the practical case is narrow
  (a period with literally no money and no hours has little downstream
  consequence either way, and PLAN-37's CSV export reads the live report
  each time, never this saved snapshot), left as an honest gap rather
  than abandoning that constraint unilaterally.
- **No committed test file for `lib/tips/allocate.ts` (CodeRabbit,
  nitpick, "heavy lift").** Correct in isolation, but this repo has no
  configured test runner anywhere, and every sibling Lane C item (PLAN-30
  through this one) deliberately uses the same ad hoc `npx tsx`
  verification-script convention instead, precisely because standing up
  a test framework is a repo-wide infrastructure decision, not a
  per-PR one. Introducing a test runner unilaterally from one PR would be
  a bigger, unrequested architectural change than the finding itself.
  The ad hoc scripts already achieve the same coverage this suggestion
  asks for (divisibility/rounding, zero-weight/pool/shift cases, BigInt
  scale, two-level proportionality, overlap detection) — see this file's
  own verification section above.
