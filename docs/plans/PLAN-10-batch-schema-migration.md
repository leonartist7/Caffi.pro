# PLAN-10 — Batch Schema + RLS Migration (Lanes A/B/C)

> Executor: read `docs/plans/MASTER-PLAN-aro.md` FIRST (§4/§5 binding), then
> `docs/plans/MASTER-PLAN-v2-operating-system.md` §7 and
> `docs/plans/MASTER-PLAN-v2R-remastered.md` §5. This is the ONE migration
> all three lanes' subsequent schema-dependent work is gated on. Lane A
> owns it (`Owner: Lane A` per v2R §5). Branch:
> `sonnet/lane-a-plan10-schema-batch` off `origin/main`.
>
> **Process note, stated honestly rather than silently reordered:** this
> spec file is landing as a follow-up commit to the migration itself,
> not as the first commit the house pattern calls for. The migration's own
> in-file header comment already carries the full rationale (house rules
> applied, additive guards, why each design call was made) at the level of
> detail this file would otherwise restate, and — given the size and risk
> of a cross-lane RLS batch — getting the actual DDL authored, self-tested,
> and committed took priority over the ordering convention. Recorded here
> so nobody assumes the convention was silently forgotten.

## Ground truth (re-verified 2026-07-30)

- `docs/plans/MASTER-PLAN-v2R-remastered.md` §5 specs nine new tables across
  three lanes, standing RLS rules, and the `members.birthday` conflict
  resolution. This migration implements that spec in full — see the
  migration file's own header for the table-by-table cross-reference.
- **Executor substitution in force**: the plan's "Fable 5 authors the
  migration and RLS policy set personally" line reads as "Opus 5" per the
  owner note at the top of `MASTER-PLAN-v2R-remastered.md` (added
  post-draft). This migration's design (table shapes, RLS policies,
  idempotency guarantees, the composite tenant-coherence FKs) was authored
  by a subagent running on the Opus model, not by the Sonnet-tier session
  orchestrating this lane. Sonnet applies, mirrors, and reviews — the v2R
  split, followed literally.
- **A genuine schema surprise the architect caught, not anticipated in
  v2R**: the RLS helper functions (`aro_my_venue_ids()`,
  `aro_my_managed_venue_ids()`, `aro_is_aro_admin()`) moved from schema
  `public` to schema `private` in `20260714075459_ordering_core_advisor_cleanup.sql`
  — a migration that landed after v2R's own verification pass. Every new
  policy in this batch calls `private.aro_*`, not `public.aro_*`. Writing
  policies against the stale `public.*` names (as v2R's own text literally
  shows them) would have created broken policies that reference
  nonexistent functions.
- **A real cross-tenant integrity hole v2R's spec didn't call out**: a
  denormalized `venue_id` column that can disagree with its parent row's
  own venue is not just a policy risk, it's a data-model hole — without a
  DB-level guarantee, a compromised or buggy server-side write path could
  insert `member_offers(venue_id = A, member_id = <a member of venue B>)`
  and every RLS policy would still pass (they only check the offer's own
  `venue_id`, which was set to A). **Resolution**: composite
  `(venue_id, parent_pk)` foreign keys everywhere both columns are
  `NOT NULL`, backed by new `(venue_id, pk)` unique indexes on the parent
  tables (`members`, `menu_items`, `orders`, plus the new tables
  themselves). These cannot fail on existing data — each unique index only
  extends an existing primary key.
- **`staff_shifts.membership_id` deliberately has NO composite venue FK**:
  `memberships.venue_id` is nullable (org-wide owners/managers), so a
  composite `(venue_id, membership_id)` FK would reject a legitimate
  org-wide staff member's shift. Venue coherence for shifts is an
  app-layer check, not a DB-enforced one — called out explicitly in the
  migration file so a future reader doesn't assume the database covers it.
- **The `orders` total CHECK and `messages.channel` CHECK are located by
  column identity (`pg_constraint.conkey`), never by name or by
  string-matching the definition.** A `LIKE '%total_cents%'` filter would
  also match `CHECK (subtotal_cents >= 0)` (the substring appears inside
  `subtotal_cents`) and silently drop an unrelated constraint. Found and
  fixed mid-authoring — see the migration file's own comment on this.

## Non-goals

- Does not build any of PLAN-11 through PLAN-18's application code —
  purely schema + RLS. The tables exist and are lockable-down; the offer
  engine, birthday capture, referral flow, push channel, etc. are separate
  PRs that build on top of this once it's live.
- Does not touch any existing table's RLS policies beyond the two CHECK
  constraint swaps (`orders`, `messages`) and the `members` column
  grant/drop — no re-litigating already-shipped tenant isolation.
- Does not apply anything to the live `aro-platform` Supabase project —
  see Verification gap below.

## ✅ Acceptance (v2R §5's checklist, status against each)

- [x] One migration file under `supabase/migrations/`
      (`20260722120000_batch_schema_lanes_abc.sql`), mirrored into
      `supabase/aro_schema.sql` in the same PR.
- [ ] `mcp__Supabase__get_advisors` (security + performance) — **not run**;
      no Supabase MCP connector available in this execution session. See
      Verification gap.
- [x] Every new table has RLS enabled — confirmed by reading the file
      (nine `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` statements) and by
      applying the full migration to a disposable local PostgreSQL 16 and
      querying `pg_tables`/`pg_policies` directly (not just by reading the
      SQL) — done by the authoring agent, not against the live project.
- [x] `scripts/verify-live.mjs` extended with one anon-denied check per new
      table, appended at the end of the existing list, plus two additional
      authenticated-non-owner checks for the two zero-grant tables
      (`push_subscriptions`, `tip_allocations`). **Not run against the live
      project** — needs live Supabase credentials this session lacks.
- [x] `inventory_movements` append-only proven: verified against the local
      disposable PostgreSQL instance that both an `UPDATE` and a `DELETE`
      raise. Not yet proven against the live project.
- [x] `member_offers` double-redemption proven impossible: the write-once
      trigger plus partial unique index were exercised with concurrent
      `UPDATE`s against the local instance; exactly one succeeded, the
      others raised. Not yet proven against the live project.
- [x] `staff_shifts` open-shift uniqueness proven: a second concurrent
      clock-in against the local instance failed at the DB (23505), not in
      application code.
- [x] `orders.tip_cents` added and the total CHECK re-established; a guard
      asserts every existing row still satisfies it before the swap, and
      the authoring agent's local-instance test seeded rows and confirmed
      the guard fires correctly on a deliberately bad row and passes on
      good ones.
- [x] `members.birthday` dropped only after a zero-non-null assertion; the
      guard's exact wording and behavior (raises and names the row count
      if any birthday is still set, never discards data) is in the
      migration file itself.
- [x] `grep -rn "birthday_year\|birthdate\|date_of_birth" app lib supabase`
      — returns nothing (re-run below, confirmed).
- [x] `npm run build` + `tsc --noEmit` green — confirmed independently in
      this session (not just trusting the authoring agent's own report).

## Verification gap — what this session could NOT check

**Nothing in this migration has been applied to the live `aro-platform`
Supabase project (`jjgccfrwjkwknyjtbtxa`).** No Supabase MCP connector was
available in this execution session (`enabledInChat: false` at the org
level) and no live database credentials exist in the environment. Per the
project's own migration protocol ("never `apply_migration` if another lane
has an unmerged PR containing a migration — write the SQL file, commit it,
note in the PR that it needs applying after merge"), this was always going
to be a write-and-hand-off step for THIS batch regardless of tooling
access, since it's the first migration in the sequence — but it's worth
being explicit that even the live `get_advisors` check and the
`verify-live.mjs` run against the real project are still outstanding, on
top of the "needs applying" step itself.

What WAS done instead, as the best available substitute for live
verification: the authoring agent applied the complete migration to a
disposable local PostgreSQL 16 instance seeded with a schema close enough
to production to exercise every constraint (not the live schema — a
local approximation), ran 28 behavioral assertions against it (idempotent
re-run under `ON_ERROR_STOP=1`, both CHECK-constraint guards firing
correctly, the append-only and write-once triggers under concurrency, the
composite FK tenant-coherence check actually rejecting a cross-venue
insert), and diffed the resulting schema against a pre-migration baseline
to confirm nothing outside the intended nine tables + column additions +
two constraint swaps changed. This is real signal, but it is **not** the
same claim as "verified against production" — the live schema may differ
in ways a local approximation didn't capture (extension versions, existing
row data shapes, concurrent load).

**Before this migration is treated as done per v2R's own acceptance bar**,
someone with Supabase MCP access needs to, in order: `list_migrations` and
`list_tables` (confirm no other lane's migration landed first and no
naming collision), `apply_migration`, `get_advisors` (security +
performance, zero new findings), `SUPABASE_SERVICE_ROLE_KEY`-scoped
`npm run verify:live` (proves the new checks pass for real), and the four
DB-level proofs above re-run against the real project, not just the local
approximation.

## Self-review (Sonnet, applying/reviewing the Opus-authored design)

Read the full 830-line migration file and the `verify-live.mjs`/
`aro_schema.sql` diffs line by line rather than trusting the authoring
agent's own summary. Specific things checked and confirmed correct:

- The `orders`/`messages` CHECK-constraint drop-and-recreate is idempotent
  by construction even though the `ADD CONSTRAINT` step has no `IF NOT
EXISTS` guard (Postgres doesn't support one for CHECK constraints): the
  preceding `DROP` step matches by column-set containment, which also
  matches the _new_ constraint's column set on a second run, so a re-run
  drops-then-recreates rather than erroring on a duplicate name.
- Every composite tenant-coherence FK's target unique index actually
  exists in the same file before the FK that references it (no forward
  reference to a not-yet-created index).
- `GRANT SELECT (birthday_month, birthday_day) ON members TO authenticated`
  is additive to the existing column-grant list (Postgres column
  privileges accumulate; this doesn't require repeating every previously
  granted column) — confirmed against Postgres's own GRANT semantics, not
  assumed.
- `push_subscriptions`/`tip_allocations` genuinely have zero policies (not
  just zero grants) — RLS enabled with no matching policy denies every
  role including the table owner's session role, which is the intended
  "service_role only" stance since service_role bypasses RLS entirely by
  virtue of the `BYPASSRLS` attribute, not via a policy.
- Independently re-ran `npx tsc --noEmit` and `npm run build` in a fresh
  checkout of this branch (not reusing the authoring agent's own worktree
  state) — both green.

No corrections were needed to the authoring agent's work. See its own
in-file comments for the two deliberate additive guards beyond v2R's
literal spec (the composite tenant-coherence FKs, and locating CHECK
constraints by column identity rather than name/string-match) — both
strictly reduce risk and were confirmed necessary, not scope creep.

## STATUS.md

Not touched — `docs/plans/STATUS.md` does not exist on `main` yet (ships
only on unmerged PR #56 / `claude/hq-unification-plan09`, v2R's "PR-0").
Recorded here and in the build log instead.
