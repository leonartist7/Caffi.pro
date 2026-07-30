# Build log — PLAN-10 Batch Schema + RLS Migration

Tracks progress against `docs/plans/PLAN-10-batch-schema-migration.md`.

## Authoring

- Delegated to a subagent running on the Opus model (the "Fable 5 → Opus 5"
  executor substitution from `MASTER-PLAN-v2R-remastered.md`'s owner note),
  run in an isolated git worktree (`.claude/worktrees/agent-...`, branch
  `sonnet/lane-a-plan10-schema-batch`) to avoid the file-collision risk of
  running a long background task against the same working directory a
  foreground session is also editing — see the operational note below,
  which explains why isolation was needed at all.
- Delivered: `supabase/migrations/20260722120000_batch_schema_lanes_abc.sql`
  (830 lines), mirrored into `supabase/aro_schema.sql`, `scripts/verify-live.mjs`
  extended with 11 new checks.
- Validated by the authoring agent against a **disposable local PostgreSQL
  16 instance** (not the live project — no credentials available): full
  migration applies clean, 28 behavioral assertions pass (idempotent
  re-run, both CHECK-constraint guards, append-only/write-once triggers
  under concurrency, cross-tenant FK rejection), base-vs-batch schema diff
  confirmed only the intended objects changed.
- `npx tsc --noEmit` and `npm run build` green, both as reported by the
  authoring agent and independently re-confirmed in this session on a
  fresh checkout of the branch (not reusing the agent's own worktree
  state) — see Self-review in the PLAN file for what else was independently
  checked rather than taken on trust.

## Operational note — a working-directory collision, caught before it touched anything committed

The first attempt at this task ran as a background agent **without**
worktree isolation, sharing the same checked-out working directory as this
session's own foreground work (which was mid-flight on the unrelated
PLAN-11 branch). Mid-task, the background agent's file edits landed on
whatever branch happened to be checked out at the moment it wrote a file —
at one point this meant a PLAN-10-authored change to `scripts/verify-live.mjs`
appeared as an uncommitted modification on the PLAN-11 branch's working
tree. It was caught via a routine `git status` check before anything was
committed, quarantined with `git stash` (labeled, never discarded), and the
task was relaunched with `isolation: "worktree"`, which runs the subagent
against a separate git worktree entirely — the correct fix, now applied
for any future long-running subagent that writes files. The two stashes
created during triage (`git stash list` will show them if inspected) are
superseded by this complete, self-validated version and are safe to drop.

## STATUS.md

Not touched — does not exist on `main` yet (ships only on unmerged PR #56).
Recorded here and in the PLAN file instead, pending PR-0.

## What's next

This migration is **written and self-tested, not live-applied**. Per the
project's migration-serialization rule, it needs someone with Supabase MCP
access to run `list_migrations`/`list_tables` first (confirm no collision
with Lane B/C's unmerged work), then `apply_migration`, then
`get_advisors`, then a live `npm run verify:live`. Until that happens,
PLAN-12 through PLAN-18 (everything in Lane A gated on this schema) stay
blocked, correctly, rather than being built against tables that don't
exist yet.
