# Build log — Reservations & Waitlist

Tracks progress against `docs/plans/PLAN-02-reservations-waitlist.md`. One
section per phase; no phase is marked live until its migration or runtime
behavior has been verified. Prerequisites: PLAN-00 and PLAN-01 complete.

## Phase 1 — Schema: reservation config, table capacity, reservations, waitlist

- Added `supabase/migrations/20260716160000_reservations_core.sql`:
  - `venues.reservation_config` JSONB (slot/party/advance/buffer/duration/hours;
    default `hours: null` so unconfigured venues are not inventively bookable).
  - `venue_tables.capacity INTEGER NOT NULL DEFAULT 2 CHECK (capacity > 0)`.
  - Public `venue_tables` grant re-asserted as
    `(table_id, venue_id, label, qr_token, is_active)` only — `capacity` is
    staff-only by omission (matches ground truth).
  - `reservations` and `waitlist_entries` with `venue_id`, guest PII, status
    CHECKs, `UNIQUE(venue_id, client_uuid)`, indexes per spec.
  - RLS enabled; `REVOKE ALL ... FROM PUBLIC, anon, authenticated`;
    `GRANT ALL ... TO service_role` only. No browser policies.
- Mirrored the migration into `supabase/aro_schema.sql` after the ordering-core
  section (append).
- **Live apply (2026-07-16):** Supabase MCP verified against project
  `jjgccfrwjkwknyjtbtxa` (`https://jjgccfrwjkwknyjtbtxa.supabase.co`). Applied
  `reservations_core` via MCP `apply_migration` (remote version
  `20260716172405`). Verified live: columns on `venues`/`venue_tables`/
  `reservations`/`waitlist_entries`; RLS on; indexes present; zero anon/
  authenticated table grants on PII tables; `venue_tables` public SELECT still
  only `(table_id, venue_id, label, qr_token, is_active)` (no `capacity`).
  `get_advisors(security)`: `rls_enabled_no_policy` INFO on
  `reservations`/`waitlist_entries` (intentional service-role-only, same class
  as `orders`/`payments`); no new WARN from this migration (pre-existing Auth
  leaked-password WARN only).

## Phase 2 — Atomic reservation functions

- Same migration defines:
  - `find_available_table` — smallest-fit active tables `FOR UPDATE`, buffer
    overlap on both sides for `confirmed`/`seated`.
  - `create_reservation` — party/hours/advance validation; `NO_AVAILABILITY`
    (`P0001`) on closed/unconfigured/full; inserts `reservation.created` into
    `events` in the same transaction; idempotent on `(venue_id, client_uuid)`.
  - `update_reservation_status` — legal transitions only
    (`confirmed→seated|canceled|no_show`, `seated→completed|canceled`).
- All three: `SECURITY DEFINER`, `search_path = public, extensions`,
  execute granted to `service_role` only.
- Tests: `supabase/tests/reservations_core_tests.sql` (BEGIN…ROLLBACK) covers
  grants, idempotent create, capacity exhaustion → `NO_AVAILABILITY`, legal and
  illegal transitions. **Run live 2026-07-16 via MCP `execute_sql` →**
  `ALL RESERVATIONS CORE TESTS PASSED`; production rows left at 0 (rolled back).

## Phase 3 — Guest-facing booking API + widget

- `POST /api/reservations` — public create via `create_reservation` RPC;
  `NO_AVAILABILITY` → 409 friendly message; public response fields only
  (`reservation_id, starts_at, party_size, status`); optional
  `member_pass_serial` attach via `members.tenant_id` (legacy column).
- `GET /api/reservations/availability` — read-only slot grid from
  `reservation_config` + day’s reservations; `{ configured, slots }`; never
  calls locking `find_available_table`.
- `GET /api/reservations/[id]` — public status with first-name only (mirrors
  `orders/[id]/status`).
- Guest widget `app/reserve/[slug]/page.tsx` — aro cream/terra single column,
  client `crypto.randomUUID()`, waitlist fallback when slots empty; no reminder
  promises.
- Middleware custom-domain rewrite: `/reserve` and `/reserve/*` →
  `/reserve/${slug}` before shop rewrite.
- Helpers: exported `localParts` from `lib/owner-stats.ts`; pure slot math in
  `lib/reservations.ts` (reuses wall-clock discipline, no new timezone module).

## Phase 4 — Staff/HQ day view + waitlist + modules/events

- `GET /api/reservations?venue_id=&date=&status=` — gated
  `requireVenueRole(..., ['owner','manager','staff'])`, venue-local day bounds.
- `PATCH /api/reservations/[id]` — `requireRowVenueRole(..., 'venue_id')` then
  `update_reservation_status`; emits `reservation.status_changed` (create is
  SQL-only).
- Waitlist: public `POST /api/waitlist`, staff `GET`, gated `PATCH /api/waitlist/[id]`
  with legal transitions; emits `waitlist.joined` / `waitlist.status_changed`.
- HQ `app/(dashboard)/reservations/page.tsx` — bookings day list grouped by
  venue-local time, status pills, Seat/Complete/No-show/Cancel; waitlist tab;
  booking-hours editor tab.
- `lib/modules.ts`: `reservations` module `live` with `CalendarDays`.
- `lib/events.ts`: `reservation.created`, `reservation.status_changed`,
  `waitlist.joined`, `waitlist.status_changed`.

## Phase 5 — Capacity settings, seed, polish

- `FulfilmentSettings` + fulfilment API: `capacity` on table create and PATCH
  (no second table-CRUD surface).
- Clients PATCH accepts `reservation_config` (merged); `CLIENT_COLUMNS` includes
  the field for HQ hours editor.
- Seed (`supabase/seed/aro_dev_seed.sql`): Roastery table capacities 2/4/6,
  booking hours Mon–Sat 08:00–20:00 Sun closed, one demo reservation, one
  waitlist entry.
- `scripts/verify-live.mjs`: anon denied on `reservations`/`waitlist_entries`;
  RPC not anon-executable; double-submit idempotency probe (cleans up row).
- **Grep gate (local):** no browser `.from('reservations'` / `.from('waitlist_entries'`
  outside `app/api`/server paths — only API routes and SQL. No new npm deps.
- Live migration + advisors + SQL tests applied/verified 2026-07-16 (see Phase 1
  / 2). Remaining app-level checks: `npm run verify:live` after PR #49 deploys
  app code; PR #49 was **not** merged by the apply session.

## Verification checklist (spec §Verification)

| #   | Check                                                              | Status                                             |
| --- | ------------------------------------------------------------------ | -------------------------------------------------- |
| 1   | Migration objects live + advisors clean                            | **Done** live 2026-07-16 on `jjgccfrwjkwknyjtbtxa` |
| 2   | Idempotent `create_reservation` (rolled-back test)                 | **Passed** live (BEGIN…ROLLBACK)                   |
| 3   | Capacity exhaustion → `NO_AVAILABILITY` / 409                      | **SQL path passed** live; API 409 needs app deploy |
| 3b  | Hours null / closed day / outside hours                            | Implemented in SQL + availability API              |
| 4   | Guest book → HQ day view → Seat → Complete; illegal transition 400 | Code paths implemented; needs live DB              |
| 5   | Waitlist waiting → notified → seated                               | Implemented                                        |
| 6   | Cross-venue 403 / anon no rows                                     | Authz gates + RLS grants as specified              |
| 7   | Venue timezone rendering                                           | HQ uses `timeZone` option; guest shows slot times  |
| 8   | tsc + build green; module live; build log complete                 | tsc green; build verified in CI/local before push  |
