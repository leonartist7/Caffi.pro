# BUILD-LOG — PLAN-12: Offer engine core

## What shipped

- One migration, additive only: `redeem_member_offer(p_venue_id, p_code,
p_staff_membership_id)` — a `SECURITY DEFINER` RPC modelled directly on
  the existing `redeem_reward()` (`aro_schema.sql:1094`). Locks the offer
  row with `FOR UPDATE` before checking state, so the "fire the same
  redeem three times concurrently" acceptance line resolves structurally:
  the second and third callers block on the `SELECT` until the first
  transaction commits, then see the already-redeemed row and take the
  idempotent-replay branch (returns the existing redemption, writes
  nothing) rather than racing the write. Not found (including
  cross-venue — the lookup is scoped to `p_venue_id`, so another venue's
  code is never even resolved), void, and lazily-detected-expired all
  raise typed `ERRCODE`s (`P0002`/`P0004`/`P0001`) that
  `app/api/counter/redeem-offer/route.ts` translates into calm JSON —
  same shape `app/api/counter/redeem/route.ts` already uses for
  `P0001`–`P0003`. `REVOKE`d from `PUBLIC`/`anon`/`authenticated`,
  `GRANT`ed to `service_role` only, same as `redeem_reward`. No other
  schema change — `loyalty_programs`, `member_offers`, their RLS
  policies, and the `forbid_member_offer_mutation` write-once trigger all
  already existed from PLAN-10.
- `lib/loyalty/offers.ts` — pure, no Supabase import: `generateOfferCode()`
  (7-char uppercase alphanumeric minus visually-ambiguous characters —
  `0/O`, `1/I/L`) and `isOfferExpired()` (lazy expiry check shared by the
  counter lookup route and the pass page, no cron).
- Program CRUD (`app/api/loyalty/programs/route.ts`,
  `.../[id]/route.ts`) and offer issuance
  (`app/api/loyalty/offers/route.ts`) — all `requireVenueRole(['owner',
'manager'])`. Issuance retries up to 3 times on a `23505` code
  collision (vanishingly rare at 7 chars over a venue-scoped namespace)
  before failing loudly rather than silently.
- Counter surfaces: `app/api/counter/offer/route.ts` (read-only lookup —
  what a code resolves to, before committing) and
  `app/api/counter/redeem-offer/route.ts` (the actual redemption), both
  gated by the existing `verifyCounterToken`/`COUNTER_COOKIE` session,
  same trust model as `/api/counter/redeem`. New counter UI phase
  (`app/counter/counter-screen.tsx`) — "Have a code?" from the search
  screen, code entry, lookup, then a confirm step showing the member's
  first name/program/value before the actual redeem call, with calm,
  specific copy for not-found/void/expired/already-redeemed rather than
  a raw error.
- Owner surface: `app/(owner)/loyalty/page.tsx` +
  `loyalty-client.tsx`, registered as `owner_loyalty` in `lib/modules.ts`
  (`surface: 'owner'`, alongside `owner_tips`/`owner_rewards`) — program
  list with status pills, activate/pause/resume/archive actions, and an
  inline issue-offer panel per active program (debounced member search
  against the existing `/api/members?search=` from PLAN-11, points/
  dollar value fields prefilled from the program's optional
  `config.default_points_value`/`default_value_cents`, shows the
  generated code back immediately on success).
- `app/pass/[serial]/page.tsx` — new "your offers" section listing that
  member's `issued`-status, unexpired offers (filtered via
  `isOfferExpired()`) with their code, points/dollar value, and expiry —
  same `aro-sand/60` card treatment the existing points-balance tile
  already uses, not a new visual language.
- `lib/events.ts` — new `// --- Lane A ---` block (append-only, per the
  file's own convention): `program.created`, `program.status_changed`,
  `offer.issued`, `offer.redeemed`, `offer.expired`, plus matching
  `EVENT_LABELS` entries.
- `scripts/verify-live.mjs` — three new checks: authenticated-non-owner
  `INSERT` denied on `loyalty_programs` and on `member_offers` (the
  meaningful proof for these two tables, since unlike the zero-grant
  tables above them a bare `SELECT` with no membership just returns zero
  rows rather than erroring — RLS filters, it doesn't block the grant
  itself), and `redeem_member_offer` confirmed uncallable by both `anon`
  and an authenticated non-owner.

## Deliberate scope cuts (see PLAN-12-offer-engine-core.md's Non-goals)

- **Only `points_value` actually credits anything.** A program can be
  configured with a dollar value (`value_cents`) and redemption marks it
  used, but nothing wires that value into the storefront checkout as an
  automatic discount — there's no store-credit/discount-code mechanism
  anywhere in this codebase yet, and building one is a materially
  different piece of work than the redemption core. The owner UI says so
  explicitly wherever a dollar value is entered, rather than shipping a
  field that silently does nothing at checkout.
- No delivery (email/SMS/push) — v2 §N1/§N6 and PLAN-18, both blocked/
  not-yet-built elsewhere.
- No automatic issuance (a birthday program finding today's birthdays
  and issuing itself) — that's PLAN-14's job; this PR only has to prove
  the engine works when something calls it.
- No expiry cron — checked lazily at redemption and at read time.

## Post-draft audit (before merge, 2026-08-10)

Independent re-read of the migration SQL with no context from the build
session, per the master-plan mandate that PLAN-12's redemption idempotency
gets architect-tier review (`MASTER-PLAN-v2R-remastered.md` owner note:
Opus 5 fills the "Fable 5" seat for this batch):

- **Real money bug found and fixed.** `redeem_member_offer()`'s expiry
  branch only ever guarded on `v_status = 'issued'`. A **second** call
  against an offer whose status was already `'expired'` (set by an
  _earlier_ call's own expiry branch, or reachable by any future terminal
  status) skipped every guard, fell through to
  `UPDATE ... WHERE status = 'issued'` — which matched **zero rows** — and
  then still ran the unconditional `points_ledger` INSERT below it,
  because that INSERT was gated only on `v_points_value IS NOT NULL AND
v_points_value > 0`, never on the UPDATE having actually matched.
  Concretely: an already-expired offer, redeemed twice, credited points
  twice, and both calls returned `already_redeemed = false` as if each
  were a fresh, legitimate redemption. The three-concurrent-redemption
  scenario in the original PR body was fine (the `FOR UPDATE` lock and the
  write-once trigger genuinely serialize that case) — this was a
  different path the acceptance checklist's phrasing didn't cover.
  **Fixed two ways**, not one:
  1. Any status other than `'issued'` at the point past the
     already-redeemed and expiry checks now raises `P0001` directly,
     closing the control-flow hole itself.
  2. `points_ledger` gained an `offer_id` column and a partial unique
     index (`uq_points_ledger_offer_award`, mirroring the existing
     `uq_points_ledger_order_award` pattern exactly) plus an
     `ON CONFLICT ... DO NOTHING` on the credit INSERT — a structural,
     catalogue-level backstop so this class of bug can't recur through a
     different control-flow path later, matching the PLAN-24/36 bar for
     money-adjacent work ("idempotency proven by a database-level
     guarantee, not an application `if`").
- Re-confirmed cross-venue rejection and the once-only redemption trigger
  by reading the schema directly — both hold as originally claimed.

## Verification

- `npx tsc --noEmit` — clean.
- `npx eslint` on every new/changed file — clean.
- `npm run build` — clean; `/loyalty`, `/api/loyalty/programs`,
  `/api/loyalty/programs/[id]`, `/api/loyalty/offers`,
  `/api/counter/offer`, `/api/counter/redeem-offer` all registered.
- Grep gate: zero `coffee-*`/`cream-*`/`dark-*` across every file this PR
  adds or touches.
- **Not verified live.** The Supabase MCP connector for this project
  (`aro-platform`) disconnected partway through this session — every
  design decision above was checked by reading the actual migration SQL
  (`20260722120000_batch_schema_lanes_abc.sql`) and the existing
  `redeem_reward()` function directly rather than assumed, but no RPC
  call, no RLS probe, and none of the three new `scripts/verify-live.mjs`
  checks have actually been run against the live database from this
  session. **This is the same class of gap PLAN-30/31 flagged for their
  own live verification** — needs a follow-up pass with the connector
  (or a populated `SUPABASE_SERVICE_ROLE_KEY`) before this is trusted in
  production, specifically:
  - The three-concurrent-redemption race claim is architecturally sound
    (`FOR UPDATE` + `WHERE status = 'issued'` is the same primitive
    `redeem_reward` already proves live), but has not itself been fired
    against a real database in this session.
  - The cross-venue rejection claim (venue B can't redeem venue A's
    code) follows directly from the `WHERE venue_id = p_venue_id`
    scoping in the lookup, but likewise wants an explicit live test
    before being taken as proven rather than reasoned.
  - `scripts/verify-live.mjs`'s three new checks are unrun.
