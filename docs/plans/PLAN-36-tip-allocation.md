# PLAN-36 — Tip allocation report

Lane C, `MASTER-PLAN-v2R-remastered.md` §6. **Money-adjacent — architect-tier.**
v2R: "Executor: Fable 5 authors. This is compensation arithmetic... Sonnet
builds from Fable's spec; Fable reviews the allocation math pre-merge
regardless of builder." Fable 5 was unavailable in this environment
(requires usage credits not provisioned here); Opus 5 stood in for both
the authoring pass and the pre-merge review, per this lane's own
contingency plan for that exact situation.

**Read-only. No payout, no money movement, no rails.** This is bookkeeping
— a report of how a period's pooled tips _would_ divide. Moving money to a
worker is payroll, explicitly out of scope (v2R §8).

## Ground truth (verified live, `jjgccfrwjkwknyjtbtxa`, before any design work)

- `tip_allocations` already exists (an earlier migration, before Lane C
  started): `allocation_id` (PK), `venue_id` (FK venues), `shift_id`
  (**NOT NULL**, composite FK `(venue_id, shift_id) → staff_shifts`),
  `membership_id` (FK memberships), `period_start`/`period_end`
  (timestamptz, `CHECK (period_end >= period_start)`), `tip_cents`
  (`CHECK (>= 0)`), `basis` (`CHECK IN ('hours','equal','manual')`),
  `created_at`. RLS enabled, **zero policies** — service-role only, same
  shape as `push_subscriptions` (already covered by
  `scripts/verify-live.mjs`'s anon-denied + authenticated-non-owner-denied
  checks from PLAN-35's session). No migration needed in this PR — the
  algorithm populates this exact, already-live schema.
- **The load-bearing constraint**: `shift_id NOT NULL` means every
  allocation row must reference exactly one real shift — there is no
  "one row per membership per period" shape available. A staff member
  who worked multiple shifts in the period necessarily gets multiple
  rows. This is the crux question handed to the architect pass (see
  Design below).
- `staff_shifts` (PLAN-35): `shift_id, venue_id, membership_id,
started_at (not null), ended_at (nullable), source, note`. Duration for
  a closed shift = `ended_at - started_at`. Only closed shifts
  (`ended_at IS NOT NULL`) inside/overlapping the period are eligible —
  an open shift has no defined duration to allocate against.
- `orders`: `venue_id, status (CHECK IN ('pending','paid','accepted',
'preparing','ready','out_for_delivery','completed','canceled',
'refunded')), tip_cents, subtotal_cents, total_cents, created_at`. This
  is where the pooled tip money comes from — `SUM(orders.tip_cents)` for
  the venue and period, filtered per the architect's stated inclusion
  rule (see Design).
- `lib/money.ts` (PLAN-20-era): `dollarsToCents`/`formatCents` — the only
  existing money convention in the codebase, integer cents throughout,
  zero floats. This item's allocation math extends that convention; it
  does not invent a new one.
- No existing allocation/split arithmetic anywhere in the codebase to
  reuse — PLAN-20's QR-order tip split is a guest choosing their own tip
  amount at checkout, a completely different problem (one person picking
  one number) from splitting a pool across N staff. Confirmed by reading
  `lib/tips*`/`app/api/orders/tip-settings` — no allocation logic there.
- `requireVenueRole(venueId, ['owner'])` (owner-only, per v2R's acceptance
  line — manager and staff denied, tested) is the authz pattern, same
  `lib/authz.ts` helper every other venue-scoped route in this lane uses.

## Design

> Architect-tier design note. Authored by Opus 5 standing in for Fable 5
> (unavailable in this environment). The allocation math still requires
> an architect-tier review pre-merge, per the standing rule — same agent
> tier, second pass, before this PR leaves draft.

**Architectural constraint governing everything below**: all allocation
arithmetic lives in exactly one pure TypeScript module (`lib/tips/allocate.ts`),
zero Supabase imports. SQL fetches raw inputs (shift rows, a tip sum);
TypeScript does every clip, weight, division, and remainder. PLAN-37 calls
the _same_ function rather than re-deriving anything — satisfying "values
match row for row" by construction, not by two implementations agreeing.

**Zero-floats rule, made concrete**: no value representing money, a
proportion, or a weight is ever held in a non-integer JS `number`. The
allocation core uses `BigInt` for every multiply/divide/modulo. Forbidden
outside the display layer: `parseFloat`, `.toFixed(`, `* 0.01`, `/ 100`,
`Math.round` on a money value. `formatCents()` remains the sole float
boundary, display-only.

### 1. Order-status inclusion rule ("the pool")

```sql
pool_cents = SUM(orders.tip_cents)
WHERE orders.venue_id = :venue_id
  AND orders.placed_at >= :period_start AND orders.placed_at < :period_end  -- half-open
  AND orders.status IN ('paid','accepted','preparing','ready','out_for_delivery','completed')
```

Excluded: `pending` (not yet real money), `refunded` (PLAN-20: refunds
return the full `total_cents`, tip included — the guest got it back),
`canceled` (genuinely ambiguous — verified live that `transition_order_status`
allows `canceled` from any pre-terminal state and the counter cancel path
only lands there when no succeeded payment was found, so a `canceled`
order's money status can't be inferred). Excluded amounts are **displayed,
not hidden**: "Excluded from this pool: $X.XX on N canceled orders and
$Y.YY on M refunded orders" — a visible number, not a silent guess, with
the `manual` basis as the owner's override if they know better.

Period anchor is `placed_at` (business timestamp, never mutated by a
status transition — verified live it exists and defaults to `created_at`),
not `created_at`/`accepted_at`/`ready_at`. Boundaries computed at
venue-local midnight, stored as instants, compared half-open `[start, end)`
everywhere (orders and shifts alike) — the v2 §N3 boundary-bug class.

Known limitation, documented not solved: partial refunds are unrepresentable
today (the Stripe webhook defers reconciliation), so a partially-refunded
order's full tip stays in the pool. Flagged in the build log.

**Explicit non-model**: this is _pooled_ allocation, not per-order
attribution to whoever was on shift when that order was placed. `shift_id`
in `tip_allocations` is the required _output_ granularity, not an input
join key.

### 2. Shift attribution (the crux decision)

**Two-level allocation, uniform across all three bases.** Level 1 allocates
the pool across memberships by basis-specific weights. Level 2 allocates
each membership's exact Level-1 integer total across _that membership's
own shifts_, weighted by each shift's counted duration. Both levels use
the identical integer primitive (§3), so neither level can lose or invent
a cent — Level 2's pool is Level 1's exact output.

Rejected: one-pass (`shift's share = pool × shift_duration / total_duration_of_ALL_shifts`).
Wrong by definition for `equal`/`manual` (those are per-person, not
per-shift, splits — five short shifts would out-earn one long one). Even
restricted to `hours`, one-pass's per-person deviation from exact share
grows with shift count (bounded by ~shift-count/2 cents, not ±1),
correlating with part-time-vs-full-time scheduling — a bias in
compensation-adjacent output that two-level structurally avoids
(guarantee: `|allocated_total − exact_share| < 1 cent` per person, always).

Level-2 sub-distribution is **duration-proportional** (not evenly across
shifts — "$40 for your 2-hour shift and $40 for your 8-hour shift" is
indefensible; not longest-shift — destroys the per-shift signal PLAN-37
needs). Degenerate case: a member whose every counted shift has zero
duration falls back to equal weights (1 each) across their own shifts.

**Consequence surfaced in the UI**: because `shift_id NOT NULL`, a
membership with zero counted shifts in the period cannot receive any
allocation at all — not even on `manual`. The manual-basis input is
restricted to the computed roster, with an explanatory line if an owner
tries to allocate to someone with no recorded shift.

### 3. The shared primitive: `allocate(poolCents, units) → Map<unitId, cents>`

Largest-remainder (Hamilton) apportionment, integer-exact via `BigInt`:

```
W = Σ weights
if pool === 0 || W === 0: every unit -> 0
for each unit: prod = BigInt(pool) * BigInt(weight); base = Number(prod / BigInt(W)); rem = prod % BigInt(W)
R = pool - Σ base   // provably 0 <= R < #{units with rem > 0}
sort units by: rem DESC, weight DESC, id ASC (plain UUID text compare)
award +1 cent to each of the first R units
assert Σ result === pool
```

Proof sketch (stated so the zero-hours acceptance line is a proof, not a
hope): `pool·W = W·Σbase + Σrem`, so `R = Σrem/W < #{rem>0}` — the
remainder pass never reaches a unit with `rem = 0`, and in particular
never reaches a zero-weight unit. A zero-hours member gets exactly `0`
structurally, not via a special-cased branch. No division by a per-unit
weight ever occurs — the only divisor is `W`, guarded by the `W === 0`
branch above — so there is no reachable divide-by-zero.

`BigInt` is load-bearing, not stylistic: weights are integer milliseconds;
a 31-day period is `2.68e9` ms, a $10,000 pool is `1e6` cents, the product
reaches `~2.7e15` — within ~3x of `Number.MAX_SAFE_INTEGER`. `BigInt`
removes that overflow class entirely.

**Building the counted shift set** (shared by all three bases): shifts
with `ended_at IS NOT NULL` (open shifts excluded — see edge cases) that
overlap `[period_start, period_end)`, clipped to the intersection:
`counted_ms = min(ended_at, period_end) − max(started_at, period_start)`,
plain integer subtraction, no division. Roster = distinct membership_ids
in this set. **`memberships.is_active` is never filtered on** — a member
terminated after the period still worked the shifts and still earned the
tips; filtering on a current-access flag would silently zero a departed
worker's earnings, the single most damaging bug this feature could ship.

### 4. Per-basis algorithm

- **`hours`**: Level-1 weight per membership = sum of that membership's
  counted_ms. If the roster's total weight is `0` (shifts exist but all
  have zero measured duration): **refuse**, return
  `{ ok: false, reason: 'NO_MEASURABLE_HOURS' }` with a message pointing
  at the time clock — never silently fall back to `equal`.
- **`equal`**: identical to `hours` except every roster membership gets
  weight `1`. Pins down the semantics explicitly: equal means equal per
  _person present in the period_, not prorated by how much of the period
  they worked — a 20-minute shift and a 20-day one get the same period
  total. The UI must show each member's hours next to their `equal`
  figure so this consequence is visible before saving.
- **`manual`**: owner supplies non-negative integer **weights** (shares),
  not exact dollar amounts, restricted to the computed roster (absent
  members default to weight 0; weight 0 → exactly 0 cents, guaranteed by
  the primitive's postcondition). If all weights are 0, refuse
  (`NO_MANUAL_WEIGHTS`) — allocating a nonzero pool to nobody isn't valid.
  Weights over exact amounts for three reasons: (1) exactness by
  construction — reconciling owner-typed dollar figures to sum exactly to
  the pool is either a rejected-input support ticket or a silently-adjusted
  number, both wrong for compensation data; (2) one reviewable code path
  for all three bases; (3) pool-independence — weights stay valid if the
  pool moves (a late order settles, a refund lands) where exact amounts
  would silently go stale.

All three funnel through the same Level-1 → Level-2 → primitive pipeline.

### 5. Persistence and idempotency

Computation is pure and read-only; writing `tip_allocations` is a
**separate, explicit "Save this allocation" owner action**, never a side
effect of viewing. The save is atomic via a `SECURITY DEFINER` RPC
(service-role only): `DELETE FROM tip_allocations WHERE venue_id = :v AND
period_start = :s AND period_end = :e` (all bases for that period, not
just the one being saved — the table has no unique key preventing
duplicate accumulation across repeated saves, and exactly one basis can be
"the" answer for a period at a time) followed by inserting the fresh row
set. `allocation_id` is regenerated every save — never a stable key to
reference across saves.

Determinism means: identical _inputs_ → identical _outputs_, including
which unit gets each remainder cent — not that the numbers are frozen
forever. If a shift is corrected after a save, a recompute legitimately
differs. The report shows `computed_at`; viewing a period with an existing
saved snapshot recomputes live and flags drift ("saved on `<date>`;
recomputing now yields different figures — shifts or orders changed since")
rather than silently going stale.

### 6. Remainder rule, worked example

Sort by remainder DESC, then weight DESC, then unit id ASC (plain UUID
text compare) — a fully specified total ordering, applied identically at
both levels. $100.00 pooled, 3 staff, equal hours, `equal` basis: `base =
3333` each, `Σbase = 9999`, `R = 1`; all three remainders and weights tie,
so the lexicographically-smallest membership_id gets the extra cent →
`3333/3333/3334 = $100.00` exactly. UUIDv4 ordering carries no correlation
with any human attribute (unlike alphabetical-by-name or created_at, both
of which would systematically favor some group) — the arbitrary tie-break
is a deliberate feature, not a gap. One honest caveat for the build log:
on `equal`, remainders always tie, so the _same_ member gets the stray
cent every period (≤1¢/period, ~12¢/year) — accepted for auditability
over a rotating hash tie-break that would be harder to explain to an
accountant.

### 7. Edge cases

| Case                                                          | Rule                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Zero-hours member, `hours` basis                              | Exactly `0`, structurally (§3's proof) — never `NaN`.                                                                                                                                                                                                                                                                                      |
| Roster's total hours = 0, pool > 0                            | Refuse (`NO_MEASURABLE_HOURS`), never silently fall back to `equal`.                                                                                                                                                                                                                                                                       |
| Zero shifts in period, pool > 0                               | Refuse (`NO_SHIFTS_IN_PERIOD`) — `shift_id NOT NULL` means nothing can be written.                                                                                                                                                                                                                                                         |
| Zero shifts, pool = 0                                         | Valid empty report: `{ ok: true, rows: [] }` — PLAN-37 still emits headers.                                                                                                                                                                                                                                                                |
| Zero pool, shifts present                                     | Persist the full row set at `tip_cents = 0` — self-describing ("we ran this, the answer was zero"), keeps PLAN-37 branch-free.                                                                                                                                                                                                             |
| Shift crosses period boundary                                 | Clip to the intersection (never exclude, never count whole) — the only rule under which adjacent periods partition cleanly with no gap or overlap.                                                                                                                                                                                         |
| Open shift overlapping period                                 | Excluded from the counted set (no measurable duration; clipping to `period_end` would fabricate hours from a forgotten clock-out). Never silent: warns with name + started_at; **blocks saving** for a historical period until closed/corrected via PLAN-35; a still-running period is labelled "Provisional — this period has not ended." |
| Two closed shifts overlapping each other (manual-entry error) | Detect and warn, never auto-merge — silent deduplication changes what a worker appears owed.                                                                                                                                                                                                                                               |

### ESCALATE TO HUMAN — asked, no answer received, resolved via the architect's own sanctioned fallback

**The question the architect raised**: should `owner`/`manager` memberships
participate in the tip-pool roster by default? Flagged as a genuine
policy/legal question, not an engineering one — tip-pool participation by
supervisors is restricted in many jurisdictions this platform serves, and
the choice moves a whole share of the pool (not cents) either direction.
I asked the user directly (`AskUserQuestion`); no answer was returned.

**Resolution, per the architect's own explicit instruction for exactly
this situation** ("do not ship a hard-coded default... until this is
answered"): **force an explicit choice, every time, with no stored
default.** The report will not compute any allocation until the owner has
clicked either "Include owner/manager" or "Exclude owner/manager" for
that run — never a pre-selected radio, never a silently-applied default.
This is not me picking the policy answer; it's refusing to let the system
pick it silently, which is the one thing explicitly ruled out regardless
of which way the real answer eventually goes. Every allocation row carries
and displays the member's `role`, and the report/export both record which
choice produced the figures, so nothing about eligibility is hidden.
Decided-but-flagged items (`canceled` orders excluded from pool, open
shifts excluded, `equal` not prorating by time-in-period) are each
surfaced in the UI per the design above rather than treated as silent
defaults, for the same reason.

## Non-goals

- No payout/payroll — see header.
- No wage rate, no tax withholding, no employment-status logic.
- No UI for the owner to configure a standing/default basis per venue —
  the owner picks a basis each time they run the report (matches "the
  venue hasn't chosen a default" not being a real state to handle, since
  there is no stored default at all).

## Acceptance (from the master plan, verbatim, plus this doc's own additions)

- [ ] Owner/manager tip-pool participation has **no stored or pre-selected
      default** — the report requires an explicit include/exclude choice
      before computing, every run (resolution of the escalated question
      above).
- [ ] Every allocation row displays the member's `role`.

- [ ] Hours-basis allocation sums **exactly** to the period's total tips —
      no cent lost, no cent invented. Remainder distribution rule stated
      in the build log and tested with a deliberately indivisible amount.
- [ ] Equal-basis and manual-basis each also sum exactly.
- [ ] A staff member with zero hours receives zero on the hours basis (not
      `NaN`, not a divide-by-zero).
- [ ] All arithmetic in integer cents via `lib/money.ts`; **zero float
      operations** (grep-verifiable).
- [ ] Re-running the report for the same period returns identical numbers.
- [ ] The "not a payroll record" notice renders on the report and in any
      export.
- [ ] Only `owner` can view; `manager` and `staff` are denied and the
      denial is tested.
- [ ] **Design bar** (§2), `aro` tokens only, `npm run build` +
      `tsc --noEmit` green.
