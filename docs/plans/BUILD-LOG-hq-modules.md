# Build log — HQ Control Center rewire (modular-painting-castle plan)

Tracks progress against `docs/plans/PLAN-hq-control-center.md` (see plan text in the PR/session). One bullet per phase.

## Phase 1 — Kill the slow navigation

- `app/(dashboard)/layout.tsx` and `app/(owner)/layout.tsx`: swapped the per-navigation `auth.getUser()` (network round-trip to Supabase Auth) for `auth.getSession()` (cookie-local). `middleware.ts` still runs the authoritative `getUser()` once per request and refreshes the cookie; these layouts now just read that already-validated session for the UX gate. All data access remains independently authorized via `requireVenueRole`/`requireAroAdmin` in each route — this change touches rendering gate only, not authorization.
- Verified: `npx tsc --noEmit` clean, `npm run build` green, `middleware.ts` confirmed unchanged (`getUser()` still present).
