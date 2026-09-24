---
id: spec-06-security-review-2026-09-24
title: SPEC-06 independent security review
status: reviewed
updated: 2026-09-24
tags: [product-os, growth, security, evidence]
---

# SPEC-06 independent Astra xhigh review

Independent read-only Astra xhigh review approved the static implementation at draft [PR #89](https://github.com/leonartist7/Caffi.pro/pull/89) head 8b9059c8555c051f4067e4cac5de185dc014e121. The preceding code head was 969b09fa4a055653d95237bd0103d27d8080137e; the later commit changed documentation only. The reviewer ran 53 of 53 unit tests in the growth worktree.

The review examined venue-scoped redemption keys, member locking, active staff checks, append-only refund reversal, durable paid-offer retries anchored to the paid event, tenant-bound AI context and budgets, output validation and denied consequential AI actions. Initial findings were corrected before approval. Static approval covers loyalty accounting, tenancy and consequential AI permissions at these heads.

A separate exact-head Astra xhigh static re-review approved the owner member-history page added at a721d343f319e6c88cbb0ac907aaafa45c0726cf. The reviewer confirmed verified authentication and current active owner/manager membership before the member lookup, explicit member and venue predicates on orders and reservations, and delivery IDs derived only from scoped orders. No contact-based identity inference or consequential write was introduced.

The first disposable browser run exposed an existing PostgREST embed through the member_status view that returned no profile. The reviewer then approved the bounded lookup/directory repair at exact head 2379a0995c9c5619f302d091b8d004229a12d68f: direct member lookup requires tenant_id plus member_id, directory queries remain venue-scoped, and the replacement view appends full_name while preserving security_invoker and existing grants. The reviewer recommended authenticated/anonymous RLS checks and an exact count of same-name browser rows; both were added to the tests after that head. No runtime test was executed by the reviewer. Runtime/browser and revoked-access gates remain separate.

This is not disposable database/RLS, API, genuine concurrent-session, browser, paid Gateway/provider sandbox, outbound messaging, device push or live approval. Those checks remain distinct. The critical dependency audit and Phase 1 OpenCode workflow finding remain open.
