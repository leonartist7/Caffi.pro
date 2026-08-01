# BUILD-LOG — PLAN-21: Post-payment review prompt

## What shipped

- `venues.brand_kit.review_profile.url` — same zero-migration JSONB
  namespacing precedent as `site_profile`/`tip_config`. `lib/orders/
review-config.ts` (pure, no Supabase import): `parseReviewConfig`,
  `isHttpsUrl`, `looksLikeReviewHost` (small known-host allowlist, used
  only for a non-blocking warning).
- `set_venue_review_url(p_venue_id, p_url)` — an atomic single-statement
  JSONB merge, the exact same pattern PLAN-20 established for
  `set_venue_tip_delivery_enabled` after a real review finding on PR #61
  showed a naive read-modify-write racing with the client site-profile
  route. This one reuses that pattern from the start rather than
  repeating the mistake.
- `GET`/`PATCH /api/orders/review-settings` — PATCH rejects a non-https
  URL with 400; a URL that doesn't match the known-host allowlist is
  still saved, with the "doesn't look like a review link" warning
  surfaced client-side only (`ReviewSettings.tsx`), never blocking the
  save. Wired into `app/(dashboard)/orders/page.tsx` next to the
  existing `TipSettings`/`KitchenSettings`/`FulfilmentSettings` cards.
- Confirmation flow: `order-confirmation/[id]/page.tsx` fetches
  `getReviewConfig(slug)` server-side, passes `reviewUrl` to the existing
  client `OrderStatus`. The prompt renders only when `settled` (the
  component's own existing definition of "past a successful payment,"
  reused unchanged) **and** a URL is configured **and** the order hasn't
  already shown it.
- **Once-per-order, guest-side, no migration**: `localStorage` key
  `aro-review-shown:<orderId>`, checked once on mount _before_ the prompt
  can ever render. The very first eligible render persists the flag and
  fires `review.prompted` exactly once (a `useEffect` keyed on the
  boolean `showReviewPrompt`, so it only fires on the false→true
  transition, never again on re-renders while it stays visible). A
  reload reads the flag first and the prompt never renders again for
  that order — satisfies "reloading does not re-prompt" literally, not
  just "reappears then re-dismissible."
- **Anti-gating by construction**: the component has exactly two actions
  — "Leave a review" (external link, `target="_blank"`, fires
  `review.clicked`) and "No thanks" (hides it for the rest of this page
  load). No rating input exists anywhere in the file to accidentally
  wire up wrong.
- New route `app/api/orders/[id]/review-event/route.ts` (POST, no auth —
  same capability-token trust model as the existing
  `/api/orders/[id]/status` it sits next to: the order UUID itself is
  the guest's token). Body `{ type: 'prompted' | 'clicked' }`, looks up
  the order's `venue_id`, emits the matching event.
- `review.prompted` / `review.clicked` appended to `lib/events.ts`.

## Verified live (Supabase MCP, `jjgccfrwjkwknyjtbtxa`)

Fully inside a transaction that rolled back — zero permanent residue:

- Set a review URL on the seeded `the-roastery` venue via
  `set_venue_review_url`; confirmed it round-trips exactly.
- **Atomicity proof, same shape as PLAN-20's**: seeded an unrelated
  `brand_kit` marker key and an existing `tip_config.presets_pct` before
  the call, confirmed both survived the review-URL update untouched —
  proves the merge only ever touches `review_profile`, never the rest of
  `brand_kit`.
- Cleared the URL (`NULL`) and confirmed it round-trips to `null`, not a
  literal `"null"` string or a missing key.
- A nonexistent `venue_id` returned `NULL` from the function (not an
  error), which the route turns into a 404.
- `get_advisors` (security): clean from the start this time — the
  `REVOKE ... FROM PUBLIC, anon, authenticated` + `GRANT ... TO
service_role` pair was folded into the migration on the first pass,
  having learned that lesson from PLAN-26 in this same lane.
- `npx tsc --noEmit`, `npm run build`, `npm run lint` all green (`.next`
  cleared first). `aro` design-token grep on every changed file clean.
  Grep for `rating`/`Rating` across the two new/changed UI files found
  only a prose mention in the settings copy explaining the anti-gating
  promise — no actual rating input anywhere.

## Branch-dependency note

This branch was rebased onto `main` after PLAN-20 (#61) and PLAN-22
(#62) merged mid-session, so it already includes `KitchenSettings` in
`app/(dashboard)/orders/page.tsx` alongside the new `ReviewSettings` —
no reconciliation needed for this file. PLAN-23/24/25 also merged during
this build; none of their files overlap with PLAN-21's.

## Verification gap — honest about what was NOT checked

- **No live browser check.** Same environment gap as every prior PR in
  this lane: the prompt's appearance on the confirmation screen, the
  settings card's warning banner, and the anti-gating DOM assertion were
  verified by reading the code, not by clicking through a rendered page.
