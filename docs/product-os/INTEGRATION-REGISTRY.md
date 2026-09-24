---
id: integration-registry
title: Integration registry
status: accepted-strategy
updated: 2026-09-22
tags: [product-os]
---

# Integration registry

Back to [architecture](ARCHITECTURE.md) and [founder gates](FOUNDER-DECISIONS.md). Inspected 2026-09-20. None of the proposed vendors is commercially selected by this document.

| Integration | Purpose / data boundary | Cost and access | Current status / next proof |
|---|---|---|---|
| Supabase | Auth, tenant data, operational records | Existing account; restoration/capacity cost not verified | Relevant projects INACTIVE; F-02, read-only parity then isolated tests |
| Vercel | Hosting, schedules, previews | Existing account; runtime/cron limits verify before worker activation | Current main READY; env parity unknown |
| Stripe | Hosted checkout, signed payment events; no card details stored by ARO | Processing/account/Connect costs unresolved, F-05 | Code present; test reconciliation then approved merchant setup |
| Uber Direct | Courier delivery; minimum address/contact/order metadata | Per-delivery terms, region and platform account arrangement unverified | First feasibility candidate, API sandbox documented [D1] |
| DoorDash Drive | Direct courier service, not marketplace listings | Production access restricted; no timeline [D2] | Adapter only after access gate |
| Deliverect | Candidate POS/channel/dispatch intermediary | Partner agreement, supported direction and merchant billing unknown [D3] | Validate ARO as ordering partner; do not mistake courier-partner API for dispatcher access |
| Stuart | Regional courier service, delivery contacts | Account, coverage and commercial quote [D4] | Candidate when service area chosen |
| Shipday | Own-driver management and eligible courier aggregation | Published on-demand API lists US/Professional/card/manual enabling [D5] | Verify applicability with vendor before selection |
| POS vendor | Menu IDs/prices/availability, order injection and status | First client POS unknown; Toast requires approval [D6] | Contract/spec only until F-04 |
| Email/SMS | Transactional updates and separately consented campaigns | Resend/Twilio appear as historical candidates; no new selection | No sends; F-06 |
| Web push | Subscriptions and consent-scoped notifications | VAPID exists in code; device/browser limits | Real-device qualification pending |
| AI Gateway | Server model routing; minimized venue context | Current model/region/retention and budgets verified at activation [D7] | Future replacement path for direct OpenAI boundary |
| Apple/Google Wallet | Loyalty passes | Signing identities and programme access | Explicit current stubs |
| Address/maps | Address quality, serviceability and optional maps | Vendor and geocoding terms depend on chosen market | Use provider validation first; no paid map vendor silently added |
| Accounting/payroll/delivery marketplaces | Separate commercial systems | Access, data scope and compliance unresolved | Later discovery only |

## Connection lifecycle

SPEC-03 draft PR #87 implements disabled-by-default, tenant-scoped connection records and a strictly local synthetic simulator/restaurant-driver engine. Its provider factory rejects external adapters; no credentials are stored or requested here. Simulator is not Uber's sandbox. SPEC-04 feasibility and four offline protocol tests are independently reviewable in PR #86; absent authorized access remains the precise adapter execution blocker.
Not connected → configured → test verified → live verified; any state can become attention needed. Store last check, safe error category, capability flags and environment. Credentials are server-held references, never displayed values. Disconnect disables new work but preserves reconciliation/audit records.

Every adapter dossier must name vendor, purpose, account owner, service geography, PII fields, retention/deletion, price basis, limits, sandbox coverage, webhook authentication, timeout semantics, cancellation/refund policy, support channel and evidence date. Missing facts remain explicit; logos and marketing pages do not count as connectivity.

## Sources
- D1: [Uber Direct overview](https://help.uber.com/merchants-and-restaurants/article/what-is-uber-direct?nodeId=9729ad9d-6f2c-496c-87de-4f56927ed4d7), [API test flow](https://developer.uber.com/docs/deliveries/get-started)
- D2: [DoorDash production access](https://developer.doordash.com/en-US/docs/drive/how_to/get_production_access/)
- D3: [Deliverect APIs](https://www.deliverect.com/en/api-integrations), [dispatch overview](https://developers.deliverect.com/v3.0-ordering-experience/docs/dispatch-overview)
- D4: [Stuart integration setup](https://stuart.com/developers/setup-for-success/)
- D5: [Shipday on-demand API](https://docs.shipday.com/reference/on-demand-delivery)
- D6: [Toast integration partnership](https://doc.toasttab.com/doc/devguide/integrationDevProcess.html)
- D7: [Vercel AI Gateway](https://vercel.com/docs/ai-gateway)

## 2026-09-22 verification boundary

SPEC-03 simulator and restaurant-driver browser/API/database lifecycles pass in [CI 35777014123](https://github.com/leonartist7/Caffi.pro/actions/runs/35777014123) at `3b07268`: eight SQL suites and four genuine browser tests. This changes only the isolated simulator verification status. Uber Direct remains research/offline fixtures in separate PR #86, with no authorized sandbox credentials or execution. No external adapter or live courier readiness is claimed.

## 2026-09-24 AI Gateway boundary

SPEC-06 includes an opt-in server-side OpenAI-compatible Gateway adapter that checks the current model catalogue and requires a configured key/model plus a venue budget before generation. This has only mocked local coverage; no paid call, vendor sandbox or live verification occurred. Gateway model, region, retention and commercial authorization must be checked again before activation. Email/SMS campaign sending and push remain gated by F-06.

Referral follow-up and review analytics remain application/local-database capabilities, not vendor integrations. Their deterministic loopback fixtures and independent static review do not grant messaging, real-device push or AI provider activation. F-06 still controls external sends.
