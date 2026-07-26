# Build log — Client Websites

Tracks progress against `docs/plans/PLAN-05-client-websites.md`. One
section per phase. Prerequisites: PLAN-00, PLAN-01, PLAN-02 complete.

## Phase 1 — `site_profile` in `brand_kit`

- `lib/site-profile.ts`: `SiteProfile` shape + `parseSiteProfile()`,
  mirroring `lib/reservations.ts`'s `parseReservationConfig` pattern —
  pure, no Supabase import. `site_enabled` defaults `false`: a venue's site
  only goes live once the owner has actually filled in a profile and
  turned it on, never an empty template masquerading as a real site.
- No migration: `brand_kit` already has a public grant and no
  constraints to add, so the marketing profile is a pure application-code
  extension, namespaced under `brand_kit.site_profile` so it can never
  collide with the existing `logo_url`/`primary` fields.
- `lib/get-tenant.ts` / `lib/clients.ts`: both existing `brand_kit` readers
  extended rather than adding a third parallel reader. `getAllTenants()`
  (an admin picker that never renders site content) gets
  `DEFAULT_SITE_PROFILE` rather than a real read, since it doesn't select
  `brand_kit` at all.
- `app/api/clients/[id]/route.ts` PATCH: accepts `site_profile`, merged
  into `brand_kit.site_profile` using the same nested-merge shape already
  used for `reservation_config` in this file. Gallery length capped
  server-side even though the UI caps it too — the client isn't trusted
  for anything past this route's own gate.
- Verified: `tsc --noEmit` green.

## Phase 2 — Public site pages (`app/site/[slug]/...`)

- New unauthenticated route group, like `/shop` and `/reserve` — not under
  `(dashboard)` or `(owner)`.
- `layout.tsx`: resolves the venue via `getTenantBySlug`; a venue that
  exists but has `site_enabled: false` renders a warm "coming soon" state
  and short-circuits before any child page renders — not a 404, mirroring
  the reservations "hours not configured" convention.
- Home page CTAs never link to a dead end: "Order now" only renders when
  the venue has live menu items (`getStorefront` — the exact function
  `/shop`'s own menu page uses, called again here rather than forked),
  "Book a table" only when hours are actually configured. A venue with
  neither shows a plain "Get in touch" CTA to the Contact page instead of
  a link to nothing.
- `lib/site-hours.ts`: new server-only helper. `reservation_config` has no
  public grant (PLAN-02's PII-adjacent-config rule) — this reads it via
  service role and returns only the derived weekly open/close text, same
  discipline as `app/api/reservations/availability/route.ts`.
- `lib/site-meta.ts`: shared `generateMetadata()` helpers (description
  truncation that never cuts mid-word, OG image). No fallback OG image —
  confirmed `public/` has no default social-share asset today, and a path
  that 404s is worse than omitting the tag, so it's omitted.
- Menu page reads `getStorefront`'s categories/items directly — read-only
  display, no cart, one "Order online" CTA to the real storefront.
- `components/site/SiteShell.tsx`: deliberately not shared with `/shop`'s
  `ShopLayoutClient` — that shell carries a cart button and order-flow
  nav; this is a plain marketing site shell (home/menu/hours/contact nav,
  footer with address/phone/socials).
- Verified: `tsc --noEmit` and `npm run build` green; all four
  `/site/[slug]/*` routes present in the build manifest.

## Phase 3 — SEO: structured data, sitemap, robots

- `lib/site-structured-data.ts`: `CafeOrCoffeeShop` LocalBusiness JSON-LD.
  Omits `address`/`telephone`/`sameAs` individually when the venue has no
  data for them rather than fabricating placeholder fields — rendered only
  inside the site layout's enabled branch (a `site_enabled: false` venue
  never gets a script tag at all, since that branch short-circuits before
  reaching it).
- `app/sitemap.ts`: native Next.js App Router convention (confirmed
  supported — this project is on Next 14.2). Enumerates only
  `site_enabled: true` venues across all four site pages. **Marked
  `export const dynamic = 'force-dynamic'`** — the first build attempt
  failed prerendering `/sitemap.xml` at build time because this sandbox
  has no Supabase credentials configured; every other Supabase-backed
  route in this app is already dynamic for the identical reason, and a
  build-time-frozen sitemap would never reflect a venue turning their site
  on or off after deploy anyway, so this is the correct fix, not a
  workaround for the missing credentials specifically.
- `app/robots.ts`: allow-all, points at the sitemap.
- Verified: `npm run build` green after the `dynamic` fix; `/sitemap.xml`
  and `/robots.txt` both present in the manifest (`ƒ` and `○` respectively
  — sitemap dynamic, robots static, as expected).

## Phase 4 — HQ Website settings tab + custom-domain switch

- `app/(dashboard)/settings/page.tsx`: one more tab flipped from
  `ComingSoon` to real — Website. Tagline, about, address, phone, socials,
  a capped repeatable gallery URL list, a `site_enabled` toggle, and a
  Preview-site link that's disabled until the site is actually on.
  **Deliberately kept the existing coffee/cream HQ styling** rather than
  aro tokens — per §Non-goals, this tab is part of the old dashboard
  surface PLAN-06 will refit, not the new public-site surface this plan
  builds; the two should not be conflated.
- Confirmed the PATCH route's existing gate (`requireRowVenueRole(...,
['owner','manager'], 'venue_id')`) already covers this tab — no gate
  change needed, no duplicate gate added.
- `middleware.ts`: added one branch between the existing `/reserve`
  handling and the `/shop` fallback — a custom domain's root (and anything
  that isn't an explicit `/shop` or `/reserve` path) now rewrites to
  `/site/<slug>` instead of falling straight into `/shop/<slug>`. `/shop`
  and `/reserve` remain exactly as reachable as before (the site's own CTA
  buttons link there). Re-read the current file before editing rather than
  trusting the plan's line numbers, which had drifted since PLAN-02.
- Did **not** add a `sites`/`website` entry to `lib/modules.ts` — per the
  plan, this is a Settings sub-tab (configuration), not a client-scoped
  nav module the way Menu/Orders/Reservations are.
- Verified: `tsc --noEmit` and `npm run build` green.

## Phase 5 — Seed data, GBP guide, grep gates

- `supabase/seed/aro_dev_seed.sql`: added an idempotent `UPDATE ... SET
brand_kit = brand_kit || jsonb_build_object(...)` for The Roastery,
  merging a full `site_profile` (tagline, two-paragraph about, address,
  phone, one Instagram URL, three Unsplash gallery images following the
  same convention already used for `logo_url`/`menu_items.image_url`) and
  `site_enabled: true`. Used `||` merge rather than appending to the
  `ON CONFLICT (venue_id) DO NOTHING` venue insert above it, since that
  insert only ever fires once — the `UPDATE` is what stays safe to run
  repeatedly without clobbering the existing `primary`/`background`/
  `voice`/`logo_url` keys already in `brand_kit`.
- `docs/plans/GBP-onboarding-guide.md`: new, pure documentation — claim/
  verify the listing, map every Business Profile field back to the exact
  Settings → Website field it comes from, photos, keeping hours in sync
  (flagged explicitly as **not** automated — no API sync exists), review
  cadence. No code, no API keys, no vendor account, satisfying the master
  plan's GBP guidance line without the integration decision PLAN-05
  deliberately deferred.
- Grep gates run and passed clean:
  - No `.from('menu_items'` / `.from('menu_categories'` under `app/site/`
    — confirmed the menu page reuses `getStorefront` rather than forking
    the query.
  - Zero non-`aro-` Tailwind color classes under `app/site/**` or
    `components/site/**` (checked `bg-amber-`, `text-orange-`,
    `bg-coffee`/`text-coffee`, `bg-cream-[0-9]`/`text-cream-[0-9]`,
    `bg-mocha`, `bg-espresso[^-]`, `bg-latte`, `bg-foam`) — clean, this
    surface is 100% aro tokens.
  - `git diff main -- package.json` empty — no new npm dependency added
    anywhere in this plan (the OG-image and structured-data work stayed
    inside what Next.js and the existing stack already provide).

## Verification (end-to-end, per the plan's own checklist)

Performed in this environment:

1. `npx tsc --noEmit` and `npm run build` green throughout all five
   phases, checked after every file that touched TypeScript, not just at
   phase end.
2. All routes present in the build manifest:
   `/site/[slug]`, `/site/[slug]/menu`, `/site/[slug]/hours`,
   `/site/[slug]/contact`, `/sitemap.xml`, `/robots.txt`.
3. Grep gates (menu-query reuse, aro-token purity, no new dependency) all
   pass — see Phase 5 above.

**Not performed — this environment has no live Supabase connection.**
Everything below needs a real database and was not exercised:

1. `/site/the-roastery` actually loading with the seeded profile data
   (item 1 of the plan's checklist) — the seed SQL is written and
   idempotent but was never run against a live project here.
2. The `site_enabled: false` "coming soon" state, the menu/hours pages
   matching live data, and the sitemap actually listing only enabled
   venues (items 2, 3, 4, 5) — all logically verified by reading the code
   paths, none run against real rows.
3. The HQ Settings → Website tab's round-trip through the real PATCH route
   and the 403-for-non-owner/manager check (item 6) — the route's gate is
   unchanged from before this plan, but the new `site_profile` field on
   that same route was never exercised live.
4. The custom-domain middleware rewrite (item 7) — the branch was read
   against the current file and matches the plan's described behavior
   exactly, but middleware host-based routing needs a real custom domain
   or a manually spoofed `Host` header against a running dev server to
   actually confirm, neither of which was available here.

Whoever verifies this against the live project should seed-apply
`aro_dev_seed.sql`'s new `UPDATE`, hit `/site/the-roastery` directly, then
toggle `site_enabled` off via Settings and confirm the "coming soon" state
appears before calling any of the above items actually done.
