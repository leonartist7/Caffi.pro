# PLAN-02 — Reservations & Waitlist

> Executor: read `docs/plans/MASTER-PLAN-aro.md` FIRST. Its architecture principles (§4) and execution protocol (§5) are binding here and are not repeated in full. Prerequisite: PLAN-00 and PLAN-01 are complete (production live, ordering core shipped — see their build logs). Work on the designated `claude/…` branch, new draft PR titled `feat(reservations): bookings, table capacity, waitlist`.

## Executor notes (read this section twice before touching any file)

This spec is written to be executed by a model that did not build the rest of this codebase and cannot be interactively corrected mid-task. Because of that:

1. **Smaller commits than usual.** One commit per numbered step inside a phase, not one commit per phase, whenever a phase has more than two steps. More checkpoints = less to unwind if something drifts.
2. **Every "Ground truth" claim below was re-verified against the live schema and live code on 2026-07-16, not assumed.** Trust it. But if anything you actually read in the repo contradicts a claim here, the repo wins — STOP and flag the contradiction in the build log rather than silently picking one.
3. **Copy, do not invent.** Every phase names an exact file to clone the pattern from. If you find yourself writing a shape of code (an API route, a gate check, a modal) that doesn't match one of the named references, stop and go find the reference first.
4. **No feature beyond what's written here.** §Non-goals lists things a capable model might reasonably add on its own initiative (deposits, SMS reminders, table drag-and-drop UI, multi-table joins). Do not add them. A smaller correct system beats a larger uncertain one.
5. **Run `npx tsc --noEmit` and `npm run build` after every single file edit that touches TypeScript, not just at the end of a phase.** Catch drift immediately; do not let errors accumulate across steps.
6. **Self-review with `/code-review --level medium` before every commit.** On this codebase, every previously reviewed phase across two prior plans caught a real bug. Assume this one will too — read the diff skeptically before you trust a clean review.
7. If any acceptance check in §Verification fails and you cannot see why within a few minutes of investigation, STOP, write exactly what you tried and what you observed into `docs/plans/BUILD-LOG-reservations.md`, and do not proceed to the next phase on top of an unverified one.

## Context & goal

Reservations is the next module after ordering, per the locked roadmap (`MASTER-PLAN-aro.md` §6, Phase 2). Release-one scope, owner-equivalent decision by default (no new AskUserQuestion needed — this mirrors the ordering plan's release-one scoping): **guest-facing table reservations with automatic capacity-based confirmation, a same-day walk-in waitlist, and a staff day view** — no deposits, no third-party calendar sync, no SMS reminders (nudges are Phase 3, not this phase). Zero per-cover fees, ever (positioning, §1 of the master plan).

### Non-goals (do not build these — flag if the spec seems to imply otherwise, don't self-expand)

- Deposits / prepayment for reservations (would need the PaymentProvider abstraction wired to a _hold_, which doesn't exist yet — future phase).
- Multi-table joins (a party seated across two tables). Release one: one reservation → at most one table.
- Manual staff drag-and-drop floor plan / visual table layout. Release one: a list, not a diagram.
- SMS/email reminder sending. Phase 3 (marketing/nudges) owns all outbound messaging.
- Waitlist for a _future_ date/time. Release one: waitlist is same-day, walk-in-adjacent only (this matches how Resos and OpenTable both scope their free waitlist tier).
- Recurring/standing reservations.
- Reserve-with-Google integration (documented as a later readiness item only, no code this phase).

## Ground truth (re-verified 2026-07-16 — do not re-derive, but do re-check column names against migrations before writing SQL that touches them)

- Live Supabase project `jjgccfrwjkwknyjtbtxa` ("aro-platform"), seed venue "The Roastery" `a0000000-0000-4000-3000-000000000001`.
- **Column-name split still applies**: this phase creates fresh tables, so they use `venue_id` (never `tenant_id`), per master plan §4.2.
- `venues` columns as of today: `venue_id, business_name, slug, custom_domain, app_name, features_enabled, loyalty_config, currency, timezone, brand_kit, tax_rate_bp` (the last was added in the ordering-core migration). `timezone` is an IANA string (e.g. `America/Edmonton`) — already used venue-wide, see `lib/owner-stats.ts`.
- `mondayStartInTz(date: Date, timeZone: string): Date` already exists in `lib/owner-stats.ts` (line ~270) — reuse it or its sibling wall-clock-parts helper for any "what day is it for this venue right now" logic; do not write a new timezone helper.
- `venue_tables` (from ordering core) currently has: `table_id PK, venue_id, label, qr_token UNIQUE, is_active, UNIQUE(venue_id, label)`. **No `capacity` column yet** — this phase adds one via `ALTER TABLE`, not a new table (tables serve both QR dine-in ordering and reservations; one entity, two consumers). Its public grant is column-specific (`table_id, venue_id, label, qr_token, is_active` — see `supabase/aro_schema.sql` ~line 1591); `capacity` must NOT be added to that public grant — staff-only, no reason to expose it.
- `members` table uses `tenant_id` (legacy-renamed) and has `member_id`, `full_name`, `pass_serial` among its columns (see `lib/owner-stats.ts` / `lib/clients.ts` usage for the full shape); optional linkage only, same optional-pass-attach pattern as orders.
- Money/ordering patterns worth reusing structurally (not literally — reservations aren't money, but the atomicity pattern is identical): `create_order` / `record_order_payment_success`-style `SECURITY DEFINER` functions with `FOR UPDATE` locking (see `20260714100000_storefront_order_creation.sql` and `20260714110000_order_operations.sql`). Reservation creation and status transitions must follow the same shape: one locked, atomic, service-role-only SQL function per mutation, never ad-hoc multi-statement writes from route handlers.
- Idempotency pattern: client-generated UUID + `UNIQUE(venue_id, client_uuid)` + 23505-as-replay (see `orders.client_uuid`). Reservations must follow it identically.
- `lib/authz.ts`: `requireVenueRole(venueId, roles)`, `requireRowVenueRole(table, pkColumn, id, roles, venueColumn)` (venueColumn defaults `'tenant_id'` — **pass `'venue_id'` explicitly for every table this phase creates**), `requireAroAdmin()`. Gate BEFORE reading the request body or touching the DB; `if (!gate.ok) return gate.response`.
- **Known gate bug class, already fixed once, do not reintroduce**: row-authorization gates must authenticate the caller BEFORE resolving/fetching the target row with the service client, or an unauthenticated caller can learn whether a row exists (`docs/plans/BUILD-LOG-ordering-core.md` Phase 3 — "the shared row authorization gate resolved rows with the service client before authenticating"). If you add any new row-gate helper or copy-paste one, verify the 401 check happens first.
- `lib/events.ts`: extend the `AroEventType` union (currently ends at `'sentry.test'`) and `EVENT_LABELS` in the same file before using any new event type — TS enforces this.
- `lib/modules.ts`: `MODULES: ModuleDef[]` array, `ModuleKey` union, `enabledModules()`. No supabase import allowed in this file (it's imported into client components).
- API route pattern to clone verbatim (gates, validation, 23505→409, `void emitEvent(...)`, error shapes): `app/api/menu/items/route.ts` + `app/api/menu/items/[id]/route.ts` for CRUD-style admin routes; `app/api/orders/route.ts` + the storefront checkout flow for the public/guest-facing creation route (server-side repricing→no equivalent needed here, but the "never trust client-supplied derived values, validate everything server-side against the DB" discipline is identical: never trust a client-claimed "this slot is free").
- Staff screen pattern to clone: `components/counter/OrdersQueue.tsx` (polling list, one-tap status actions) for the day view; `app/counter/counter-screen.tsx` for how a new tab gets added to the counter shell — reservations does NOT need a counter-PWA tab in release one (that's staff-facing HQ, not the customer-facing counter device), use the HQ Orders page pattern instead: `app/(dashboard)/orders/page.tsx`.
- HQ page/data pattern to clone: `app/(dashboard)/orders/page.tsx` (list + status filter + gated fetch) and `app/(dashboard)/members/page.tsx` (search + filter pills) — reservations day view is structurally closer to a filtered list than a calendar widget; do not build a calendar-grid UI, build a filterable list grouped by time, consistent with §3 rule 2 of the master plan ("editorial hierarchy... hairline dividers over boxes-in-boxes").
- Money/number rendering: N/A here (no cents), but times must render in the venue's local timezone, never server/browser-local — reuse the wall-clock-parts helper referenced above; never call `new Date(x).toLocaleString()` without an explicit `timeZone` option.
- Next.js constraint: `app/api/**/route.ts` files may only export HTTP method handlers. Shared helpers/types go in `lib/*`.
- Migrations: numbered file under `supabase/migrations/`, mirrored into `supabase/aro_schema.sql`, RLS + explicit grants in the same migration, `search_path` includes `extensions` when using pgcrypto/uuid functions, applied live via Supabase MCP, verified against `information_schema`/`pg_proc`, `get_advisors(security)` run and findings fixed before moving on.

## Phase 1 — Schema: reservation config, table capacity, reservations, waitlist

New migration `supabase/migrations/<date>_reservations_core.sql` (+ mirror into `supabase/aro_schema.sql`, appended after the ordering-core section, matching its header-comment style).

```sql
-- Extend existing tables (do not recreate them)
ALTER TABLE venues ADD COLUMN IF NOT EXISTS reservation_config JSONB NOT NULL DEFAULT
  '{"slot_minutes":30,"min_party":1,"max_party":8,"max_advance_days":30,
    "buffer_minutes":15,"default_duration_minutes":90}'::jsonb;

ALTER TABLE venue_tables ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 2
  CHECK (capacity > 0);

-- New tables
reservations:
  reservation_id UUID PK DEFAULT uuid_generate_v4()
  venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE
  member_id UUID NULL REFERENCES members(member_id) ON DELETE SET NULL
  table_id UUID NULL REFERENCES venue_tables(table_id) ON DELETE SET NULL
  client_uuid UUID NOT NULL  -- idempotency, UNIQUE(venue_id, client_uuid)
  guest_name TEXT NOT NULL
  guest_phone TEXT NOT NULL
  guest_email TEXT NULL
  party_size INTEGER NOT NULL CHECK (party_size > 0)
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed','seated','completed','no_show','canceled'))
  starts_at TIMESTAMPTZ NOT NULL
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0)
  notes TEXT NULL
  source TEXT NOT NULL DEFAULT 'guest' CHECK (source IN ('guest','staff'))
  created_at/updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  UNIQUE (venue_id, client_uuid)

waitlist_entries:
  waitlist_id UUID PK DEFAULT uuid_generate_v4()
  venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE
  member_id UUID NULL REFERENCES members(member_id) ON DELETE SET NULL
  client_uuid UUID NOT NULL  -- idempotency, UNIQUE(venue_id, client_uuid)
  guest_name TEXT NOT NULL
  guest_phone TEXT NOT NULL
  party_size INTEGER NOT NULL CHECK (party_size > 0)
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting','notified','seated','canceled','expired'))
  notes TEXT NULL
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  created_at/updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  UNIQUE (venue_id, client_uuid)
```

Why no `deposit`/`payment_id` column: explicitly out of scope (§Non-goals) — do not add one "for future use." Unused nullable columns that nothing writes are worse than adding them in the phase that actually needs them.

**RLS/grants (same migration, follow the ordering-core hardening pattern exactly — `REVOKE ALL ... FROM PUBLIC, anon, authenticated` then explicit re-grants):**

- `reservations` and `waitlist_entries` contain guest PII (phone, email, name) — **no anon/authenticated grants or policies at all**, same treatment as `orders`/`payments`/`members`. Server-only via service role.
- `venue_tables.capacity`: do NOT add to the existing public column grant. Confirm the existing grant statement still lists only `(table_id, venue_id, label, qr_token, is_active)` after your migration runs.
- `venues.reservation_config`: check whether `venues` currently has a public/anon grant that uses `SELECT *` or a column list. If column list, you do not need to touch it (config stays staff-only by omission). If you find a `SELECT *`-style public grant on `venues`, STOP and flag — do not silently narrow or widen an existing grant outside this phase's scope.
- Indexes: `reservations(venue_id, starts_at)`, `reservations(venue_id, status, starts_at)`, `reservations(table_id)`, `waitlist_entries(venue_id, status, joined_at)`.

Apply live via Supabase MCP. Verify objects via `information_schema`. Run `get_advisors(security)`; fix findings in a follow-up statement within this same phase, same discipline as ordering core Phase 1.

## Phase 2 — Atomic reservation functions (SECURITY DEFINER, mirror the ordering-core function style)

Two SQL functions, service-role only, in the same migration file as Phase 1 or a same-day follow-up migration:

1. **`find_available_table(p_venue_id UUID, p_party_size INT, p_starts_at TIMESTAMPTZ, p_duration_minutes INT) RETURNS UUID`**: locks candidate `venue_tables` rows (`is_active = true AND capacity >= p_party_size`, ordered by `capacity ASC` — smallest fit first) `FOR UPDATE`, checks each against existing `reservations` for that table with status IN `('confirmed','seated')` for time overlap using the venue's `buffer_minutes` from `reservation_config` on both sides of the window, returns the first table_id with no conflict or `NULL` if none fit. This is a helper, not directly callable by any route — called from function 2.
2. **`create_reservation(p_venue_id UUID, p_client_uuid UUID, p_guest_name TEXT, p_guest_phone TEXT, p_guest_email TEXT, p_party_size INT, p_starts_at TIMESTAMPTZ, p_notes TEXT, p_member_id UUID, p_source TEXT) RETURNS reservations`**: validates `p_party_size` against `reservation_config.min_party`/`max_party`, validates `p_starts_at` is in the future and within `max_advance_days`, calls `find_available_table`; if `NULL`, raises a distinct, catchable exception (e.g. `RAISE EXCEPTION 'NO_AVAILABILITY' USING ERRCODE = 'P0001'`) so the API layer can return a friendly 409 rather than a generic 500; if a table is found, inserts the reservation row with `duration_minutes` from `reservation_config.default_duration_minutes`, status `'confirmed'`, and that `table_id`; emits nothing itself (events are emitted by the calling route per master plan §4.6, not inside SQL — matches the existing pattern where `order.placed` is emitted in the same transaction via the function itself for orders; **check `20260714100000_storefront_order_creation.sql` for whether that function emits its own event or expects the caller to** — copy whichever pattern it actually uses, do not guess). Idempotent: `client_uuid` replay (23505 on the unique constraint) returns the existing row, never a second one.
3. **`update_reservation_status(p_reservation_id UUID, p_new_status TEXT) RETURNS reservations`**: row-locked (`FOR UPDATE`), legal transitions only: `confirmed→seated`, `confirmed→canceled`, `confirmed→no_show`, `seated→completed`, `seated→canceled`. Any other transition raises an exception. This mirrors `20260714110000_order_operations.sql`'s status-machine style — read that file first and copy its exact validation shape (a `CASE`/lookup table of legal from→to pairs, not a chain of `IF`s).

`search_path` for both functions must include `extensions` (pgcrypto/uuid gotcha, master plan §4.9).

Verify live: call `create_reservation` twice with the same `client_uuid` → one row, second call returns the first (test via a rolled-back transaction, same style as `supabase/tests/ordering_core_tests.sql` — add a `reservations_core_tests.sql` file following that exact structure, run inside `BEGIN...ROLLBACK`, never leave test rows in production data). Call `find_available_table` with a fully-booked venue → confirms `NULL`/`NO_AVAILABILITY` path.

## Phase 3 — Guest-facing booking API + widget

- `app/api/reservations/route.ts`: **POST** (public, no auth — guests aren't signed in), body `{ venue_slug, client_uuid, guest_name, guest_phone, guest_email?, party_size, starts_at, notes?, member_pass_serial? }`. Resolve venue by slug (`getTenantBySlug`, same as storefront). Resolve `member_pass_serial` → `member_id` if present (optional attach, same pattern as order checkout). Call `create_reservation`. Catch the `NO_AVAILABILITY` exception specifically → 409 `{ error: 'No tables available for that time — try another slot.' }` (friendly, matches the delivery-zone-miss convention from ordering core). Any other DB error → 500, logged, generic message to client. Success → 201 with the reservation's public-safe fields only (`reservation_id, starts_at, party_size, status` — never echo phone/email back in a response that could be viewed by someone else with the same link).
- `app/api/reservations/[id]/route.ts`: **GET** only, public, bearer-reference pattern identical to `app/api/orders/[id]/status/route.ts` (returns only `status, starts_at, party_size, guest_name` first-name-masked — check exactly how the order-status route masks guest info and copy it, do not invent a new masking rule).
- `app/api/reservations/availability/route.ts`: **GET** `?venue_slug=&party_size=&date=` (public) — returns a list of open slot start-times for that venue-local calendar day, computed by calling `find_available_table` in a read-only loop over the day's slot grid (`slot_minutes` from config) between the venue's configured operating hours. **If the venue has no explicit operating-hours field you can find, STOP and flag** — do not invent a default open/close time; check `venues` and `brand_kit` columns first for anything hours-shaped before assuming this needs a new column (if it does need one, that's a Phase 1 addition you missed — go back, don't patch around it in Phase 3).
- Guest widget: new route `app/reserve/[slug]/page.tsx` (mirrors `/shop/[slug]` structure and aro styling — cream/sand, terracotta CTA, one-thumb single column, JetBrains Mono for the time chips). Form: name/phone/email(optional)/party size/date/time-slot picker (fed by the availability endpoint) → POST → confirmation state showing the reservation with a "STUBBED — no SMS reminder yet" note only if you're tempted to promise one; do not promise reminders, they don't exist. Client-generated `client_uuid` via `crypto.randomUUID()`, same as storefront cart checkout.
- Middleware: add `/reserve`, `/api/reservations` to the public-route allowlist (check `middleware.ts` matcher, same place the ordering-core plan added `/shop`, `/t`, `/api/orders`).

## Phase 4 — Staff/HQ: day view + status actions + waitlist

- `app/api/reservations/venue/route.ts` (or extend the Phase 3 route with a gated GET variant — pick whichever avoids route-name collision, Next.js route files can't have two GETs in one file, so if `/api/reservations` already has POST only, adding `GET ?venue_id=&date=&status=` gated by `requireVenueRole` to the SAME file is fine and preferred over a new path): staff-facing list for a given venue-local day, gated `requireVenueRole(venueId, ['owner','manager','staff'])`.
- `app/api/reservations/[id]/route.ts`: add **PATCH** `{ status }` to the same file as the public GET — gate the PATCH branch with `requireRowVenueRole('reservations', 'reservation_id', id, ['owner','manager','staff'], 'venue_id')` (the public GET stays ungated; branch on method, gate only the mutating one). Calls `update_reservation_status`. Emit `reservation.status_changed`.
- `app/(dashboard)/reservations/page.tsx` (new, clone `app/(dashboard)/orders/page.tsx` structure): venue-local "today" list grouped by time, status filter pills, one-tap status buttons (Seat / Complete / No-show / Cancel) respecting the legal-transition set from Phase 2 — disable buttons for illegal transitions client-side too (defense in depth, the DB is still the real gate). Date picker to view other days (bounded by `max_advance_days` forward, no arbitrary past browsing needed beyond "today" for release one — if you want a simple "yesterday" toggle that's fine, don't build a full calendar picker).
- Waitlist: `app/api/waitlist/route.ts` (**POST** public — guest self-add from `/reserve/[slug]` with a "no tables right now? Join the waitlist" fallback when availability is empty; **GET** gated staff list for today), `app/api/waitlist/[id]/route.ts` (**PATCH** `{ status }` gated, legal transitions `waiting→notified→seated`, `waiting→canceled`, any→`expired` via a simple direct update — this one doesn't need a SECURITY DEFINER function, it has no capacity logic, a normal gated route update is fine and consistent with how `app/api/staff/[id]/route.ts` does simple status PATCHes). `app/(dashboard)/reservations/page.tsx` gets a second tab or section for the waitlist (same page, not a separate module — keep nav simple, one "Reservations" module covers both bookings and waitlist per the roadmap wording).
- `lib/modules.ts`: add `{ key: 'reservations', label: 'Reservations', href: '/reservations', icon: CalendarClock (or CalendarDays — pick one from lucide-react, check it's already imported elsewhere or add the import), status: 'live' }`. Add `'reservations'` to `ModuleKey`.
- Events: add `reservation.created`, `reservation.status_changed`, `waitlist.joined`, `waitlist.status_changed` to `AroEventType` + `EVENT_LABELS`.

## Phase 5 — Table capacity settings, seed data, polish

- Table capacity editing: extend the existing table-management surface added in ordering-core Phase 6 (Orders settings — check `components/orders/FulfilmentSettings.tsx`, it already has table CRUD for QR printing) to include a `capacity` field on create/edit, rather than building a second table-management UI. **Do not create a duplicate table-CRUD surface** — one place edits `venue_tables`, full stop.
- Extend `scripts/verify-live.mjs`: anon cannot read/write `reservations` or `waitlist_entries`; `find_available_table`/`create_reservation`/`update_reservation_status` exist and are not callable by anon; a double-submit of the same `client_uuid` produces one row.
- Seed additions (idempotent, fixed UUIDs, extend `supabase/seed/aro_dev_seed.sql`): give The Roastery's existing seeded tables real `capacity` values (2–3 different sizes so availability logic has something to differentiate), one demo reservation, one demo waitlist entry.
- Final grep gates: no browser `.from('reservations'` / `.from('waitlist_entries'` outside `app/api`/server components; confirm no new gateway/SDK-style direct imports were introduced (this phase shouldn't need any new npm dependency at all — if you find yourself wanting one, STOP and flag, that's a signal you've drifted from the spec).
- `docs/plans/BUILD-LOG-reservations.md` (new file, same format as the ordering-core build log): one section per phase.

## Verification (end-to-end, per phase + final)

1. Migration objects verified live; `get_advisors(security)` clean or findings fixed; RLS confirmed on both new tables with zero anon/authenticated grants.
2. `create_reservation` called twice with the same `client_uuid` → exactly one row (rolled-back transaction test, mirrors `ordering_core_tests.sql`).
3. Book a table to full capacity for a given slot (across enough covers to exhaust every table sized for that party), then attempt one more booking for the same slot/party size → `NO_AVAILABILITY` / 409, not a 500.
4. Guest books via `/reserve/[slug]` → appears on the HQ `/reservations` day view within one reload → Seat → Complete, each transition legal and reflected; an illegal transition attempt (e.g. `completed→seated`) is rejected server-side even if you disabled the button client-side (test by calling the API directly).
5. Waitlist: guest joins → staff marks notified → seated; canceled/expired entries don't show as active.
6. Isolation: owner of venue B gets 403 reading/mutating venue A's reservations; anon gets no rows from `reservations`/`waitlist_entries` under any query.
7. Times render correctly in the venue's configured timezone on both the guest widget and the HQ day view — verify by checking a slot near a timezone boundary renders the same wall-clock time in both places.
8. `npm run verify:live` extended checks pass; `npx tsc --noEmit` and `npm run build` green; module registry shows Reservations `live`; `BUILD-LOG-reservations.md` complete with one section per phase, each stating what was verified.
