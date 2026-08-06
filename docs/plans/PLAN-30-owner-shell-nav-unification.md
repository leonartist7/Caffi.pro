# PLAN-30 — Owner shell nav unification

Lane C, `MASTER-PLAN-v2R-remastered.md` §6. Marked 🟡 NEXT, N17. First Lane C
item — everything else in the lane (PLAN-31–37) either imports the shell this
PR touches or sits behind it in the dependency graph (§10).

## Ground truth (this branch is fresh off `main`, PR-0 merged)

- `app/(owner)/owner-shell.tsx` declares a hardcoded 6-item `NAV` array:
  Home, Regulars, Creative, Rewards (`/rewards-admin`), Campaigns
  (`/campaigns`), Settings (`/settings`). Only `/home`, `/regulars`,
  `/creative` resolve to a page under `app/(owner)/`. `/rewards-admin` and
  `/campaigns` have no page anywhere. `/settings` resolves to
  `app/(dashboard)/settings/page.tsx` — the agency HQ shell, coffee/cream
  skin, `TenantContext`-driven — so an owner clicking "Settings" in their own
  console is silently thrown into the wrong product.
- `lib/modules.ts` already carries the `surface: 'hq' | 'owner'` field and a
  `hqModules()` helper consumed by `Sidebar`/`MobileNav`. `creative` is
  currently the only `surface: 'owner'` entry. Nothing consumes an
  owner-surface list yet — this PR adds that consumer.
- **Route-path conflict found, resolved here:** `app/(dashboard)/settings/page.tsx`
  already owns the URL `/settings`. Next.js route groups do not affect the
  URL — a second `page.tsx` at `app/(owner)/settings/page.tsx` would collide
  on the exact same route and fail the build. v2R's acceptance line only
  requires "every owner nav entry resolves to a page **inside** the `(owner)`
  group," not a specific URL, so the owner's Settings page lives at
  `/venue-settings` instead. The nav label stays "Settings"; only the path
  differs from the dead link it replaces.
- **Impersonation gap found, not fixed here:** `app/(owner)/home/page.tsx`,
  `creative/page.tsx`, and `regulars/page.tsx` each re-derive their venue via
  `resolveOwnerVenueId(user.id)` directly, with no impersonation check —
  `resolveOwnerVenueId` only matches an `owner`/`manager` membership, so an
  `aro_admin` impersonating a venue (PLAN-09) gets a blank page on all three
  today. That's a pre-existing bug in files this lane doesn't own (`/home`
  isn't assigned to any lane in v2R's partition; `/regulars` is Lane A's).
  Flagged in STATUS.md, not fixed here. The three pages this PR _does_ own
  (`/rewards-admin`, `/campaigns`, `/venue-settings`) are built
  impersonation-aware from the start via a new helper, so the gap doesn't
  grow.
- `app/api/rewards/**` and `app/api/orders/{tip,review}-settings/**` already
  exist, are venue-scoped via `requireVenueRole(venueId, ['owner','manager'])`,
  and already pass for an impersonating `aro_admin` (that check has an
  explicit `aro_admin` bypass for any venue — verified by reading
  `lib/authz.ts`). This PR consumes those routes from new pages; it does not
  modify them.

## Design

- `lib/modules.ts`: append (Lane C block, end of file per the append-only
  convention) —
  - `OWNER_ITEMS`: fixed array for the two owner-surface entries that are
    core navigation, not toggleable modules (mirrors `HQ_ITEMS`'s existing
    precedent for `Dashboard`/`Clients`/`Leads`) — Home (`/home`), Regulars
    (`/regulars`).
  - Three new `ModuleKey` values + `MODULES` entries, all `surface: 'owner'`:
    `owner_creative` is _not_ added (the existing `creative` entry already
    covers it) — only `owner_rewards` (`/rewards-admin`, `status: 'live'`),
    `owner_campaigns` (`/campaigns`, `status: 'coming_soon'` — campaigns/
    marketing sends are Lane A's eventual item, blocked on a vendor per §8;
    this is the same "coming_soon still renders a real page" pattern already
    used for `coupons`/`notifications`/`locations`, not a dead link),
    `owner_settings` (`/venue-settings`, `status: 'live'`).
  - `ownerModules()`: `MODULES.filter(m => m.surface === 'owner')`, mirroring
    `hqModules()`.
- `lib/impersonation.ts`: add `resolveEffectiveOwnerVenueId(userId)` —
  impersonation cookie first, `resolveOwnerVenueId` fallback, same order the
  `(owner)` layout already uses inline. New pages call this one function
  instead of duplicating the two-step check.
- `owner-shell.tsx`: delete the hardcoded `NAV` array. Nav is now
  `[...OWNER_ITEMS, ...ownerModules()].map(...)`, in that fixed order (Home,
  Regulars, then modules in `MODULES` array order — Creative, Rewards,
  Campaigns, Settings). `coming_soon` entries render a small "Soon" badge
  (matching `Sidebar`'s existing badge pattern) but remain real, clickable
  links — never disabled, never a dead click.
- `app/(owner)/rewards-admin/page.tsx` (server) + `rewards-admin-client.tsx`
  (client, co-located, matching the `regulars/regulars-list.tsx` precedent):
  list/create/toggle-active/delete against the existing `/api/rewards` +
  `/api/rewards/[id]` routes, scoped to the resolved venue. Real CRUD, not a
  stub — the table and API already exist and are already venue-scoped.
- `app/(owner)/campaigns/page.tsx`: renders the existing `ComingSoon`
  component (same pattern as `/coupons`, `/notifications`) — honest, not a
  fake feature, not a 404.
- `app/(owner)/venue-settings/page.tsx` (server) + `venue-settings-client.tsx`:
  business name/timezone (read-only, direct query), tip delivery-prompt
  toggle and review-URL field (both live-editable, reusing PLAN-20/21's
  existing `GET`/`PATCH /api/orders/tip-settings` and `/review-settings`
  routes exactly as the HQ dashboard's equivalent controls do).

## Non-goals

- Not rebuilding `/rewards` (HQ) or `/settings` (HQ) — those stay as-is,
  owned by the agency console, untouched by this PR.
- Not fixing the `/home`/`creative`/`regulars` impersonation gap (flagged,
  not this PR's file ownership).
- Not adding full settings parity (website/notifications/API keys/email
  templates tabs) to `/venue-settings` — the two owner-editable settings that
  exist as real, venue-scoped API surfaces today (tip prompt, review URL),
  plus the two read-only identity fields. More tabs land when their owning
  surface ships.
- Not touching `coffee-*`/`cream-*`/`dark-*` tokens on any _existing_ file —
  that's PLAN-31/32/33. New files in this PR are `aro`-token only from the
  start.

## ✅ Acceptance

- [ ] Every entry in `[...OWNER_ITEMS, ...ownerModules()]` resolves to a real
      page inside `app/(owner)/` — asserted by a test that walks the list and
      requires a matching route file.
- [ ] Zero 404s from the owner nav; zero owner-nav links landing in the
      `(dashboard)` shell (`/venue-settings` ≠ `/settings`, confirmed no
      route collision — `npm run build` succeeds, which fails hard on a
      duplicate-page conflict).
- [ ] `owner-shell.tsx` contains no hardcoded nav array — its `navItems`
      constant is built by spreading `OWNER_ITEMS`/`ownerModules()`, not a
      literal list of hrefs/labels/icons (grep gate:
      `grep -nE "href: '/(rewards-admin|campaigns|venue-settings|creative)'" app/\(owner\)/owner-shell.tsx`
      → nothing; those strings now live only in `lib/modules.ts`).
- [ ] PLAN-09's impersonation banner still renders on every owner page and
      still exits correctly — regression-tested by reading the unchanged
      banner JSX and confirming `impersonating` prop plumbing is untouched.
- [ ] Nav renders correctly at 375/768/1280; the mobile panel closes on
      navigation (existing behaviour preserved).
- [ ] Rewards admin: create, toggle active, delete all round-trip against
      the real `rewards` table for the resolved venue; a second venue's
      rewards are never visible (tenant isolation, inherited from the
      existing `/api/rewards` authz).
- [ ] Venue settings: tip delivery toggle and review URL save round-trip
      against the real `venues.brand_kit` via the existing PATCH routes; a
      non-`https` review URL is rejected client-side before the network call
      (mirrors the existing route's own validation).
- [ ] **Design bar**: `grep -rE 'coffee-[0-9]|cream-[0-9]|\bdark-[0-9]'` on
      every file this PR adds → nothing.
- [ ] `npm run build` + `tsc --noEmit` green.
