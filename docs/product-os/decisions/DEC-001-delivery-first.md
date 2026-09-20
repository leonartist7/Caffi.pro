---
id: dec-001-delivery-first
title: DEC-001: Delivery-first commercial release
status: documented
updated: 2026-09-20
tags: [product-os]
---

# DEC-001: Delivery-first commercial release
Status: accepted by founder, 2026-09-20.

## Context and decision
Founder needs a working product to win first clients. White-label courier delivery across multiple providers is essential, alongside restaurant drivers. It moves from the old broadly blocked delivery backlog into a core engineering workstream. Live vendor activation remains gated by market/access/billing.

Build the shared lifecycle and simulator now; investigate Uber Direct first, and add other adapters after access. Preserve ARO branding and existing merged code. Sales readiness precedes self-service.

## Consequences
No courier claim based only on delivery zones. No guaranteed provider acceptance timeline. No paid dispatch without approval. Architecture supports multiple providers; first release qualifies one accessible integration.

Supersedes historical sequencing, not historical vendor contracts (none are established here).

Related: [vision](../VISION.md), [delivery contract](../DELIVERY-ARCHITECTURE.md), [founder gates](../FOUNDER-DECISIONS.md).
