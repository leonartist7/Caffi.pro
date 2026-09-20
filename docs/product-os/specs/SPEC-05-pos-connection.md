---
id: SPEC-05
title: Existing POS connection and reconciliation
status: ready-spec
updated: 2026-09-20
tags: [product-os, execution-packet]
---

# SPEC-05: Existing POS connection and reconciliation

Back to [worker protocol](../WORKER-PROTOCOL.md), [ledger](../EXECUTION-LEDGER.md) and [roadmap](../ROADMAP.md).

## Objective and scope
Introduce PosProvider with importMenu, getAvailability, submitOrder, lookupOrder and normalizeEvent capabilities. Define external IDs per venue/connection for categories/items/modifiers. Build contract simulator and connection health view before the first vendor adapter. Implement the first real adapter only for an approved client/vendor.

**Non-goals:** No register, cash drawer, terminal payment, offline POS replacement, marketplace ingestion or unrestricted bidirectional menu editor.

## Ownership and constraints
**Owned modules:** New lib/pos, POS API/webhook routes, mapping/settings UI and scoped data migrations/tests. Shared order effects are coordinated with delivery/payment owners.

POS owns imported menu/prices/availability; ARO owns guest presentation and direct-order delivery. Imported fields are read-only or edited through the upstream system. Delivery dispatch requires restaurant acceptance; for connected POS venues that acceptance must include a successful POS acknowledgement. Use external order reference and lookup before retry after an unknown submission.

## Acceptance and test plan
Import creates deterministic mappings without duplicate items; availability changes reach checkout validation. One ARO order produces one acknowledged POS ticket in simulator/sandbox. Rejection creates a visible exception. Timeout remains unknown until lookup resolves. Disconnected POS cannot silently lose orders.

**Tests:** Modifier mapping, removed items, invalid currency, partial import rollback, duplicate events, rejected submission, timeout-after-accept, two-tenant IDs, availability race at checkout and connection disconnect/reconnect.

## Dependencies, risk and release gate
**Dependencies:** SPEC-01 and SPEC-02 order contract; SPEC-03 shared acceptance semantics. First client POS and vendor API rights not yet selected.

**Risks:** POS API write access may require commercial approval; partial menu mappings can produce incorrect tickets; duplicate source-of-truth editing causes price drift.

**Release gate:** Contract simulator passes and Astra xhigh reviews integration boundary. Vendor sandbox certification and F-04 required for real adapter; no live POS write without approved release.

**Lead:** GPT-5.6 Terra high. Sensitive changes require independent GPT-6 Astra xhigh review. Bounded non-sensitive subwork may use Sol high or Luna medium–high under the worker protocol.

## Ready-to-paste worker prompt
> Implement the SPEC-05 POS boundary and deterministic connector simulator. Preserve the restaurant's existing POS as menu source of truth. Prove duplicate/unknown submission recovery and tenant mapping before a real adapter. Record the first client's vendor access as a gate; do not imply Toast access from its public docs. Update ledger and open a draft PR.
