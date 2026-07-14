# HANDOFF — live Supabase bring-up (updated 2026-07-12)

Written for whoever/whatever picks this up next (Cowork or a Sonnet
delegate) with zero prior context. Read this file first, then
`docs/plans/PLAN-live-supabase-bringup.md` for the original design reasoning.

## What's already done (do not redo)

The original Supabase project (`ugppbaavzevmdkblniim`) was paused >90 days
and is **permanently unrecoverable**. A fresh project was created and fully
bootstrapped via the Supabase MCP connector:

- **Project:** `aro-platform`, ref `jjgccfrwjkwknyjtbtxa`, org `lionovart's Org`
  (`svemweqlxcebycqclhww`), region `eu-north-1`, free tier.
- **URL:** `https://jjgccfrwjkwknyjtbtxa.supabase.co`
- **Anon key** (public-safe, client-side): `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqZ2NjZnJ3amt3a255anRidHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NTc5MTQsImV4cCI6MjA5OTIzMzkxNH0.nrMZ7FzjmcbqPilerVVhGjZZeNtR8ffUo5n3Y811ABs`
- **Service-role key:** rotated by the owner on 2026-07-12 and confirmed in
  Caffi.pro's Vercel Production environment. The value is intentionally not
  recorded here.

### Phase A production cutover — 2026-07-12

- Caffi.pro PR #47 merged to `main` as `cb80a46`; production serves the aro
  sign-in UI and the live Roastery join page.
- Production smoke checks: `/login` 200 with `aro.club`; `/join/the-roastery`
  200 with the join form; anonymous `/api/clients` 401 as required.
- `/api/check-env` returns 404 in production by design. The merged route is
  development-only so it cannot disclose which secrets exist on a live
  deployment; the older acceptance step expecting an all-green production
  response is obsolete.
- AURA PR #2 merged to `main` as `b94d247`. Both repositories' designated
  `claude/caffi-aura-audit-plan-dgr8wy` branches were reset to their new
  `main` heads after merge.
- **Open Phase A blocker:** AURA production returns
  `{"ok":true,"queued":false}` for an idempotent smoke diagnostic after six
  retries. The merged forwarding code is deployed, but Caffi did not accept
  the lead. Recheck AURA Production `PLATFORM_URL` and
  `LEADS_WEBHOOK_SECRET`, confirm the secret exactly matches Caffi Production,
  redeploy AURA, then repeat the diagnostic and require `queued:true` before
  marking Phase A complete.

### Schema, RLS, and seed — all live and verified

Four migrations applied in order, all committed to the repo:

1. `supabase/migrations/20260706000000_legacy_foundation_minimal.sql` (**NEW**) —
   bootstrap shim. The existing `20260707000001` migration only works by
   _renaming_ legacy Caffi.pro tables (`tenants→venues`, `users→members`,
   etc.) — it silently does nothing on a truly empty database. This file
   creates just enough of the empty legacy shape (zero rows) for that
   rename-and-evolve logic to run unmodified. If you ever bring up another
   fresh project, apply this first.
2. `supabase/migrations/20260707000001_aro_platform_schema.sql` (**MODIFIED** —
   two `SECURITY DEFINER` functions had `SET search_path = public`, which
   broke `crypt()`/`gen_salt()` because this Supabase project installs
   `pgcrypto` into the `extensions` schema, not `public`. Fixed to
   `SET search_path = public, extensions`.)
3. `supabase/migrations/20260707000002_aro_rls.sql` — applied unmodified.
4. `supabase/migrations/20260710000001_security_hardening.sql` (**NEW**) —
   fixes from running `get_advisors(type=security)` right after: mutable
   `search_path` on 6 trigger/helper functions, and 3 `SECURITY DEFINER` RPC
   helpers (`aro_my_venue_ids`, `aro_my_managed_venue_ids`, `aro_is_aro_admin`)
   that didn't need to be callable by `anon`.

`supabase/aro_schema.sql` was regenerated to mirror all four files in order —
it's the paste-into-SQL-editor equivalent if you ever need it.

**Legacy landmines deleted** (git rm'd, per Plan 1's own instructions): all
root-level `*.sql` panic files (`NUCLEAR_FIX_RLS.sql`, `COMPLETE_FIX_ALL_RLS.sql`,
etc.), `supabase/{reset_database,complete_setup,complete_migrations,apply-dev-mode}.sql`,
and all of `supabase/migrations/2025*.sql` + the unprefixed `00N_*.sql` files —
they're superseded by the fresh-install migration above and several of them
contained the `DEV: USING(true)` RLS disaster this whole rebuild exists to fix.

**Seed data loaded** (`supabase/seed/aro_dev_seed.sql`, run via `execute_sql`,
idempotent — safe to re-run): venue "The Roastery" (Calgary, CAD), 3
memberships (owner/manager pending-invite, staff PIN `4242`), 8 seeded
members landing at 3 regular / 3 new / 2 fading (matches the plan's expected
distribution), ~90 days of visit history, points ledger, 3 rewards, 1 draft
campaign, 1 pending AI draft, 1 lead, 1 seed-applied event.

**RLS verified end-to-end** (not just "enabled" — actually tested with role
switching):

- `anon` can read `venues` (public identity columns only) — 1 row returned. ✅
- `anon` gets a hard `permission denied` on `members` (no grant at all, by
  design — stronger than RLS filtering). ✅
- An `authenticated` stranger (no membership) queries `members`/`memberships`
  and gets **zero rows, no error** — proves the policy doesn't recurse. ✅
- A real linked owner (tested via a temporary throwaway `auth.users` row,
  cleaned up after) sees all 8 of their own venue's members. ✅
- `SELECT *` on `members` as that owner fails with `permission denied` —
  proves column-level privacy (email/phone/tokens are simply not granted,
  not just RLS-filtered) forces server code to select explicit columns. ✅

**`get_advisors(security)` re-run after hardening migration**: only the 3
expected `rls_enabled_no_policy` INFO findings remain, on `leads`,
`organizations`, `zones` — these are intentional deny-all-by-design
(server-only tables, see RLS file §11), not bugs.

## What's NOT done — pick up here

1. Fix the AURA Production lead-forwarding configuration described in the
   Phase A block above and verify one diagnostic returns `queued:true`.
2. Run `npm run verify:live` from a trusted environment containing the three
   Supabase variables. The verifier is implemented and its fail-fast behavior
   is tested, but this clean checkout intentionally has no local service key,
   so the real six-check database run remains deferred.

Phases B–E were completed by explicit owner direction while the AURA issue was
kept as a non-blocking production follow-up.

## Gotchas for whoever continues

- This Supabase project puts `pgcrypto`/`uuid-ossp` in the `extensions`
  schema, not `public`. Any new `SECURITY DEFINER` function that calls
  `crypt()`/`gen_salt()`/`uuid_generate_v4()` and sets an explicit
  `search_path` must include `extensions` in it, or it'll fail exactly like
  `verify_counter_pin` did here.
- Counter PIN for the seeded staff membership is `4242` — dev-only, seed
  file says so explicitly.
- The owner/manager seeded memberships are **pending invites** (`user_id
IS NULL`) — nobody can log in as them until a real Supabase Auth user
  exists and gets linked via the `UPDATE memberships SET user_id = ...`
  command in the seed file's header.
- Don't re-run the legacy landmine SQL files — they're deleted from the repo
  now, but if anyone has a local copy floating around, do not run it against
  this project. Several of them disable RLS outright.

## Redeploy log

- 2026-07-11: owner added NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
  / SUPABASE_SERVICE_ROLE_KEY to Vercel envs. This project has "Ignored Build
  Step" enabled, so an empty commit does NOT trigger a rebuild — needs a real
  file diff. This line is that diff.
- 2026-07-12: owner confirmed the rotated Supabase key, Caffi/AURA Production
  env scopes, and Supabase Auth URL configuration. Caffi production smoke
  checks passed. AURA was merged and deployed, but its lead-forwarding smoke
  test remains blocked with `queued:false` pending an env-value match/redeploy.

# Ordering payment setup

Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in the Caffi.pro Production environment.
In Stripe test mode, add webhook endpoint
`https://caffipro.vercel.app/api/webhooks/stripe` for Checkout completion,
asynchronous payment success/failure, and refund events. Use Stripe test card
`4242 4242 4242 4242` for the release-one end-to-end payment check.
