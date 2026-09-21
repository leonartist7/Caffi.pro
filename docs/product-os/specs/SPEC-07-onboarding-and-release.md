---
id: SPEC-07
title: Client onboarding and release qualification
status: ready-spec
updated: 2026-09-20
tags: [product-os, execution-packet]
---

# SPEC-07: Client onboarding and release qualification

Back to [worker protocol](../WORKER-PROTOCOL.md), [ledger](../EXECUTION-LEDGER.md) and [roadmap](../ROADMAP.md).

## Objective and scope
Produce an executable onboarding checklist and operator runbook covering brand/menu import, roles, hours/tax/currency, integration setup, training, data policy, staging acceptance and rollback. Add connection health and release evidence views needed for ARO support. Qualify the end-to-end first client release.

**Non-goals:** No automated production deploy, subscription pricing invention, forced provider signup or guarantee that vendor approval fits 3–4 weeks.

## Ownership and constraints
**Owned modules:** ARO HQ client/onboarding/health modules, runbooks, release checks and docs/product-os/handoffs; shared provider modules read-only unless coordinated.

Account credentials are entered through approved server configuration, never copied to docs. Separate synthetic/demo, staging and production. Launch checklist cannot be marked passed from a build alone. Founder owns production activation and spend.

## Acceptance and test plan
A new synthetic venue can be configured from the checklist, with documented expected inputs and ownership. Failed connection check has actionable safe guidance. Release record has exact app/schema revisions, local/sandbox/live results, known gaps, rollback and founder approval. Real delivery proof is required for live courier claims.

**Tests:** Rehearse onboarding from empty disposable tenant; verify permissions, branding, menus, payment test, kitchen, courier sandbox, POS acknowledgement, guest tracking, loyalty and consent. Verify rollback disables new effects while preserving reconciliation. Test operator audit attribution.

## Dependencies, risk and release gate
**Dependencies:** SPEC-01–06 for release; runbook drafting starts immediately. Founder supplies first market/client/provider decisions.

**Risks:** Environment mismatch, incomplete merchant setup, unexplained support responsibility and premature live-readiness claims.

**Release gate:** All mandatory packet gates pass; no critical tenant or duplicate-money risk; F-01–07 satisfied. Controlled real delivery and production activation require explicit approval.

**Lead:** GPT-6 Astra xhigh. Sensitive changes require independent GPT-6 Astra xhigh review. Bounded non-sensitive subwork may use Sol high or Luna medium–high under the worker protocol.

## Ready-to-paste worker prompt
> Execute SPEC-07 as a reproducible onboarding and release qualification exercise. Start with a clean synthetic tenant and follow the documented steps. Record failures and exact evidence; do not mark blocked steps passed. Prepare a concrete controlled-delivery and rollback plan for founder approval. Do not merge, deploy or spend automatically.
