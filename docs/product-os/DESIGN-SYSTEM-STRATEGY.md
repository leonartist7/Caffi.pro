---
id: design-system-strategy
title: Design and experience strategy
status: accepted-strategy
updated: 2026-09-20
baseline: 05022ffd797bea8149a44bcac3959c648158b594
tags: [product-os]
---

# Design and experience strategy

Back to [Product OS](README.md); implement through [SPEC-02](specs/SPEC-02-connected-sales-journey.md).

## Direction
Keep the existing ARO cream, espresso, terra and restrained accent palette. Reuse current typography/tokens from [Tailwind configuration](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/tailwind.config.ts) and [owner shell](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/app/(owner)/owner-shell.tsx). Audit contrast before endorsing a combination. Use calm surfaces, readable tables and intentional hierarchy. Ornament must never obscure order state.

## Information architecture
- HQ: Clients, onboarding, leads, venue health, support and audited “operate as venue”.
- Venue: Today, Orders & delivery, Reservations, Menu & stock, Guests & loyalty, Growth & creative, Team, Reports, Settings & connections.
- Guest: venue identity, menu/reserve, cart, checkout, order/delivery status, account/pass.
- Staff modes: counter, kitchen and assigned delivery task. Show only permitted actions.

Integrate existing routes through lib/modules.ts; do not create colliding App Router paths. Hide unauthorized actions; a server error after clicking a manager-visible owner-only action is not an acceptable permission UX.

## Component and state inventory
Venue switcher; connection status card; order ticket; delivery timeline; exception inbox; menu/modifier selector; money breakdown; quote expiry notice; confirmation dialog; empty/loading/error/offline states; guest profile; loyalty balance/history; creative draft approval; staff task; onboarding checklist.

Every async action needs submitting, success, retryable error, terminal error and permission-denied states where applicable. Integration labels are Not connected / Configured / Test verified / Live verified / Attention needed. Do not label an installed key “working”.

## Interaction rules
Aim for a short browse-select-checkout path, not a literal three-tap promise for complex orders. Address eligibility precedes courier price confirmation. Show final total, tax, fee and tip recipient before payment. Provide a readable status page even when location tracking is unavailable.

Target WCAG 2.2 AA; use at least 44px primary touch controls; visible keyboard focus; explicit labels and live announcements for state changes. Test at 375, 768 and 1440px and at 200% zoom. Target field p75 LCP <=2.5s, INP <=200ms, CLS <=0.1; lab measures are proxies until field traffic exists.

## Prioritized debt
1. Replace guest-selected delivery zone with address-derived eligibility.
2. Remove raw loyalty UUID entry from the main guest flow; use an authenticated/scoped pass association.
3. Fix owner/HQ impersonation consistency and role-aware navigation.
4. Add delivery exception and connection health views.
5. Unify legacy coffee/dark tokens with ARO tokens without a blanket redesign.
6. Test status, loading, empty and error states across all demo journeys.
7. Show demo/sandbox mode clearly and consistently.

Evidence: [checkout](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/components/storefront/CheckoutForm.tsx), [modules](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/lib/modules.ts), [globals](https://github.com/leonartist7/Caffi.pro/blob/05022ffd797bea8149a44bcac3959c648158b594/app/globals.css). These are static design findings; no new visual verification is claimed.
