---
id: competitive-benchmark
title: Competitive benchmark
status: accepted-strategy
updated: 2026-09-20
tags: [product-os]
---

# Competitive benchmark

Back to [vision](VISION.md), [capability map](CAPABILITY-MAP.md) and [integration registry](INTEGRATION-REGISTRY.md).

Research date: 2026-09-20. Public vendor pages and developer documentation only. “Documented” means the vendor advertises or documents the capability, not that ARO has tested the product or gained API rights. We reproduce functional requirements, not competitor branding, assets or source code.

| Capability group | Benchmark evidence | ARO requirement / choice |
|---|---|---|
| Direct ordering | Restolabs documents branded pickup/delivery, modifiers, scheduled orders and throttling [S1] | Complete immediate ordering first; scheduled/capacity controls next |
| Delivery | Restolabs documents outside fleets, own-driver integration, zones, hours and guest updates [S2] | One courier lifecycle with own-driver mode; vendor-specific capabilities explicit |
| Digital conversion | Toast documents branded ordering, location selection, offers, upsells and order-volume controls [S3] | Strong mobile checkout, availability and a measurable conversion funnel |
| Kitchen | Toast documents ticket fulfillment, production views and device permissions [S4] | Reliable queue and handoff first; advanced station/coursing features later |
| Offline operation | Toast distinguishes local POS/KDS behavior from online orders [S5] | ARO communicates outages honestly; no implied offline card processing |
| Guest relationship | Toast describes unified guest CRM, loyalty and marketing [S6] | Join orders/reservations/loyalty through tenant-scoped guest identity |
| Back office | Toast describes inventory, invoices, accounting and workforce tools [S6] | Preserve current stock/team reports; defer regulated payroll and banking |
| Brand ecosystem | Restolabs describes website, mobile app, reporting and QR experiences [S7] | Website and web/PWA first; native apps only after real-device value is proven |
| AI assistance | Toast describes data-grounded suggestions and workflow actions [S6] | Grounded summaries and draft approvals first; deterministic permissions for actions |
| POS access | Toast requires partner approval and certification [S8] | First connector depends on client/vendor access; no assumption of open write APIs |

## Opportunities to validate
Delivery cost visibility alongside guest repeat value; clearer exception handling; consistent role-aware owner workflows; an integrated brand/creative approval loop; onboarding with visible connection health. These are hypotheses, not proven competitor deficiencies.

## Pricing and commercial research limits
Restolabs' retrieved pricing page rendered $00 base-plan values and mixed add-on wording [S9]; another public landing page showed different tier figures [S10]. Do not quote these as validated current prices. Obtain a written quote for competitive economics. “Commission free” does not mean no payment-processing, courier, platform or messaging costs. ARO pricing remains a founder decision after unit economics.

## Source register
- S1: [Restolabs online ordering](https://www.restolabs.com/product/online-ordering)
- S2: [Restolabs delivery management](https://www.restolabs.com/product/delivery-management)
- S3: [Toast online ordering](https://pos.toasttab.com/products/online-ordering)
- S4: [Toast KDS setup](https://support.toasttab.com/en/article/Get-Started-With-the-Kitchen-Display-System)
- S5: [Toast offline behavior](https://support.toasttab.com/en/article/Using-Toast-in-Offline-Mode)
- S6: [Toast platform](https://pos.toasttab.com/toast-platform)
- S7: [Restolabs features](https://www.restolabs.com/features)
- S8: [Toast partnership process](https://doc.toasttab.com/doc/devguide/integrationDevProcess.html)
- S9: [Restolabs pricing](https://www.restolabs.com/pricing)
- S10: [Restolabs product landing page](https://www.restolabs.com/lp/restolabs-product-features)

Recheck source date, region, package, API access and restrictions before each implementation commitment. No gated-page scraping or authenticated competitor access was performed.
