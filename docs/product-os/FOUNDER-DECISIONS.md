---
id: founder-decisions
title: Founder decision queue
status: accepted-strategy
updated: 2026-09-20
baseline: 05022ffd797bea8149a44bcac3959c648158b594
tags: [product-os]
---

# Founder decision queue

Back to [Product OS](README.md) and [ledger](EXECUTION-LEDGER.md). No routine implementation question needs to block documentation, local tests or simulator work.

| Gate | Decision needed | Recommendation / consequence |
|---|---|---|
| F-01 | First country/city and target venue type | Start in one service area; required for live courier, tax, language and consent qualification |
| F-02 | Demo/staging environment and inactive project disposition | Isolated synthetic environment first; do not resume or modify existing projects without approval |
| F-03 | Courier account owner, billing party and spend cap | Prefer merchant-attributed accounts where provider supports platforms; no provider commitment until contract reviewed |
| F-04 | First POS vendor and access | Connect the first real client's POS; do not promise Toast certification before acceptance |
| F-05 | Stripe account/merchant-of-record, refunds and tips | Resolve historical D-17; define restaurant vs courier tip recipient and failure reimbursement |
| F-06 | Messaging vendor, sender identity and first-market requirements | Transactional order notices first; marketing separately consented; no sending before approval |
| F-07 | Production activation and release approval | Require isolated staging evidence plus controlled delivery plan and approved spend |

## Already decided
White-label courier delivery is core, multiple providers are the direction, own-driver support remains, existing POS is retained, premium coherent ARO experience, sales readiness precedes self-service. No need to ask these again.

## Deferred without blocking core development
Pricing tiers; native apps; payroll processing; stored value; voice provider; lending; unrestricted autonomous customer AI. Do not buy accounts to resolve an unknown.

Historical decisions are not silently erased. [DEC-001](decisions/DEC-001-delivery-first.md), [DEC-002](decisions/DEC-002-existing-pos.md) and [DEC-003](decisions/DEC-003-ai-boundary.md) record supersession and compatibility.
