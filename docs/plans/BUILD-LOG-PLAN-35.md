# BUILD-LOG — PLAN-35 (Time clock)

Branch `sonnet/lane-c-plan35-time-clock`, fresh off `origin/main`. Zero
migrations — built entirely on `staff_shifts` as PLAN-10 shipped it.

## What shipped

- `lib/staff-shifts.ts` — read model: `computeDurationMinutes`,
  `isStaleOpenShift` (`STALE_SHIFT_HOURS = 12`, a named constant per the
  Design section's reasoning, not an owner-editable setting),
  `defaultWeekRange` (venue-local week, reusing `mondayStartInTz` from
  `lib/owner-stats.ts` read-only), `listShiftsForPeriod`.
- `app/api/counter/shift/route.ts` — counter-session-authenticated
  (`verifyCounterToken`/`COUNTER_COOKIE`, same pattern as
  `app/api/counter/visit/route.ts`): `GET` status, `POST` clock in
  (idempotent on the `23505` race — reports the existing open shift as
  success instead of erroring), `PATCH` clock out.
- `app/api/shifts/route.ts` + `app/api/shifts/[id]/route.ts` —
  owner/manager (`requireVenueRole`/`requireRowVenueRole`, `aro_admin`
  passes automatically): `GET` list for a venue-local period, `POST` add a
  missed shift (`source: 'manual'`, purely additive), `PATCH /[id]` close a
  stuck-open shift (writes only `ended_at` + appended `note` on the
  original row — 409 if the target is already closed).
- `app/counter/counter-screen.tsx` — a persistent clock strip above the
  existing queue/offline banners (visible in every phase except the
  full-screen order queue), fetched once on mount (no polling — only this
  device's own taps change it), self-healing on a 404/409 by resyncing
  from `GET`.
- `app/(dashboard)/staff/shifts/page.tsx` — new `aro`-token-only owner
  surface: this week's shifts table, stale-open rows visually flagged
  (`bg-aro-rose/10` row + `text-aro-terracotta` label — both pairings
  already used elsewhere in the codebase, not invented here), "Close
  shift" and "Add missed shift" modals. Linked from `staff/page.tsx` (a
  minimal, token-matching addition to that still-unrefit legacy page —
  intentionally not rewritten here, that's PLAN-31/32/33's scope on their
  own branches).
- `lib/events.ts` — `// --- Lane C ---` append block:
  `shift.started`/`shift.ended`/`shift.corrected` + labels.
- `scripts/verify-live.mjs` — added `authenticated non-owner staff_shifts
denied`, mirroring the existing `tip_allocations` check.

## Verified live (`jjgccfrwjkwknyjtbtxa`, `execute_sql`)

- **RLS shape confirmed before writing any code**: `staff_shifts` has
  `relrowsecurity = true` and **zero** rows in `pg_policies` — identical
  shape to `tip_allocations`/`push_subscriptions`. Every read/write in
  this PR goes through the service-role client behind an app-level authz
  check; nothing here loosens or depends on client-side RLS grants.
- **The partial unique index actually blocks a double clock-in** — proven
  with a real insert against seed data (`Milo Manager`,
  `a0000000-...-002`): first `INSERT ... source='counter'` succeeds, a
  second concurrent-shape `INSERT` for the same `membership_id` fails with
  `23505 duplicate key value violates unique constraint
"uq_staff_shifts_open_per_membership"` — exactly the guarantee the API's
  `POST` handler is coded to expect and swallow gracefully.
- **The "close stuck shift" correction preserves the original row** —
  proven by re-reading the row after the correction UPDATE: `shift_id`,
  `membership_id`, `started_at`, and `source` ('counter') are byte-for-byte
  unchanged; only `ended_at` and `note` differ. Confirmed a fresh
  `POST` clock-in for the same membership succeeds immediately afterward
  (the unique index is unblocked, not bypassed).
- All test rows deleted after verification — no seed data left mutated.
- `get_advisors` (security): no new findings. The pre-existing INFO-level
  `rls_enabled_no_policy` list (informational, not a warning) doesn't even
  include `staff_shifts` in this run; the zero-policy state was confirmed
  directly via `pg_policies` above regardless. Zero schema touched by this
  PR, so no advisor delta is expected either way.

## Not verified here (honest gap)

- `scripts/verify-live.mjs` itself was not executed end-to-end in this
  sandbox — no populated `SUPABASE_SERVICE_ROLE_KEY`/anon key in the local
  env (same constraint prior build logs in this lane have noted). The
  specific fact the new check asserts (authenticated-non-owner denied on
  `staff_shifts`) was verified directly via the RLS/policy inspection
  above instead — same underlying guarantee, different tool.
- No live browser session to click through the counter clock strip or the
  owner shifts page — `tsc --noEmit` and `npm run build` are green, the
  grep gate (`coffee-*`/`cream-*`/`dark-*`) returns zero matches on every
  new/touched file, and the JSX/logic was traced by hand against the
  existing, already-shipped `counter-screen.tsx`/`staff/page.tsx`
  patterns it extends. Flagging rather than claiming a browser check that
  didn't happen.
- Timezone correctness at venue-local midnight: `defaultWeekRange` reuses
  `mondayStartInTz`'s already-DST-correct offset math rather than
  reimplementing it, so this inherits that function's existing
  correctness rather than being independently proven here.

## Design notes not obvious from the diff

- Duration is computed at read time in every consumer
  (`computeDurationMinutes`) — no duration/hours column exists anywhere,
  so PLAN-36/37 can't accidentally read a stale stored value.
- The "manual correction" acceptance line reads as two distinct real-world
  actions, not one: a shift that was never captured by the counter at all
  (→ **add missed shift**, a wholly new `source='manual'` row, original
  untouched because there is no original) vs. a shift the counter opened
  but nobody closed (→ **close stuck shift**, in-place `ended_at` update on
  the _original_ `source='counter'` row, because inventing a _second_ row
  for the same shift would double-count hours in PLAN-36/37 and because
  the partial unique index would otherwise permanently block that
  person's next clock-in). Both satisfy "never silently invent an end
  time" — the owner always supplies it explicitly.
