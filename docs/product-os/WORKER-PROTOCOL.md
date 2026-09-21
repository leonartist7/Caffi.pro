---
id: worker-protocol
title: Worker protocol
status: accepted-strategy
updated: 2026-09-21
tags: [product-os]
---

# Worker protocol

Back to [ledger](EXECUTION-LEDGER.md), [roadmap](ROADMAP.md) and [quality](QUALITY-STRATEGY.md).

Every worker follows the [continuity procedure](CONTINUITY.md) at startup, before implementation, at review and at handoff. Documentation maintenance is part of the packet's definition of done.

## Packet index
- [SPEC-01 quality and access](specs/SPEC-01-quality-and-access.md)
- [SPEC-02 connected sales journey](specs/SPEC-02-connected-sales-journey.md)
- [SPEC-03 delivery foundation](specs/SPEC-03-delivery-foundation.md)
- [SPEC-04 first courier](specs/SPEC-04-first-courier.md)
- [SPEC-05 POS connection](specs/SPEC-05-pos-connection.md)
- [SPEC-06 growth and creative](specs/SPEC-06-growth-and-creative.md)
- [SPEC-07 onboarding and release](specs/SPEC-07-onboarding-and-release.md)

## Parallel execution
Separate worktree/branch per worker from current main or an explicitly reviewed dependency commit. Never continue a stale historical branch by name alone. Claim packet and file ownership before edits. Shared app/api/orders, Stripe webhook, authz, lib/modules, migrations and ledger have one writer at a time.

SPEC-01 owns auth/test infrastructure. SPEC-02 owns checkout/demo UX and payment recovery. SPEC-03 owns delivery core and new delivery routes; negotiate its order integration after SPEC-02 contract lands. SPEC-04 owns only courier adapter/contract fixtures. SPEC-05 owns POS boundary and mapping UI. SPEC-06 owns loyalty/AI/growth after shared identity work. Integrator owns shared schema numbering and ledger conflict resolution. Keep migrations sequential and generated with the supported CLI.

Independent evidence extraction, UI-only polish and provider feasibility can run alongside core work. Parallel tasks must use immutable reviewed contracts, not assumptions about unmerged code.

## Model allocation
| Work | Model | Thinking |
|---|---|---|
| Strategy, architecture, security, provider boundaries | GPT-6 Astra | ultra |
| Cross-system spec review | GPT-6 Astra | xhigh–ultra |
| Data/auth/payment/delivery vertical slice | GPT-5.6 Terra | high |
| Complex implementation within reviewed safe boundaries | GPT-5.6 Sol | high |
| Bounded tests/refactors/UI without sensitive changes | GPT-5.6 Luna | medium–high |
| Evidence extraction and routine docs | GPT-5.6 Luna | medium |
| Independent security/architecture review | GPT-6 Astra | xhigh |

These are worker recommendations, not runtime Gateway model IDs. Never send these display names as provider model slugs.

## Standard handoff
Report objective, owned paths, base/head SHA, changes, exact checks/results, failures/blocked tests, migration compatibility, rollback, external effects (normally none), ledger update and next owner. Draft PRs are reviewable deliverables; no automatic merge or production deploy.

## Stop boundaries
Stop only the dependent action when credentials, commercial authority or founder decisions are missing. Continue local tests, contracts and synthetic fixtures. Do not run old “RUN SQL NOW” documents against any live project. Escalate conflicts over tenant ownership, money or irreversible external effects to the architecture reviewer.
