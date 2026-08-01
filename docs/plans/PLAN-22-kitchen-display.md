# PLAN-22 — Kitchen Display Surface

> Executor: read `docs/plans/MASTER-PLAN-aro.md` FIRST (§4/§5 binding). Read
> `docs/plans/MASTER-PLAN-v2-operating-system.md` and
> `docs/plans/MASTER-PLAN-v2R-remastered.md` §6 Lane B PLAN-22 before
> touching any file — this document is the lean spec those sections
> require, not a replacement for them. Lane B owns this work exclusively.
> Branch: `sonnet/lane-b-plan22-kitchen-display` off `origin/main`.
> Depends on: PR-0 only (confirmed merged — `main` already carries PLAN-09,
> PLAN-10, PLAN-11).

## Ground truth (verified 2026-07-31)

- `components/counter/OrdersQueue.tsx` + `app/api/counter/orders/route.ts` +
  `app/api/counter/orders/[id]/route.ts` already do the core work: every
  open order with items and modifiers, and the full
  `paid→accepted→preparing→ready→completed` advance chain (plus refund on
  cancel). **Not rewritten here** — reused as-is.
- `OrdersQueue` is reachable only from `app/counter/counter-screen.tsx`'s
  "Open order queue" button, itself behind `app/counter/page.tsx`'s PIN
  login — there is no dedicated kitchen URL. That is gap #1.
- Counter/kitchen auth is a **custom HMAC-signed cookie**
  (`lib/counter-session.ts`, `COUNTER_COOKIE`), verified server-side against
  `SUPABASE_SERVICE_ROLE_KEY`-derived key — **not a Supabase Auth session**.
  No Supabase JWT is ever issued to the browser for this flow.
- `orders` has RLS **enabled with zero policies**
  (`SELECT polname FROM pg_policy … WHERE relname='orders'` returns empty,
  confirmed live) — deny-all to `anon`/`authenticated`, service-role only.
  This is correct and intentional (§5 of the batch migration doctrine:
  "No anon grants on anything… a direct table grant" is exactly what this
  would require).
- **Real architectural finding, flagged rather than improvised**: `MASTER-PLAN-v2R`
  §6 PLAN-22 calls for "Supabase Realtime on `orders` replacing the
  15-second poll." A browser-side Supabase Realtime subscription
  (`postgres_changes`) is authorized through the same RLS the REST API
  uses — with zero policies and no Supabase Auth session bound to this
  custom cookie flow, the kitchen client has no legitimate way to receive
  `orders` change events directly from Supabase without either (a) loosening
  `orders` RLS to grant `anon`/`authenticated` a scoped read (a
  tenant-isolation change), or (b) minting a scoped custom JWT via
  `SUPABASE_JWT_SECRET` for Realtime Authorization and adding `SUPABASE_JWT_SECRET`
  as a new secret this environment does not have configured anywhere
  (`grep -in jwt .env.example` → nothing). Either path is an auth/tenant-isolation
  design decision — "never improvise on tenant isolation, auth… logic" per
  binding doctrine. **Escalating, not improvising**: this PR ships a fast
  poll (3s, down from 15s) as the interim mechanism, honestly labelled as
  polling — never claiming to be realtime — with the architecture decision
  flagged here and in `STATUS.md` for whoever picks it up next (Fable-tier:
  it is exactly the "money, consent, or cross-cutting design" trigger for
  architect review, v2 §7.1).

## Non-goals

- Rewriting `OrdersQueue`'s data model or status-advance logic.
- True Supabase Realtime — flagged above as needing an architecture
  decision, not built here.
- Any change to `orders` RLS policies.

## Design

- **`app/kitchen/page.tsx`** — mirrors `app/counter/page.tsx`'s PIN-login
  flow exactly (same `/api/counter/login`, `/api/counter/session`,
  `/api/counter/logout` routes; same cookie), styled for kitchen use:
  larger type, high contrast, no phone-sized chrome.
- **`app/kitchen/kitchen-screen.tsx`** — the display itself:
  - Polls `/api/counter/orders` every **3 seconds** (down from
    `OrdersQueue`'s 15s), with a visible "Live · polling every 3s" /
    "Reconnecting…" status chip — the screen states its own mechanism
    honestly rather than implying realtime.
  - **Ticket age** computed from `placed_at`, escalating
    `aro-sage` → `aro-saffron` → `aro-terra` at owner-configurable minute
    thresholds (defaults: 5 / 12 minutes), sourced from
    `venues.brand_kit.kitchen_config` (same zero-migration JSONB
    namespacing as `tip_config`/`site_profile`).
  - **Audible chime** on a newly-seen `order_id` (client-side diff against
    the previous poll's ID set), muted by default, one-tap unmute — browser
    autoplay policies require a user gesture before any audio, so the
    first chime literally cannot play until the kitchen taps unmute once;
    the UI says so.
  - **Always-on display mode**: `navigator.wakeLock` requested on mount
    where available (falls back silently — no wake lock API on the device
    is not an error state), large-type mode, zero hover-only controls
    (every control is a big tap target).
  - Status advance reuses the exact same `PATCH /api/counter/orders/[id]`
    call `OrdersQueue` already makes — `accepted_at`/`ready_at` stamping
    (PLAN-20's fix to `transition_order_status`) is what ticket age reads.

## Phases

1. `app/kitchen/page.tsx` + `kitchen-screen.tsx` — dedicated route, PIN
   auth reused, 3s poll, parity-tested against `/api/counter/orders`'s
   existing payload shape.
2. Ticket age thresholds + colour escalation, `kitchen_config` JSONB helper
   (`lib/orders/kitchen-config.ts`, mirrors `tip-config.ts`).
3. Chime (muted-by-default, one-tap unmute) + wake lock + large-type mode.
4. Owner-configurable thresholds surfaced on the HQ Orders page (small
   settings card, same pattern as `TipSettings`).

## ✅ Acceptance

- [ ] A new paid order appears on `/kitchen` within one poll cycle (≤3s) without a manual refresh.
- [ ] The screen states its own mechanism (`polling`) and never claims to be realtime; if a poll fails it visibly says "Reconnecting…" rather than silently going stale.
- [ ] Every ticket shows all items, quantities, modifiers, and item notes — parity with `/api/counter/orders`'s payload, field by field.
- [ ] Status advance from `/kitchen` writes the same transitions as the counter path and emits `order.status_changed`; `accepted_at`/`ready_at` are stamped (already true via PLAN-20's fix).
- [ ] Ticket age colour changes at the configured thresholds; verified with an injected clock.
- [ ] Chime is muted by default and fires only after one user gesture unmutes it.
- [ ] Legible at 2m on a 1080p display; no hover-only affordances.
- [ ] Design bar (§2 of the remastered plan), kitchen exception noted (high-contrast `aro-espresso`-on-`aro-cream` at larger type sizes, still `aro` tokens only).
- [ ] `npm run build` + `tsc --noEmit` green.
- [ ] **Flagged, not silently dropped**: true Supabase Realtime is an open architecture item, recorded in this file, the PR body, and `STATUS.md`, for Fable-tier review before anyone builds it.
