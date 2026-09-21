# Browser fixture journeys

SPEC-01 browser tests must run only after `npm run db:reset` succeeds against
the local disposable Supabase stack and the Playwright browser is installed.
Add login/role-navigation coverage here with fixture-only credentials. The
current repository has no local Supabase CLI/Docker capability in this checkout,
so `npm run test:browser` is deliberately recorded as blocked rather than
reported as a passing skipped test.
