---
id: evidence
title: Evidence index and audit method
status: accepted-strategy
updated: 2026-09-20
baseline: 05022ffd797bea8149a44bcac3959c648158b594
tags: [product-os]
---

# Evidence index and audit method

Back to [Product OS](README.md). Baseline SHA: 05022ffd797bea8149a44bcac3959c648158b594. Observation date: 2026-09-20.

## Provenance
- [GitHub audit inventory](evidence/GITHUB-2026-09-20.md): complete PR/issue metadata, current statuses and Actions inventory.
- [Branch inventory](evidence/BRANCHES-2026-09-20.md): all fetched branch tips and ancestry counts. Squashed branches may appear ahead although changes merged.
- [Service observations](evidence/SERVICES-2026-09-20.md): sanitized read-only Supabase/Vercel observations.
- [Verification report](evidence/VERIFICATION-2026-09-20.md): commands, results and unrun checks.
- [Competitive benchmark](COMPETITIVE-BENCHMARK.md): dated official public sources, not authenticated product testing.
- [Repository inventory](evidence/REPOSITORY-2026-09-20.md): migrations, test paths, scripts, governance and build-log provenance.

## Claim discipline
Code present = path exists and behavior inspected. Locally verified = named check passed at a specified revision. Sandbox verified = external test environment exercised with evidence. Live verified = approved real-world journey completed. Blocked = named dependency and owner. These are separate axes, not interchangeable labels.

Material repository findings link to pinned files or commits. Historical reports are attributed as reports. Service observations identify tool, date and sanitized result; private URLs, project refs, tokens and customer data are excluded from this public vault. Reproduce them through the account's read-only tools.

## Limits
The audit inventories every PR and branch, but does not claim exhaustive review of all historical diffs. Runtime conclusions use current code, relevant build logs and service metadata. Inactive databases prevent fresh schema/RLS/migration parity verification. Vercel project-detail/build-log tool calls returned unavailable/invalid-argument errors; no environment values were retrieved. Provider calls, real payments, messages and deliveries were not made. Current dependencies' security posture requires a dedicated audit, not inference from a passing build.
