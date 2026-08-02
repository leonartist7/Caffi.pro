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

[Architect-tier design note — allocation algorithm, remainder rule,
shift-attribution resolution, edge cases — inserted below once the
architect pass returns.]

## Non-goals

- No payout/payroll — see header.
- No wage rate, no tax withholding, no employment-status logic.
- No UI for the owner to configure a standing/default basis per venue —
  the owner picks a basis each time they run the report (matches "the
  venue hasn't chosen a default" not being a real state to handle, since
  there is no stored default at all).

## Acceptance (from the master plan, verbatim)

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
