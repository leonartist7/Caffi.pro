# PLAN-05 — Client Websites & Creative Studio

> Executor: read `docs/plans/MASTER-PLAN-aro.md` FIRST. Its architecture principles (§4) and execution protocol (§5) are binding here and are not repeated in full. Prerequisite: PLAN-00, PLAN-01, PLAN-02 are complete and live (production cutover, ordering core, reservations — all merged and verified). Work on a new branch off `main`, new draft PR titled `feat(sites): per-venue marketing websites, SEO, structured data`.

## Executor notes (read twice before touching any file)

Same operating rules as PLAN-02, restated because they matter more than the feature list:

1. **Smaller commits than usual** — one commit per numbered step inside a phase whenever a phase has more than two steps.
2. **Every "Ground truth" claim below was re-verified against the live repo on 2026-07-17.** Trust it; if the actual repo contradicts it, the repo wins — STOP and flag in the build log.
3. **Copy, do not invent.** Every phase names the exact file to clone.
4. **No feature beyond what's written here.** See §Non-goals. This phase deliberately does NOT touch the HQ dashboard's visual design (that's PLAN-06, not yet written, not your job here) — you are building a NEW public surface, not refitting an old one.
5. **`npx tsc --noEmit` and `npm run build` after every file that touches TypeScript**, not just at phase end.
6. **Self-review with `/code-review --level medium` before every commit.**
7. Any failed verification check you can't explain in a few minutes → STOP, write it in `docs/plans/BUILD-LOG-client-websites.md`, don't build on top of it unverified.

## Context & goal

Every café on aro gets a real public website — not just the ordering storefront (`/shop`) or the booking widget (`/reserve`), but an actual home page: who they are, what they serve, where they are, hours, and clear calls-to-action into ordering and booking. This is the Owner.com-parity piece of the platform (master plan §1) and the first release of what the owner is calling the platform's "creative studio" angle: professional, on-brand, SEO-correct sites generated from data the café already has (menu, hours, brand_kit), zero extra work for the café owner beyond filling in a short marketing profile.

Release-one scope: **a template-driven public site per venue** (home, menu — reads the same live menu data as `/shop`, hours & location, contact), **SEO fundamentals** (per-page metadata, Open Graph, LocalBusiness structured data, sitemap.xml, robots.txt), **a Website tab in HQ Settings** to edit the marketing profile, and **custom domains now resolving to the site as the true homepage** instead of straight into the ordering storefront. All of it renders in the aro design system (it's a brand-new surface — this phase never had the "still using coffee/cream" problem PLAN-06 will fix).

### Non-goals (do not build these — flag if you're tempted to add them)

- The HQ dashboard visual refit (coffee/cream → aro tokens on `/dashboard`, `/clients`, `/staff`, `/settings`, etc.). Confirmed 2026-07-17 via grep that every HQ screen still renders zero `aro-` classes — real gap, real future phase (PLAN-06), NOT this one. Do not touch HQ screen styling in this phase.
- Image upload / asset pipeline. Gallery and logo images are owner-provided URLs only (same convention as `brand_kit.logo_url` today) — no upload UI, no storage bucket, no image processing.
- A page builder / drag-and-drop editor. Release one is a fixed template with data fields, not a CMS.
- Blog / content pages, multi-page custom nav, multiple templates/themes per venue. One template, one theme (derived from `brand_kit`), four fixed pages (home/menu/hours/contact).
- Google Business Profile API integration. Guidance is documentation only (§Phase 5 below) — no code, no API keys, no new vendor account (this is exactly why this phase was promoted ahead of Phase 3/4, which do need vendor accounts).
- Analytics/tracking pixels, cookie consent banners, A/B testing. Out of scope until there's a reason to add third-party scripts at all.
- Multi-language / i18n.

## Ground truth (re-verified 2026-07-17 — do not re-derive, but do re-check before writing code that touches these)

- Live Supabase project `jjgccfrwjkwknyjtbtxa` ("aro-platform"), seed venue "The Roastery" `a0000000-0000-4000-3000-000000000001`, slug `the-roastery`.
- **`venues.brand_kit` is a JSONB column already granted SELECT to `anon, authenticated`** (verified via `information_schema.column_privileges` — it's in the public column list alongside `business_name, slug, custom_domain, app_name, features_enabled, loyalty_config, currency, timezone`). This means: any new marketing fields you add inside `brand_kit` (tagline, about text, address, socials, gallery) are **automatically publicly readable with zero grant changes** — do not write a migration to grant anything for this data. Only write a migration if you need a genuinely new top-level column (you shouldn't for this phase — extend the JSONB).
- Today `brand_kit` is read via `lib/get-tenant.ts`'s `toTenant()` (only extracts `logo_url` and `primary_color` off it) and `lib/clients.ts`'s `toTenantShape()` (same, for the HQ owner-editing side). Both need extending to surface the new fields — do not create a third parallel brand_kit reader.
- HQ editing precedent: `app/(dashboard)/settings/page.tsx` has a `general` tab that PATCHes `app/api/clients/[id]/route.ts` with `{ business_name, logo_url, primary_color }`; that route already merges into existing `brand_kit` rather than overwriting it (see the reservation_config merge added in PLAN-02 — same file, same pattern: `update.brand_kit = { ...(existing.brand_kit ?? {}), ...body.brand_kit }`, follow that exact merge shape, don't invent a new one). Other Settings tabs are still `ComingSoon` (`components/ComingSoon.tsx`) — you are flipping ONE more tab to real, not touching the others.
- **Menu data reuse**: `menu_categories`/`menu_items`/`modifier_groups`/`modifiers` already have public anon-readable column grants with `is_active` RLS policies (ordering core, PLAN-01) — the exact same query shape the `/shop/[slug]/menu` page already uses. The site's menu page reads the SAME data through the SAME public grant — do not create a second menu data path, duplicate a query, or add any new grant.
- **Hours data reuse**: `venues.reservation_config.hours` (added in PLAN-02) is the venue's weekly open/close window — reuse it for the site's Hours page display. `reservation_config` is server-only (not in the public grant), so the site's server component must resolve hours via `getTenantBySlug`-adjacent server-side fetch (service-role or a new minimal public accessor), NOT by adding `reservation_config` to the public column grant — PII-adjacent config stays off the public grant; expose only the derived open/close text, same "derived, never the raw config" principle as the Phase 3 availability endpoint.
- **Custom domain routing** (`middleware.ts`, current content re-read 2026-07-17, lines 51–83): the rewrite currently sends everything NOT starting with `/shop/`, `/join`, `/pass` to `/shop/${venue.slug}${pathname}` — meaning today a custom domain's root `/` IS the ordering storefront. This phase changes that: bare `/` (and any unmatched path) on a custom domain should become the new site (`/site/${venue.slug}${pathname}`) instead, with `/shop` and `/reserve` staying reachable as explicit sub-paths people link to from the site (the CTA buttons). Exact change in Phase 4 below.
- Next.js constraint: `app/api/**/route.ts` files may only export HTTP method handlers; shared helpers go in `lib/*`.
- `lib/authz.ts`: `requireRowVenueRole('venues', 'venue_id', id, ['owner','manager'], 'venue_id')` — note `venues` itself uses `venue_id` as BOTH its own PK and its venue column (it's the root of the tenancy tree, not a child table) — confirm this against how `app/api/clients/[id]/route.ts` already gates its PATCH before copying; do not guess the venueColumn value, read that file.
- aro design tokens (from `tailwind.config.ts`, confirmed live): `aro-cream`, `aro-cream-warm`, `aro-sand`, `aro-clay`, `aro-terracotta`, `aro-espresso`, `aro-ink`, `aro-ink-soft`, `aro-muted`, `aro-hairline`, `aro-terra`, `aro-rose`, `aro-saffron`, `aro-plum`, `aro-sage`, `aro-honey`. Fonts via `next/font` already wired in `app/layout.tsx`: `font-display` (Bricolage Grotesque), `font-serif` (Instrument Serif italic accents), `font-body`/default (Inter), `font-mono` (JetBrains Mono, numbers only). The comment in `tailwind.config.ts` is explicit: **"New surfaces use ONLY these [aro tokens]"** — this is a brand-new surface, zero legacy classes, zero exceptions.
- Reference the exact page you're rebuilding-from-scratch on: `/shop/[slug]/page.tsx` and `/reserve/[slug]/page.tsx` for aro visual patterns (hero section shape, card patterns, CTA button style) — clone the _visual_ patterns, not the ordering/booking logic.
- Migrations discipline (only if you end up needing one — see Phase 1, you likely won't for the JSONB extension but WILL for the sitemap/robots plumbing if you choose a DB-backed page-count approach — prefer the code-only approach described in Phase 3 instead): numbered file under `supabase/migrations/`, mirrored into `supabase/aro_schema.sql`, RLS + grants in the same migration, applied live via Supabase MCP, verified, `get_advisors(security)` clean.

## Phase 1 — Extend `brand_kit` with the marketing profile (no migration needed)

`brand_kit` is untyped JSONB — extend it in application code, not SQL, since it already has a public grant and no NOT NULL/CHECK constraints to add (this is deliberately the lightest possible phase 1, unlike PLAN-01/02 which both needed real migrations).

1. Define the shape in a new `lib/site-profile.ts` (mirrors `lib/reservations.ts`'s `parseReservationConfig` pattern — pure functions, no Supabase import):
   ```ts
   export interface SiteProfile {
     tagline: string | null // short hero line, e.g. "Third-wave coffee, no pretense."
     about: string | null // 1–3 short paragraphs, plain text (render with line breaks, no HTML/markdown parsing this phase)
     address: string | null // single-line display address (no geocoding this phase)
     phone_display: string | null // formatted for display, separate from any auth/contact phone
     instagram_url: string | null
     facebook_url: string | null
     gallery: string[] // owner-provided image URLs, max 6, validate length not content
     site_enabled: boolean // OFF by default — see Phase 4's "warm setup state" rule
   }
   export const DEFAULT_SITE_PROFILE: SiteProfile = {
     tagline: null,
     about: null,
     address: null,
     phone_display: null,
     instagram_url: null,
     facebook_url: null,
     gallery: [],
     site_enabled: false,
   }
   export function parseSiteProfile(brandKit: unknown): SiteProfile {
     /* same defensive parsing style as parseReservationConfig */
   }
   ```
   `site_enabled` defaults `false` deliberately — master plan §3 rule 5 ("missing config shows a visible STUBBED/setup badge, never a silent fake"): a venue's site only goes live once the owner has actually filled in a tagline and turned it on, never an empty template masquerading as a real site.
2. Extend `lib/get-tenant.ts`'s `Tenant` interface and `toTenant()` to include `site_profile: parseSiteProfile(v.brand_kit)` (import from the new file). Extend `lib/clients.ts`'s `ClientRow`/`toTenantShape()` the same way for the HQ owner-editing side.
3. Extend `app/api/clients/[id]/route.ts` PATCH: accept `site_profile?: Partial<SiteProfile>` in the body, merge into `brand_kit.site_profile` using the SAME nested-merge shape already used for `reservation_config` in that file (read it first, copy exactly — do not flatten `site_profile` fields directly onto `brand_kit` top level, keep it namespaced as `brand_kit.site_profile` so it doesn't collide with `logo_url`/`primary`).
4. Verify: `tsc` green; a manual PATCH via the dev server (or a one-off `curl` against a running `npm run dev`) round-trips `site_profile` correctly through `GET /api/clients/[id]` before moving to Phase 2.

## Phase 2 — The site pages (`app/site/[slug]/...`)

Route group, NOT inside `(dashboard)` or `(owner)` — this is public, unauthenticated, like `/shop` and `/reserve`.

1. `app/site/[slug]/layout.tsx`: resolves the venue via `getTenantBySlug` (same call `/shop/[slug]/layout.tsx` makes — check that file for the exact not-found handling pattern and copy it). If `site_profile.site_enabled` is `false`, render a warm "This café's site is coming soon" state (NOT a 404 — the venue exists, the site just isn't turned on yet; this mirrors the reservations "hours not configured" convention from PLAN-02) instead of the full layout, and short-circuit before rendering child pages.
2. `app/site/[slug]/page.tsx` (home): hero section (tagline, business_name, CTA buttons → `/shop/[slug]` "Order now" and `/reserve/[slug]` "Book a table" — only show the ordering CTA if the venue actually has `menu` module live and only show the reservations CTA if `hours` is configured, i.e. don't link to dead ends), about blurb, a small gallery strip if `gallery` has entries, footer with address/phone/social icons. Aro visual language: cream/sand background, terracotta CTA, one oversized display statement (master plan §3 rule 2 — same "ONE number" editorial pattern, here it's ONE statement, not a number).
3. `app/site/[slug]/menu/page.tsx`: server-reads the same public `menu_categories`/`menu_items` data `/shop/[slug]/menu` already reads (copy that query, this is a read-only display, not a cart — no "add to cart" buttons here, just a clean printed-menu-style read with a single "Order online" CTA at the top linking to `/shop/[slug]/menu`). If the venue has no active menu items, show a warm empty state, not a broken grid.
4. `app/site/[slug]/hours/page.tsx`: renders `reservation_config.hours` (resolved server-side, NOT via the public grant — see Ground truth) as a simple weekly table, plus `address`/`phone_display` from `site_profile`, plus a "Book a table" CTA if hours are configured or a neutral map/address-only view if not (don't imply booking works when hours aren't set).
5. `app/site/[slug]/contact/page.tsx`: address, phone, social links, embed nothing (no third-party map iframe this phase — a plain address line is fine, do not add a Google Maps embed, that's a future phase with its own API-key discussion).
6. All four pages: `export const metadata` or `generateMetadata()` per Next.js App Router convention — title `${business_name} — ${tagline ?? 'Menu, hours & location'}`, meta description from `about` (truncated), Open Graph image from `gallery[0]` or a sensible fallback (check if a default aro OG image asset already exists in `public/`; if not, skip the `og:image` tag entirely rather than inventing an asset path that 404s).

## Phase 3 — SEO: structured data, sitemap, robots

1. Add `<script type="application/ld+json">` LocalBusiness structured data to `app/site/[slug]/layout.tsx` (or the home page) — `@type: "CafeOrCoffeeShop"`, `name`, `address` (as a plain string in `PostalAddress.streetAddress` if you don't have structured address parts — do not fabricate city/region/postal fields you don't have data for, omit them), `telephone`, `url`, `sameAs: [instagram_url, facebook_url].filter(Boolean)`. Skip entirely (no script tag) for a venue with `site_enabled: false`.
2. `app/sitemap.ts` (Next.js App Router native sitemap convention — verify this project's Next version supports it via `next.config`/existing `app/` structure before assuming; if it's an older Next version without native `sitemap.ts` support, fall back to a route handler `app/sitemap.xml/route.ts` that hand-builds the XML — check which is actually supported before writing 200 lines against the wrong API): enumerate all venues with `site_profile.site_enabled = true` (service-role query, `venues` table, no new grant needed — server-only script), yield `/site/${slug}`, `/site/${slug}/menu`, `/site/${slug}/hours`, `/site/${slug}/contact` for each. This is the ONE piece of this phase that needs a server-side venue list, not a per-venue page — keep it as one small file, not a new API route.
3. `app/robots.ts` (or `app/robots.txt/route.ts`, same version-check caveat as sitemap): allow all, point `sitemap:` at the sitemap URL. Simple, static-ish, no per-venue logic needed beyond the sitemap reference.
4. Verify: fetch the sitemap in dev, confirm it lists only `site_enabled: true` venues (seed The Roastery with `site_enabled: true` in Phase 5 so there's at least one); confirm structured data validates as well-formed JSON (a simple `JSON.parse` round-trip test is enough, don't reach for an external schema validator).

## Phase 4 — HQ: Website settings tab + custom-domain homepage switch

1. `app/(dashboard)/settings/page.tsx`: flip ONE more tab from `ComingSoon` to real — a "Website" tab (add to the existing tabs array alongside `general`). Form fields: tagline, about (textarea), address, phone_display, instagram_url, facebook_url, gallery (simple repeatable URL input list, max 6 — client-side cap, no upload), a `site_enabled` toggle with copy explaining what turning it on does ("Your public site goes live at yourcafe.com" or the aro subdomain — check what URL to actually show, see step 3), and a "Preview site" link (`/site/${slug}`, opens in a new tab) that's disabled/grayed until `site_enabled` is true. PATCHes the same `app/api/clients/[id]/route.ts` extended in Phase 1. Gate: this page is already inside `(dashboard)`, which already gates via the layout — confirm the existing PATCH gate in that route (`requireRowVenueRole`/`requireVenueRole`, whichever it already uses) covers `owner` and `manager`, matching every other Settings tab; do not weaken or duplicate the gate.
2. `lib/modules.ts`: this is a Settings sub-tab, not a new top-level module — do NOT add a `sites` entry to `MODULES`/`ModuleKey`. The public site is not a client-scoped nav item the way Menu/Orders/Reservations are; it's configuration, like the rest of Settings.
3. `middleware.ts` custom-domain rewrite (exact change, current file re-read 2026-07-17): today (lines 68–76) every path except `/shop/`, `/join`, `/pass`, and `/reserve` variants falls through to `url.pathname = \`/shop/${venue.slug}${pathname}\``. Add a branch BEFORE that fallback: if `pathname === '/' || (!pathname.startsWith('/shop') && !pathname.startsWith('/reserve'))`, rewrite to `` `/site/${venue.slug}${pathname === '/' ? '' : pathname}` `` instead — i.e. the site becomes the default landing surface for a custom domain, with `/shop`and`/reserve` remaining directly reachable as they are today (the CTA links on the site point there). Re-read the exact current file before editing — line numbers may have shifted since this was last touched in PLAN-02's fix round.
4. Do NOT change the `join.aro.club` branch (lines 33–39) or the `isMainDomain` list (lines 42–49) — those are unrelated to this phase.
5. Verify: with a venue that has no `custom_domain` set (like the seed), confirm `/site/the-roastery` works directly on the main app domain regardless of the middleware change (middleware only rewrites for actual custom domains) — the direct `/site/[slug]` path must work standalone, custom domains are an enhancement on top, not a requirement.

## Phase 5 — Seed data, Google Business guidance doc, polish

1. Seed additions (idempotent, extend `supabase/seed/aro_dev_seed.sql`): give The Roastery a full `site_profile` (tagline, about, address, phone_display, at least one social URL, 2–3 gallery URLs using placeholder image URLs that actually resolve — check what pattern existing seed data uses for image URLs, e.g. `menu_items.image_url`, and follow the same convention) and `site_enabled: true` so `/site/the-roastery` demos immediately.
2. New `docs/plans/GBP-onboarding-guide.md` — pure documentation, no code: a short owner-facing guide for claiming/optimizing a Google Business Profile per café (claim listing, verify address, add the aro site URL, add hours matching `reservation_config.hours`, respond-to-reviews cadence suggestion). This satisfies the master plan's "Google Business Profile guidance" line without any API integration.
3. Final grep gates: no `.from('menu_items'` / `.from('menu_categories'` duplicate query construction outside the established pattern (confirm the site's menu page actually reuses logic rather than forking it — if it forked, refactor to share, don't leave two copies of the same query drifting); zero non-`aro-` Tailwind color classes anywhere under `app/site/**` (grep for `bg-amber-`, `text-orange-`, `bg-coffee`, etc. — this is a brand-new surface, it must be 100% clean); no new npm dependency (this phase needs none — if you want one, STOP and flag).
4. `docs/plans/BUILD-LOG-client-websites.md` (new file, same format as prior build logs): one section per phase.

## Verification (end-to-end, per phase + final)

1. `/site/the-roastery` loads, shows real seeded profile data, aro-styled, zero legacy color classes.
2. A venue with `site_enabled: false` shows the warm "coming soon" state at `/site/<slug>`, not a 404 and not a broken empty template.
3. `/site/the-roastery/menu` shows the same live menu items as `/shop/the-roastery/menu` (same data, different presentation, no cart).
4. `/site/the-roastery/hours` reflects `reservation_config.hours` correctly in the venue's timezone.
5. Sitemap lists only `site_enabled: true` venues; robots.txt references it; structured data on the home page is valid JSON and omits fields with no data rather than fabricating them.
6. HQ Settings → Website tab: editing and saving round-trips correctly through the existing PATCH route; `site_enabled` toggle actually gates the public page; a non-owner/manager of that venue gets 403 on the PATCH (existing gate, just confirm it still applies).
7. Custom-domain rewrite: a venue WITH `custom_domain` set now lands on `/site/<slug>` at its root, with `/shop` and `/reserve` still directly reachable on that same domain; a venue withOUT `custom_domain` is entirely unaffected by the middleware change (site still reachable at `/site/<slug>` on the main app domain).
8. `npx tsc --noEmit` and `npm run build` green; `docs/plans/BUILD-LOG-client-websites.md` complete with one section per phase, each stating what was verified.
