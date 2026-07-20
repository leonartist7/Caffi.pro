# BUILD LOG — R3 Client Websites

## Baseline

- Branched `codex/r3-client-websites` from local `main` at `e448984`.
- `npm run type-check`: passed.
- `npm run build`: passed with the pre-existing webpack cache and Supabase Edge Runtime warnings.
- Local Supabase credentials are not configured; authenticated/live checks remain explicitly pending.

## Phase 1 — Marketing profile and API

- Added defensive parsing for namespaced `brand_kit.site_profile`, capped gallery entries at six, and defaulted publishing off.
- Extended public tenant and HQ client response shapes, including custom-domain data for accurate website URLs.
- Extended the existing authorized client PATCH route with a normalized nested merge that preserves unrelated brand-kit fields.
- Added labeled `site.published` and `site.updated` events while preserving `client.updated`.
- Added server-only accessors for derived weekly hours and published-site enumeration.
- Review: consolidated all brand-kit writes before assignment so a request that edits general branding and website fields cannot overwrite either change.
- Verification: type-check passed after each TypeScript file; phase production build passed.

## Phase 2 — Public site pages

- Added the public `/site/[slug]` layout and home, menu, hours, and contact pages in the aro design system.
- Disabled profiles short-circuit to a warm setup state; publishing now requires a non-empty tagline so an empty template cannot silently go live.
- Reused `getStorefront` and `formatCents` for the printed menu, with no duplicate Supabase menu query.
- Read only parsed weekly hours through the server accessor and gated ordering/booking links against real availability.
- Added gallery, contact, social, canonical navigation, and safely escaped LocalBusiness JSON-LD behavior.
- Review: removed invented fallback marketing copy, corrected internal site links for custom-domain canonical navigation, and hoisted all public strings.
- Verification: type-check passed after each TypeScript file; production build passed; aro-color, inline-JSX-string, and duplicate-query grep gates passed.

## Phase 3 — SEO and discovery

- Added native Next.js sitemap and robots metadata routes.
- Sitemap output is generated dynamically from service-role venue data and includes only enabled, non-killed sites with canonical home/menu/hours/contact URLs.
- Added distinct page metadata, canonical URLs, Open Graph fields, optional gallery imagery, and enabled-site-only JSON-LD.
- Review: forced the database-backed sitemap dynamic so builds without runtime Supabase credentials do not attempt to query live data during prerendering.
- Verification: type-check and production build passed; the generated robots body allows crawling and references `/sitemap.xml`. Live sitemap membership remains pending a keyed environment.
