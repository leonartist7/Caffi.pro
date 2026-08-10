# PLAN-12 — Offer engine core

Lane A, `MASTER-PLAN-v2R-remastered.md` §6 (design already resolved there,
🟡 NEXT, N11's prerequisite). A venue can define a loyalty program, that
program can issue a redeemable offer to a member, and a barista can redeem
it at the counter exactly once. This is the library's foundation — seven
"features" from the idea list (bounce-back, appreciation, birthday,
anniversary, win-back, mystery, survey reward) are one engine and seven
`loyalty_programs.type` rows, not seven new mechanisms.

## Ground truth (this branch is fresh off `main`, Lane B and Lane C fully merged)

- PLAN-10 already shipped the full schema this engine runs on:
  `loyalty_programs` (type enum already lists every program type Lane A
  will ever need — `accrual`, `bounce_back`, `birthday`, `anniversary`,
  `appreciation`, `winback`, `mystery`, `survey`, `referral` — config is
  JSONB, read server-side per type), `member_offers` (immutable after
  issue except the redemption triple, enforced by a
  `forbid_member_offer_mutation` trigger), RLS already wired (owner/manager
  read+write on `loyalty_programs`, owner/manager read+insert+update on
  `member_offers`, no client DELETE grant on either — void, don't remove).
  Confirmed via direct migration read, not assumed: `redeemed_at` is
  write-once at the trigger level, and a partial unique index
  (`uq_member_offers_redeemed_once`) backs it as a second, independent
  guarantee. This PR does not touch the schema at all — every table,
  index, trigger, and policy it needs already exists and already passed
  `scripts/verify-live.mjs`'s anon-denied checks.
- The **exact redemption idempotency pattern already exists** in this
  codebase for the points-reward system: `redeem_reward()`
  (`supabase/aro_schema.sql:1094`) is `SECURITY DEFINER`, locks the
  relevant row with `FOR UPDATE` before checking state, raises typed
  errors via custom `ERRCODE`s (`P0001`–`P0003`) that
  `app/api/counter/redeem/route.ts` translates into calm JSON, and is
  granted to `service_role` only — never `anon`/`authenticated`.
  `redeem_member_offer()` (this PR) mirrors that shape exactly, so
  there's no new authorization pattern to review, only a new function
  body.
- `points_ledger.reason` is bare `TEXT NOT NULL` with no `CHECK`
  (confirmed in `aro_schema.sql:119` area) — a new reason string
  (`'offer_redemption'`) needs no migration.
- The counter session (`app/api/counter/*`, `lib/counter-session.ts`) is
  a signed HMAC cookie, not a Supabase Auth session — the exact same
  trust model `redeem_reward` already runs under. The new offer-redeem
  route sits at `app/api/counter/redeem-offer` alongside the existing
  `app/api/counter/redeem` and uses the identical `verifyCounterToken`
  gate.
- `lib/modules.ts`'s `ownerModules()`/`OWNER_ITEMS` registry (built by
  Lane C's PLAN-30, merged) is exactly the mechanism the master plan
  describes for adding an owner nav entry — append one `ModuleDef` row
  with `surface: 'owner'`, no `owner-shell.tsx` edit needed.

## Design

- **No new tables, no new migration for the schema itself.** One new
  migration, additive only: `redeem_member_offer()` (the RPC) plus a
  small number of `service_role`-only grants for it. Nothing in PLAN-10's
  tables changes shape.
- **`lib/loyalty/offers.ts`** (pure, no Supabase import, mirrors
  `lib/tips/allocate.ts`'s house pattern of pure core + thin route
  wrapper): `generateOfferCode()` — 7-character, uppercase, digits +
  letters minus visually-ambiguous characters (`0/O`, `1/I/L`), so a
  human can read a code off a phone screen and a barista can type it
  without ambiguity; `isOfferExpired(offer)`.
- **Program CRUD** — `app/api/loyalty/programs/route.ts` (`GET` list for
  the venue, `POST` create — `requireVenueRole(['owner','manager'])`) and
  `app/api/loyalty/programs/[id]/route.ts` (`PATCH` status transitions:
  `draft → active`, `active ⇄ paused`, any non-archived → `archived`;
  same role gate). Status changes emit `program.status_changed`;
  creation emits `program.created`.
- **Issuing an offer** — `app/api/loyalty/offers/route.ts` (`GET` list
  issued offers for a program, `POST` issue one to a member —
  owner/manager). The route generates a code via
  `generateOfferCode()` and inserts; on the rare `23505` unique-violation
  (code collision within the venue), it retries with a fresh code up to
  3 times before giving up with a 500 — collisions are expected to be
  vanishingly rare at 7 chars over a venue-scoped namespace, so a bounded
  retry is proportionate, not a sign the code space is too small. Emits
  `offer.issued`.
- **Redeeming at the counter** — the RPC, `redeem_member_offer(p_venue_id,
p_code, p_staff_membership_id)`:
  1. `SELECT ... FOR UPDATE` the offer by `(venue_id, code)` — the lock
     is what makes "fire the same redeem three times concurrently"
     resolve to exactly one write: the second and third callers block on
     this `SELECT` until the first transaction commits, then see the
     already-updated row and take the idempotent-replay branch below,
     never the write branch.
  2. Not found → `RAISE 'offer_not_found' USING ERRCODE = 'P0002'`
     (covers cross-venue codes too — the lookup is scoped to
     `p_venue_id`, so venue B can never even resolve venue A's code; no
     separate cross-venue error path needed, the row simply isn't
     there).
  3. `status = 'void'` → `RAISE 'offer_void' USING ERRCODE = 'P0004'`.
  4. Already redeemed (`redeemed_at IS NOT NULL`) → **not an error.**
     Per the acceptance line, a replay returns the already-redeemed
     state and writes nothing — the function returns the existing
     redemption row as a normal success result, same shape as a fresh
     redemption, so the caller can't tell replay from first-success by
     status code alone (by design: the counter should say "already
     redeemed" warmly either way, not surface plumbing).
  5. `status = 'issued'` and past `expires_at` → flips it to `status =
'expired'` (self-healing, idempotent — a `WHERE status = 'issued'`
     guard means a second expiry check on the same row is a no-op) and
     `RAISE 'offer_expired' USING ERRCODE = 'P0001'`.
  6. Otherwise: `UPDATE ... SET redeemed_at = NOW(), status =
   'redeemed', redeemed_by_membership_id = p_staff_membership_id WHERE
   offer_id = ... AND status = 'issued'`, and if `points_value` is set,
     one `INSERT INTO points_ledger (..., reason: 'offer_redemption')` —
     same table, same shape `redeem_reward` already writes to, so the
     member's balance updates through the exact code path already
     proven live.
     `app/api/counter/redeem-offer/route.ts` calls this and translates the
     `ERRCODE`s into calm, specific JSON (never a bare 500/409) — mirroring
     `app/api/counter/redeem/route.ts`'s existing `P0001`/`P0002`/`P0003`
     translation table.
- **Counter lookup** — `app/api/counter/offer/route.ts` (`GET
?code=`), used by the new counter UI phase to show the barista what a
  code resolves to (member's first name, program name, value) _before_
  committing to redeem, so a mis-typed or already-redeemed code doesn't
  surprise anyone. Read-only; doesn't touch `redeemed_at`.
- **Owner surface** — `app/(owner)/loyalty/page.tsx` +
  `loyalty-client.tsx`, registered as `owner_loyalty` in `lib/modules.ts`
  (`surface: 'owner'`, next to `owner_tips`/`owner_rewards`). Program
  list with status pills and activate/pause/archive actions; an
  issue-offer flow (pick an existing member by search, pick an active
  program, optionally override the program's default value) that shows
  the generated code back to the owner immediately — useful for a
  manual, in-person issue, though the member's own `/pass` page (below)
  is the primary surface a member sees it on.
- **Pass integration** — `app/pass/[serial]/page.tsx` gains an "Offers"
  section listing that member's `issued`-status, unexpired offers with
  their code, mirroring the page's existing points-balance card styling
  exactly (same `aro-sand/60` card treatment already used for the points
  tile).
- **Events** — `program.created`, `program.status_changed`,
  `offer.issued`, `offer.redeemed`, `offer.expired` appended to
  `lib/events.ts` as a new `// --- Lane A ---` block at the end (Lane B's
  and Lane C's existing blocks are untouched, per the file's own
  append-only convention).

## Non-goals (deliberate, stated with teeth — matches the master plan)

- **No delivery of any kind.** An offer is issued and shows up on the
  member's pass and (if the owner chooses) the counter's issue-flow
  screen. No email, no SMS, no push — those are v2 §N1/§N6 (blocked on
  vendor decisions) and PLAN-18 (push) respectively.
- **`value_cents`-type programs are schema-supported but not
  checkout-applied.** The `member_offers.value_cents` column exists (a
  program can be configured with a dollar value instead of a points
  value) and redemption marks it used, but nothing in this PR wires that
  dollar value into the storefront checkout flow as an automatic
  discount — there is no store-credit or discount-code mechanism
  anywhere in the codebase today, and building one is a materially
  different, checkout-integration-shaped piece of work than "the offer
  engine's redemption core." The owner UI labels a dollar-value program
  honestly: **"Dollar-value offers aren't applied automatically at
  checkout yet — redeeming just marks the offer used."** Only
  `points_value` actually credits anything in this PR (via
  `points_ledger`, same mechanism the existing rewards system already
  uses). This is the same class of honest, explicitly-flagged scope cut
  PLAN-36 made for currency and PLAN-22 made for realtime — surfaced
  here, not silently shipped as if it worked.
- **No scheduled/automatic issuance.** An owner (or, later, a specific
  program type's own logic in PLAN-13/14) issues an offer explicitly via
  the API this PR builds. A birthday program automatically finding
  members whose birthday is today and issuing offers to them is PLAN-14's
  job, not this one's — PLAN-12 only has to prove the engine works when
  something calls it.
- **No expiry cron.** Expiry is checked lazily, at redemption and at
  read time for the pass/owner list (`isOfferExpired()`), not swept by a
  background job. An offer sitting expired-but-unmarked in the database
  between checks is harmless — nothing reads `status = 'issued'` as a
  promise that it's still redeemable without also checking
  `expires_at`.

## Acceptance (from the master plan, verbatim, plus this PR's own scoping above)

- [ ] An owner can create, activate, pause, and archive a program from
      the `/loyalty` owner surface; state changes emit events.
- [ ] Issuing an offer to a member creates exactly one `member_offers`
      row; the offer appears on that member's pass.
- [ ] Redeeming at the counter marks it redeemed, credits `points_value`
      per config, and **a replayed redeem of the same code returns the
      already-redeemed state and writes nothing** — proven by firing the
      same redeem three times concurrently.
- [ ] An expired offer cannot be redeemed; the counter shows why,
      warmly, not "Error 409".
- [ ] A cross-venue offer code is rejected — venue B cannot redeem venue
      A's code. Tenant-isolation test, run explicitly.
- [ ] Events emitted + labelled: `offer.issued`, `offer.redeemed`,
      `offer.expired`, `program.created`, `program.status_changed`.
- [ ] **Design bar** (§2) — all five clauses.
- [ ] `scripts/verify-live.mjs` extended; `npm run build` +
      `tsc --noEmit` green.
