# aro — Master Platform Plan

**Role of this document.** This is the executive master plan for evolving aro (Caffi.pro) into the complete, commission-free hospitality platform. It encodes the owner's locked strategic decisions, the competitive positioning derived from the 2026 restaurant-tech research, the unified design direction, the architecture principles every module must obey, and the phased roadmap. Each active phase has (or will get) its own executable spec in `docs/plans/PLAN-NN-*.md`, written so a mid-tier model (Sonnet 5, GPT 5.6) can implement it without judgment calls. **The executor reads this file first, then the phase spec it was assigned. Nothing in a phase spec may contradict this file.**

---

## 1 · Vision & competitive positioning

Derived from the competitive analysis of Restolabs, Owner.com, Toast, BentoBox, OpenTable, Resos, Crave (QRCrave/Up/Cruncher), LOOPos, and Restaurant Growth:

**aro's position: the loyalty-first, commission-free, data-owned operating system for independent cafés — sold and operated by an agency (the platform owner) who activates modules per client.**

The market's fault lines, and where aro stands on each:

| Fault line      | The trap (competitors)                                                   | aro's stance                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Commissions     | Owner.com 5% order fee, BentoBox $0.99/order + 3%, OpenTable $1.50/cover | **0% platform commission, flat SaaS tiers.** The Restolabs/Resos side of the line, always.                                                                   |
| Payment lock-in | Toast forces its own processing (2.49–3.69%)                             | **Gateway-agnostic architecture** (PaymentProvider abstraction). Stripe is adapter #1; more gateways added incrementally. Cafés keep their negotiated rates. |
| Data ownership  | Toast/OpenTable/BentoBox share or own guest data                         | **100% merchant data ownership**, exportable, PII server-only, per-venue isolation enforced in code (existing authz layer).                                  |
| Hardware        | Toast: $500–$1,000+ terminals, 2–3 yr contracts                          | **Zero proprietary hardware.** Everything runs on the café's existing phones/tablets (counter PWA, KDS-lite view, QR codes).                                 |
| Loyalty         | An add-on module everywhere else ($50/mo at Toast)                       | **The core.** Every other module feeds the loyalty graph (visits, points, status, win-back). This is the moat — no competitor leads with it.                 |
| Onboarding      | Toast: 4–6 weeks                                                         | **7-day guided onboarding** (Restolabs-style checklist), eventually productized in-app.                                                                      |

**What "everything together" means** (union of the researched platforms' capabilities, mapped to aro modules): loyalty (live) · members CRM (Phase 0) · online ordering: QR dine-in, pickup, in-house delivery (Phase 1) · reservations + waitlist (Phase 2) · marketing automation: email/SMS nudges, AI drafts that send (Phase 3) · platform billing & per-client module activation (Phase 4) · client websites + SEO + Google Business (Phase 5) · gateway #2+, third-party delivery dispatch (Phase 6) · wallet passes + white-label PWA/apps (Phase 7) · POS-lite: floor plans, tabs, split checks, KDS (Phase 8).

## 2 · Business model (locked)

**Flat SaaS tiers per venue, 0% commission**, gated through the existing `lib/modules.ts` + `venues.features_enabled` mechanism. Indicative tiers (final prices are the owner's call; the _structure_ is what phases must implement):

- **Starter** — Loyalty core: join/pass/QR, counter, members CRM, rewards, analytics, staff. (Everything live today.)
- **Growth** — + Ordering (QR dine-in, pickup, in-house delivery), reservations, campaigns/nudges.
- **Pro** — + Client website & SEO, wallet passes, white-label app, delivery dispatch, priority support.

Agency reality: until Phase 4 (billing) ships, tier assignment is manual (aro*admin toggles `features_enabled`). The owner may also sell Restaurant-Growth-style service retainers on top; the platform only needs to \_gate modules*, not invoice, before Phase 4.

## 3 · Design direction (locked): one brand — aro, everywhere

The platform unifies under the **aro design system**: warm, editorial, café-native. This replaces the coffee/cream "Caffi Pro" admin look progressively (new surfaces immediately, existing HQ screens in a dedicated refit pass inside Phase 5).

**Foundations (already in the repo — extend, don't reinvent):**

- Tokens: tailwind `aro` namespace (`tailwind.config.ts`) — terracotta `aro-terra`, cream/sand surfaces, ink text scale, sage/saffron/rose status hues, hairline borders.
- Type: Bricolage Grotesque (display), Instrument Serif italic (accents), Inter (body), JetBrains Mono (numbers/serials) — wired via next/font in `app/layout.tsx`.
- Texture: grain overlay utilities in `app/globals.css`.

**Creative direction rules for every new surface:**

1. **Warm, never sterile.** Cream/sand backgrounds, terracotta as the single action color, ink text. No grays-on-white SaaS default, no blue.
2. **Editorial hierarchy.** One oversized display number or statement per screen (the "ONE number" pattern from owner home). Generous whitespace; hairline dividers over boxes-in-boxes.
3. **Numbers are monospace.** Points, prices, counts, serials — always JetBrains Mono.
4. **Status is a chip, never a traffic light.** new/regular/fading/lost and order states use the muted sage/saffron/rose chip pattern.
5. **Empty states are warm and instructive** ("Your circle starts with the first scan"), never blank or fake-zeroed. Missing config shows a visible "STUBBED — needs X" badge, never a silent fake.
6. **Diner surfaces are one-hand, one-thumb.** Join, pass, storefront, QR ordering: single column, large tap targets, works pre-hydration (plain form POST fallback where feasible), café-wifi tolerant.
7. **Motion is subtle**: 150–300ms ease-out transitions; no bounce, no confetti except a single moment of delight at order-placed / reward-redeemed.
8. Dark mode: keep supporting the existing `dark:` variants on HQ surfaces; diner surfaces are light-only (cream) by design.

Component inventory to grow (extract into `components/aro/` as phases touch them): StatTile, StatusChip, ComingSoon (exists) + Button, Card, Modal, Sheet, MenuItemCard, OrderTicket, QuantityStepper, PriceText.

## 4 · Architecture principles (binding on every phase)

These are proven in the codebase and non-negotiable:

1. **Tenant isolation is server-side only.** Browser code never queries tenant tables. Every venue-scoped API validates the caller via `requireVenueRole` / `requireRowVenueRole` / `requireAroAdmin` (`lib/authz.ts`) BEFORE reading the body. Client-supplied `venue_id` is authz _input_, never trusted. aro_admin passes all venue gates.
2. **Column-name split is permanent**: legacy-renamed tables use `tenant_id` (`members`, `rewards`, `points_ledger`, `tenant_manifests`); fresh tables use `venue_id` (`visits`, `memberships`, `events`, `redemptions`, `campaigns`, `ai_drafts`, `status_snapshots`, and ALL NEW TABLES going forward). `requireRowVenueRole`'s `venueColumn` param must match.
3. **Derived, never stored.** Balances and member status are views (`member_balances`, `member_status`). Order totals are computed server-side from line items at insert; any denormalized total column is written once, atomically, server-side.
4. **Append-only money.** `points_ledger` never updates rows; payments/refunds are new rows, never mutations. Atomic multi-row operations (like `redeem_reward`) are `SECURITY DEFINER` SQL functions with `FOR UPDATE` locks, granted to `service_role` only when they take raw venue/member ids.
5. **Idempotency everywhere money or messaging moves**: client-generated UUID + unique constraint + 23505-treated-as-success (pattern: `visits.client_uuid`, `leads.idempotency_key`). Orders and payments MUST follow it.
6. **Events spine**: every meaningful action emits into `events` via `emitEvent` (`lib/events.ts`); extend `AroEventType` + `EVENT_LABELS` in that one file.
7. **PaymentProvider abstraction (new, Phase 1)**: all payment operations go through a `lib/payments/provider.ts` interface (`createCheckout`, `capture`, `refund`, `webhookVerify`, …); gateway adapters live in `lib/payments/adapters/<gateway>.ts`. No route or component ever imports a gateway SDK directly. Stripe is adapter #1.
8. **Module registry** (`lib/modules.ts` + `venues.features_enabled`): every new surface registers as a module (`live`/`coming_soon`), nav renders from the registry, per-client activation via `features_enabled` (Phase 4 adds the UI).
9. **Migrations discipline**: new numbered file under `supabase/migrations/`, mirrored into `supabase/aro_schema.sql`, RLS + explicit grants in the same migration, `search_path` includes `extensions` when using pgcrypto/uuid functions, applied live via Supabase MCP, verified with a `pg_proc`/`information_schema` query. `get_advisors(security)` after every schema phase.
10. **Secrets**: never in git (`.env*` untracked — a service key was burned twice; treat every leak as burned + rotate). New keys documented in `.env.example` with the "STUBBED badge" convention.

## 5 · Execution protocol for lower models (binding)

1. Read this file, then your assigned `PLAN-NN` spec, fully, before any tool call.
2. Work phase-by-phase inside the spec; **one commit per phase, push after each**; `npx tsc --noEmit` AND `npm run build` green before every commit (pre-commit hooks enforce lint/format/types).
3. Self-review every phase diff with `/code-review --level medium` (or equivalent careful review if unavailable) BEFORE committing; fix findings pre-commit. History shows every reviewed phase caught a real bug — treat a "clean" review with suspicion and re-read the diff.
4. READ files fully before editing. Verify every column name against the migrations. Copy the named code patterns; do not invent parallel ones.
5. STOP-and-flag rather than improvise when: a schema change isn't in the spec, a CHECK constraint conflicts, an owner-only dashboard step is missing, or a spec instruction contradicts this file.
6. Log every phase in `docs/plans/BUILD-LOG-<plan-name>.md` (what changed, what review caught, what was verified, what's deferred).
7. Never claim something was sent/live/verified that wasn't (no fake sends, no fake data — visible stub states instead).
8. Branch protocol: work on the designated `claude/…` branch; after a PR merges, reset the branch from `origin/main` and open a NEW draft PR for the next plan.

## 6 · Roadmap

> **Sequencing update (2026-07-19):** the roadmap below remains the phase
> record, but build ordering is now governed by
> `docs/plans/MASTER-PLAN-v2-operating-system.md` — the operating-system
> masterplan (vision, revenue-ordered 🔴/🟡/⚪ sequence, per-system specs,
> and the consolidated open-decisions register). Phase numbering here is
> unchanged; v2 sequences and extends it, never renumbers it.

**Phase 0 — Go-live + polish** ✅ COMPLETE _(spec: `PLAN-00-go-live-polish.md`)_
Production cutover (merged PR #47 + AURA #2), invite-link loop, Members CRM module in HQ, legacy surface retirement (`/staff/*` old portal, `/tenants/[id]`), `scripts/verify-live.mjs` RLS regression net. Decisions locked: ship now; nudges deferred.

**Phase 1 — Ordering core** ✅ COMPLETE _(spec: `PLAN-01-ordering-core.md`, evidence: `BUILD-LOG-ordering-core.md`)_
Menu system (categories/items/modifiers), PaymentProvider abstraction + Stripe adapter, revived `/shop` storefront restyled to aro, QR tableside ordering, order-ahead pickup, in-house delivery zones, order management screen + KDS-lite for staff, loyalty integration (points per order through the existing ledger). Menu and Orders modules are `live`. Open item: owner has not yet supplied real Stripe credentials — checkout is functionally complete but shows the `STUBBED` badge until keys are added (env var task, not code).

**Phase 2 — Reservations & waitlist** ✅ COMPLETE _(spec: `PLAN-02-reservations-waitlist.md`, evidence: `BUILD-LOG-reservations.md`, merged PR #49)_
Bookings with venue-local slotting, table capacity, hours-gated availability, same-day waitlist, guest widget, staff day view. Live-verified: migration applied, RLS confirmed, rate limiting added in a required review round before merge.

**Phase 3 — Marketing & nudges** ⏸ DEFERRED (owner decision, 2026-07-17)
Needs a real email/SMS vendor account (Resend and/or Twilio) and consent/compliance calls before a spec can be written responsibly — an executor cannot make those decisions. Revisit once a provider is chosen; do not start this phase on assumptions. Deep diagnosis, creative vision, and pre-staged implementation plan for this phase — plus the "creative studio" AI-content-generation surface named in Phase 5's title but not scoped there — now exist in `docs/plans/MASTER-PLAN-marketing-creative-studio.md` (2026-07-18). That document's Creative Studio sub-phases (CS-1–CS-3: AI-generated social captions, owner digest, site-copy assist) are **not** blocked on the vendor decision above and are a candidate to pull forward, the same way Phase 5 itself was pulled forward on 2026-07-17 — see that document's §4.1 and §11 before deciding sequencing.

**Phase 4 — Billing & per-client module activation** — not started, not next (see below).

**Phase 5 — Client websites & creative studio** _(spec: `PLAN-05-client-websites.md` — ready now, next up, pulled forward ahead of Phase 3/4 because it needs no new vendor account)_
Per-venue public marketing site (Owner.com-parity: home/menu/hours/location, SEO metadata, structured data, sitemap), brand_kit-driven theming already using the aro design system since day one (unlike the HQ screens — see below). Split from the original Phase 5 scope: the **HQ coffee/cream → aro design-system refit is deliberately deferred to its own follow-up (PLAN-06, not yet written)** rather than bundled in — every HQ screen (`/dashboard`, `/clients`, `/staff`, `/settings`, etc.) still renders zero `aro-` classes as of 2026-07-17, confirmed by grep; that's a large, separate, mechanical migration and bundling it here would blow this phase's scope past what one executor pass should carry.

**Phase 3 — Marketing & nudges** _(deferred from earlier decision; spec to be written)_
The loyalty loop completed: Resend (email) adapter first, Twilio (SMS) later; campaigns page becomes real; "Send a nudge" on member profiles; AI-draft approval actually sends; win-back automation with owner approval (autopilot flag exists on `campaigns`); CASL compliance — consent already captured at join, unsubscribe tokens already in schema; invite emails replace copy-link.

**Phase 4 — Billing & per-client module activation**
Stripe Billing for the flat tiers (§2), tier→module mapping enforced through `features_enabled`, HQ UI on the client profile to assign tier / toggle modules, dunning states (`organizations.billing_status` exists), plan-gated upsell states in client nav ("part of Growth — ask your aro contact").

**Phase 5 — Client websites, SEO & aro design-system refit**
Owner.com-parity: per-venue public site (template-driven from `brand_kit`), menu/hours/location pages, SEO landing structure, custom domains (middleware already resolves `custom_domain`), Google Business Profile guidance. Includes the **HQ refit pass**: migrate remaining coffee/cream screens to the aro design system (§3).

**Phase 6 — Payments expansion & delivery dispatch**
Gateway adapter #2+ (Moneris/Square — Canada-first), per-venue gateway selection UI; DoorDash Drive / Uber Direct dispatch adapters behind a `DeliveryProvider` interface mirroring the payments abstraction.

**Phase 7 — Wallet passes & white-label apps**
Apple/Google wallet passes (stub routes exist at `app/api/wallet/*`), installable PWA per venue, app-store white-label track documented (Restolabs charges $49/mo for this — Pro-tier feature).

**Phase 8 — POS-lite**
LOOPos-parity for cafés that want it: floor/table config (feeds QR dine-in + reservations), open tabs, split checks, richer KDS. Explicitly last: aro augments a café's existing POS until demand proves replacing it.

**Standing decisions log**: ship-to-prod now · ordering first · gateway abstraction w/ Stripe adapter #1 (multi-gateway positioning) · flat SaaS tiers, 0% commission · unified aro brand · revive `/shop` storefront · release-one ordering includes in-house delivery · nudges = Phase 3 · no proprietary hardware, ever.

## 7 · Security & production-readiness baseline (all phases)

- RLS on every new table in the same migration that creates it; explicit column grants (PII pattern from `members`: no anon/authenticated grant at all where server-only).
- `scripts/verify-live.mjs` (Phase 0) must be extended by every schema-touching phase with checks for its new objects.
- Webhooks (payments, delivery): signature verification mandatory (`webhookVerify` in the provider interface), shared-secret timing-safe compare pattern already exists in `/api/leads`.
- Rate limiting on public writes (pattern exists in `/api/join` via events-table window counting).
- Sentry DSN wiring exists; enabling it is a standing owner step.
- Rotate any credential that ever touches git history. Immediately.
