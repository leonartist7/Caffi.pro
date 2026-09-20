---
id: roadmap
title: Roadmap
status: accepted-strategy
updated: 2026-09-20
tags: [product-os]
---

# Roadmap

Back to [vision](VISION.md) and [execution ledger](EXECUTION-LEDGER.md). Day 1 starts when implementation workers begin; dates below are relative targets, not vendor promises.

| Window | Slice / outcome | Dependencies and gate | Lead |
|---|---|---|---|
| Week 1 | Product OS, current truth, decision records and worker packets | This documentation PR reviewed; no production mutation | GPT-6 Astra ultra |
| Weeks 1–2 | SPEC-01: repeatable tests and revoked-access fix | Local fixtures; security review before real connections | GPT-5.6 Terra high |
| Weeks 1–3 | SPEC-02: coherent sales journey with test payment and recovery | SPEC-01 access gates; isolated demo environment | GPT-5.6 Terra high |
| Weeks 2–5 | SPEC-03: delivery lifecycle, simulator and driver task | Reviewed contracts, tests, payment semantics | GPT-5.6 Terra high |
| Weeks 4–7 | SPEC-04: first courier sandbox connection | Account/coverage/billing gates; no guaranteed provider approval date | GPT-5.6 Terra high |
| Weeks 5–8 | SPEC-05: first POS connector | Vendor/client access; acknowledged order contract | GPT-5.6 Terra high |
| Weeks 6–10 | SPEC-06: qualified loyalty and grounded creative/growth | Repeatable journeys, Gateway review; sends separately gated | GPT-5.6 Terra high |
| Weeks 9–13 | SPEC-07: onboarding and release qualification | Full staging evidence; explicit production approval | GPT-6 Astra xhigh |

## Now
Publish this Product OS. Run SPEC-01 and bounded SPEC-02 work. In parallel, prepare provider feasibility dossiers without opening paid accounts. Design delivery contracts and test fixtures without waiting for a market decision.

## Next
End-to-end simulator delivery, payment recovery, own-driver milestones, first approved courier adapter and first POS connection. Demo should tell a complete story from branded order to kitchen, handoff, guest status and repeat visit.

## Later
Scheduled/capacity-managed ordering, combos/catering, additional POS/courier adapters, richer inventory and analytics, native apps, self-service onboarding/billing. Add a second adapter after the first has proven the contract; do not build five unqualified connectors in parallel.

## Explicitly blocked
Live courier dispatch without city/access/billing approval; production database restoration/mutations; real payments; outbound messaging; autonomous booking/discount/refund/campaign tools; regulated stored value/payroll; voice provider activation. [Founder queue](FOUNDER-DECISIONS.md).

## Definition of a sellable showcase
Synthetic venue can complete ordering, preparation, simulated delivery and loyalty visibly and honestly. External test-mode flows are clearly labelled. Promised live integrations require their own evidence. A 3–4 week client deployment is a planning assumption after access and data prerequisites arrive, not a guarantee of vendor certification.

## Success review
Review after each slice: complete journey evidence, unresolved exceptions, support burden, cost assumptions and founder feedback. Reduce breadth before sacrificing a functioning order-to-delivery loop. Never call the 90-day programme complete simply because all planned screens exist.
