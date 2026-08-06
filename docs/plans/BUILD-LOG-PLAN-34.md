# BUILD-LOG-PLAN-34 — Team management suite

## What shipped

- `app/(dashboard)/staff/page.tsx` split into a server-gated wrapper +
  `staff-client.tsx` (client component, everything the old single-file
  page did, unchanged, plus one new addition).
- **New wrong-door redirect**: the server wrapper resolves the caller's
  own active membership roles (skipping the check entirely for
  `aro_admin`, same as `dashboard/page.tsx`'s existing pattern) and
  `redirect('/counter')`s anyone whose only role is `staff` — before any
  client JS for this page ships. `owner`/`manager`/`aro_admin` render
  through unchanged.
- **New "Edit" action** per staff card (hidden for pending invites, which
  have nothing yet to edit): a modal to change `full_name`/`role`,
  calling the existing `PATCH /api/staff/[id]` — no new API route.
- `staff-client.tsx` is `aro`-token only from the start (this file was on
  legacy tokens on `main` as of this branch — PLAN-33's refit of the same
  file is a separate, still-open PR; the two will need combining at merge
  time, same as the `STATUS.md` duplication already documented across
  PLAN-30–33).

## What was already true before this PR (found, not built)

Read `app/api/staff/route.ts` and `app/api/staff/[id]/route.ts` in full
before writing anything, since the brief was explicit that this item
"extends, doesn't invent" the existing staff API:

- **Manager-escalation prevention is already server-enforced** — `PATCH`
  re-checks the _target_ row's current role before any change; a manager
  can only touch rows that are already `staff`, and can only ever set
  `role: 'staff'`. Confirmed live: `memberships_role_check` CHECK
  constraint is exactly `owner|manager|staff|aro_admin` (queried via
  Supabase MCP `execute_sql`), matching the route's own `VALID_ROLES`
  array — the route can't accidentally accept a role the DB would reject
  anyway, and vice versa.
- **Deactivation preserves history already** — `DELETE` 409s once a
  membership's `user_id` is set (invite accepted); deactivation only ever
  goes through `PATCH { is_active: false }`, which never touches
  `membership_id`, so any `staff_shifts` rows already tied to that
  membership survive.
- **No new roles** — `VALID_ROLES` already matches the live CHECK
  constraint exactly (verified live, not assumed).

## Verified here

- Live Supabase query (`execute_sql` against `aro-platform`): confirmed
  `memberships` has every column both files read/write
  (`membership_id`, `role`, `venue_id`, `user_id`, `is_active`,
  `full_name`, `invite_email`, `pin_updated_at`, `invite_token`), and
  confirmed the exact CHECK constraint text for `role`.
- Grep gate: zero `coffee-*`/`cream-*`/`dark-*` in either new/touched
  file.
- Grep gate: no PIN value ever passed to `console.*` (the one
  `console.error('Error setting PIN:', error)` call logs the error
  object only, never `pinValue`).
- `npx tsc --noEmit` — clean (`.next` cleared first).
- `npx eslint` — clean on both files.
- `npm run build` — clean; `/staff` now compiles as a dynamic
  server-rendered route (previously fully client).
- **Security self-review**: the new Edit modal calls the pre-existing,
  already-audited `PATCH` route with no new client-side authorization
  logic — a manager attempting to use the new UI to escalate someone's
  role still hits the same server-side 403 the route already enforced
  before this PR. The wrong-door redirect is a UX layer only; it carries
  no authorization weight of its own; per-tenant data access still goes
  through `requireVenueRole`/`requireRowVenueRole` on every API call,
  unchanged. No new vulnerability surface introduced.

## NOT verified here

- No live click-through as an actual manager or staff-role user — this
  sandbox has no `SUPABASE_SERVICE_ROLE_KEY`/live login, same gap as
  every prior Lane C item's build log. The manager-escalation-prevention
  and wrong-door-redirect claims above are verified by reading the exact
  code paths and cross-checking the live schema/constraint, not by a
  live session attempting the escalation.
- Cross-venue access denial — inherited from `requireRowVenueRole`'s
  existing venue-resolution logic (unmodified by this PR), not re-tested
  live.

## Known merge friction, flagged not fixed

`app/(dashboard)/staff/page.tsx` is touched by both this PR and the
still-open PLAN-33 refit PR (#71) — PLAN-33 refits the same
(then-single-file) page's tokens, this PR restructures it into two files.
Whichever merges second will need to manually combine both diffs. Same
class of friction as the `STATUS.md` duplication already documented
across PLAN-30–33; not a new problem, following the same established
"resolve at merge time" convention.
