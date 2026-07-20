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
