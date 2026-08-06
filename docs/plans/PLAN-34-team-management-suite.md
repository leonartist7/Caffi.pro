# PLAN-34 — Team management suite

Lane C, `MASTER-PLAN-v2R-remastered.md` §6. Builds on the existing
`app/(dashboard)/staff/page.tsx` + `app/api/staff/**`, doesn't invent a new
surface from scratch.

## Ground truth (branch fresh off `main`, PR-0 + PLAN-30 not required — no file overlap)

- `app/api/staff/route.ts` (GET/POST) and `app/api/staff/[id]/route.ts`
  (PATCH/DELETE) already implement almost everything this item's
  acceptance checklist asks for, **before this PR touches anything**:
  - **Manager-escalation prevention is already server-enforced.**
    `PATCH` re-checks the _target_ row's current role before allowing any
    change — a manager can only modify rows that are already `staff`, and
    can only ever set `role: 'staff'` even if they try to pass something
    else. This isn't new work; verified by reading
    `app/api/staff/[id]/route.ts:40-52` and `:62-67`, not built here.
  - **Deactivation history is already preserved.** `DELETE` refuses
    (`409`) once a membership has `user_id` set (i.e. the invite was
    accepted) — deactivation always goes through `PATCH { is_active:
false }`, which never touches `membership_id`, so any
    `staff_shifts`/`visits`/`redemptions` rows already hanging off that
    membership survive untouched. Confirmed by reading the code, not new.
  - **No new roles.** `VALID_ROLES = ['owner', 'manager', 'staff']`
    already matches the live `memberships.role` CHECK constraint
    (`owner|manager|staff|aro_admin` — `aro_admin` deliberately excluded
    from self-service assignment, correct and unchanged).
- **The one acceptance line genuinely unmet**: "a staff member cannot
  reach the team surface at all (wrong-door redirect, not a 403 wall)."
  `app/(dashboard)/staff/page.tsx` is a plain `'use client'` component with
  **zero server-side role check** — confirmed by grep: only
  `app/(dashboard)/dashboard/page.tsx` does any role gating anywhere under
  `(dashboard)`; every other page (`orders`, `rewards`, `clients`,
  `activity`, `analytics`, `settings`, `staff`) relies entirely on the
  layout's bare "a session exists" check plus each API call's own authz.
  A `staff`-role user hitting `/staff` today would see the full page shell
  (TenantSelector, invite button, etc.) and then silent/broken API calls
  once they picked a tenant — a 403 wall by another name, not a redirect.
  **Fixing this specific gap is this PR's actual scope**; auditing every
  other `(dashboard)` page for the same gap is a larger, separate
  cross-cutting change outside "team management suite" and is flagged in
  STATUS.md, not attempted here.
- **"Profile view/edit" is the other real gap.** The invite modal sets
  `full_name`/`role` once at creation; there's no way to edit an existing
  member's name or role afterward from the UI, even though the PATCH route
  already supports both fields server-side.

## Design

- Split `app/(dashboard)/staff/page.tsx` into a server component
  (`page.tsx`) + client component (`staff-client.tsx`), matching the
  pattern `dashboard/page.tsx` already established: resolve the caller's
  active membership roles, and if the only role present is `staff` (no
  `owner`/`manager`/`aro_admin`), `redirect('/counter')` before any client
  JS ships — the wrong door, not a wall. `owner`/`manager`/`aro_admin`
  render through unchanged.
- Add an "Edit" action per staff card (owner/manager only, same
  manager-restricted-to-staff-role rule the PATCH route already enforces
  and re-displays server-side) opening a modal to edit `full_name` and
  `role`, calling the existing `PATCH /api/staff/[id]` — no new API
  surface, this is a UI gap closing over an endpoint that already existed.

## Non-goals

- Not re-architecting the manager-escalation or deactivation-history logic
  — both are already correct in the live route code; this PR is
  UI-surface work on top of it.
- Not auditing/gating every other `(dashboard)` page for the same
  wrong-door gap `/staff` had — flagged in STATUS.md as a follow-up, not
  built here.
- Not inventing a 5th role.

## ✅ Acceptance

- [ ] An owner can invite, view, edit (name + role), and deactivate staff;
      a deactivated membership retains its history and its shifts —
      verified by reading `PATCH`'s `is_active` path (no delete, no
      `membership_id` mutation).
- [ ] A manager cannot escalate anyone to `owner`/`aro_admin` — already
      server-enforced (`app/api/staff/[id]/route.ts`), re-verified by
      reading the exact guard clauses, not re-tested with a live manager
      session (this sandbox has no live login — see the build log).
- [ ] A `staff`-role member hitting `/staff` is redirected to `/counter`
      before the page renders — new, this PR's actual deliverable.
- [ ] PIN set/reset flows through the existing `set_counter_pin` RPC
      (unchanged); no PIN value is ever logged or returned (grep gate on
      the touched files).
- [ ] Cross-venue access denied — already covered by
      `requireRowVenueRole`'s venue resolution on every row-scoped route;
      not re-tested live.
- [ ] **Design bar** (§2) — the new edit modal is `aro`-token only from
      the start (this file was already refit to `aro` tokens in PLAN-33;
      the new modal must not reintroduce legacy classes).
- [ ] `npm run build` + `tsc --noEmit` green.
