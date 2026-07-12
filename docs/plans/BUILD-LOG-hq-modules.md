# Build log — HQ Control Center rewire (modular-painting-castle plan)

Tracks progress against `docs/plans/PLAN-hq-control-center.md` (see plan text in the PR/session). One bullet per phase.

## Phase 1 — Kill the slow navigation

- `app/(dashboard)/layout.tsx` and `app/(owner)/layout.tsx`: swapped the per-navigation `auth.getUser()` (network round-trip to Supabase Auth) for `auth.getSession()` (cookie-local). `middleware.ts` still runs the authoritative `getUser()` once per request and refreshes the cookie; these layouts now just read that already-validated session for the UX gate. All data access remains independently authorized via `requireVenueRole`/`requireAroAdmin` in each route — this change touches rendering gate only, not authorization.
- Verified: `npx tsc --noEmit` clean, `npm run build` green, `middleware.ts` confirmed unchanged (`getUser()` still present).

## Phase 2 — HQ overview dashboard at /dashboard

- Rewrote `app/(dashboard)/dashboard/page.tsx`: aro_admin now renders a real HQ overview instead of redirecting to `/clients` — stat tiles (clients, members, visits this week + delta, new leads), "Clients at a glance" per-venue mini list, recent activity feed off `events` (friendly type labels), quick actions to `/clients` and `/leads`. Non-admin role dispatch (owner/manager → `/home`, else → `/counter`) unchanged. Single `Promise.all` for all data, no new RPC.
- Self-review pass (`/code-review --level medium`) caught two real bugs before commit, both fixed:
  1. `members`/`visits` row-fetch queries had no `.limit()` — PostgREST's default max-rows cap would have silently truncated totals once platform scale passed ~1000 rows, with no error surfaced. Fixed by adding explicit `{ count: 'exact', head: true }` queries for the headline totals (never truncated) and bounding the row-fetches (used only for per-venue breakdown) to 5000.
  2. `venues` query had no `ORDER BY` — "Clients at a glance" would show an arbitrary/unstable subset once there were more than 8 clients. Fixed by ordering `created_at DESC`, matching `/clients`.
- Verified: `npx tsc --noEmit` clean, `npm run build` green.

## Phase 3 — Staff API + page rewire (fixes "Unknown error" on Add Staff)

- New `lib/invites.ts`: extracted the invite-creation logic shared by `/api/invites` and the new `/api/staff` POST, so both stay in lock-step with the `memberships` schema.
- New `app/api/staff/route.ts` (GET list / POST invite), `app/api/staff/[id]/route.ts` (PATCH / DELETE), `app/api/staff/[id]/pin/route.ts` (POST, delegates to the `set_counter_pin` RPC — hash never touches app code).
- Rewired `app/(dashboard)/staff/page.tsx` off the deprecated `staff_users` table (browser-direct, wrong columns, wrong roles) onto the routes above. Roles are now exactly `owner | manager | staff`; removed the `barista/kitchen/cashier` options and all `can_manage_*`/`assigned_location_id` fields that don't exist on `memberships`. Added a "Set counter PIN" action per staff row. Pending invites (`user_id IS NULL`) show as "Invited"; DELETE only revokes pending invites, accepted members are deactivated via `PATCH { is_active: false }` instead (their history — visits logged, redemptions processed — must survive).
- **Found and fixed a pre-existing, unrelated bug while wiring this**: `requireRowVenueRole` in `lib/authz.ts` hardcoded `.select('tenant_id')`, but its only prior caller (`/api/ai-drafts/[id]`) operates on `ai_drafts`, which has `venue_id`, not `tenant_id` — meaning the owner's AI-drafts Approve/Skip buttons have silently 404'd since they were built. Added an explicit `venueColumn` parameter (defaults to `'tenant_id'` so every other existing caller is unaffected) and fixed the ai-drafts route to pass `'venue_id'`. The new staff routes also pass `'venue_id'` correctly since `memberships` uses that column too.
- Self-review pass (`/code-review --level medium`) caught a real authorization gap before commit, fixed:
  - `PATCH`/`DELETE /api/staff/[id]` only re-checked the manager-only-touches-staff rule against the _requested_ role field, not the _target row's current_ role. A manager could deactivate/rename an owner (via `is_active`/`full_name` with no `role` field) or revoke a pending owner/manager invite, since neither path is gated by the target's existing role. Fixed by fetching the target row's current role first and refusing with 403 if a manager caller targets a non-staff row.
- Verified: `npx tsc --noEmit` clean, `npm run build` green, all three new routes present in the build's route manifest. Column/RPC-param names re-checked by hand against `20260707000001_aro_platform_schema.sql` (Supabase MCP was disconnected at commit time, so the live POST→GET→PIN round trip on real data is **deferred** — queued to run as soon as the connector is back, before Phase 3 is marked fully done in the task tracker).
