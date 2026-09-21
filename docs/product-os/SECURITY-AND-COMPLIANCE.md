---
id: security-and-compliance
title: Security and compliance strategy
status: accepted-strategy
updated: 2026-09-21
baseline: 05022ffd797bea8149a44bcac3959c648158b594
tags: [product-os]
---

# Security and compliance strategy

Back to [Product OS](README.md); execution owner: [SPEC-01](specs/SPEC-01-quality-and-access.md).

## Before any real service connection
Repair and test active-membership enforcement; verify row-scoped authorization and two-tenant denial across every privileged path touched. Test inactive platform admins as well as owners/managers. Review impersonation entry/exit, actor attribution and effective venue resolution.

Validate Stripe signatures against raw bodies; do the same using each courier's documented authentication. Durable deduplication applies to payments, dispatch, refunds, rewards, redemptions and stock effects. Invalid events cannot mutate state; authenticated events must still match the stored connection/order tenant.

No service-role key or courier credential in client code. No hardcoded demo access on public deployments. Limit public quote/order endpoints by tenant/session/network using application-controlled limits; bound payload sizes and expensive provider calls. Error logs exclude addresses, phones, tokens and raw provider bodies.

## Data and AI boundaries
Collect delivery address/contact only for fulfillment; expose minimal driver task information. Guest tracking uses scoped expiring access, not a guessable order ID alone. Define configurable retention, export and deletion with financial/audit retention exceptions reviewed before launch. Deletion jobs must not corrupt order/accounting ledgers.

Treat menus, messages, uploaded files and retrieved content as untrusted model input. The model cannot expand its own tenant scope or permissions. Human approval and deterministic validation precede bookings, outbound marketing, price/discount changes and money actions. Default to no prompt-content logging; budget checks occur before a paid request.

## Market gate
Jurisdiction is undecided. GDPR, CASL, CAN-SPAM, TCPA and local rules are applicability questions for the selected markets/channels, not a declaration of compliance. Separate transactional delivery notices from marketing consent. Store consent purpose, channel, source, wording/version, timestamp and withdrawal; suppression must take effect before dispatching a campaign.

Founder/legal review is required for merchant-of-record and payout responsibility, taxes, courier claims/refunds, tip recipients, restricted goods, processor agreements, retention and cross-border processing. Initial delivery excludes regulated goods until specifically approved.

## Known risk register
- Active-membership application-boundary omission: repaired in SPEC-01 with mocked regression coverage; independent security review and isolated RLS replay remain required before this gate closes.
- Existing refund reconciliation is deferred; no safe live refund completion claim.
- Historical legacy-project RLS exposure: not reverified while project INACTIVE.
- Comment-driven agent workflow now restricts trusted author associations and pins action SHAs; review its permissions and branch-protection interaction before relying on it.
- Provider access, shared credentials and payment account model: unresolved founder gates.

Evidence: [current state](CURRENT-STATE.md), [services](evidence/SERVICES-2026-09-20.md). Supabase [RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) confirms that grants and row policies are separate and service roles can bypass RLS.
