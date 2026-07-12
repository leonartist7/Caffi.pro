# PLAN-live-supabase-bringup — Rank 1 of 5 (do this FIRST)

**Status as of 2026-07-10: steps 1–6 DONE via the Supabase MCP connector.**
See `docs/plans/HANDOFF-live-bringup.md` for exact state, what's left (steps
7–8, browser/Vercel verification), and the two owner-only actions blocking
it. The rest of this file is kept as reference for what was built and why —
read the HANDOFF doc first if you're picking this up fresh.

**Goal:** the platform runs against the real Supabase project — schema applied,
RLS enforced and _proven_, seed data visible in the browser, Vercel preview
working end-to-end. Until this lands, every other plan produces theory.
Everything in Phase 2 was written blind (this container cannot reach
`*.supabase.co`); this plan is where reality bites back.

**Executor note:** parts marked 👤 OWNER need the human (dashboard clicks /
secrets). Everything else is yours. Never fake a passing state: if a step
can't be verified from your environment, output the exact command/SQL for the
owner and mark the step BLOCKED — do not tick it.

## Files to touch

- `supabase/migrations/20260707000001_aro_platform_schema.sql` (read; fix only if live apply errors)
- `supabase/migrations/20260707000002_aro_rls.sql` (same)
- `supabase/aro_schema.sql` (regenerate if migrations change — it must stay a paste-able mirror)
- `supabase/seed/aro_dev_seed.sql`, `supabase/tests/rls_tests.sql`
- `scripts/verify-live.mjs` (CREATE — node script: anon + service clients, runs the checks in §Acceptance)
- `.env.local` (values only, never committed), `.env.example` (docs only if keys change)
- DELETE (git rm) the legacy landmines so nobody ever runs them against the live DB again: `supabase/reset_database.sql`, `supabase/complete_setup.sql`, `supabase/complete_migrations.sql`, root-level `*.sql` panic files, and `supabase/migrations/2025*.sql` (superseded by the 20260707 pair — check nothing in 2026 files references them first)

## Steps, in order

1. 👤 OWNER — in Supabase dashboard (project `ugppbaavzevmdkblniim` or a fresh project; fresh is cleaner):
   rotate/copy **anon key** + **service-role key** + URL; put them in `.env.local` locally and in
   Vercel → Settings → Environment Variables (all three envs). The old service key is burned in git
   history — it must be rotated even if a fresh project is used for the app.
2. 👤 OWNER — Supabase Auth settings: enable Email provider (password + magic link),
   set Site URL to the Vercel preview URL, add `http://localhost:3000` to redirect allowlist.
3. Inspect live state BEFORE applying anything (via `scripts/verify-live.mjs --inspect`, service key):
   list tables + row counts. Three possible worlds:
   a. empty/fresh project → run migrations as-is;
   b. old schema present with junk data → drop old tables listed in the migration's rename path is NOT safe —
   the migration renames `tenants→venues` etc.; confirm the pre-state it expects matches what's live;
   c. old schema with data worth keeping → same rename path, but snapshot first (`pg_dump` or dashboard backup).
4. Apply `20260707000001` then `20260707000002` (SQL editor paste of `aro_schema.sql` is equivalent).
   After ANY DDL: `NOTIFY pgrst, 'reload schema';` — this repo's history (`FIX_SCHEMA_CACHE.md`) shows
   stale-schema-cache 400s were a recurring ghost; kill it preemptively.
5. Run `supabase/seed/aro_dev_seed.sql`. Verify idempotency by running it twice — second run must not error or duplicate.
6. Run `supabase/tests/rls_tests.sql` **and** the JS-level checks in `verify-live.mjs`.
7. Local browser verification (owner machine or any env that can reach supabase.co):
   `npm run build && npm start`, log in as seeded owner, load dashboard/clients/menu; log into `/counter` with seeded PIN.
   Screenshot each to `docs/audit/after/phase-2-live/`.
8. Vercel: confirm preview deployment picks up envs (a `NEXT_PUBLIC_*` change requires a redeploy —
   trigger one with an empty commit if needed). Hit `/api/check-env` on the preview to confirm all three
   Supabase vars load, then verify login works on the preview URL.

## Edge cases a weaker model would miss

- **Testing RLS with the service key proves nothing** — service role bypasses RLS. The tests must run
  with (a) anon key, (b) a signed-in owner JWT of venue A, (c) a second venue B user. `verify-live.mjs`
  must create two venues/users and assert cross-venue reads return 0 rows _and no error_ (RLS filters
  silently — an empty array is the pass signal, an error usually means policy recursion).
- **Membership-policy recursion:** policies on `memberships` that select from `memberships` recurse
  (Postgres error 42P17). If hit, use a `security definer` helper function — don't "fix" it with `USING (true)`.
  That is exactly how the last dev-mode disaster started.
- **Rotating the service key invalidates counter sessions** (`lib/counter-session.ts` derives its HMAC key
  from it). Expected; staff just re-PIN. Don't chase it as a bug.
- **New-format Supabase keys** (`sb_publishable_…`/`sb_secret_…`) work with supabase-js v2 — don't reject
  them for not looking like JWTs.
- **Auth email confirmations:** seeded users created via service-role `auth.admin.createUser` must set
  `email_confirm: true`, or logins mysteriously fail with valid passwords.
- **Do not run any legacy SQL file** from the repo root or old migrations — several disable RLS or drop tables. Step "DELETE landmines" exists for this reason; do it in the same PR.
- The compat views (`tenants`, `users`, `loyalty_transactions`, `rewards_catalog`) exist so old pages keep
  reading — views don't carry RLS themselves; they run with the querying user's rights against base tables
  (`security_invoker` must be set on them in the migration — verify, or add `ALTER VIEW … SET (security_invoker = true);` for Postgres 15+).

## Acceptance criteria (all must hold)

1. `verify-live.mjs` prints PASS for: anon sees zero rows on every base table; venue-A owner reads own venue rows and zero of venue B's; staff counter token records a visit but a member email/phone read via the counter search endpoint returns masked/absent contact fields.
2. Seed run twice = no duplicates (`select count(*) from venues` unchanged).
3. Browser screenshots: real login (no bypass), dashboard rendering **live seeded data** (no `Failed to fetch` in console log capture), counter PIN login succeeding.
4. Vercel preview URL: login works; `/api/check-env` all-green.
5. Legacy SQL landmines removed from the tree; `npm run build:vercel` green; committed + pushed.
