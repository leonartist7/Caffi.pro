# Phase 6+ candidates — deferred commerce stack (not scheduled)

**Status: deferred, not planned in detail.** Captured 2026-07-10 from a
Restolabs feature-parity request. Decision: aro stays loyalty-first through
Plans 1–5 (`docs/plans/README.md`); prove the join → visit → redeem loop with
real venues before adding a second product surface. This doc exists so the
request isn't lost, not as a build order.

## Why deferred, not rejected

The Phase 0/1 audit (`docs/audit/GAP-TABLE.md`) found Caffi.pro's core defect
was persona mismatch — it tried to be an ordering PWA instead of the focused
owner/staff/diner loyalty loop the Blueprint specifies. Building Restolabs'
ordering/delivery/website/native-app stack now, before Plans 1–4 have live
venues on them, walks back into that exact mismatch. Sequencing discipline:
prove the smaller product retains owners first.

## Items NOT covered by Plans 1–5 (candidate Phase 6 scope, unordered)

| Restolabs feature                                                      | What it would require in aro                                                                     | Rough size                             |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------- |
| Zero Commission Ordering (pickup/delivery/curbside)                    | Full order-taking flow: cart, menu items w/ modifiers, order status states, kitchen-facing queue | Large — new domain                     |
| QR _Table_ Ordering                                                    | Distinct from aro's QR _join_ (loyalty check-in) — needs live menu + order-to-kitchen path       | Large — depends on Ordering above      |
| Menu Syncing                                                           | Menu CRUD + POS sync (Toast/Clover push/pull)                                                    | Medium-large, needs POS partner APIs   |
| Custom Delivery Zones & Fees                                           | Geofencing, fee rules engine, driver assignment or fleet API                                     | Large — new domain                     |
| 3rd-Party Delivery Fleet Integration (DoorDash Drive, Uber Direct)     | Partner API integrations, webhook handling for delivery status                                   | Medium, per-integration                |
| SEO-Optimized Website builder                                          | Templated public site generation, hosting per venue                                              | Large — different product (agency/CMS) |
| Branded Mobile App (native iOS/Android)                                | Native app shell or wrapped PWA, app store presence per brand                                    | Large — ongoing maintenance cost       |
| POS integrations (Toast, Clover) beyond menu sync                      | Payment terminal integration, order push                                                         | Medium-large                           |
| Payment integrations (Stripe, Authorize.net, Apple/Google Pay, PayPal) | Needed once Ordering exists; not needed for loyalty-only                                         | Depends on Ordering                    |

## Items already satisfied by the current roadmap (no Phase 6 work needed)

- Customer Data Ownership → owner already has full member contact/history (Plan 4)
- Branded Loyalty Program (points, automated rewards, targeted promos) → Plans 2–4 core; `campaigns`/`ai_drafts` tables already scaffolded
- Real-Time Analytics (loyalty-scoped) → Plan 4's one-number + tiles is the intentional, honest version — not a metrics dashboard by design

## Re-evaluation trigger

Revisit this list only after Plans 1–4 are live on ≥1 real venue and the
owner retention signal (Plan 4's "regulars returned this week") is being
checked weekly by an actual owner. Picking the first Phase 6 item before then
is premature — there's no evidence yet the loyalty loop alone retains owners.
