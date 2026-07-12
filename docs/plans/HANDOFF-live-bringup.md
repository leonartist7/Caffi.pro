# HANDOFF — live Supabase bring-up (2026-07-10)

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
- **Service-role key:** NOT retrievable via MCP by design (Supabase intentionally
  doesn't expose secret keys to connectors). This is the one credential you
  cannot get programmatically — see "Owner-only steps" below.

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

### Owner-only (cannot be done by any agent — needs dashboard access)

1. **Get the service-role key**: Supabase dashboard → project `aro-platform`
   → Settings → API → `service_role` secret. Put it in `.env.local` locally
   AND in Vercel → Settings → Environment Variables for **all three**
   environments (Preview, Staging, Production), alongside:
   - `NEXT_PUBLIC_SUPABASE_URL=https://jjgccfrwjkwknyjtbtxa.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=` (value above)
   - `SUPABASE_SERVICE_ROLE_KEY=` (from dashboard, this step)
2. **Enable Auth**: Authentication → Providers → enable **Email** (password +
   magic link). Authentication → URL Configuration → set Site URL to the
   Vercel preview URL, add `http://localhost:3000` to the redirect allowlist.
3. Trigger a Vercel redeploy after step 1 (env var changes need a fresh
   build) — an empty commit works if there's nothing else to push.

### Remaining agent work (Plan 1 steps 7–8, once the above lands)

7. Local/CI browser verification: `npm run build && npm start`, log in as
   the seeded owner (bind the pending `owner@roastery.dev` membership to a
   real Supabase Auth user first — see the seed file's header comment for
   the exact `UPDATE memberships SET user_id = ...` command), load
   dashboard/clients/menu, log into `/counter` with PIN `4242`. Screenshot
   each to `docs/audit/after/phase-2-live/`.
8. Vercel: confirm the preview deployment picks up the new envs, hit
   `/api/check-env` to confirm all three Supabase vars load, verify login
   works on the preview URL.
9. `scripts/verify-live.mjs` doesn't exist yet — Plan 1 called for creating
   it (anon + service clients, scripted version of the RLS checks already
   done manually above). Worth writing so this isn't a one-off manual
   verification; future migrations need a regression check.

### Then: Plans 2–5 are unblocked

Once steps 7–8 above are done (or even before, for local dev — the DB itself
is fully live now), Plans 2 (diner join page), 3 (counter two-tap), 4 (owner
home + regulars), 5 (leads pipeline) can all proceed. They were written
against the _design_ of this schema, which is now confirmed to match reality
byte-for-byte (the two fixes above were runtime bugs in migration mechanics,
not schema-shape changes) — no plan content needs revision because of this
bring-up.

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
