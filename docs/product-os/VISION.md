---
id: vision
title: Product vision
status: accepted-strategy
updated: 2026-09-20
baseline: 05022ffd797bea8149a44bcac3959c648158b594
tags: [product-os]
---

# Product vision

**ARO helps independent cafés and restaurants sell directly, fulfill reliably and bring guests back through one branded experience.** Initial users are owner-operated venues and small groups that retain their existing POS. This is a recommended segment, not validated customer demand.

Founder direction recorded on 2026-09-20: no current clients; working features must support sales; white-label third-party delivery is essential; restaurant drivers are also supported; connect existing POS; target market remains undecided. See [decisions](decisions/DEC-001-delivery-first.md).

## Jobs to be done
| Person | Job | Evidence of success |
|---|---|---|
| ARO operator | Configure, demonstrate, onboard and support many venues | Repeatable setup, connection health and audited venue entry |
| Owner/manager | Know what needs attention and run a profitable service | Orders accepted, delivery exceptions resolved, useful sales/guest reporting |
| Staff/kitchen | Prepare the correct food and hand it to the correct person | Clear tickets, modifiers, availability and handoff milestones |
| Guest | Order or reserve quickly and trust the outcome | Clear price/time, mobile checkout, honest status and useful rewards |

## Principles
One venue product shared with HQ through explicit operator access. Brand ownership with accessible interactions. Operational truth before decorative analytics. Every displayed metric has a definition and data source. Integrations advertise only verified capabilities. Helpful AI proposes actions; deterministic code and explicit permissions execute them.

The experience is warm, calm and premium. A restaurant's brand is the guest-facing identity; ARO is the operating system behind it. Three primary surfaces are HQ, venue and guest; counter, kitchen and driver views are focused work modes.

## Differentiation hypotheses
Connect delivery economics to repeat-guest value; connect actual menus/offers to Creative Studio; surface actionable exceptions; make onboarding and connection health understandable. Validate these with prospect interviews and pilot observations. No claim of competitive superiority until measured.

## Non-goals for initial release
Full POS/register replacement; card-terminal certification; banking or lending; payroll processing; stored-value gift cards; autonomous refunds or campaigns; universal worldwide delivery; native apps before a verified web/PWA journey.

## Measures
Track demo journey completion, time to configure a synthetic venue, setup exceptions, accepted-order-to-handoff time, dispatch failure rate, duplicate paid side effects (target zero), guest repeat rate and support effort. Establish conversion baselines after prospects exist; do not invent sales uplift targets.

Related: [benchmark](COMPETITIVE-BENCHMARK.md), [design](DESIGN-SYSTEM-STRATEGY.md), [roadmap](ROADMAP.md).
