# PLAN-16 — Survey promotions

Lane A, `MASTER-PLAN-v2R-remastered.md` §6. A short (3–5 question)
owner-authored survey reachable from the pass; completion issues an
offer via PLAN-12's engine. The reward is for completing, never for a
particular answer — pay for the response, not the rating.

## Design

**No schema change.** `survey_responses` (PLAN-10) already has exactly
the shape this needs: `uq_survey_responses_program_member` (`program_id,
member_id) WHERE member_id IS NOT NULL`) is the DB-level "one response
per member per survey" guarantee, and `member_id` is already nullable so
an anonymous response is a first-class row, not a special case, and is
automatically excluded from that unique index by its own `WHERE` clause —
the acceptance line about anonymous responses is satisfied structurally
by schema PLAN-10 already shipped, not by anything this PR adds.

**Questions live in `loyalty_programs.config.questions`** — a small JSON
shape (`lib/loyalty/survey.ts`'s `SurveyQuestion`), validated by a pure
function before it's ever trusted, both at program-creation time (owner
UI) and at submission time (so a hand-crafted POST against a malformed
config fails loudly instead of writing a response nobody can read back
correctly).

**Completion issues exactly one offer**, gated on the response insert
itself succeeding — a replayed submit hits `survey_responses`'s own
unique index (`23505`, treated as "already responded," not an error) and
never reaches the issuance call. The offer issuance is additionally
gated by `period_key = 'survey_completion'` (`member_offers`), so even a
route restructure that called `issueMemberOffer` from two places
couldn't double-issue — belt and suspenders, not load-bearing on its own.

**Free-text answers are shown verbatim, never routed through any AI
surface** — the results route (`/api/loyalty/survey-responses`) returns
raw `answers` JSONB exactly as submitted; nothing in this PR summarizes,
rewrites, or forwards a response anywhere else.

## Honest scope gap

The acceptance line asks for "per-question aggregates" in the results
view. What shipped is a verbatim list of every response (satisfying the
free-text-verbatim requirement exactly), **not** a per-question
aggregation (e.g. a count-per-choice-option breakdown for `choice`
questions). Building that well needs the question schema joined back
against the response rows in a way that's worth its own pass rather than
a rushed bar-chart bolted onto this PR — flagged here rather than shipped
half-done.

## Non-goals

- No survey delivery beyond the pass — no email/SMS nudge to complete it
  (blocked, same as every other Lane A send).
- No anonymous survey entry point beyond what the pass surfaces — the
  schema supports an anonymous row, but no public (non-pass) survey URL
  was built; "reachable from the pass" is the stated scope.

## ✅ Acceptance

- [ ] One response per member per survey, enforced at the DB (PLAN-10's
      unique index, unchanged) — not in the route.
- [ ] Completion issues exactly one offer; replaying the submit issues
      zero more.
- [x] Results view shows per-question aggregates — **partial**: verbatim
      list ships, aggregation does not (see gap above).
- [x] Free-text answers are shown verbatim and never fed to any AI
      surface.
- [x] Anonymous responses are possible and excluded from the per-member
      unique — structural, from PLAN-10's schema.
- [ ] Design bar (§2). `npm run build` + `tsc --noEmit` green.
