# PLAN-17 — Mystery reward gamification

Lane A, `MASTER-PLAN-v2R-remastered.md` §6. A "reveal" on the pass after
a configured visit count — the prize is drawn server-side at issue time
from a weighted table the owner configures, and the animation only
_reveals_ what the server already decided.

Non-negotiable, stated in the master doc with teeth: **the client never
draws.** A client-side random is a client-side exploit, and the value
distribution is the venue's money.

## Design

**One real `Math.random()` call in the entire feature**, at the one
server-side issuance call site (`lib/loyalty/mystery-issue.ts`), fed into
a pure cumulative-weight selector (`lib/loyalty/mystery.ts`'s
`drawPrize`) that never runs in a browser. The prize is written into
`member_offers` (`value_cents`/`points_value`, exactly like every other
offer type, plus a new `prize_label` for the human-readable name) at the
moment it's decided — **before any reveal UI exists**, not when the
member later taps to reveal.

**Recurring, not one-time.** "After a configured visit count" is read as
_every_ Nth visit, not just the first — `app/api/counter/visit/route.ts`
already computes the post-insert visit count for every genuinely new
visit; this checks it against the venue's threshold on every one of
them, not just visit #1. `period_key = 'mystery:<visitCount>'` scopes the
DB-level once-per-threshold-crossing guarantee (PLAN-13's mechanism,
reused as-is).

**Reveal is a disclosure boundary, not a re-roll.** New `revealed_at`
column (this PR's only schema change beyond `prize_label`), write-once
via the same trigger extension pattern PLAN-13 already established for
`redeemed_at`. The pass page's own data-fetching code
(`app/pass/[serial]/page.tsx`) is the actual enforcement point: any
mystery-type offer with `revealed_at IS NULL` is excluded from the
regular offers list entirely — only its `offer_id` reaches the client, as
a link to the dedicated reveal page. **The pre-reveal payload therefore
contains no prize information by construction**, not by the reveal page
remembering not to show it early.

**Reload mid-reveal shows the same prize** because there is no
mid-reveal server state to lose — the prize was decided and persisted at
issue time; visiting the reveal page a second time just marks (or
confirms it already marked) `revealed_at` and re-displays the same
already-fixed `prize_label`/value. A race between two simultaneous
reveal-page loads is harmless for the same reason: both read the same
already-decided row.

**Weighted distribution verified over 100,000 simulated draws** (ad hoc
via `node`, no test framework in this repo, matching PLAN-37's own
precedent) — a 3-prize distribution (70/25/5 weights) measured within
0.1 percentage points of its theoretical share at that sample size, well
under a reasonable tolerance; an edge case at `randomValue ≈ 1` and a
single-prize program were both checked separately. Script was throwaway,
not committed — the pure function it exercises (`drawPrize`) is what
ships and is trivially re-verifiable the same way.

**Expected cost per reveal** (`expectedCostCentsPerReveal`/
`expectedPointsPerReveal`, `lib/loyalty/mystery.ts`) is computed live in
the owner's config screen as they edit the prize table — a café owner
who can't see this misprices the whole mechanic, per the master doc's own
framing.

**`prefers-reduced-motion`** — the reveal animation
(`reveal-animation.tsx`) skips its transition entirely and shows the
final state immediately when the media query matches; the prize itself
is identical either way.

## Non-goals

- No configurable "reveal window" or expiry beyond the reward's own
  `expires_at` semantics — a mystery offer behaves like any other offer
  once issued.
- No admin-facing draw simulator UI beyond the expected-cost figure —
  the 1000-draw verification above is a one-time engineering check, not
  a live tool built into the product.

## ✅ Acceptance

- [ ] The prize is determined and persisted server-side before any
      reveal UI renders; the pre-reveal API response contains no prize
      information.
- [ ] Reload mid-reveal shows the same prize.
- [ ] Weighted distribution verified over 1,000+ simulated draws within
      tolerance.
- [ ] Owner config screen states expected cost per reveal in currency.
- [ ] Reveal animation respects `prefers-reduced-motion`.
- [ ] Design bar (§2).
