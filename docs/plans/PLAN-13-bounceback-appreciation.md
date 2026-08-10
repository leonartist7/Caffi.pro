# PLAN-13 — Bounce-back + appreciation

Lane A, `MASTER-PLAN-v2R-remastered.md` §6. The two highest-value
zero-vendor program types run end-to-end on PLAN-12's engine (merged to
`main`, PR #76): _bounce-back_ (a paid order issues an offer valid in a
future window — "$5 back when you return between day 3 and day 14") and
_appreciation_ (an owner hand-approves a batch issue to a `member_status`
cohort).

## Design

**The window is the mechanism.** An offer with no dead period is a
discount, not a bounce-back — so this PR's real schema work is adding
`valid_from`/`period_key` to `member_offers` (PLAN-12 shipped `expires_at`
only) and teaching `redeem_member_offer()` a new boundary: not-yet-valid,
its own `ERRCODE` (`P0005`), never conflated with expired/void.
`period_key` (unique per `program_id, member_id`) is the DB-level "don't
double-issue" guarantee every later automatic-issuance PLAN item
(14/16/17) will reuse — designed once here, not per-item.

**Bounce-back issues from the Stripe webhook**, at the exact point
`record_order_payment_success`'s `applied: true` already gates
points-award and depletion (`app/api/webhooks/stripe/route.ts`) — the
authoritative "this order just became paid, for real, not a replay"
boundary already proven live by PLAN-20/24. `period_key =
'bounce_back:<order_id>'` is a second, independent guard against the same
replay on top of (not instead of) that boundary. Guest orders
(`member_id IS NULL`) issue nothing — there's no pass to hold the offer.

**Appreciation issues from an owner-triggered batch route**
(`/api/loyalty/appreciation-batch`, owner-only — stricter than the single-
issue panel's owner+manager, matching the higher blast radius). Two-phase:
a dry run returns the exact recipient count, a `confirm: true` call above
50 recipients is rejected unless the count matches what a client already
saw — the route itself enforces the fat-finger guard, not just the UI.
"Don't double-issue to a member already holding an unredeemed offer from
the program" is an **application-level** exclusion (query existing
`status = 'issued'` rows, subtract from the cohort before issuing) — this
is a duplicate-offer convenience for an infrequent, supervised action, not
a money-correctness guarantee, so it's stated as such rather than given
the DB-constraint bar redemption itself has.

## Non-goals

- No cron for bounce-back — it's event-driven off the payment webhook, not
  time-driven.
- Appreciation cohort issuance is owner-triggered only; no scheduled
  "appreciate weekly" automation.
- Win-back (`type = 'winback'`) is not this PR — v2R marks its mechanics
  buildable but its send blocked; PLAN-13 only builds the two send-free
  types.

## ✅ Acceptance (from the ground-truth doc)

- [ ] A paid order issues exactly one bounce-back offer when the program
      is active, and zero when paused.
- [ ] The offer is not redeemable before `valid_from` and not after
      `expires_at`; both boundaries enforced in the DB.
- [ ] Batch issue shows the exact recipient count before committing, and
      requires typed confirmation above 50 recipients.
- [ ] Re-running the same batch does not double-issue to a member who
      already holds an unredeemed offer from that program.
- [ ] Offers appear on `/pass/[serial]` with the window stated in plain
      language.
- [ ] Design bar (§2). `npm run build` + `tsc --noEmit` green.
