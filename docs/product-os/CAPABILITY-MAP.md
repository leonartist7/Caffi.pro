---
id: capability-map
title: Capability map
status: accepted-strategy
updated: 2026-09-22
tags: [product-os]
---

# Capability map

Back to [Product OS](README.md). “Present” is code evidence at the baseline, not live verification. L/S/V mean current local journey / external sandbox / live verification; unless explicitly recorded in [verification](evidence/VERIFICATION-2026-09-20.md), these are unverified.

| Capability | Current evidence / maturity | Gap or dependency | Risk / next action |
|---|---|---|---|
| HQ clients/leads | Present: [clients](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/app/api/clients/route.ts), [leads](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/app/api/leads/route.ts) | Current environment and inbound lead parity | High PII; SPEC-02/07 |
| Venue owner shell | Present: [shell](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/app/(owner)/owner-shell.tsx) | Role visibility and impersonation consistency | High auth; SPEC-02 |
| Branded venue websites | Merged #55; [site](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/app/site) | Current rendering/SEO/mobile verification | Medium; SPEC-02 |
| Multi-location management | org/venue model present; locations module parked [registry](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/lib/modules.ts) | Owner switching and permissions qualification | High tenancy; SPEC-02 |
| Menus/modifiers | Present: [menu types](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/lib/menu/types.ts) | Complex combos/time rules and POS mapping | Medium; SPEC-02/05 |
| Pickup/QR/delivery checkout | Present: [orders API](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/app/api/orders/route.ts) | Full browser/payment/recovery loop | High money; SPEC-02 |
| Postal delivery zones | Present: [storefront](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/lib/storefront.ts) | Address-derived eligibility, courier quotes | High fulfillment; SPEC-03 |
| White-label courier dispatch | No delivery provider module/routes in baseline inventory | Lifecycle, account, city, adapter | High money/PII; SPEC-03/04 |
| Own-driver tasks | Not found in baseline application | Assignment, driver permission, milestones | High PII; SPEC-03 |
| POS connection | No POS adapter in baseline | Vendor rights, menu IDs and acknowledgement | High duplication; SPEC-05 |
| Marketplace ingestion | Not found | Separate APIs/agreements, channel mapping | Later; do not confuse with direct courier delivery |
| Stripe payments | Adapter and signed webhook present [adapter](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/lib/payments/adapters/stripe.ts) | Account model, concurrent checkout and refund reconciliation | High money; SPEC-02 |
| Reservations/waitlist | Merged #49; [reservation library](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/lib/reservations.ts) | Capacity/timezone/guest journey rerun | Medium; SPEC-02 |
| Counter/kitchen | Present: [counter](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/app/counter), [kitchen](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/app/kitchen) | Real-device notifications and handoff | High operations; SPEC-02/03 |
| Inventory/depletion/86 | Merged #63–66; [inventory](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/app/api/inventory) | SQL replay, modifier costing gaps | High data; SPEC-06 |
| Loyalty/offers/referrals | Merged #76–81; [loyalty](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/lib/loyalty) | Concurrent/retry verification | High value; SPEC-06 |
| Guest CRM | Members/regulars present [regulars](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/app/(owner)/regulars) | Unified identity/history, consent qualification | High PII; SPEC-06 |
| Web push | Merged #82; [push](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/lib/push/provider.ts) | VAPID configuration, real-device loop | Medium; SPEC-06 |
| Wallet passes | Explicit stubs [wallet](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/app/api/wallet) | Certificates/vendor setup and device verification | Later |
| Campaign email/SMS | Owner module coming soon; invite email stub | Vendor, sender, consent/suppression | High compliance; SPEC-06 gated send |
| Creative Studio | Caption/digest types present [AI boundary](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/lib/ai/provider.ts) | Gateway, budgets, actual generation verification | Medium/high; SPEC-06 |
| Guest/reservation AI | Not present as a qualified assistant | Knowledge, permissions, availability integration | Later bounded read-only assistant |
| Voice AI | Not present | Telephony/voice vendor and consent | Blocked founder/vendor |
| Staff/shifts/tips/export | Merged #72–75; [tips](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/lib/tips) | Role/device/timezone/CSV regression | High compensation data; SPEC-06 |
| Analytics | Pages/routes present [analytics](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/app/api/analytics/route.ts) | Metric provenance and reconciliation | Medium; SPEC-06 |
| Self-service SaaS billing | No qualified billing flow found | Pricing and account model | Later after first clients |
| Payroll/stored value | Not delivered | Specialist vendors and approval | Explicitly blocked |
| Quality/observability | SQL tests, Sentry config, strict script present | CI regression suite and verified runtime telemetry | High; SPEC-01/07 |

No row earns production-ready from a filename or merged PR. See [ledger](EXECUTION-LEDGER.md) for ownership and gates.

## 2026-09-22 Phase 3 review checkpoint

The baseline delivery gaps above now have implementation in draft [PR #87](https://github.com/leonartist7/Caffi.pro/pull/87): quote-bound checkout, durable simulator dispatch/reconciliation, own-driver authorization and milestones, staff recovery and minimal guest tracking. [Independent contract and implementation review](evidence/SPEC-03-IMPLEMENTATION-REVIEW-2026-09-22.md) is accepted for its exact recorded revisions. Simulator-only operation remains restricted to disposable synthetic infrastructure. Full synthetic SQL/browser acceptance now passes at `3b07268` in [CI 35777014123](https://github.com/leonartist7/Caffi.pro/actions/runs/35777014123); the [ledger](EXECUTION-LEDGER.md) records passing and failed runs separately. [PR #86](https://github.com/leonartist7/Caffi.pro/pull/86) contains independent Uber Direct feasibility and offline fixtures; no external courier adapter or sandbox/live coverage exists. Critical dependency audit and OpenCode findings remain unresolved.
