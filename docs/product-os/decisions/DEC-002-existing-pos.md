---
id: dec-002-existing-pos
title: DEC-002: Connect the existing POS
status: documented
updated: 2026-09-20
tags: [product-os]
---

# DEC-002: Connect the existing POS
Status: accepted by founder, 2026-09-20.

## Decision
ARO owns branded direct ordering, delivery orchestration, guest growth and connected operational experiences. Retain each restaurant's existing POS. Build adapters and reconciliation, not terminals/registers/cash drawers.

Default imported menu source of truth is POS; ARO owns presentation and direct-order delivery records. Require POS acknowledgement before treating connected orders as accepted for courier dispatch. First live connector depends on first client/vendor access.

## Consequences
Toast product research informs capabilities but does not confer API access. Full POS replacement, terminal payments and offline POS remain out of initial scope.

Related: [architecture](../ARCHITECTURE.md), [SPEC-05](../specs/SPEC-05-pos-connection.md), [registry](../INTEGRATION-REGISTRY.md).
