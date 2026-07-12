# PLAN-01 — Ordering Core: menus, payments abstraction, storefront, QR dine-in, pickup, in-house delivery

> Executor: read `docs/plans/MASTER-PLAN-aro.md` FIRST. Its architecture principles (§4) and execution protocol (§5) are binding here and are not repeated in full. Prerequisite: PLAN-00 is complete (production live, Members module shipped, legacy `/staff` + `/tenants` retired). Work on the designated `claude/…` branch, new draft PR titled `feat(ordering): menus, payments, storefront, QR dine-in, pickup, delivery`.

## Context & goal

aro is live as a loyalty platform. This plan adds the revenue engine: commission-free direct ordering — the Restolabs-parity core. Owner-locked scope for release one: **QR tableside ordering + order-ahead pickup + in-house delivery zones** (no third-party dispatch), payments through a **gateway-agnostic PaymentProvider abstraction with Stripe as adapter #1**, storefront = **revival of the existing `/shop` PWA restyled to the aro design system**, and loyalty integration (orders award points into the existing ledger). The parked Menu and Orders modules flip from `coming_soon` to `live`.

Ground truth to trust (verified previously — re-verify column names against migrations before querying, never guess):

- Live Supabase project `jjgccfrwjkwknyjtbtxa`; seed venue "The Roastery" `a0000000-0000-4000-3000-000000000001`.
- `tenant_id` = venue id on legacy-renamed tables; **all NEW tables in this plan use `venue_id`** (master plan §4.2).
- Legacy shim note: the fresh DB has NO `menu_items`/`categories`/`orders`/`locations` tables. The 501-stub API routes for menu-items/categories/locations were deleted in PLAN-00 Phase D. You are creating this domain from scratch — no renames, no compat views needed.
- **Tripwire:** `supabase/migrations/20260707000001_aro_platform_schema.sql` (~lines 325–365) contains legacy trigger functions that award points from orders (`award_points_from_order`-style logic referencing `NEW.order_id`, `points_per_euro` from `venues.loyalty_config`, and an `award_signup_bonus` trigger on members). READ that section before Phase 4 of this plan. If a trigger already fires on an `orders`-shaped table or on `points_ledger`, integrate with it (or supersede it explicitly in your migration with a comment) — do NOT create a second award path that double-credits points. If the situation is ambiguous, STOP and flag.
- The old `/shop/**` pages exist and are visually complete but query dead tables via the browser client (the exact disease PLAN-HQ fixed for the dashboard: keep JSX, replace the data layer). `app/shop/[slug]/rewards/page.tsx` and `components/…` may reference `rewards_catalog` — the live `rewards` table exists; wire through server APIs, never browser table access.
- `lib/get-tenant.ts` `getTenantBySlug` already resolves public venue identity for `/shop/[slug]` server-side.
- Counter/staff auth: HMAC cookie sessions (`lib/counter-session.ts`) — the order management screen for staff reuses THIS session, not Supabase Auth.
- Env keys go in `.env.example` with STUBBED-badge convention; Stripe keys are owner-provided (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — already listed there).

## Phase 1 — Schema: menu + orders + payments (one migration)

New migration `supabase/migrations/<date>0001_ordering_core.sql` (+ mirror into `supabase/aro_schema.sql`). All tables use `venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE` and `uuid_generate_v4()` defaults (search_path note in master plan §4.9).

```
menu_categories: category_id PK · venue_id · name · display_order INT DEFAULT 0 ·
  is_active BOOL DEFAULT true · available_from TIME NULL · available_until TIME NULL ·
  created_at/updated_at
menu_items: item_id PK · venue_id · category_id FK ON DELETE SET NULL · name ·
  description TEXT · price_cents INT NOT NULL CHECK (price_cents >= 0) · image_url ·
  is_active BOOL DEFAULT true · sort_order INT DEFAULT 0 · dietary_tags TEXT[] DEFAULT '{}' ·
  created_at/updated_at
modifier_groups: group_id PK · venue_id · item_id FK ON DELETE CASCADE · name ·
  min_select INT DEFAULT 0 · max_select INT DEFAULT 1 · created_at
modifiers: modifier_id PK · group_id FK ON DELETE CASCADE · venue_id · name ·
  price_delta_cents INT DEFAULT 0 · is_active BOOL DEFAULT true · sort_order INT DEFAULT 0
venue_tables: table_id PK · venue_id · label TEXT NOT NULL · qr_token UUID UNIQUE DEFAULT uuid_generate_v4() ·
  is_active BOOL DEFAULT true · UNIQUE(venue_id, label)
delivery_zones: zone_id PK · venue_id · name · fee_cents INT DEFAULT 0 ·
  min_order_cents INT DEFAULT 0 · postal_prefixes TEXT[] NOT NULL DEFAULT '{}' · is_active BOOL DEFAULT true
orders: order_id PK · venue_id · member_id UUID NULL REFERENCES members(member_id) ON DELETE SET NULL ·
  client_uuid UUID NOT NULL · UNIQUE(venue_id, client_uuid)  -- idempotency, pattern from visits
  · order_type TEXT NOT NULL CHECK (order_type IN ('dine_in','pickup','delivery'))
  · table_id UUID NULL REFERENCES venue_tables(table_id) ON DELETE SET NULL
  · zone_id UUID NULL REFERENCES delivery_zones(zone_id) ON DELETE SET NULL
  · status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN
      ('pending','paid','accepted','preparing','ready','out_for_delivery','completed','canceled','refunded'))
  · guest_name TEXT · guest_phone TEXT · guest_email TEXT · delivery_address TEXT · notes TEXT
  · subtotal_cents INT NOT NULL · delivery_fee_cents INT NOT NULL DEFAULT 0 ·
    tax_cents INT NOT NULL DEFAULT 0 · total_cents INT NOT NULL
  · placed_at TIMESTAMPTZ DEFAULT NOW() · created_at/updated_at
order_items: order_item_id PK · order_id FK ON DELETE CASCADE · venue_id · item_id UUID NULL
  (SET NULL — menu edits must not corrupt history) · name_snapshot TEXT NOT NULL ·
  unit_price_cents INT NOT NULL · quantity INT NOT NULL CHECK (quantity > 0) · notes TEXT
order_item_modifiers: id PK · order_item_id FK ON DELETE CASCADE · name_snapshot TEXT NOT NULL ·
  price_delta_cents INT NOT NULL DEFAULT 0
payments: payment_id PK · venue_id · order_id FK ON DELETE RESTRICT · provider TEXT NOT NULL ·
  provider_ref TEXT · amount_cents INT NOT NULL · currency TEXT NOT NULL DEFAULT 'CAD' ·
  status TEXT NOT NULL CHECK (status IN ('pending','succeeded','failed','refunded')) ·
  idempotency_key UUID UNIQUE · raw JSONB DEFAULT '{}' · created_at
  -- append-only: refunds are NEW rows with negative amount_cents, status 'refunded', never updates
  -- of amount on the original row (only status transitions pending->succeeded/failed are updated).
```

Snapshots (`name_snapshot`, `unit_price_cents`) are mandatory — order history must survive menu edits/deletes.

**RLS/grants (same migration):** enable RLS on all. Public storefront reads: grant SELECT on `menu_categories`, `menu_items`, `modifier_groups`, `modifiers`, `venue_tables(label, qr_token…—only what the QR resolve needs)`, `delivery_zones` to `anon, authenticated` with `USING (is_active)` policies (menus are public data, like `venues` identity columns). `orders`/`order_items`/`order_item_modifiers`/`payments`: NO anon/authenticated grants at all — server-only via service role (the members-table pattern: absence of grant beats RLS filtering). Indexes: `orders(venue_id, status, placed_at DESC)`, `orders(venue_id, placed_at DESC)`, `menu_items(venue_id, category_id)`, `payments(order_id)`.

Apply live via Supabase MCP, verify objects via `information_schema`, run `get_advisors(security)`, fix findings in a follow-up statement within the same phase.

## Phase 2 — PaymentProvider abstraction + Stripe adapter

- `lib/payments/provider.ts`: `interface PaymentProvider { key: string; createCheckout(input: { venueId, orderId, amountCents, currency, description, successUrl, cancelUrl, metadata }): Promise<{ redirectUrl: string; providerRef: string }>; verifyWebhook(rawBody: string, signatureHeader: string): Promise<ProviderEvent>; refund(providerRef: string, amountCents: number): Promise<{ providerRef: string }> }` with `ProviderEvent = { type: 'payment.succeeded'|'payment.failed'|'refund.succeeded', providerRef, orderId (from metadata), amountCents }`. Plus `getProvider(venue): PaymentProvider` — for now returns Stripe always; the venue-level gateway choice lands in Phase 6 of the master plan (leave a `venues.brand_kit`-style TODO comment, no schema now).
- `lib/payments/adapters/stripe.ts`: implements the interface with the `stripe` npm package (ONE allowed new dependency; pin exact version). Checkout Sessions API, `metadata: { order_id, venue_id }`, webhook verification via `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET`. Server-only files (`import 'server-only'`).
- `app/api/webhooks/stripe/route.ts`: raw-body route (Next: read `await request.text()` before any json parse), signature-verify FIRST, then: on `payment.succeeded` → transactionally mark `payments` row succeeded + advance `orders.status 'pending'→'paid'` (only from pending — webhook replays must be no-ops), emit `order.paid`. Never trust amounts from the client — compare event amount to the stored payment row; mismatch → log loudly + flag status `failed`.
- Missing env keys ⇒ storefront checkout shows the visible STUBBED badge (existing convention), never a fake success.

## Phase 3 — Menu management in HQ (Menu module goes live)

- APIs (clone the `app/api/rewards` pattern — gates, validation, 23505→409, emitEvent): `app/api/menu/categories` (+`[id]`), `app/api/menu/items` (+`[id]`), `app/api/menu/items/[id]/modifier-groups` (+ modifiers CRUD nested or flat `app/api/menu/modifiers` — pick flat, simpler). Gates: `requireVenueRole(venueId, ['owner','manager'])`; row routes `requireRowVenueRole(<table>, <pk>, id, ['owner','manager'], 'venue_id')`.
- Rewire `app/(dashboard)/menu/page.tsx` from ComingSoon back to a real page: reuse the git history of the old menu page (`git show <pre-parking-commit>:"app/(dashboard)/menu/page.tsx"`) as the JSX starting point, data layer replaced with the new APIs (the proven staff/rewards rewiring pattern). Categories list + items grid + item modal (name, price, category, image URL, dietary tags, modifiers editor with min/max select). Prices entered as dollars, stored as cents — one `dollarsToCents` helper in `lib/money.ts` (+ `formatCents`), used EVERYWHERE money renders (aro rule: monospace).
- `lib/modules.ts`: flip `menu` to `live`.
- Events: add `menu.item_created|updated|deleted`, `menu.category_created|updated|deleted` to the union + labels.

## Phase 4 — Storefront revival (`/shop/[slug]`) in aro style

- Keep route structure `app/shop/[slug]/…` (menu, cart/checkout, order-confirmation/[id], orders). Delete or park pages that don't apply to release one (login/signup/profile/rewards under shop — OUT of scope; ordering is guest-first with optional loyalty link, see below). Replace their content with a redirect to the venue storefront root.
- Data layer: server components fetch via `getTenantBySlug` + service-role menu reads (or anon reads — either is fine since menus are anon-granted; prefer server components with the service client for consistency). NO browser Supabase.
- Cart: client-side state (localStorage per venue slug), aro-styled (§3 of master plan: single column, thumb-first, JetBrains Mono prices, terracotta CTA). QuantityStepper + modifier picker respecting min/max.
- Checkout POST `app/api/orders` (server route): body `{ venue_slug, client_uuid, order_type, table_token?, zone_id?, guest: {name, phone?, email?}, delivery_address?, items: [{item_id, quantity, modifier_ids[], notes?}] , notes?, member_pass_serial? }`. Server: resolve venue by slug → re-price EVERY line from the DB (never trust client prices) → validate modifiers belong to item + min/max → compute subtotal, delivery fee (zone lookup + min-order check), tax (release one: single `venues.loyalty_config`-style JSONB tax rate? NO — add `tax_rate_bp INT DEFAULT 0` to venues in the Phase 1 migration and apply it here; flag if surprising) → insert order (status `pending`) + items + modifier snapshots in one service-role transaction (SECURITY DEFINER function `create_order(...)` if multi-statement atomicity is needed — follow `redeem_reward`'s style) → `getProvider(venue).createCheckout(...)` → insert `payments` row (pending) → return `redirectUrl`. Idempotent on `(venue_id, client_uuid)` — 23505 returns the existing order's checkout state.
- Order confirmation page polls `GET app/api/orders/[id]/status` (public-safe: returns ONLY status + masked info, looked up by order_id UUID — acceptable as unguessable bearer reference, same argument as pass serials; no PII beyond first name).
- **Loyalty link**: optional `member_pass_serial` field ("have a pass? tap to attach") resolves `members.pass_serial` → sets `orders.member_id`. Points award happens in Phase 5 wiring.
- QR dine-in: `app/t/[qr_token]/page.tsx` resolves `venue_tables.qr_token` → redirects to `/shop/[slug]?table=<token>`; storefront pins order_type `dine_in` + table. HQ: table management UI inside the (new) Orders module settings — CRUD `venue_tables`, printable QR sheet reusing the dependency-free `lib/qr.ts` encoder (already battle-tested).
- Middleware: ensure `/shop`, `/t`, `/api/orders`, `/api/webhooks/stripe` are public routes (check `middleware.ts` matcher and the public-route handling added in the join-page plan).

## Phase 5 — Orders module: staff management screen + loyalty award

- `app/api/counter/orders` (list active by status, gated by the counter HMAC session — copy `app/api/counter/search`'s session check) and `PATCH app/api/counter/orders/[id]` (status transitions). Legal transitions only: `paid→accepted→preparing→ready→(out_for_delivery→)completed`, any pre-completed → `canceled` (canceled after payment ⇒ create refund via provider + append refund payment row). Emit `order.status_changed`.
- Staff screen: extend `app/counter/counter-screen.tsx` with an "Orders" tab (aro-styled ticket cards: items, modifiers, table/pickup/delivery badge, elapsed time, one-tap advance button). Poll every 15s (no realtime dependency in release one). This doubles as KDS-lite.
- HQ Orders page (`app/(dashboard)/orders/page.tsx`): un-park from ComingSoon; owner/manager view of order history + statuses via `app/api/orders?venue_id=` (requireVenueRole), filters by status/date, aro-refit of the old JSX from git history where useful. Flip `orders` module to `live`.
- **Loyalty award** (respect the Phase-1 tripwire): on order status → `completed`, award `floor(total_cents/100 * points_per_euro)` points via ONE ledger insert (`reason 'order'`, `tenant_id`, `member_id`, description "Order <short-id>") — only when `orders.member_id` is set, only once (unique partial index on `points_ledger` … simplest: check-then-insert inside the same status-transition service call; note idempotency in code comment). `points_per_euro` from `venues.loyalty_config` (seeded as 10). Also record a visit? NO — dine-in QR orders may coexist with counter visit scans; do not double-count. Flag as a product question in the build log for the owner (visit-on-order semantics), default OFF.
- Events + labels: `order.placed`, `order.paid`, `order.status_changed`, `order.refunded`.

## Phase 6 — Delivery zones + polish + docs

- HQ delivery-zone settings (inside Orders module settings or Settings tab): CRUD `delivery_zones` (name, fee, min order, postal prefixes — Canadian FSA prefixes like "T2N"). Checkout validates the entered postal code against active zones; no match ⇒ friendly "outside our delivery area".
- Extend `scripts/verify-live.mjs`: new tables exist, anon CAN read `menu_items`, anon CANNOT read `orders`.
- `.env.example`: confirm Stripe keys documented; onboarding notes in `docs/plans/HANDOFF-live-bringup.md` (Stripe dashboard steps: get keys, add webhook endpoint `https://caffipro.vercel.app/api/webhooks/stripe`, events to send).
- Seed additions (idempotent, fixed UUIDs, extend `supabase/seed/aro_dev_seed.sql`): 2 categories, 5 items with modifiers, 2 tables, 1 delivery zone for The Roastery — so every screen demos instantly.
- Final grep gates: no browser `.from('` against order/menu tables outside `app/api`/server components; no gateway SDK import outside `lib/payments/adapters/`.

## Verification (end-to-end, per phase slices + final)

1. Migration objects verified live; advisors clean (or findings fixed).
2. HQ: create category + item with 2 modifier groups; edit price; deactivate item — storefront reflects each within one reload.
3. Storefront on production: browse The Roastery menu → cart with modifiers → checkout (Stripe test mode) → pay with `4242 4242 4242 4242` → confirmation page reaches `paid`; webhook row + `order.paid` event exist; replayed webhook is a no-op.
4. QR: scan a generated table QR → order pinned to table → appears on counter Orders tab → advance to completed → (with pass attached) points appear in member ledger exactly once.
5. Delivery: order with postal code inside zone gets fee + min-order enforcement; outside zone is blocked with the friendly state.
6. Isolation: owner of venue B gets 403 on venue A's menu/order APIs; anon gets 401/permission-denied on orders.
7. Refund path: cancel a paid test order → Stripe refund created → negative payments row → status `refunded`.
8. `npm run verify:live` extended checks pass; build green; module registry shows Menu + Orders live; BUILD-LOG updated per phase.
