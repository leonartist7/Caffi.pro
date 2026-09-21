---
id: SPEC-04
title: First white-label courier connection
status: ready-spec
updated: 2026-09-20
tags: [product-os, execution-packet]
---

# SPEC-04: First white-label courier connection

Back to [worker protocol](../WORKER-PROTOCOL.md), [ledger](../EXECUTION-LEDGER.md) and [roadmap](../ROADMAP.md).

## Objective and scope
Create an Uber Direct feasibility dossier first. Once sandbox credentials/access are authorized, implement its adapter, quote/create/lookup/cancel/event mapping and provider contract tests. Record unsupported features explicitly. Prepare a second-adapter dossier for DoorDash or a suitable regional/aggregator option; do not implement it before access.

**Non-goals:** No marketplace ingestion, paid real dispatch, automatic provider switching, unapproved merchant/platform accounts or claimed worldwide coverage.

## Ownership and constraints
**Owned modules:** lib/delivery/adapters/uber-direct.ts, adapter-specific tests/fixtures, safe connection health UI, integration registry. Core contracts change only through SPEC-03 owner review.

Pin official API/version evidence and region/account model. Authenticate raw-body webhook signatures per current vendor docs; bind event to stored connection/job. Minimize shared PII. Stable operation/reference and lookup semantics must resolve unknown outcomes; manual review if API cannot prove absence.

## Acceptance and test plan
Recorded feasible region/account arrangement, quote expiry/currency mapping, canonical statuses and safe errors. Sandbox lifecycle succeeds and failure/cancellation scenarios are exercised. Missing credentials leave connection not configured. Provider test success is labelled sandbox verified, never live.

**Tests:** Signed/invalid event fixtures, provider schema changes, quote unavailable/expired, token expiry, timeout after create, duplicate event, cancellation rejection, provider lookup; opt-in sandbox end-to-end with sanitized evidence.

## Dependencies, risk and release gate
**Dependencies:** SPEC-03; founder commercial gates. Feasibility research can proceed without credentials; adapter sandbox execution cannot.

**Risks:** Account arrangement unsupported for multi-tenant platforms, provider access delay, changing fees, cancellation charges and unsupported reference lookup.

**Release gate:** SPEC-03 contract suite plus approved vendor/account and independent Astra xhigh review. Live qualification additionally requires F-01/03/05/07 and a separately approved controlled delivery.

**Lead:** GPT-5.6 Terra high. Sensitive changes require independent GPT-6 Astra xhigh review. Bounded non-sensitive subwork may use Sol high or Luna medium–high under the worker protocol.

## Ready-to-paste worker prompt
> Execute SPEC-04 with Uber Direct as the first feasibility candidate, not an assumed approved vendor. Document account/region/cost/data boundaries from current official sources. Implement only against authorized sandbox access using the reviewed delivery contract. Do not create paid accounts or real deliveries. Report unsupported cases and update registry/ledger; draft PR only.
