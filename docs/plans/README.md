# Execution plans — ranked by leverage (2026-07-09)

Written for a less-capable model to execute without questions. Each plan:
goal, exact files, ordered steps, the edge cases that actually bite, and
verifiable acceptance criteria. House rules from `docs/audit/REBUILD-PLAN.md`
apply to all (screenshot proof, visible stubs, build stays green, commit per
work item, push to `claude/caffi-aura-audit-plan-dgr8wy`).

| #   | Plan                                                        | Why this rank                                                                                                                     |
| --- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | [PLAN-live-supabase-bringup](PLAN-live-supabase-bringup.md) | Everything else is theory until the schema/RLS/seed run against the real project. Unblocks all. Needs owner for keys.             |
| 2   | [PLAN-diner-join-page](PLAN-diner-join-page.md)             | The missing half of the product; starts the loop; also lands the aro brand tokens every later screen reuses.                      |
| 3   | [PLAN-counter-two-tap](PLAN-counter-two-tap.md)             | Loop middle: visits + redemptions actually get recorded; the staff-adoption make-or-break.                                        |
| 4   | [PLAN-owner-home-regulars](PLAN-owner-home-regulars.md)     | Loop end: the ONE number + fading list — the screens that prove value and retain the owner. Wants 2–3's real data.                |
| 5   | [PLAN-leads-pipeline](PLAN-leads-pipeline.md)               | Smallest, independent after 1: stops throwing away real sales leads (the oldest P0). Slot it whenever a session has spare budget. |

Order is strict for 1→2→3→4 (each consumes the previous one's output).
5 can run in parallel with any of 2–4.

## Deferred: Restolabs feature-parity request (2026-07-10)

A competitor feature scan (Restolabs — ordering, delivery, POS, website,
native app) was evaluated against this roadmap and deliberately deferred.
Decision: stay loyalty-first, prove Plans 1–5 with real venues first. See
[PHASE-6-COMMERCE-CANDIDATES.md](PHASE-6-COMMERCE-CANDIDATES.md) for the full
gap list and re-evaluation trigger. Plans 2 and 4 got small alignment notes
(no scope change) documenting which Restolabs items they already satisfy.
