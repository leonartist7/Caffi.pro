---
id: architecture
title: Architecture strategy
status: accepted-strategy
updated: 2026-09-22
baseline: 05022ffd797bea8149a44bcac3959c648158b594
tags: [product-os]
---

# Architecture strategy

Back to [Product OS](README.md). Implements [vision](VISION.md), [delivery decision](decisions/DEC-001-delivery-first.md) and [POS decision](decisions/DEC-002-existing-pos.md).

## Preserve the modular application
Keep Next.js App Router and existing server-only domain libraries. HQ handles clients/onboarding/support; owner pages are the real venue console; counter/kitchen are task-specific; site/shop/pass/reserve are guest entry points. Do not introduce microservices or a full rewrite for the first clients.

Current evidence: [application](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/app), [authz](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/lib/authz.ts), [payments](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/lib/payments/provider.ts), [AI](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/lib/ai/provider.ts).

## Tenancy and data
Organizations own venues. Memberships determine active role access; operator impersonation carries actor and effective venue independently. Resource IDs resolve their stored tenant before privileged mutation. A client venue_id may be a selection hint but never grants access.

Retain legacy tenant_id columns where present; new delivery/POS records use venue_id. Use composite tenant/resource constraints for relationships and explicit RLS/grants. Route guards protect service-role queries; RLS alone cannot protect a bypass client. Financial and operational side effects use database transactions and unique operation keys.

Keep payment, preparation, delivery and POS transmission states separate. Store money as integer minor units plus currency, timestamps in UTC with venue timezone for schedules. Do not reinterpret all currencies as two-decimal currencies during international expansion.

SPEC-02 adds a scoped guest tracking credential distinct from an order ID and checkout operation UUID. Public order status needs both values and returns only guest-safe status data. A retry uses the same durable provider operation key; a persisted checkout redirect is recovered before a new external effect is attempted. The local test-payment adapter is network-disabled and requires explicit synthetic-fixture flags. It is not a provider sandbox or production capability. See [DEC-005](decisions/DEC-005-synthetic-payment-and-guest-tracking.md).

## Integrations
[Delivery architecture](DELIVERY-ARCHITECTURE.md) owns courier contracts; [SPEC-05](specs/SPEC-05-pos-connection.md) owns POS contracts. Vendor-specific code stays in adapters. Durable outbox jobs hold intended external effects; leases and reconciliation handle crashes. No background promise after an HTTP response.

Default first implementation: Postgres-backed outbox plus scheduled server worker, explicitly at-least-once. Isolate queue operations behind a module so a managed queue can replace the transport later. Local tests run the worker directly. Production schedule activation is a deployment gate.

Credentials stay in server secret storage, referenced by connection records. The first live connection cannot ship until per-merchant/platform account ownership is documented. Never store keys in brand_kit or browser bundles.

## AI
[DEC-003](decisions/DEC-003-ai-boundary.md) keeps one server boundary and stages Gateway migration. Task capability contracts distinguish owner insights, creative drafts, guest assistance, marketing drafts and future voice. Tenant retrieval and tools enforce role permission independently of prompts. Generation IDs, model/provider, usage, latency and sanitized outcomes support audits and budget enforcement.

## Compatibility and rollout
Add schema before deploying dependent code; tolerate old rows with disabled/unconfigured capabilities. Feature flags are per venue with a global kill switch. Run migrations in local/staging only until production approval. Disable new effects to roll back; never erase delivery/payment history to undo a release. Observe dispatch lag, unknown outcomes, POS rejections and payment mismatches.

Related: [quality](QUALITY-STRATEGY.md), [security](SECURITY-AND-COMPLIANCE.md), [registry](INTEGRATION-REGISTRY.md).

## 2026-09-24 growth boundary checkpoint

SPEC-06 keeps loyalty redemption and refund reversal in append-only venue-scoped transactions. A paid-order trigger creates recoverable offer work, consumed by the signed webhook or authenticated daily cron with period-key deduplication. Creative generation uses one server-only provider choice, scoped factual context, explicit per-venue token reservations and validated drafts. Budget rows are disabled by default. Publication and messaging remain separate permission and consent gates.

A first-visit trigger also records referral work in the same transaction, including the selected program/configuration snapshot. The retry worker claims a lease and checks the unique referred-member credit before settling, so a crash after credit cannot award it twice. New visits have a composite venue/member FK; legacy rows need an audit before validation. Guest review events require the independent order tracking credential as well as the order ID.
