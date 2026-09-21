---
id: local-test-environment
title: Local disposable test environment
status: active
updated: 2026-09-21
tags: [product-os, quality, fixtures]
---

# Local disposable test environment

Back to [quality strategy](QUALITY-STRATEGY.md), [SPEC-01](specs/SPEC-01-quality-and-access.md) and the [execution ledger](EXECUTION-LEDGER.md).

The only supported database target for local quality checks is the disposable Supabase stack on this machine. Do not set `SUPABASE_TEST_DATABASE_URL` to a hosted project: `npm run test:db` refuses non-loopback hosts.

## Prerequisites

Install Docker, the Supabase CLI and PostgreSQL client tools (`psql`). Start the local stack with the Supabase CLI from the repository root. No production or staging credentials are required or read by these steps.

## Reset and verify

1. Run `npm run db:reset`. It performs `supabase db reset --local`, replays repository migrations, and loads [synthetic fixtures](../../supabase/seed.sql).
2. Set `SUPABASE_TEST_DATABASE_URL` to the local loopback database URL reported by the CLI.
3. Run `npm run test:db`. It runs all six existing SQL suites with `ON_ERROR_STOP=1`; their transactions roll back their per-suite writes.
4. Run `npm run test:browser` only after the local stack has been reset and Playwright browsers are installed. Browser tests must use these fixture identities, never a real account.

The fixture contains two organizations, two venues in the first organization, an unrelated third venue, active owner/manager/platform-admin memberships, and a revoked owner. It is synthetic and resettable by design. Local database, mocked unit, provider sandbox and live results must always be reported separately.
