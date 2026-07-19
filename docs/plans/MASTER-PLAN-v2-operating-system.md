# aro — Operating System Masterplan (v2)

**Status: in progress, approval-gated.** Being written section by section; each
section lands only after owner approval. Sections not yet present are not yet
approved. Ground truth: `MASTER-PLAN-aro.md` (binding §4/§5),
`MASTER-PLAN-marketing-creative-studio.md`, `PLAN-05-client-websites.md`,
`PHASE-6-COMMERCE-CANDIDATES.md`, `HANDOFF-live-bringup.md`, and the live
Supabase project `jjgccfrwjkwknyjtbtxa` — all re-verified 2026-07-18/19.
Locked owner decisions (flat tiers, 0% commission, no hardware, one aro brand,
loyalty at the core) are inherited, not restated.

---

## THE VISION

aro is one machine with a heart, a nervous system, and organs — not a bundle
of restaurant tools.

**The heart is the loyalty graph**: `members`, `visits`, `points_ledger`, and
the derived truth on top of them (`member_balances`, `member_status`,
`member_cadence_days`). It is the only part of the system that knows who a
café's people are, how often they really come, and who is quietly drifting
away. Everything else exists to feed it or to act on what it knows. It is the
moat — it is never outsourced, and no third party ever holds it.

**The nervous system is the events spine** (`lib/events.ts` → `events`
table). Every meaningful action — a join, a visit, an order, a booking, a
send, an approval — lands one event. This is what lets the machine observe
itself: rate limits count events, digests summarize them, automation triggers
off them, and the activity feed replays them. New organs plug into the spine;
they never grow parallel plumbing.

**The organs, and what they pump:**

- **Intake surfaces** bring people into the graph. The QR join page and web
  pass (live) turn a stranger at the counter into a member in five seconds.
  The client website (next up, PLAN-05) turns a Google search into a visit.
  The reservation widget (live) turns intent into a booking. A future voice
  agent turns a ringing phone — still how most cafés lose bookings — into the
  same `create_reservation` RPC the widget already calls.
- **The counter** (live) is the heartbeat recorder: two taps, visit recorded,
  reward redeemed, offline-tolerant. Without it the graph starves; with it,
  every day of trade deepens the café's data advantage.
- **Commerce** (ordering live, Stripe stubbed awaiting keys; reservations
  live) converts loyalty into revenue and pumps orders back into the graph as
  points and visit signals.
- **The owner's mirror** (`/home`, live) compresses the whole graph into ONE
  honest number — "regulars returned this week" — plus the fading list. This
  screen is the retention engine for the _platform's own_ revenue: the owner
  who checks it weekly renews.
- **The voice** (Creative Studio + Marketing, designed in
  `MASTER-PLAN-marketing-creative-studio.md`, unbuilt) closes the loop the
  graph opens: the graph notices Maya fading → aro drafts the win-back in the
  café's own voice → the owner approves with one tap → the message goes out
  with consent enforced at the SQL level → Maya's next visit lands back in
  the graph and the ONE number ticks up. Generation is grounded in real venue
  data; distribution never moves without a human click; `ai_drafts.status`
  is the single door between them.
- **The agency engine** (AURA diagnostic → `leads` → HQ inbox) feeds new
  venues into the machine, and the module registry + `features_enabled` +
  future billing turn each venue's growth into tier revenue.

**The two funnels interlock**: the agency funnel signs a café; the platform
funnel makes that café undeniably stickier week by week; the owner's results
become the agency's referral story; referrals feed the agency funnel. Every
build decision below is judged by which funnel stage it accelerates and what
it does to "regulars returned this week."

---

## THE SEQUENCE

Ordering principle: **revenue leaks before revenue features; proof before
promises; vendor-free before vendor-blocked.** Phases 0–2 are complete and
live; nothing below re-plans them.

### 🔴 NOW — drives revenue in weeks

| #   | Item                                                                                                              | Funnel stage                                | Why now                                                                                                                                                             | Gated on                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| R1  | **Fix AURA lead-forwarding** (production returns `queued:false`; every completed diagnostic is a lost sales lead) | Agency: lead capture                        | This is not a feature, it is a hole in the hull. The oldest P0 in the project, regressed in production.                                                             | AURA Vercel env check (`PLATFORM_URL`/`LEADS_WEBHOOK_SECRET` match) — diagnosable now, one owner confirmation |
| R2  | **Stripe production keys** into Caffi Vercel env                                                                  | Platform: commerce revenue                  | Checkout is functionally complete and shows STUBBED. Zero code. Turns Phase 1 into actual money.                                                                    | Owner env task only                                                                                           |
| R3  | **PLAN-05 client websites** (already fully specced, executor-ready)                                               | Agency: demo asset + Platform: diner intake | Each venue becomes a sellable "you get a real website" line item and an SEO intake funnel. No new vendor.                                                           | Nothing — next executable phase                                                                               |
| R4  | **Creative Studio CS-1 + CS-2** (social captions + weekly digest, per the marketing/creative-studio doc §4.1)     | Platform: owner retention                   | Daily visible value in the owner's hands; fills the ApprovalsInbox that has sat empty in production; proves generation quality before any send vendor is committed. | LLM API key only (Anthropic recommended, §4.2 of that doc)                                                    |

### 🟡 NEXT — compounds the machine

| #   | Item                                                                                                                                                                    | Funnel stage                  | Why next                                                                                                                                                   | Gated on                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| N1  | **M-1 email nudges** (Resend adapter, win-back/slow-day sends, unsubscribe infra, SQL-level consent gate)                                                               | Platform: member reactivation | The loop-closer: the graph's insight finally reaches the member. Compliance design already staged (§5.3).                                                  | **Owner vendor decision** (open decision #1)       |
| N2  | **CS-3 site-copy assist** ("AI suggest" in the Website settings tab)                                                                                                    | Agency: onboarding speed      | Ties Creative Studio to PLAN-05; makes venue onboarding faster and sites better.                                                                           | R3 + R4 shipped                                    |
| N3  | **Digest delivery** (email the CS-2 weekly digest to the owner — generation exists after R4, delivery doesn't)                                                          | Platform: owner retention     | The owner who _receives_ the ONE number weekly without opening the app renews harder. Small delta on N1's rails.                                           | N1                                                 |
| N4  | **7-day onboarding checklist** (named in the master plan, never specced: in-app guided path — print QR, first member, first visit, first reward, staff PIN, website on) | Agency: activation            | Signed-but-never-activated is the silent churn path. An activation checklist is the cheapest retention lever in SaaS.                                      | Nothing hard; specced in this doc's later sections |
| N5  | **Referral engine** (member-refers-member on the pass; owner-refers-owner in HQ)                                                                                        | Both funnels: acquisition     | The pass is already in every member's pocket — a "bring a friend" serial link is near-free acquisition; owner referrals are the agency's best lead source. | R4 proven (needs the loop visibly working first)   |
| N6  | **M-2 SMS** (Twilio, STOP webhook, stricter TCPA bar)                                                                                                                   | Platform: reactivation        | SMS out-converts email for cafés but costs real money per send — earn it after email proves the pipeline.                                                  | N1 + owner SMS vendor decision                     |
| N7  | **Phase 4 billing** (Stripe Billing on flat tiers, module gating UI)                                                                                                    | Agency: monetization          | Manual tier toggling works at a handful of venues; billing becomes the bottleneck exactly when the agency funnel starts working.                           | Owner pricing decision (tier prices)               |
| N8  | **PLAN-06 HQ aro refit** (the coffee/cream → aro migration, deliberately split out of PLAN-05)                                                                          | Platform: perceived quality   | Design debt, mechanical, large — schedule as filler work between revenue items, not ahead of them.                                                         | Nothing                                            |

### ⚪ LATER — scale infrastructure

| #   | Item                                                                                                                                                            | Why later                                                                                                                                                                                                                                                                                     | Gated on                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| L1  | **Voice agent for phone reservations/orders** (Vapi/Retell-class vendor speaking to the existing `create_reservation`/order RPCs behind a provider abstraction) | The single biggest future differentiator in this plan — cafés lose real bookings to unanswered phones — but it is a new vendor, a new trust surface, and a new failure domain. Earn it after the text-based loops run clean. Inbound-first; outbound calls inherit the full consent doctrine. | Vendor decision + M-1/M-2 track record |
| L2  | **M-3 campaign autopilot** (`campaigns.autopilot`, finally)                                                                                                     | A trust gate, not a technical one — only after a real manual-approval track record on a real venue.                                                                                                                                                                                           | N1/N6 history + explicit owner opt-in  |
| L3  | **Wallet passes** (Apple/Google; stubs live)                                                                                                                    | Pocket presence compounds retention but needs cert accounts and signing infra; the web pass already covers the core job.                                                                                                                                                                      | Apple/Google developer accounts        |
| L4  | **Review-response + GBP automation**                                                                                                                            | Real value, but third-party-platform API surface; the guidance doc covers the manual path meanwhile.                                                                                                                                                                                          | Google API decision                    |
| L5  | **Churn prediction beyond `member_status`**                                                                                                                     | The view's new/regular/fading/lost is honest and sufficient at current scale; ML on top is premature until multi-venue data exists.                                                                                                                                                           | Real multi-venue volume                |
| L6  | **Payments expansion, delivery dispatch, POS-lite, white-label apps, i18n**                                                                                     | Phase 6–8 doctrine unchanged; i18n stays a design-for-not-build-now constraint (string externalization on all new surfaces).                                                                                                                                                                  | Per PHASE-6 re-evaluation trigger      |

**The shape of the next 90 days in one sentence:** plug the lead leak, turn
on real payments, ship every venue a website, put aro's voice in the owner's
inbox — and only then let it start sending.

---

_Sections that follow (per-system specs with acceptance checklists) land one
at a time after approval of this vision and sequence._
