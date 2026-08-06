# PLAN-35 — Time clock

Lane C, `MASTER-PLAN-v2R-remastered.md` §6. Marked "Fable 5 (done, this
doc)" — no architect-tier pass needed (unlike PLAN-36).

## Ground truth (verified live, `jjgccfrwjkwknyjtbtxa`, before writing code)

- `staff_shifts` (PLAN-10) is already live with exactly the shape this item
  needs: `shift_id` (PK), `venue_id`, `membership_id`, `started_at` (not
  null, default `now()`), `ended_at` (nullable), `source`
  (`CHECK (source IN ('counter','manual'))`), `note`, `created_at`,
  `updated_at`. FKs to `memberships`/`venues` both `ON DELETE CASCADE`.
- **The DB already enforces "at most one open shift per membership"**:
  `uq_staff_shifts_open_per_membership` is a partial unique index —
  `UNIQUE (membership_id) WHERE (ended_at IS NULL)`. This item relies on
  that constraint; it is not reimplemented in application code beyond
  catching the resulting `23505` on a double clock-in.
- `staff_shifts_ended_after_started CHECK ((ended_at IS NULL) OR (ended_at
  > = started_at))` is also already live — every write path here composes
  > with it rather than duplicating the check, though the API still
  > validates the same thing itself first for a clean 400 instead of a raw
  > DB error.
- No migration in this PR — zero new tables/columns. `scripts/verify-live.mjs`
  already has an anon-denied check for `staff_shifts` (added by PLAN-10);
  this PR adds the authenticated-non-owner-denied variant, following the
  `tip_allocations` precedent already in that file.
- The counter PIN session (`lib/counter-session.ts`) already carries
  `membershipId` + `venueId` on every request — no new session plumbing
  needed for clock-in/out; the existing `verifyCounterToken()` +
  `COUNTER_COOKIE` pattern (mirrored from `app/api/counter/visit/route.ts`)
  is reused as-is.
- `venues.timezone` (IANA string, e.g. `America/Edmonton`) is already
  selected elsewhere (`lib/get-tenant.ts`, `lib/ai/context.ts`) with a
  `'America/Edmonton'` fallback when null — the owner shift list reuses
  that same fallback convention. `lib/owner-stats.ts` exports `localParts()`
  or the venue-local calendar day of an instant — imported read-only here,
  not modified (not a Lane C file).
- `app/counter/counter-screen.tsx` is a single always-mounted client
  component (339 lines) with a `Phase = 'search' | 'panel' | 'redeem-list'
| 'success'` state machine and no header/nav chrome today — the clock
  control needs its own small persistent strip above the existing
  queue/offline banners, not a new phase (clocking in/out must not
  interrupt a visit/redeem flow in progress).
- `app/counter/**` and most of `app/api/counter/**` aren't listed in any
  lane's explicit file-ownership table (only `app/api/counter/orders/**`
  and `components/counter/**` are Lane B's) — v2R's own PLAN-35 line
  ("Clock in/out through the counter PIN session") requires touching the
  counter screen to be buildable at all, so this is read as spec-directed
  scope, not an ownership violation. The one new file added under
  `app/api/counter/` (`shift/route.ts`) is additive and doesn't touch
  Lane B's `orders/` subtree.

## Design

- **Duration is always computed, never stored** — no duration/hours column
  anywhere; every consumer (counter UI, owner shift list, PLAN-37's export)
  derives it from `ended_at - started_at` (or "still open") at read time.
- **Counter-session-authenticated routes** (`app/api/counter/shift/route.ts`,
  mirrors `app/api/counter/visit/route.ts`'s auth pattern exactly):
  - `GET` — current membership's open-shift status:
    `{ clocked_in, started_at, shift_id }`.
  - `POST` (clock in) — inserts `{ venue_id, membership_id,
started_at: now(), source: 'counter' }`. A `23505` from the partial
    unique index (already clocked in, e.g. a double-tap or a second
    device) is treated as success and returns the existing open shift,
    not an error — same idempotent-on-conflict shape PLAN-20's visit
    recording uses. Emits `shift.started`.
  - `PATCH` (clock out) — finds this membership's open shift, sets
    `ended_at = now()`. 404 (`No open shift`) if none. Emits
    `shift.ended` with the computed duration in the payload.
- **Owner-facing routes** (`app/api/shifts/route.ts`,
  `app/api/shifts/[id]/route.ts`), gated `requireVenueRole(venueId,
['owner', 'manager'])` (`aro_admin` passes automatically, same as every
  other venue-scoped route):
  - `GET /api/shifts?from=&to=` — shifts in the venue-local period
    (default: the current venue-local week via `mondayStartInTz`, reused
    read-only from `lib/owner-stats.ts`), joined with membership
    `full_name`, each row carrying a computed `duration_minutes` (null
    while open) and `is_stale` (open **and** `started_at` older than
    `STALE_SHIFT_HOURS` — a fixed constant in `lib/staff-shifts.ts`, not a
    new settings field; "configurable" is read as "named in one place",
    not "owner-editable UI", since v2R doesn't specify a settings surface
    for it and inventing one would be scope creep).
  - `POST /api/shifts` (**add missed shift**) — owner supplies
    `membership_id`, `started_at`, `ended_at` (both required — this action
    exists specifically to backfill a period the counter never captured),
    optional `note`. Inserted with `source: 'manual'`. Purely additive:
    touches no other row. Emits `shift.corrected` with `action:
'added_missed'`.
  - `PATCH /api/shifts/[id]` (**close a stuck-open shift**) — owner
    supplies `ended_at` (+ optional `note`). Only valid when the target
    row's `ended_at IS NULL` (409 otherwise — "already closed, use add
    missed shift for a separate period instead"). Updates **only**
    `ended_at` (and appends to `note`) on the original row — `started_at`,
    `membership_id`, `source: 'counter'`, `shift_id` all untouched. This is
    the resolution to the acceptance line's two-sided requirement: a
    stranded open shift must eventually close (or the partial unique index
    permanently blocks that person's next clock-in) without ever being
    auto-closed or having its origin silently rewritten. Emits
    `shift.corrected` with `action: 'closed_stuck'`.
  - Both owner writes validate `ended_at >= started_at` (matching the DB
    CHECK, for a clean 400) and `ended_at <= now()` (no future-dated
    clock-outs).
- **Counter UI**: a persistent strip at the top of `counter-screen.tsx`
  (above the existing queue-count/offline/storage banners, visible in every
  phase except the full-screen order queue) showing the session's own
  clock status — "Clocked in since H:MM" / "Not clocked in" — with a single
  toggle button. Fetches status once on mount; no polling (clock state
  only changes via this device's own taps). A 409/404 from a race (two
  taps) is treated as the resulting true state, not surfaced as an error.
- **Owner shift list**: new `app/(dashboard)/staff/shifts/page.tsx` (HQ
  surface, `aro` tokens only, gated the same way `staff/page.tsx` already
  is — owner/manager/aro_admin, `staff` role wrong-door redirected),
  linked from the existing team page. Table of the venue-local week's
  shifts (name, started, ended-or-"Open", duration-or-"—"), a stale-open
  row visually flagged (not hidden, not auto-acted-on) with inline "Close
  shift" (opens the correction form: end time + note) and a separate "Add
  missed shift" action (member picker + both timestamps + note).

## Non-goals

- No payroll/wage computation — this item is hours-tracking only. Money
  math starts at PLAN-36.
- No owner-editable stale-shift threshold UI — see Design above.
- No shift editing beyond the two explicit correction actions (no free-form
  edit of a normal, already-closed shift — that would let anyone quietly
  rewrite history with no distinguishing `source`).
- No mobile-specific owner shift-list layout beyond the existing HQ
  responsive baseline already established by PLAN-31/32/33.

## Acceptance (from the master plan, verbatim + this doc's resolution)

- [ ] Clock in/out through the counter PIN session.
- [ ] At most one open shift per membership — DB-enforced, verified live
      (a second clock-in attempt while one is open does not create a
      second open row).
- [ ] Duration is always computed, never stored.
- [ ] A shift left open past a configurable threshold is flagged for owner
      review and is not auto-closed.
- [ ] Manual correction by an owner writes a new record with `source =
  'manual'` and preserves the original **or** closes the original's
      `ended_at` in place without touching any other field — both actions
      exist, matching the two distinct real-world corrections (a
      never-captured shift vs. a stranded open one). See Design.
- [ ] Events emitted + labelled: `shift.started`, `shift.ended`,
      `shift.corrected`.
- [ ] `aro` design bar on the new owner surface. `npm run build` +
      `tsc --noEmit` green.
- [ ] `scripts/verify-live.mjs`: authenticated-non-owner-denied check added
      for `staff_shifts`.
