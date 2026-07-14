# Build log — Ordering Core

Tracks progress against `docs/plans/PLAN-01-ordering-core.md`. One section per
phase; no phase is marked live until its migration or runtime behavior has been
verified against the production project.

## Phase 1 — Schema: menu + orders + payments

- Added `20260714062310_ordering_core.sql`: fresh `venue_id`-scoped tables for
  menu categories/items, modifiers, QR tables, delivery zones, immutable order
  snapshots, and append-only payments. The order idempotency key is unique per
  venue; database totals must equal the component totals; tax is stored as a
  venue-level basis-points configuration.
- RLS is enabled on every new table in the same migration. Active menu and
  fulfilment configuration is publicly readable through explicit column grants;
  orders, line items, modifiers snapshots, and payments receive no browser-role
  grants or policies. Service-role grants are explicit because these tables are
  created after the baseline grant migration.
- The old `update_order_stats` / `award_order_loyalty_points` definitions were
  unattached and target an incompatible legacy order shape. The migration drops
  them with an explicit Phase-5 single-award-path comment, preventing a second
  loyalty-credit path when the new completion flow lands.
- Updated `supabase/aro_schema.sql` as the full paste-ready mirror. Review
  caught and repaired pre-existing mirror drift: the owner-stats volatile
  function fix had been listed in the header but its body was missing.
- Reconciled the live migration history from its earlier MCP-generated
  timestamps to the repository's canonical timestamps, then confirmed the CLI
  dry-run proposed only Ordering Core. Applied `20260714062310_ordering_core.sql`
  to `aro-platform` (`jjgccfrwjkwknyjtbtxa`).
- Live inspection caught two platform-default gaps and fixed them in tracked
  advisor follow-ups: `20260714075113_ordering_core_grant_hardening.sql`
  removes inherited browser CRUD grants and hardens future default privileges;
  `20260714075459_ordering_core_advisor_cleanup.sql` moves recursive RLS
  helpers behind the non-exposed `private` schema and optimizes `auth.uid()`.
- Verified live: all 26 public tables have RLS; public menu/config tables expose
  only their intended columns; orders, line items, and payments have no browser
  grants; payment reconciliation is service-role-only; every required table,
  column, constraint, index, and function exists. Database lint reports no
  schema errors and the performance advisor reports no warnings. The only
  remaining security warning is the project-level leaked-password-protection
  setting, not a schema issue.
- Added `supabase/tests/ordering_core_tests.sql`; its production-safe rolled-back
  transaction proves payment success, replay no-op, amount mismatch rejection,
  and zero persistent test data. Extended `npm run verify:live` to 11 checks;
  all pass against production.
- Verified locally: every migration is mirrored in order, the latest migration
  matches the consolidated-schema tail exactly, `git diff --check` passes,
  `npm run type-check` passes, and `npm run build` passes.
