---
id: SPEC-05
title: Existing POS connection and reconciliation
status: ready-spec
updated: 2026-09-24
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

### Phase 4 acceptance contract (2026-09-24)

| ID | Contract, ownership and failure behavior | Required evidence |
|---|---|---|
| SPEC-05-AC-01 | A venue owns one explicit POS connection per provider/environment. Service-only records contain no credentials; disconnected means no new submission. A revoked member or foreign tenant cannot view or operate it. | SQL/RLS and API authorization tests |
| SPEC-05-AC-02 | A versioned menu import binds external category/item/modifier IDs to one connection and venue. POS owns imported names, prices and availability; ARO presentation is separate. Missing mappings, invalid currency or partial import leaves the last committed version intact. | Simulator import and transactional SQL tests |
| SPEC-05-AC-03 | A paid direct order has one durable submission key and one POS ticket. Unknown outcome is reconciled by lookup with the same key; no second create or failover. Restart, concurrent worker and duplicate event preserve this invariant. | SQL concurrency and simulator tests |
| SPEC-05-AC-04 | Acknowledged, rejected and unknown are distinct states. Only acknowledged connected orders may satisfy delivery's restaurant-acceptance prerequisite. Delayed acknowledgements and cancellation races do not silently advance orders. | API/database journey and SQL tests |
| SPEC-05-AC-05 | Owner/manager staff queue shows connection health, sync/rejection/unknown exceptions and reasoned recovery; revoked/cross-tenant access is denied. | Browser/keyboard and API tests |
| SPEC-05-AC-06 | First real adapter requires named client/vendor, documented write/read scope and authorized sandbox. Without F-04, only simulator/offline fixtures are accepted. | Vendor dossier plus sandbox result, or exact blocker |

The initial implementation owns lib/pos, POS routes, additive POS migration and tests. Shared order/delivery changes are limited to the acknowledged-order guard. Operations must resolve tenant from stored resources before service-role writes; user-provided venue IDs never authorize themselves. The POS event inbox must authenticate vendor messages by the vendor's documented protocol before state mutation. A simulator has no network or live effects. Migration rollback disables connections/workers and retains tickets, attempts and event history for reconciliation.
## Dependencies, risk and release gate
**Dependencies:** SPEC-01 and SPEC-02 order contract; SPEC-03 shared acceptance semantics. First client POS and vendor API rights not yet selected.

**Risks:** POS API write access may require commercial approval; partial menu mappings can produce incorrect tickets; duplicate source-of-truth editing causes price drift.

**Release gate:** Contract simulator passes and Astra xhigh reviews integration boundary. Vendor sandbox certification and F-04 required for real adapter; no live POS write without approved release.

**Lead:** GPT-5.6 Terra high. Sensitive changes require independent GPT-6 Astra xhigh review. Bounded non-sensitive subwork may use Sol high or Luna medium–high under the worker protocol.

## Ready-to-paste worker prompt
> Implement the SPEC-05 POS boundary and deterministic connector simulator. Preserve the restaurant's existing POS as menu source of truth. Prove duplicate/unknown submission recovery and tenant mapping before a real adapter. Record the first client's vendor access as a gate; do not imply Toast access from its public docs. Update ledger and open a draft PR.
