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
