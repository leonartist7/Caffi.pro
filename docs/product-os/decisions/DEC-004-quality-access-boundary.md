---
id: dec-004-quality-access-boundary
title: DEC-004: Active membership is an application authorization boundary
status: documented
updated: 2026-09-21
tags: [product-os, security, quality]
---

# DEC-004: Active membership is an application authorization boundary

Status: implementation decision, pending independent security review.

## Context and decision

The service-role-backed `requireVenueRole` had a venue/org/role match but did not require `memberships.is_active`, despite the RLS helpers and `requireAroAdmin` already doing so. Because route guards authorize service-role reads, RLS cannot compensate for a missing route-gate predicate.

Require active membership in both the database query and the in-memory match. Preserve existing role scope: active venue roles match only the stored venue; active org-wide roles match only the stored organization; active `aro_admin` remains platform-wide. The stored resource tenant is resolved before row authorization. Keep 400/401/403/404/500 response semantics unchanged.

## Consequences

Vitest mocks test route-gate behavior, including revoked owner/manager/admin memberships and cross-tenant guessed resource IDs. A disposable local database must separately replay migrations and run RLS/SQL tests; no mocked result closes an RLS gate. Production database/RLS changes are neither required nor authorized by this decision.

The existing comment-triggered agent workflow now admits only trusted repository associations and pins its actions by immutable SHA. This reduces trigger/supply-chain risk but does not replace review of prompts, permissions or branch protection.

Related: [SPEC-01](../specs/SPEC-01-quality-and-access.md), [security strategy](../SECURITY-AND-COMPLIANCE.md), [quality strategy](../QUALITY-STRATEGY.md), [handoff](../handoffs/HANDOFF-2026-09-21-spec-01.md).
