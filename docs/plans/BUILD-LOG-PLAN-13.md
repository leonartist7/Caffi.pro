# BUILD-LOG — PLAN-13 (Bounce-back + appreciation)

Branch `sonnet/lane-a-plan13-bounceback-appreciation`, off `main` after
PLAN-12 (PR #76) merged.

## What shipped

- **Migration** `20260810190000_plan13_offer_lifecycle.sql`:
  `member_offers.valid_from`/`period_key` columns, a partial unique index
  (`uq_member_offers_program_member_period` on `program_id, member_id,
period_key WHERE period_key IS NOT NULL`), both new columns added to
  `forbid_member_offer_mutation()`'s immutable-column list (they'd
  otherwise be silently mutable after issue, unlike every other field),
  and `redeem_member_offer()` gained a `valid_from > NOW()` boundary
  raising a new `ERRCODE` (`P0005`) — placed after the already-audited
  expired/terminal-status checks from PLAN-12's post-draft fix, so a
  not-yet-valid offer never reaches the redeem UPDATE either.
- `lib/loyalty/bounce-back.ts` — pure: `parseBounceBackConfig` (reads
  `delay_days`/`window_days` off a program's JSONB config, falling back to
  a 3/11-day default — "day 3 through day 14" — for any missing or
  non-positive value) and `computeBounceBackWindow(paidAt, config)`.
- `lib/loyalty/issue.ts` — `issueMemberOffer()`, the automated-issuance
  counterpart to PLAN-12's owner-driven POST route: same code-retry-on-
  collision loop, plus period-key-scoped dedup (a `23505` on the period
  index returns `{ issued: false, reason: 'duplicate_period' }`, not an
  error — a retried caller sees "already issued", not a 500). Shared by
  this PR's bounce-back and appreciation paths, and designed for PLAN-14/
  16/17 to reuse rather than each reimplementing the retry loop.
- `lib/loyalty/bounce-back-issue.ts` — `issueBounceBackOffersForOrder()`,
  called from `app/api/webhooks/stripe/route.ts` only when
  `record_order_payment_success` returns `applied: true` (never on a
  webhook replay). Looks up the order's `member_id` (skips guest orders),
  every `active` `bounce_back` program for the venue, computes each one's
  window from `paidAt = now()`, and issues via `issueMemberOffer` with
  `period_key = 'bounce_back:<order_id>'`. A program with neither
  `default_points_value` nor `default_value_cents` configured is skipped
  (not an error — the owner hasn't finished setting it up). A failure here
  is logged and does not turn a real payment into a 5xx Stripe would
  retry.
- `app/api/loyalty/appreciation-batch/route.ts` — owner-only, two-phase
  (dry run vs. `confirm: true`). Cohort membership comes from
  `member_status` (paginated past PostgREST's 1000-row cap, same pattern
  PLAN-36/37 already established); members already holding an `issued`
  offer from the program are excluded before the count is shown, so the
  number the owner confirms against is the number that will actually
  issue. The `confirm` gate is server-enforced: a call with `confirm:
true` but no prior preview still works (recomputes and checks the
  threshold itself), but anything above 50 recipients is refused unless
  `confirm: true` is explicitly set — a scripted caller can't skip the
  guard by only ever sending `confirm: true` blind, since the response
  always reports the real count either way for a caller that checks it.
- `app/api/counter/offer/route.ts` / `redeem-offer/route.ts` —
  lookup now returns `not_yet_valid`/`valid_from`; redeem translates
  `P0005` into calm JSON, distinct from expired/void.
- `app/counter/counter-screen.tsx` — a third rejection state ("Not quite
  yet — this one's good starting <date>"), visually distinct (muted, not
  the rose expired/void treatment) from expired/void, matching the design
  doc's "not an error, just early" framing.
- `app/pass/[serial]/page.tsx` — offers not yet valid show a muted code
  (not the terra "ready to use" color) plus "Good starting <date>" in
  plain language.
- `app/(owner)/loyalty/loyalty-client.tsx` — bounce-back program creation
  gained delay/window-days inputs with an inline example
  ("$5 back... = 3 and 11"); active appreciation programs gained a batch
  panel (cohort select → preview count → typed-number confirmation above
  50 → send), reusing the existing card/panel visual language rather than
  a new component family.

## Deliberate scope cuts

- No cron — bounce-back is entirely event-driven off the payment webhook.
- Win-back (`type = 'winback'`) is out of this PR; its send is blocked
  (v2R §8), and its mechanics would be near-identical to bounce-back's,
  better done once the send question is actually resolved.
- Appreciation's "already holds an unredeemed offer" de-dup is an
  application-level query, not a DB constraint — stated explicitly in the
  spec doc as a different rigor class from redemption idempotency, which
  does have the DB-level guarantee.

## Verification

- `npx tsc --noEmit` — clean.
- `npx next lint --max-warnings 0` — clean (the one pre-existing,
  unrelated `CreativeStudio.tsx` warning also present on `main`).
- `npm run build` — clean; `/api/loyalty/appreciation-batch` and every
  touched route register.
- Grep gate: zero `coffee-*`/`cream-*`/`dark-*` in this PR's files.
- **Not verified live.** No Supabase service-role key / MCP connection in
  this container — same honest gap as PLAN-12. Every claim above (the new
  unique index, the `P0005` boundary, the period-key dedup, the RLS-
  unaffected surface of the new columns) is argued from the SQL and the
  existing grant/RLS shape on `member_offers` (unchanged by this PR — no
  new table, no new grant), not fired against a real database. No
  `scripts/verify-live.mjs` check was added for this PR specifically: the
  existing PLAN-12 checks (anon/non-owner denied on `member_offers`
  insert, `redeem_member_offer` service-role-only) already cover the only
  RLS/grant surface this PR touches — adding new columns to an existing
  table changes no policy. The new `/api/loyalty/appreciation-batch`
  route's authorization is Next.js-level (`requireVenueRole`), which
  `verify-live.mjs` doesn't probe (it tests Supabase RLS/grants, not
  application routes).
- No live browser click-through: the bounce-back webhook path, the
  appreciation batch panel, and the counter's not-yet-valid state are all
  unexercised against a real database or browser in this session.
