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
- **Once per order, per browser profile, guest-side, no migration**:
  `localStorage` key `aro-review-shown:<orderId>`, checked once on mount
  _before_ the prompt can ever render. The first eligible render persists
  the flag and fires `review.prompted` (a `useEffect` keyed on the
  boolean `showReviewPrompt`, so it only fires on the false→true
  transition, never again on re-renders while it stays visible). A
  reload reads the flag first and the prompt never renders again for
  that order in that browser profile — satisfies "reloading does not
  re-prompt" literally, not just "reappears then re-dismissible." This
  is a plain-`localStorage` guarantee, not an atomic cross-tab
  check-and-set: a `storage` event listener re-syncs the flag when a
  _second_ tab on the same order writes it, and the server-side
  `review-event` insert is separately deduplicated at the DB level
  (`idx_events_review_once`) so the `review.prompted` event itself can
  never land twice for one order regardless of how many tabs or reloads
  raced to fire it.
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

## Post-review hardening (CodeRabbit + Codex, before merge)

Both bots reviewed the PR once it left draft; real findings, all fixed
in the same PR rather than deferred:

- **Cross-venue data leak (🟠, the significant one)**: the confirmation
  page derived `reviewUrl`/`currency` from `params.slug` alone, never
  checking that the order at `params.id` actually belongs to that
  venue. A crafted/mistyped URL pairing one venue's slug with another
  venue's order UUID would have shown the wrong venue's review link.
  Fixed by looking up the order's own `venue_id` server-side and
  rejecting (404) any mismatch — there's no legitimate case where they
  differ. Also added `key={params.id}` on `<OrderStatus>` so a
  client-side order-to-order navigation always gets a fresh component
  instance instead of carrying over stale per-order state.
- **Unbounded anonymous review-event inserts (🔴 P1)**: the capability-
  token trust model meant any guest with an order UUID could replay
  `POST /api/orders/[id]/review-event` indefinitely, including before
  paying. Fixed with two independent bounds: the route now rejects the
  event unless the order is actually settled (`isSettledOrderStatus`,
  shared with `OrderStatus.tsx` so the two definitions can't drift), and
  a new partial unique index (`idx_events_review_once`, migration
  `20260801083000`) makes the insert itself idempotent per
  `(order, event type)` — a duplicate request is a 200 no-op, not a
  second row.
- **`ReviewSettings.tsx` stale-response race**: switching venues while a
  GET was in flight could let a slower, stale response overwrite the
  newly-selected venue's value, and `loading` was never reset on that
  switch, leaving Save enabled against the wrong venue's data. Fixed
  with a `cancelled` flag scoped to the effect plus re-arming `loading`
  on every `venueId` change; added the missing non-ok-response error
  toast too.
- **Multi-tab review-prompt race**: two tabs open on the same pending
  order both start with the `localStorage` flag absent; if one tab
  showed the prompt and set the flag, the other had no way to observe
  that before independently re-showing it once its own poll saw the
  order settle. Fixed with a `storage` event listener that re-syncs the
  flag across tabs — on top of the DB-level dedupe above, which is the
  real backstop regardless of what any tab's local state thinks.
- **`localStorage` access not guarded**: wrapped both the read and the
  write in `try/catch` — private-mode/blocked storage can throw. Failure
  on the read side is treated as "already shown" (fails toward showing
  the prompt _less_, never more).
- Small nitpick: the review-settings PATCH's 500 branch wasn't logging
  the underlying Supabase error before returning the generic message —
  added the `console.error`.

**Deliberately not fixed here (pre-existing, out of scope)**: Codex also
flagged that `set_venue_review_url`'s atomic merge only protects against
concurrent writers who _also_ use an atomic RPC — `kitchen-settings` and
the client `site_profile` route still do a whole-object read-modify-write
of `brand_kit`, so either could still clobber a review URL saved between
their read and their write. This is real, but it's an existing,
systemic gap that already applied identically to `tip_config` before
this PR (merged in PLAN-20) — not a regression introduced here.
Fixing it properly means converting every `brand_kit` writer in the app
to the same atomic-merge pattern, which is bigger than this PR's scope.
Flagged here rather than improvised; needs its own pass across
`kitchen-settings`, `clients/[id]`, and `clients` routes.

## Verification gap — honest about what was NOT checked

- **No live browser check.** Same environment gap as every prior PR in
  this lane: the prompt's appearance on the confirmation screen, the
  settings card's warning banner, and the anti-gating DOM assertion were
  verified by reading the code, not by clicking through a rendered page.
