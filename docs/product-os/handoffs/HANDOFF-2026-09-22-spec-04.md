---
id: handoff-2026-09-22-spec-04
title: Handoff: SPEC-04 Uber Direct feasibility and fixtures
status: blocked-access
updated: 2026-09-22
tags: [product-os, handoff, spec-04]
---

# SPEC-04 independent fixture slice

Back to [SPEC-04](../specs/SPEC-04-first-courier.md), [dossier](../evidence/UBER-DIRECT-2026-09-22.md) and [ledger](../EXECUTION-LEDGER.md).

## Dependency and ownership

Branch: `codex/spec-04-first-courier`; base: `ef3afe239aba282604670496675ea72e73250a99` (open draft PR #85). Underlying Phase 1 #84 is `c1b51d998eec961b00830d17bb5662737d4d5366`; Product OS #83 is `2e24f4164d61a4d48b2046c3750429e5f94f506a`. This independent branch contains only provider research, offline protocol fixtures/tests, their package script and Product OS updates. Draft publication is owned by the integrator after deployment exclusion is verified. Before adapter work, rebase onto exact approved SPEC-03 contract SHA and target its branch while unmerged.

## Changes and evidence

- AC-01: dated official-source dossier separates documented protocol from unresolved geography, account/billing, cancellation cost and unknown-booking guarantees.
- AC-02: `npm run test:courier-fixtures` passes 4 tests on local Node, without dependencies/network. Raw-byte HMAC mutation, malformed signature, replay limitations and expiry boundary are tested. Fault fixtures cover invalid address, unavailable quote, token expiry, ambiguous create and rejected cancellation. HTTP faults are explicitly hypothetical; no provider error schema or adapter correctness is claimed.
- `node docs/product-os/check.mjs` passed (40 documents, 181 relative links); `git diff --check` passed after trimming trailing blank lines. CI now runs the fixture script. App types/build/regression checks are inherited dependency evidence, not rerun or promoted by this documentation/fixture slice.
- AC-03 adapter: not implemented, blocked by missing authorized Uber Direct test credentials/customer account and independent SPEC-03 contract approval. AC-04 sandbox: not run. SQL/RLS/browser and live: not run. Accepted Phase 2 Astra xhigh review is static only; critical Next.js audit and Phase 1 OpenCode finding remain unresolved.

## Recovery, rollback and next action

No migrations or application runtime configuration changed. `vercel.json` disables automatic Git deployments for both scoped Phase 3 branches while preserving existing crons, following the integrator-verified official Vercel setting; no deployment was initiated. Revert this slice to remove fixtures; preserve historical acceptance evidence. The recovery design is manual reconciliation after ambiguous create when no provider reference or reliable absence proof exists; never immediate failover or a new booking key. No operational provider calls exist to disable.

Next owner is SPEC-04 implementer. Obtain authorized sandbox credentials through secret storage (never commit them), chosen service area and account/billing authorization; read the completed Astra ultra core-contract review and record its approved SHA. Retrieve complete DaaS schema and resolve lookup/idempotency guarantees, then implement adapter contract tests and opt-in sandbox lifecycle. Independent Astra xhigh safeguards review and separately authorized real delivery remain later gates. No account activation, deployment, database mutation, customer message, real refund or real courier request occurred.
