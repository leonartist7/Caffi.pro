# BUILD-LOG-PLAN-30 — Owner shell nav unification

## What shipped

- `lib/modules.ts`: `OWNER_ITEMS` (Home, Regulars — fixed, non-toggleable,
  mirrors `HQ_ITEMS`), three new `surface: 'owner'` module entries
  (`owner_rewards` → `/rewards-admin`, `owner_campaigns` → `/campaigns`,
  `status: 'coming_soon'`, `owner_settings` → `/venue-settings`), and an
  `ownerModules()` helper mirroring `hqModules()`. All appended at the end
  under a `// --- Lane C ---` comment, per the file's append-only
  convention.
- `lib/impersonation.ts`: added `resolveEffectiveOwnerVenueId(userId)` —
  impersonation cookie first, `resolveOwnerVenueId` fallback. Used by the
  three new pages below so they render correctly for an `aro_admin`
  mid-impersonation.
- `app/(owner)/owner-shell.tsx`: hardcoded `NAV` array replaced with
  `navItems`, computed from `[...OWNER_ITEMS, ...ownerModules()]`. Both the
  desktop sidebar and the mobile slide-down panel render from the same
  list and now show a "Soon" badge for `coming_soon` entries (only
  Campaigns today), matching `Sidebar.tsx`'s existing HQ-side badge
  pattern. Impersonation banner JSX is untouched.
- Three new real pages under `app/(owner)/`:
  - `rewards-admin/` — list/create/toggle-active/delete against the
    existing `/api/rewards` + `/api/rewards/[id]` routes (unmodified,
    already venue-scoped via `requireVenueRole`). Full CRUD, not a stub.
  - `campaigns/` — renders the existing `ComingSoon` component. Marketing
    sends are Lane A's eventual item, blocked on a vendor decision (v2R
    §8) — this keeps the nav entry honest instead of a dead link.
  - `venue-settings/` — business name + timezone (read-only, direct
    query), tip delivery-prompt toggle and review-URL field (both
    live-editable through PLAN-20/21's existing
    `/api/orders/tip-settings` and `/api/orders/review-settings` routes,
    unmodified).

## Architectural finding, resolved (not improvised)

`app/(dashboard)/settings/page.tsx` already owns the URL `/settings`. Next.js
route groups don't affect the URL, so a second `page.tsx` at
`app/(owner)/settings/page.tsx` would collide on the exact same route and
fail the build — this is why the owner's Settings page lives at
`/venue-settings` instead. Confirmed by reading the build output: `/settings`
(HQ, 6.09 kB) and `/venue-settings` (owner, 2.08 kB) both appear as distinct
routes, and `npm run build` completed with no duplicate-route error, which is
the failure mode this would have hit if I'd reused the literal path.

## Gap found, flagged, not fixed

`app/(owner)/home/page.tsx`, `creative/page.tsx`, and `regulars/page.tsx`
each re-derive their venue via `resolveOwnerVenueId(user.id)` directly, with
no impersonation check. An `aro_admin` impersonating a venue (PLAN-09) gets
a blank page on all three today — `resolveOwnerVenueId` only matches an
`owner`/`manager` membership row, which an impersonating admin doesn't have.
Not fixed here: `/home` isn't assigned to any lane in v2R's partition, and
`/regulars` is Lane A's file. The three pages this PR _does_ own use
`resolveEffectiveOwnerVenueId` so the gap doesn't grow. Recorded in
STATUS.md's Lane C section.

## Verified here

- `npx tsc --noEmit` — clean (after `npm install`; `node_modules` wasn't
  present at session start).
- `npm run build` — clean. All new routes appear as distinct entries;
  `/venue-settings` (167 kB), `/rewards-admin` (169 kB), `/campaigns`
  (156 kB) build alongside the pre-existing `/settings` (171 kB) and
  `/rewards` (172 kB) with no route collision.
- `npx eslint` — clean on every file this PR touches.
- Grep gate (`coffee-[0-9]|cream-[0-9]|\bdark-[0-9]`) — zero hits across
  every file this PR adds or touches.
- Grep gate (hardcoded owner hrefs) —
  `grep -nE "href: '/(rewards-admin|campaigns|venue-settings|creative)'" app/(owner)/owner-shell.tsx`
  returns nothing; those strings now live only in `lib/modules.ts`.
- Live Supabase query (`aro-platform`, via MCP `execute_sql`): confirmed
  `rewards` has the five columns the new page reads/writes
  (`reward_id`, `tenant_id`, `name`, `points_required`, `is_active`) and
  `venues.brand_kit` exists — the two tables/columns this PR's new pages
  depend on, both pre-existing and unmodified by this PR.
- Local dev server smoke-check: booted `npm run dev`, confirmed all three
  new routes respond (no crash) at the route level.

## NOT verified here (needs a live login/browser this environment doesn't have)

- No interactive click-through as a real owner or an impersonating
  `aro_admin` — this sandbox has no `SUPABASE_SERVICE_ROLE_KEY` (only the
  anon/publishable key is obtainable via the MCP connector; the service
  role key is a Vercel-side secret this session was never given), so
  `getSupabaseAdmin()` calls fail locally regardless of `NEXT_PUBLIC_*`
  env vars. Confirmed the anon key alone isn't enough by attempting to
  boot the dev server without a full `.env.local` — every server-rendered
  owner page 500s on `Missing Supabase environment variables` before
  reaching the code this PR added.
- No screenshot/DOM assertion at 375/768/1280 — the desktop
  sidebar/mobile-panel split is unchanged code (same conditional classes
  as before this PR), and the three new pages reuse the exact layout
  vocabulary (`p-6 md:p-8 max-w-2xl`, `flex-col sm:flex-row`) already
  proven responsive on `regulars/regulars-list.tsx`, but that's inference
  from a pattern match, not a rendered screenshot.
- Tip-toggle and review-URL save round-trips were read from the existing,
  unmodified route code (confirmed request/response shapes match what the
  new client components send), not exercised live end-to-end.

## STATUS.md

Lane C section added with PLAN-30 marked built, the route-collision
resolution, and the impersonation gap flagged.
