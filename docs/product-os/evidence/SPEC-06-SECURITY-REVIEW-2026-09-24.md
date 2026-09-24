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

The same independent Astra xhigh reviewer approved the review-prompt capability repair at exact code head c2cf8623d5cc5a93599b506db877fb5fc8e7c665. Previously, the review-event route accepted a settled order UUID alone while guest status required the separate tracking token. The event route and confirmation page now prove order ID plus tracking token together, then check the venue slug before loading review configuration. The client supplies that token for prompted/clicked events. The disposable browser/API test exercises missing, wrong and other-order tokens, wrong venue slug, pending orders, duplicate events and actual prompt/click requests; external review navigation is intercepted. The reviewer ran no runtime tests, so the code-head CI/browser result is a separate gate.

The reviewer then statically approved the referral/review-prompt code at exact committed head `0e8eecc7271ee335967aa3c2cb4fd300a2d991db`, with no remaining blocking findings. An earlier review held the referral change for a batch-first-visit edge case, a missing visit/member tenant constraint and an unclaimed lease finish; this head corrects all three. The reviewer checked the `BEFORE` trigger, deferred visit reference, tenant-coherent visit/member FK, rejection of null, unclaimed, expired and stale leases, and the order-plus-tracking-token review boundary. `git diff --check` passed. This is static approval only; SQL/browser execution, real concurrency and offer-value recovery are separate gates.

This is not disposable database/RLS, API, genuine concurrent-session, browser, paid Gateway/provider sandbox, outbound messaging, device push or live approval. Those checks remain distinct. The critical dependency audit and Phase 1 OpenCode workflow finding remain open.
