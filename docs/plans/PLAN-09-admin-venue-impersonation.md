# PLAN-09 — Admin venue impersonation

Lean executable spec, per the house pattern (`MASTER-PLAN-aro.md` §11):
ground truth / non-goals / phases / acceptance. Written the same day the
gap was found in production, not pre-planned in `MASTER-PLAN-v2` — this
document is the record of that decision, and `MASTER-PLAN-v2` should be
read alongside it (N8 HQ refit is the sibling item; see §Relationship to
N8 below).

## Why this exists

An `aro_admin` (platform staff) membership is org-wide by design —
`venue_id IS NULL` — and the `(owner)` layout's `resolveOwnerVenueId` only
ever resolves a venue for `owner`/`manager` roles. That's correct
tenant-isolation behavior, but it left the platform operator with no way
into the real venue console (`/home`, `/regulars`, `/creative`) short of
holding a second owner-role login per venue — which is how a stale/seeded
`owner@roastery.dev` account ended up being the only way to see Creative
Studio at all. This plan closes that gap properly instead of accumulating
more per-venue throwaway accounts.

## Ground truth (verified live, 2026-07-29)

- `memberships.role` CHECK: `owner | manager | staff | aro_admin`
  (`supabase/migrations/20260707000001_aro_platform_schema.sql`).
- `lib/authz.ts`'s `isAroAdminUser()` and `requireAroAdmin()` are the only
  aro_admin checks in the codebase — both service-role reads of
  `memberships`, both already React-`cache()`'d or straightforward to call
  again.
- `lib/owner-stats.ts`'s `resolveOwnerVenueId(userId)` filters
  `role IN ('owner','manager')` only — confirmed by reading the function;
  an aro_admin-only membership resolves to `null` here, identical to no
  membership at all.
- `app/(owner)/layout.tsx` redirects to `/counter` when
  `resolveOwnerVenueId` returns null — the "wrong door" pattern, not a 403.
- `app/(dashboard)/clients/page.tsx` already has a per-tenant "Manage"
  action, but it only calls `setSelectedTenant()` (a `TenantContext` used
  by the legacy HQ per-tenant subpages) — it has never routed into the
  `(owner)` group and was never meant to.

## Non-goals

- **No standing owner-role membership is created for aro_admin.** Granting
  a permanent `owner` row per venue would blur the role model everywhere
  else that checks it (rate limits, `requireRowVenueRole`, future billing
  gates). Impersonation is a time-boxed, explicitly-entered state, not a
  role change.
- **No changes to the `(dashboard)` HQ shell's own auth.** Out of scope
  here; this only adds a door from HQ into the venue console.
- **Not a general "log in as any user" tool.** Scoped narrowly to
  venue-console access for support/QA/onboarding purposes, always visibly
  bannered, always audit-logged, never silent.
- **No client-tier cut decisions.** What a paying café owner can/can't see
  is a separate, explicitly parked question (per the owner's own
  instruction) — this plan is 100% about the _operator's_ access path.

## Relationship to N8 (HQ refit)

This plan and N8 (`MASTER-PLAN-v2` §N8, the coffee/cream → aro visual
migration) are siblings, not the same work. Impersonation fixes an actual
access gap (functionally broken today); N8 fixes a visual mismatch between
the two shells. Recommended sequencing, given the owner's own reaction to
the mismatch: do this plan first (it's small and unblocks real testing
immediately), then treat N8 as higher priority than its current
"filler work" placement in the masterplan — the mismatch is visibly
undermining trust in the product's polish, not just cosmetic debt.

## Phases

### Phase 1 — Signed impersonation token + start/end route

- `lib/impersonation.ts`: `startImpersonation`, `endImpersonation`,
  `getImpersonatedVenueId`. HMAC-SHA256-signed cookie
  (`{venueId, adminUserId, exp}`), 2-hour TTL, `httpOnly`/`secure`/
  `sameSite: lax`. Verification re-checks `isAroAdminUser` on every read —
  a revoked admin's cookie stops working immediately, not at expiry.
  New env `IMPERSONATION_SECRET`; missing key throws loudly (no
  placeholder fallback, per house doctrine) rather than silently failing
  open or closed.
- `app/api/admin/impersonate/route.ts`: `POST {venue_id}` (gated by
  `requireAroAdmin()`, validates the venue exists, sets the cookie, emits
  `admin.impersonation_started`) and `DELETE` (clears the cookie, emits
  `admin.impersonation_ended`).
- New event types: `admin.impersonation_started`, `admin.impersonation_ended`
  (+ labels in `lib/events.ts`).

**Status: done.**

### Phase 2 — Layout wiring

`app/(owner)/layout.tsx`: for a signed-in user, check
`getImpersonatedVenueId(userId)` first; if it returns a venue, use it
(and pass an `impersonating` flag + venue name down to `OwnerShell`).
Otherwise fall through to the existing `resolveOwnerVenueId` check,
completely unchanged. A non-admin's request never even calls the
impersonation check meaningfully (the cookie can only have been set by a
route gated on `requireAroAdmin()`, and every read re-verifies admin
status), so this adds no new attack surface to the owner/manager path.

**Status: in progress this session.**

### Phase 3 — Owner shell banner

`app/(owner)/owner-shell.tsx`: when impersonating, render a persistent,
impossible-to-miss top banner — "Operating as **{venue}** — aro_admin" —
with an Exit action that calls `DELETE /api/admin/impersonate` and routes
back to `/dashboard`. Never silent; the whole point is that anyone looking
at the screen (including the admin themselves, days later) can tell
instantly that this isn't a real owner session.

**Status: in progress this session.**

### Phase 4 — HQ entry point

`app/(dashboard)/clients/page.tsx`: add an "Operate as this venue" action
alongside the existing Manage/Edit/Delete buttons, calling
`POST /api/admin/impersonate` with the venue's id and redirecting to
`/home` on success.

**Status: in progress this session.**

### Phase 5 — Docs + verification

`.env.example` entry, `BUILD-LOG-admin-impersonation.md`, `tsc --noEmit` +
`npm run build` green, grep gates (no other file reads/writes the
`aro_impersonation` cookie directly — only `lib/impersonation.ts` touches
it).

## ✅ Acceptance checklist

- [ ] `aro_admin`-only account (no owner/manager row) can click "Operate
      as" on a venue and land on that venue's real `/home`.
- [ ] `/creative`, `/regulars`, etc. all resolve to the impersonated venue
      while the cookie is valid.
- [ ] The owner shell shows the "Operating as" banner on every page while
      impersonating; it never appears for a real owner/manager session.
- [ ] Exit clears the cookie and a subsequent load of `/creative` bounces
      back to `/counter` (proving the fallback path is unaffected).
- [ ] Cookie tampering (flipped byte in the signature) is rejected —
      falls through to the normal owner/manager check, never grants
      access.
- [ ] A membership deactivation (`is_active: false`) on the admin's own
      `aro_admin` row invalidates an in-flight impersonation cookie on
      its very next read.
- [ ] `admin.impersonation_started` / `_ended` events are emitted and
      visible in the activity feed.
- [ ] `IMPERSONATION_SECRET` missing throws loudly at first use, matching
      every other secret in this codebase — never a silent no-op.
- [ ] `tsc --noEmit` and `npm run build` green.

**Dependencies** — needs: nothing new (uses existing `memberships`,
`venues`, `requireAroAdmin`). Unlocks: real end-to-end testing of R4
(Creative Studio) and any future owner-surface work without minting a
throwaway owner account per venue; makes N8's HQ refit easier to evaluate
side-by-side with the real venue console.
