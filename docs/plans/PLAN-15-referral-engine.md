# PLAN-15 — Referral engine

Lane A, `MASTER-PLAN-v2R-remastered.md` §6. Executes `MASTER-PLAN-v2` §N5
as written — both loops, all six numbered steps — with the one delta
v2R's own text specifies: the referrer's credit issues through PLAN-12's
`member_offers` when the program config asks for a value reward, and
through `points_ledger` when it asks for points. Same once-only guarantee,
one engine.

**Mandatory architect-tier pre-merge review of the once-only-credit logic**
(v2 §7, inherited unchanged) — done as a dedicated second pass in this
session, findings below.

## Design

**Reward moment is the referred member's first visit, never their join.**
Joining is free to farm; a first visit requires a human at a counter, so
anchoring the reward there makes fraud unprofitable by design. The single
hook point is `app/api/counter/visit/route.ts` — the only place in this
codebase that inserts a `visits` row — checked for `wasNew && count === 1`
(both computed by that route already, not re-derived).

**Once-only is a database fact, not a timing assumption.** Two concurrent
"first visit" calls for the same member (two staff scanning the same new
customer moments apart, or a client retry racing the read) can both reach
`creditReferralOnFirstVisit` — the `count === 1` check reads the row count
in a separate query from the insert, so it is not itself atomic. This is
by design, not an oversight: the DB-level partial unique index is what
actually prevents a double credit, not the application check, which only
needs to be a reasonable approximation of "first visit" to keep the common
case cheap. Two structural guarantees, one per reward shape:

- **Points path**: new `points_ledger.referred_member_id` column +
  `uq_points_ledger_referral_award` (`WHERE referred_member_id IS NOT NULL
AND reason = 'referral'`) — at most one referral credit row per
  **referred** member (not per referrer — a member can only have one
  first visit, so that's the correct key). A second concurrent insert
  hits `23505`, treated as idempotent success, the exact pattern
  `/api/counter/visit` itself already uses for its own `client_uuid`
  index.
- **Value path**: reuses PLAN-13's `member_offers` `period_key`
  (`'referral:<referredMemberId>'`, scoped by `program_id, member_id`) —
  no new mechanism.

**No credit fires without an active `referral` program.** v2's original
text (`loyalty_config.referral_points`) predates PLAN-12's engine; this
reads `loyalty_programs.config` like every other Lane A type. An owner
who hasn't configured a referral program gets zero referral credits, not
a hardcoded default reward — consistent with the whole library's "nothing
fires without configuration on the engine" doctrine established since
PLAN-12.

**Join capture** (`app/api/join/route.ts`): `ref` (a referrer's
`pass_serial`) resolves scoped to the venue looked up in the same
request — a cross-venue or unknown ref simply doesn't resolve to a row
and is silently ignored, never fails the join. Only written on a
genuinely new member (`referred_by_member_id` set inside the same
`INSERT`); an existing member re-joining via a referral link is
unaffected. **Self-referral is structurally unreachable**: `ref` is
resolved to a member row _before_ the new member exists, so it can never
equal the new member's own (not-yet-created) id — no runtime guard
needed for a case the sequencing itself rules out.

**Owner loop is out of scope for this repo.** v2 §N5 step 5 (AURA
diagnostic URL, `ref=<venue slug>`, forwarded into the leads inbox) needs
a one-line change in the AURA repository, which this session does not
have access to — and R1 (AURA lead-forwarding fix) is itself still
"not done" per `STATUS.md`. Flagged rather than guessed at or stubbed
with a fake integration.

## Architect-tier review findings (this session, second pass)

- **Fixed before merge**: the points-path insert originally set
  `transaction_id: crypto.randomUUID()` redundantly — `points_ledger
.transaction_id` already has `DEFAULT uuid_generate_v4()` at the
  column level (confirmed via `aro_schema.sql`), and no other app-code
  insert into this table sets it explicitly. Removed; harmless either
  way, but dead code in a money-adjacent path gets removed, not left.
- **Confirmed, not changed**: the two race scenarios above (concurrent
  first-visit calls; a program-config insert racing a redemption) both
  resolve to "at most one write" via the partial unique indexes, not the
  application's own sequencing — verified by reading the index
  definitions and the `23505`-as-idempotent-success handling directly,
  the same standard PLAN-12's own audit applied.
- **Known edge case, not fixed (low severity, flagged)**: if a venue ever
  has _two_ active `referral`-type programs simultaneously,
  `.maybeSingle()` on the program lookup errors (PostgREST rejects
  multiple rows), and `creditReferralOnFirstVisit` silently issues no
  credit rather than picking one or crediting twice. Fails toward "no
  reward," never toward "double reward" — the correct failure direction
  for a money-adjacent path — but worth an owner-facing guard (e.g. a
  partial unique index on `loyalty_programs(venue_id, type) WHERE status
= 'active' AND type = 'referral'`) in a follow-up if this ever proves
  reachable in practice. Not added here to avoid constraining every other
  program type's "can an owner run two active bounce-backs" question
  this PR was never asked to answer.

## ✅ Acceptance (v2 §N5 verbatim, plus §2 design bar)

- [ ] Referred join records the referrer; self-referral and cross-venue
      refs are silently ignored; the join never fails because of a bad
      ref.
- [ ] Referrer credited exactly once, on first visit only — proven by
      replaying the same first-visit call and by a second visit (no
      double credit either way).
- [ ] Ledger rows carry `reason = 'referral'`.
- [ ] Share block works pre-hydration (plain link fallback), Web Share on
      mobile, clipboard on desktop.
- [ ] Owner-referred lead arrives with attribution visible in the inbox —
      **not buildable in this repo**; needs the AURA-side change (out of
      scope, flagged above).
