# Build log — Admin venue impersonation (PLAN-09)

Tracks progress against `docs/plans/PLAN-09-admin-venue-impersonation.md`.

## What triggered this

Testing R3/R4 in production surfaced a real gap: `connect@lionovart.com`
(a fresh `aro_admin` account, created to test the merged Client Websites +
Creative Studio work) landed on `/counter` instead of Creative Studio.
Root cause traced live: `resolveOwnerVenueId` only matches `owner`/
`manager` memberships by design (tenant isolation — `aro_admin` is
org-wide, `venue_id IS NULL`), and Creative Studio lives under the
`(owner)` route group. The only existing way in was a separate,
pre-seeded `owner@roastery.dev` account whose password had to be reset to
even use it. That's not a real access path for an operator who needs to
check any venue, so this plan builds the actual one.

## Phase 1 — Signed impersonation token + start/end route

- `lib/impersonation.ts`: `startImpersonation`/`endImpersonation`/
  `getImpersonatedVenueId`. HMAC-SHA256-signed cookie
  (`{venueId, adminUserId, exp}`), `timingSafeEqual` comparison (not `===`)
  to avoid a timing side-channel on the signature check. 2-hour TTL.
  `IMPERSONATION_SECRET` missing throws loudly at first use — no
  placeholder fallback, matching every other secret in this codebase.
- `app/api/admin/impersonate/route.ts`: `POST {venue_id}` gated by the
  existing `requireAroAdmin()` (no new authz primitive invented), verifies
  the venue exists via service role, sets the cookie, emits
  `admin.impersonation_started`. `DELETE` clears the cookie and emits
  `admin.impersonation_ended`.
- `lib/events.ts`: two new event types + labels.

## Phase 2 — Layout wiring

`app/(owner)/layout.tsx`: `getImpersonatedVenueId(userId)` is checked
first. If it resolves, that venue_id is used and the venue's
`business_name` is looked up for the banner. If it doesn't resolve (no
cookie, expired, tampered, or the caller is no longer `aro_admin`), the
existing `resolveOwnerVenueId` owner/manager check runs completely
unchanged — this was a pure addition, not a rewrite of the existing gate.

## Phase 3 — Owner shell banner

`app/(owner)/owner-shell.tsx`: new optional `impersonating` prop. When
present, a `bg-aro-plum` banner reading "Operating as **{venue}** —
aro_admin" renders above the shell (sticky, always visible, never mixed
up with real owner chrome) with an Exit button that calls
`DELETE /api/admin/impersonate` then routes to `/dashboard`. Restructured
the outer wrapper from a single flex row into a flex column (banner
stacked above the existing sidebar+content row) — the sidebar/header/nav
JSX itself is untouched, only re-nested one level deeper.

## Phase 4 — HQ entry point

`app/(dashboard)/clients/page.tsx`: new "Operate as this venue" button per
client card, below the existing Manage/Edit/Delete row (kept visually
separate — it enters a completely different surface than "Manage", which
opens `TenantContext`-driven legacy subpages). Calls the new route,
hard-navigates to `/home` on success (a full navigation, not client-side
routing, since the server layout needs to re-read the fresh cookie).

## Phase 5 — Docs + verification

- `.env.example`: `IMPERSONATION_SECRET` documented under its own section,
  `openssl rand -hex 32` noted as the generation command.
- Grep gate: `grep -rn "aro_impersonation" app lib` returns exactly one
  file (`lib/impersonation.ts`) — confirmed no other code reads or writes
  the cookie directly, which would have bypassed the signature/expiry/
  still-admin checks.
- `tsc --noEmit`: clean.
- `npm run build` (with a throwaway `IMPERSONATION_SECRET` for the build
  step only): green. `/api/admin/impersonate` present in the manifest;
  every previously-existing route unchanged.

## Not done — needs a live login this environment can't perform

This sandbox has no browser and its outbound network to Vercel/Supabase
domains is policy-blocked (confirmed earlier this session — direct
`curl`/Playwright to `*.vercel.app` gets a 403 at the proxy), so the
actual click-through was never exercised here:

1. The HQ "Operate as this venue" button → landing on the real `/home`
   for that venue.
2. The banner rendering correctly and the Exit button actually clearing
   the cookie (verified the route logic and the `DELETE` handler
   independently, not the full round-trip).
3. Cookie-tampering rejection (flipped signature byte falls through to
   `/counter`) — the `timingSafeEqual` length-mismatch guard was
   reasoned through, not exercised with a real forged cookie against a
   live server.
4. The "revoked admin's cookie stops working on next read" property —
   `isAroAdminUser` is called on every verification by construction, but
   this wasn't proven against a live deactivate-then-reload sequence.

Whoever verifies this live: set `IMPERSONATION_SECRET` in Vercel, log in
as `aro_admin`, click "Operate as this venue" from `/clients`, confirm
`/home` and `/creative` both load for that venue with the banner visible,
click Exit, confirm `/creative` bounces back to `/counter` afterward.
