---
id: dec-003-ai-boundary
title: DEC-003: Controlled AI Gateway boundary
status: documented
updated: 2026-09-20
tags: [product-os]
---

# DEC-003: Controlled AI Gateway boundary
Status: accepted strategic direction, implementation pending.

## Context and decision
Current code selects a direct OpenAI adapter for captions/digests. Preserve the server-only abstraction and draft approval workflow while introducing Vercel AI Gateway where supported. This supersedes the historical direct-provider-only direction prospectively; no provider switch occurs in this documentation PR.

Separate owner insights, creative drafts, guest support/reservation assistance, marketing drafts and voice. Each has an explicit capability contract, permitted data, task quality checks and budget. Validate current model IDs/capabilities before implementation. Worker model recommendations are not application model IDs.

## Controls
Tenant-scoped retrieval; schema validation; bounded retries; provider/model allowlists; cost reservation and usage settlement; sanitized audit; no keys in client; no autonomous money, booking, discount or message action without deterministic permission and human-approved policy.

Voice remains separately gated on telephony and consent. Gateway does not supply a courier network, CRM sender identity or telephony contract.

Related: [architecture](../ARCHITECTURE.md), [SPEC-06](../specs/SPEC-06-growth-and-creative.md), [security](../SECURITY-AND-COMPLIANCE.md).
