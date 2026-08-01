# PLAN-21 — Post-payment review prompt

Lane B, `MASTER-PLAN-v2R-remastered.md` §6. Design already resolved in
that doc (marked 🔴 NOW, R8) — the destination URL, anti-gating rule, and
zero-migration approach are all specified there; only the "once per
order"/persistence mechanism is a small implementation decision made here.

## Ground truth (this branch is fresh off `main`, PLAN-20 already merged)

- `venues.brand_kit` JSONB namespacing precedent is now well-established:
  `brand_kit.site_profile` (`lib/site-profile.ts`), `brand_kit.tip_config`
  (`lib/orders/tip-config.ts`, PLAN-20). This review destination lives at
  `brand_kit.review_profile.url` — same pattern, zero migration for the
  URL itself.
- PLAN-20 already added an atomic single-statement JSONB-merge pattern
  (`set_venue_tip_delivery_enabled`) after a real review finding (PR #61)
  showed the naive read-modify-write racing with
  `app/api/clients/[id]/route.ts`'s own `brand_kit` writes. The review-URL
  setting reuses that exact pattern from the start via a new, narrowly-
  scoped `set_venue_review_url` function — not a naive read-then-write.
- `components/storefront/OrderStatus.tsx` already computes a `settled`
  boolean (`paid`/`accepted`/`preparing`/`ready`/`out_for_delivery`/
  `completed` — i.e. everything past a successful payment, explicitly
  excluding `canceled`/`refunded`). That's the exact definition of "a
  successful payment" this feature needs — reused, not redefined.
- `app/api/orders/[id]/status/route.ts` has no auth: the order UUID
  itself is the guest's capability token (same trust model as the
  confirmation page it feeds). The new review-event endpoint follows the
  same model.

## Design

- `lib/orders/review-config.ts` (pure, no Supabase import — mirrors
  `lib/orders/tip-config.ts`): `ReviewConfig { url: string | null }`,
  `parseReviewConfig(brandKit)`, `isHttpsUrl()`, and
  `looksLikeReviewHost()` (a small allowlist of known review-platform
  hosts — Google, Yelp, Facebook, TripAdvisor — used only for a
  non-blocking warning, never validation that rejects).
- `getReviewConfig(slug)` added to `lib/storefront.ts`, mirroring
  `getTipConfig(slug)`.
- Owner settings: `GET`/`PATCH /api/orders/review-settings`, mirroring
  `tip-settings/route.ts` exactly, including the atomic
  `set_venue_review_url` RPC (new migration). `PATCH` rejects a non-https
  URL outright (400); a URL that doesn't match the known-host allowlist
  is still saved, with the "doesn't look like a review link" warning
  surfaced client-side only, never blocking the save.
- `components/orders/ReviewSettings.tsx`, wired into
  `app/(dashboard)/orders/page.tsx` next to the existing `TipSettings` /
  `FulfilmentSettings` cards.
- Confirmation flow: `order-confirmation/[id]/page.tsx` fetches
  `getReviewConfig(slug)` server-side and passes `reviewUrl` down to the
  existing client `OrderStatus`, which already polls order status.
- **Once-per-order persistence, decided here (no migration, guest-side
  only)**: a single `localStorage` key `aro-review-shown:<orderId>`.
  Read once on mount, _before_ the prompt can render — if already set,
  the prompt never renders again for that order, satisfying "reloading
  the confirmation does not re-prompt" literally (not just "reappears
  then re-dismissible"). The very first time it's eligible to show
  (`settled && reviewUrl && not already shown`), it renders, the flag is
  written immediately, and `review.prompted` fires exactly once. A tap on
  "No thanks" only needs to hide it for the rest of _this_ render — the
  localStorage flag already guarantees it can never reappear on a future
  load, so no separate "dismissed" state is needed to satisfy either
  acceptance line.
- **Anti-gating, structurally**: no rating input exists anywhere in the
  component — two actions only, "Leave a review" (external link, new
  tab) and "No thanks". Nothing to gate on, by construction, not by a
  conditional that could be gotten wrong.
- New API route `app/api/orders/[id]/review-event/route.ts` (POST, no
  auth — same capability-token model as `[id]/status`), body
  `{ type: 'prompted' | 'clicked' }`, looks up the order's `venue_id` and
  emits the matching event.
- New event types `review.prompted` / `review.clicked` appended to
  `lib/events.ts` (append-only).

## Non-goals

- No Google Place ID lookup/API — the owner pastes their own link, per
  the master plan's own explicit scoping ("that single decision is what
  keeps this item unblocked").
- No star-rating capture of any kind, gated or not — the master plan
  calls this out as a Google-policy violation and "beneath the product."
- No server-side/DB-backed dismissal record — a guest's own browser
  reloading the same confirmation link is the only case the acceptance
  criteria describe, and `localStorage` satisfies it without a migration.

## Acceptance (from the master plan, verbatim)

- [ ] With a configured URL, a successful payment shows the prompt on
      the confirmation screen; tapping it opens the venue's review page
      in a new tab.
- [ ] With no URL configured, no prompt renders anywhere — proven on a
      venue with an empty `brand_kit`.
- [ ] The prompt appears **once per order**; reloading the confirmation
      does not re-prompt.
- [ ] Dismissal persists for that order.
- [ ] No rating is collected before the redirect (assert absent in the
      DOM — this is the anti-gating gate, and it is pass/fail).
- [ ] Settings field validates that the URL is `https` and warns on a
      non-review-looking host without blocking it.
- [ ] Events emitted + labelled: `review.prompted`, `review.clicked`.
- [ ] **Design bar** (§2). `npm run build` + `tsc --noEmit` green.
