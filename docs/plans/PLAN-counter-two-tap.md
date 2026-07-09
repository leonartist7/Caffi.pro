# PLAN-counter-two-tap — Rank 3 of 5

**Goal:** the staff surface is genuinely two taps: PIN in (exists from Phase
2.2) → search member → tap member → tap **+ Visit** or **Redeem**. Learnable by
a day-one hire in 60 seconds, tolerant of flaky café wifi (visits queue
offline), and privacy-correct (staff never see member contact info).
Depends on: PLAN-live-supabase-bringup. Pairs with PLAN-diner-join-page
(the pass QR the diner shows is the serial this screen scans/searches).

## Files to touch

- `app/counter/page.tsx` (MODIFY — Phase 2.2 built the PIN login; extend into the working screen. Read it first: session comes from `lib/counter-session.ts` cookie `aro_counter_session`)
- `app/counter/counter-screen.tsx` (CREATE — client: search box, results, member panel with two big actions, offline queue indicator)
- `app/counter/offline-queue.ts` (CREATE — client module: localStorage queue, replay, described below)
- `app/api/counter/search/route.ts` (CREATE — verified counter token → search members of the bound venue ONLY; returns `{id, first_name, points, usual, masked_contact}` — never raw phone/email)
- `app/api/counter/visit/route.ts` (CREATE — records a visit; accepts client-generated `visit_uuid` for idempotency)
- `app/api/counter/redeem/route.ts` (CREATE — atomic redemption; see steps)
- `supabase/migrations/20260709000002_counter_rpc.sql` (CREATE — `redeem_reward(member, reward, membership)` SQL function: checks balance from `member_balances`, inserts negative `points_ledger` delta + `redemptions` row in ONE transaction, returns new balance; also `visits.client_uuid uuid unique` column for dedupe)
- `lib/events.ts` (no change — emit `visit.recorded`, `reward.redeemed` from the routes)
- `scripts/verify-live.mjs` (MODIFY — counter checks in §Acceptance)

## Steps, in order

1. Read existing `app/counter/page.tsx`, `app/api/counter/*` (login/session/logout exist). Keep the PIN flow; build the post-login screen.
2. Migration first (`client_uuid` + `redeem_reward` fn + grant EXECUTE to service role only). Regenerate `aro_schema.sql` mirror.
3. Search API: min 2 chars; match `first name prefix` OR `phone suffix (last 4+ digits)` OR exact `pass_serial` (QR scan paste). Max 8 results. Members of `session.venueId` only — the venue comes from the VERIFIED cookie, never from the request body (body-supplied venue = cross-tenant hole).
4. Visit API: body `{member_id, visit_uuid}`; insert with `source='manual'`, `ON CONFLICT (client_uuid) DO NOTHING` and return current visit count either way (idempotent double-tap and offline replay share one mechanism).
5. Redeem API: body `{member_id, reward_id}`; call the RPC; map "insufficient balance" to a calm 409 the UI shows as "Not enough points yet — N more to go", not an error toast.
6. UI: one screen. Giant search input (autofocus, `enterkeyhint=search`). Result rows ≥ 64px tall (tablet thumbs). Member panel: first name, points, usual (nullable), two buttons — terra `+ Visit`, saffron `Redeem` (Redeem opens affordable-rewards list only). After action: 1.5s success flash with new points, auto-return to empty search (next customer). No nav, no settings, no links out. Buttons disable while in flight.
7. Offline queue (visits ONLY): on fetch failure/`navigator.onLine === false`, push `{visit_uuid, member_id, member_name, ts}` to localStorage; badge "N visits waiting — will sync"; replay on `online` event + every 30s + before any new action; each replay uses the stored `visit_uuid` so double-send is harmless. Queue cap 100 with oldest-first eviction warning.
8. Session-expiry UX: any 401 from counter APIs → PIN overlay in place (do NOT navigate away; the queue and the current search must survive re-auth).
9. Screenshots (tablet 1024×768 + phone): search, member panel, visit success, redeem list, insufficient-points state, offline badge with queued visit, PIN re-entry overlay → `docs/audit/after/plan-counter/`.

## Edge cases a weaker model would miss

- **Never queue redemptions offline.** Offline you can't know the true balance; queued redeems can drive it negative and hand out doubles. Offline: Redeem button disabled with "needs connection" note. Visits are safe to queue (append-only, idempotent); redemptions are not. This asymmetry is the whole design.
- **Balance check and deduction must be one transaction** (the SQL RPC). Check-then-insert from two JS calls races when two staff devices redeem the same member simultaneously.
- **Venue scoping from the cookie, not the payload.** The counter token binds venueId; any API accepting venue/member IDs must verify the member belongs to `session.venueId` before acting (member IDs are guessable across venues otherwise).
- **Masked contact in search results:** return `…0100` style suffix for disambiguating two Mayas — never the full phone. Column-level privacy is Blueprint §8, and it's why search runs server-side.
- Double-tap protection is server-side (`client_uuid` unique), not just a disabled button — disabled buttons don't survive a page reload mid-request.
- `points_ledger` rows for redemptions need `reason='redemption'` and the redemption id in metadata, or the member's history screen (Plan 4) can't explain the deduction.
- Timestamps: record `ts` client-side at queue time and send it; a visit synced 2h later must count for when it happened (cadence math depends on it). Server clamps to ±24h sanity.
- iPad Safari localStorage in private mode can throw on write — wrap in try/catch, degrade to memory queue with a visible warning.

## Acceptance criteria

1. verify-live.mjs: counter search for venue A token never returns venue B members (seed both); response objects contain NO `email`/`phone` keys (assert key absence, not just empty values).
2. Same `visit_uuid` posted 3× = exactly one `visits` row.
3. Concurrent redeem test (two parallel requests, member has points for one) → one 200 + one 409; ledger sum never negative.
4. Playwright offline simulation (`context.setOffline(true)`): tap +Visit twice on two members, go online, queue drains, exactly 2 visits in DB, badge clears — screenshot sequence saved.
5. From search-focused to visit-recorded in ≤ 2 taps on the happy path (screenshot flow proves it); build green; committed + pushed.
