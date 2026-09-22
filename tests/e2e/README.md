# Browser fixture journeys

SPEC-01 browser tests must run only after `npm run db:reset` succeeds against
the local disposable Supabase stack and the Playwright browser is installed.
Add login/role-navigation coverage here with fixture-only credentials. The
workstation has no Docker/psql capability, so local execution remains blocked.

The `isolated-database-browser` quality job installs checksum-pinned Supabase CLI
2.117.0, starts disposable containers, explicitly replays migrations/seed, runs
SQL/RLS suites and prepares six synthetic Auth passwords before running Chromium.
`node scripts/ci-local-verify.mjs` runs the same sequence in a clean checkout with
Docker, Supabase CLI, psql and Chromium installed. It rejects `.env` files and
non-loopback service URLs, drops inherited provider credentials, and captures CLI
status without logging keys. Fixture passwords are random per run and remain only
in subprocess environments. No hosted project or provider account is involved.

The initial `local-auth.spec.ts` checks browser sign-in against actual local Auth.
It is infrastructure coverage, not a delivery journey. Missing fixture credentials
fail the test; there are no skip paths. The full SPEC-03 journey must be added after
the independent contract gate. CI configuration is not proof of a successful run.
