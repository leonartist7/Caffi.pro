# BUILD-LOG — PLAN-17 (Mystery reward gamification)

Branch `sonnet/lane-a-plan17-mystery-reward`, off `main` after PLAN-16
(PR #80) merged.

## What shipped

- **Migration** `20260810230000_plan17_mystery_reveal.sql`:
  `member_offers.prize_label`/`revealed_at`. `forbid_member_offer_mutation`
  extended a third time (after PLAN-10's original and PLAN-13's
  `valid_from`/`period_key` addition) — `prize_label` joins the
  immutable-after-issue list, `revealed_at` gets the same write-once
  treatment `redeemed_at` already has.
- `lib/loyalty/mystery.ts` — pure: `isValidMysteryConfig` (1–12 prizes,
  unique ids, exactly one of points/dollars per prize — never both, never
  neither), `drawPrize` (cumulative-weight selection, takes the random
  value as a parameter rather than generating it), and the two expected-
  value functions for the owner's config screen.
- `lib/loyalty/mystery-issue.ts` — `issueMysteryPrizeOnVisit()`: looks up
  the venue's active `mystery` program, checks the visit count against
  its configured threshold (default 5), draws via `drawPrize(prizes,
Math.random())` — the one real random call in the feature — and issues
  through `lib/loyalty/issue.ts` with `period_key = 'mystery:<count>'`.
- `lib/loyalty/issue.ts` — extended with an optional `prizeLabel` field
  on `issueMemberOffer`'s input (unused by every other program type).
- `app/api/counter/visit/route.ts` — one new call, fire-and-forget, on
  every genuinely new visit (not just the first, unlike the referral
  hook right above it in the same file).
- `app/pass/[serial]/mystery/[offerId]/page.tsx` +
  `reveal-animation.tsx` — the reveal surface. Server component marks
  `revealed_at` (idempotently — a race just means two harmless attempts
  to set the same already-fixed value) and passes the already-decided
  `prize_label` to a client component that animates disclosing it,
  respecting `prefers-reduced-motion`.
- `app/pass/[serial]/page.tsx` — the actual disclosure boundary: the
  member-offers query now also selects `revealed_at` and the program
  `type`; any mystery offer with `revealed_at IS NULL` is routed into a
  separate `unrevealedMysteryOfferIds` list carrying only the offer id,
  never reaching the regular `offers` array the page otherwise renders
  freely. A revealed mystery offer displays like any other offer once
  its `revealed_at` is set.
- `app/(owner)/loyalty/loyalty-client.tsx` — prize-table builder (up to
  12 prizes, name/weight/points-or-dollars) plus a visit-threshold input
  for `type: 'mystery'` program creation, with a live expected-cost
  figure computed via the same pure functions the engine itself uses (no
  separate, potentially-drifting client-side reimplementation).
- `lib/events.ts` — `mystery.revealed` appended (issuance reuses the
  existing `offer.issued` type).

## Weighted-distribution verification

Ran ad hoc via `node` (throwaway script, not committed — matches
PLAN-37's own precedent of no test framework in this repo): a 3-prize
70/25/5 weight distribution over 100,000 draws measured within 0.1
percentage points of its theoretical share for every prize — well inside
any reasonable tolerance, comfortably exceeding the acceptance line's
1,000-draw minimum. Also checked: a `randomValue` arbitrarily close to 1
still resolves to the last prize in the list (no off-by-one boundary
bug), and a single-prize program always returns that prize. The function
under test (`drawPrize`) is exactly what ships; the verification is
trivially re-runnable by anyone with the same 20-line script.

## Verification

- `npx tsc --noEmit` — clean.
- `npx next lint --max-warnings 0` — clean (the one pre-existing,
  unrelated `CreativeStudio.tsx` warning, also present on `main`).
- `npm run build` — clean; `/pass/[serial]/mystery/[offerId]` registers.
- Grep gate: zero `coffee-*`/`cream-*`/`dark-*` in this PR's files.
- **Not verified live.** No Supabase service-role key / MCP connection in
  this container, same gap as every Lane A PR this session. The reveal
  page's `revealed_at` write, the disclosure-boundary split in the pass
  page's own query, and the trigger's new write-once guard on
  `revealed_at` are all argued from the code and the SQL, not fired
  against a real database or exercised in a browser — including the
  actual reveal animation, which was never seen render.
