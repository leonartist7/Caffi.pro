---
id: repository-2026-09-20
title: Repository inventory
status: observed
updated: 2026-09-20
tags: [product-os, evidence]
---

# Repository inventory

Back to [evidence](../EVIDENCE.md). Baseline: 05022ffd797bea8149a44bcac3959c648158b594.

Tracked files: 591. Remote branches: 71. Migrations: 30. SQL test files: 6.

## Governance

- [GITHUB_FIRST_WORKFLOW.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/GITHUB_FIRST_WORKFLOW.md)
- [GIT_WORKFLOW_GUIDE.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/GIT_WORKFLOW_GUIDE.md)
- [spec-kit-main/AGENTS.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/spec-kit-main/AGENTS.md)
- [spec-kit-main/memory/constitution.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/spec-kit-main/memory/constitution.md)
- [spec-kit-main/templates/commands/constitution.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/spec-kit-main/templates/commands/constitution.md)

## Root workflow

- [.github/workflows/opencode.yml](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/.github/workflows/opencode.yml)

## Migrations

- [supabase/migrations/20260706000000_legacy_foundation_minimal.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260706000000_legacy_foundation_minimal.sql)
- [supabase/migrations/20260707000001_aro_platform_schema.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260707000001_aro_platform_schema.sql)
- [supabase/migrations/20260707000002_aro_rls.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260707000002_aro_rls.sql)
- [supabase/migrations/20260710000001_security_hardening.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260710000001_security_hardening.sql)
- [supabase/migrations/20260710000002_pass_serials.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260710000002_pass_serials.sql)
- [supabase/migrations/20260710000003_leads_status.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260710000003_leads_status.sql)
- [supabase/migrations/20260711000001_counter_rpc.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260711000001_counter_rpc.sql)
- [supabase/migrations/20260711000002_owner_stats.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260711000002_owner_stats.sql)
- [supabase/migrations/20260711000003_fix_venue_week_stats_volatile.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260711000003_fix_venue_week_stats_volatile.sql)
- [supabase/migrations/20260714062310_ordering_core.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260714062310_ordering_core.sql)
- [supabase/migrations/20260714075113_ordering_core_grant_hardening.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260714075113_ordering_core_grant_hardening.sql)
- [supabase/migrations/20260714075459_ordering_core_advisor_cleanup.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260714075459_ordering_core_advisor_cleanup.sql)
- [supabase/migrations/20260714080519_ordering_payment_event_atomicity.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260714080519_ordering_payment_event_atomicity.sql)
- [supabase/migrations/20260714100000_storefront_order_creation.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260714100000_storefront_order_creation.sql)
- [supabase/migrations/20260714110000_order_operations.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260714110000_order_operations.sql)
- [supabase/migrations/20260714120000_ordering_demo_seed.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260714120000_ordering_demo_seed.sql)
- [supabase/migrations/20260716160000_reservations_core.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260716160000_reservations_core.sql)
- [supabase/migrations/20260722120000_batch_schema_lanes_abc.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260722120000_batch_schema_lanes_abc.sql)
- [supabase/migrations/20260731175843_lane_b_tips_on_orders.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260731175843_lane_b_tips_on_orders.sql)
- [supabase/migrations/20260731185507_perpetual_depletion.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260731185507_perpetual_depletion.sql)
- [supabase/migrations/20260731191421_food_costing_report.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260731191421_food_costing_report.sql)
- [supabase/migrations/20260731193000_eighty_six_stock_out.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260731193000_eighty_six_stock_out.sql)
- [supabase/migrations/20260801023300_lane_b_tip_config_atomic_patch.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260801023300_lane_b_tip_config_atomic_patch.sql)
- [supabase/migrations/20260801071500_lane_b_review_url_atomic_patch.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260801071500_lane_b_review_url_atomic_patch.sql)
- [supabase/migrations/20260801083000_lane_b_review_event_dedup.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260801083000_lane_b_review_event_dedup.sql)
- [supabase/migrations/20260802210000_plan36_save_tip_allocation.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260802210000_plan36_save_tip_allocation.sql)
- [supabase/migrations/20260810000000_plan12_offer_engine.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260810000000_plan12_offer_engine.sql)
- [supabase/migrations/20260810190000_plan13_offer_lifecycle.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260810190000_plan13_offer_lifecycle.sql)
- [supabase/migrations/20260810210000_plan15_referral_credit.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260810210000_plan15_referral_credit.sql)
- [supabase/migrations/20260810230000_plan17_mystery_reveal.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/migrations/20260810230000_plan17_mystery_reveal.sql)

## Tests and verification scripts

- [scripts/verify-live.mjs](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/scripts/verify-live.mjs)
- [scripts/verify-ordering-rpc.mjs](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/scripts/verify-ordering-rpc.mjs)
- [supabase/tests/depletion_tests.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/tests/depletion_tests.sql)
- [supabase/tests/eighty_six_tests.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/tests/eighty_six_tests.sql)
- [supabase/tests/food_costing_tests.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/tests/food_costing_tests.sql)
- [supabase/tests/ordering_core_tests.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/tests/ordering_core_tests.sql)
- [supabase/tests/reservations_core_tests.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/tests/reservations_core_tests.sql)
- [supabase/tests/rls_tests.sql](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/supabase/tests/rls_tests.sql)
- [test-analytics-connection.js](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/test-analytics-connection.js)
- [test-connection.js](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/test-connection.js)
- [test-with-service-key.js](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/test-with-service-key.js)

## Historical build logs and handoffs

- [HANDOFF.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/HANDOFF.md)
- [docs/plans/BUILD-LOG-PLAN-10.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-10.md)
- [docs/plans/BUILD-LOG-PLAN-11.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-11.md)
- [docs/plans/BUILD-LOG-PLAN-12.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-12.md)
- [docs/plans/BUILD-LOG-PLAN-13.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-13.md)
- [docs/plans/BUILD-LOG-PLAN-14.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-14.md)
- [docs/plans/BUILD-LOG-PLAN-15.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-15.md)
- [docs/plans/BUILD-LOG-PLAN-16.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-16.md)
- [docs/plans/BUILD-LOG-PLAN-17.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-17.md)
- [docs/plans/BUILD-LOG-PLAN-18.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-18.md)
- [docs/plans/BUILD-LOG-PLAN-20.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-20.md)
- [docs/plans/BUILD-LOG-PLAN-21.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-21.md)
- [docs/plans/BUILD-LOG-PLAN-22.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-22.md)
- [docs/plans/BUILD-LOG-PLAN-23.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-23.md)
- [docs/plans/BUILD-LOG-PLAN-24.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-24.md)
- [docs/plans/BUILD-LOG-PLAN-25.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-25.md)
- [docs/plans/BUILD-LOG-PLAN-26.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-26.md)
- [docs/plans/BUILD-LOG-PLAN-30.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-30.md)
- [docs/plans/BUILD-LOG-PLAN-31.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-31.md)
- [docs/plans/BUILD-LOG-PLAN-32.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-32.md)
- [docs/plans/BUILD-LOG-PLAN-33.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-33.md)
- [docs/plans/BUILD-LOG-PLAN-34.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-34.md)
- [docs/plans/BUILD-LOG-PLAN-35.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-35.md)
- [docs/plans/BUILD-LOG-PLAN-36.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-36.md)
- [docs/plans/BUILD-LOG-PLAN-37.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-PLAN-37.md)
- [docs/plans/BUILD-LOG-admin-impersonation.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-admin-impersonation.md)
- [docs/plans/BUILD-LOG-client-websites.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-client-websites.md)
- [docs/plans/BUILD-LOG-creative-studio.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-creative-studio.md)
- [docs/plans/BUILD-LOG-diner-join.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-diner-join.md)
- [docs/plans/BUILD-LOG-hq-modules.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-hq-modules.md)
- [docs/plans/BUILD-LOG-ordering-core.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-ordering-core.md)
- [docs/plans/BUILD-LOG-reservations.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/BUILD-LOG-reservations.md)
- [docs/plans/HANDOFF-live-bringup.md](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/docs/plans/HANDOFF-live-bringup.md)

## Inspection notes

Root AGENTS.md and CLAUDE.md absent at baseline. Spec Kit instructions and constitution are vendored toolkit material. Git workflow guides, README, HANDOFF and historical master plans are discovery inputs; current Product OS supersedes their sequencing. Existing build logs were searched for unresolved verification gaps; current code was inspected for authorization, checkout/payment, delivery zones, AI, consent, flags and impersonation behavior. No exhaustive historical security audit is claimed.
