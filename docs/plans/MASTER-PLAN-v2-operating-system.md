# aro — Operating System Masterplan (v2)

**Status: complete draft, 2026-07-19.** Vision + Sequence approved by the
owner; remaining sections written to completion on the owner's instruction in
the same session, including a Horizon 3 vision appendix, birthday capture
(N9), and per-task executor model assignments (Section 7). Ground truth:
`MASTER-PLAN-aro.md` (binding §4/§5),
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
| N9  | **Birthday capture** (one-shot ask on the web pass; feeds the `campaigns.type='birthday'` slot the schema already allows)                                               | Platform: reactivation        | Hospitality's highest-converting message type, and the schema already anticipated it — nothing has ever captured the date.                                 | Capture needs nothing; sends need N1               |

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

# SECTION 2 — 🔴 NOW: per-system specifications

_Vision + Sequence approved 2026-07-19. This section specifies R1–R4. Two of
the four (R3, R4) already have strong specs elsewhere in the corpus; per the
churn rule, this section strengthens what's underspecified and points at what
already works instead of rewriting it._

---

## R1 · AURA lead-forwarding fix

**Executor:** Sonnet 5 / GPT 5.6 — the runbook below is a literal, ordered
diagnostic tree with explicit stop conditions at each step; no design
judgment required to execute it. **Escalate to Fable 5** only if steps 1–3
fail to isolate the fault (a genuinely novel failure mode, not covered
here).

**Objective** — every completed AURA diagnostic lands as a `leads` row in the
platform within seconds, permanently, with proof.

### Strategic & creative direction

This is triage, not architecture. The pipeline was designed correctly (never
break the diner-facing flow; never lose the payload; idempotent on
`idempotency_key`; timing-safe shared-secret auth) and worked in local
verification — production has returned `{ok:true, queued:false}` since the
2026-07-12 cutover, meaning the AURA side deploys and _swallows_ the forward
failure exactly as designed while the platform never receives the lead. The
design's graceful degradation is currently hiding a total outage of the
agency funnel's top-of-funnel. Lesson to encode: **graceful degradation
without an alarm is silent failure** — R1 closes the hole AND adds the alarm.

### Implementation spec

Diagnosis runbook, in order (each step has a stop-if-fixed exit):

1. **Env parity check** (most likely culprit; owner-assisted, ~5 min):
   AURA Vercel Production must have `PLATFORM_URL=https://caffipro.vercel.app`
   (absolute https, no trailing slash) and `LEADS_WEBHOOK_SECRET` byte-identical
   to Caffi Production's value. Known trap: values pasted with trailing
   whitespace/newline — re-enter both, don't eyeball them. A changed env var
   requires a **redeploy** of AURA to take effect (both projects have
   "Ignored Build Step" quirks — use dashboard Redeploy, never junk commits).
2. **Vercel function logs** on AURA production for the structured
   `lead-forward-failed` JSON line (the route logs the full payload on
   forward failure by design). The line's error field distinguishes:
   401 → secret mismatch (step 1); timeout/ENOTFOUND → `PLATFORM_URL` wrong;
   404 → path drift. Any logged payloads found here are **recoverable leads**
   — re-POST them to `/api/leads` with the secret so nothing captured during
   the outage is lost.
3. **Direct platform probe**: POST `/api/leads` with the production secret
   and a probe payload (`source:'diagnostic'`, distinct `idempotency_key`).
   200 + `{stored:true}` proves the platform side is healthy and isolates
   the fault to AURA's outbound leg. Delete the probe row after.
4. **End-to-end smoke**: run the real diagnostic on AURA production; require
   `queued:true` in the response AND the row visible in HQ `/leads` AND a
   `lead.received` event in the events table. All three, not any one.

**The alarm (small code change, platform side):** extend the existing
`lead.received` flow with its inverse — a lightweight `GET`-safe canary is
overkill; instead, document in `HANDOFF-live-bringup.md` a weekly owner
check ("leads count grew this week?") until N3's digest delivery exists,
then fold "new leads this week" into the owner-facing agency digest. No new
infrastructure for release-one of the fix; the structured log + runbook is
the alarm until digests ship.

### ✅ Acceptance checklist

- [ ] Production diagnostic completion returns `{ok:true, queued:true}`.
- [ ] The lead row exists in `leads` with correct `source`, `contact`,
      `score`, and the HQ `/leads` inbox renders it.
- [ ] `lead.received` event emitted (query `events` by type, ts within the
      test window).
- [ ] Same diagnostic re-submitted (browser-back path) → still exactly one
      row (`idempotency_key` dedupe proven in production, not just locally).
- [ ] Kill-test: with the platform unreachable (or secret temporarily
      wrong), the diner-facing thank-you still renders and AURA logs one
      `lead-forward-failed` line containing the full payload.
- [ ] Any `lead-forward-failed` payloads found in logs during diagnosis were
      replayed into `/api/leads` (count them in the build log).

**Dependencies** — needs: owner access to both Vercel projects' env settings
(~10 min). Unlocks: the entire agency funnel; N3's agency digest has real
data; R3's "demo asset" story has leads to demo _to_.

---

## R2 · Stripe production keys

**Executor:** Sonnet 5 / GPT 5.6 for the verification steps (2–4 below);
the env-var/dashboard steps (1, owner-only) are not model work at all.
Zero design judgment in the verification protocol — it's a literal
sequence with a hard test-mode-before-live-mode gate.

**Objective** — a real card buys a real coffee: ordering revenue flows,
loyalty points accrue, zero code changes.

### Strategic & creative direction

Phase 1 built checkout completely and honestly — it shows the STUBBED badge
rather than faking a connection (the house rule working as intended). R2 is
the cheapest revenue unlock in the entire sequence _because_ the code is
done: it is an owner env task plus verification discipline. The only
judgment call encoded here: go **test mode first, production keys second**,
same day — never skip the test-mode end-to-end because "the code was already
verified"; webhook config is environment-specific and is exactly what a
dry-run catches.

### Implementation spec

1. 👤 Owner: Stripe dashboard → API keys. Set in Caffi Vercel **Production**:
   `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
   `STRIPE_WEBHOOK_SECRET` (the last one comes from step 2). Redeploy.
2. 👤 Owner: Stripe dashboard → Webhooks → add endpoint
   `https://caffipro.vercel.app/api/webhooks/stripe`, subscribed to the
   events the handler processes (checkout completion, async payment
   success/failure, refund events — the handler file is the source of truth
   for the exact list; read it, don't guess).
3. Test mode end-to-end: seed venue storefront → cart → checkout with
   `4242 4242 4242 4242` → confirm order paid, `payments` row written,
   points accrued to the ordering member via `points_ledger`
   (`reason='order'`), `order.paid` event emitted, KDS/orders screen shows
   the order. This is the release-one payment check named in
   `HANDOFF-live-bringup.md` — it has never been run.
4. Flip to live keys. One real low-value transaction, then refund it through
   the platform's refund path (proving the refund webhook round-trip, and
   that refunds land as new ledger/payment rows per the append-only money
   doctrine — never mutations).
5. Confirm the STUBBED badge is gone from checkout (it is env-gated; if it
   lingers, the env didn't load — check the deployment, not the code).

### ✅ Acceptance checklist

- [ ] Test-mode transaction completes the full loop: order → payment row →
      points ledger row (`reason='order'`) → `order.paid` event → visible in
      orders screen.
- [ ] Webhook signature verification proven (a request without a valid
      signature is rejected — Stripe's dashboard "send test webhook" with
      the wrong endpoint secret, or curl without signature, gets 4xx).
- [ ] Live-mode transaction + refund round-trip completes; refund is a new
      row, no mutated payment row.
- [ ] STUBBED badge absent in production checkout.
- [ ] `scripts/verify-live.mjs` unchanged-but-green (no schema touched; run
      the existing net once from a keyed environment as the standing item).

**Dependencies** — needs: owner's Stripe account (~30 min total). Unlocks:
real commerce revenue; N7 billing later reuses the same Stripe account and
webhook discipline.

---

## R3 · Client websites (PLAN-05)

**Executor:** Sonnet 5 / GPT 5.6. `PLAN-05-client-websites.md` was already
written for exactly this tier (verified ground truth, exact files to
clone, non-goals with teeth) — this masterplan's three deltas (§below) are
equally literal. No Fable-tier authoring needed; the spec chain is
complete.

**Objective** — every venue gets a real, SEO-correct public website generated
from data it already has, becoming both the agency's demo asset and the
platform's diner-intake surface.

### Strategic & creative direction

**The existing spec is strong — execute it as written.**
`PLAN-05-client-websites.md` already carries executor-grade precision:
verified ground truth with dates, exact file-to-clone references, non-goals
with teeth, the brand*kit JSONB extension path that needs no migration, the
custom-domain homepage switch, and a full verification list. It needs no
churn. This masterplan adds only the v2-lens connective tissue below —
three small enrichments an executor applies \_while* following PLAN-05, not
a reinterpretation of it.

### Implementation spec (delta on top of PLAN-05, not a replacement)

1. **Events spine hookup**: emit `site.published` (new `AroEventType` +
   label, one-file change per the established rule) when `site_enabled`
   flips false→true via the Settings PATCH, and `site.updated` on subsequent
   `site_profile` saves. Rationale: N3's owner digest and the activity feed
   should be able to say "your website went live this week" — the machine
   observes itself. (PLAN-05 predates the digest design; this is the one
   thing it couldn't have known to include.)
2. **Referral-readiness (N5 foresight, zero extra work)**: the site's URL
   structure (`/site/[slug]` + custom-domain root) is about to become the
   thing members share. Keep every site page shareable-clean: no
   query-string state on the four fixed pages, correct canonical URLs in
   metadata. PLAN-05's metadata step already implies this — this line just
   makes it a stated requirement so N5 doesn't need URL surgery later.
3. **String discipline (i18n non-retrofit rule from the constraints)**: all
   user-visible strings on the new site surface live as named constants at
   the top of each page file (or a small per-page `strings` object), not
   inline JSX literals. Costs nothing now; makes L6's someday-i18n a
   mechanical extraction instead of a rewrite. This applies to NEW surfaces
   only — no retrofitting existing pages.

### ✅ Acceptance checklist

- [ ] PLAN-05's own §Verification list (items 1–8), unchanged, all green —
      that list is the contract; this masterplan does not weaken or fork it.
- [ ] `site.published` / `site.updated` events emitted and labeled
      (`EVENT_LABELS` entry present; visible in the activity feed).
- [ ] Site pages carry canonical URLs; zero query-string-dependent rendering
      on the four fixed pages.
- [ ] Grep gate: no inline user-visible string literals in `app/site/**`
      page JSX (strings hoisted per the discipline above).

**Dependencies** — needs: nothing (next executable phase). Unlocks: N2
site-copy assist, N5 member-referral sharing surface, the agency's "you get
a real website" pitch line, custom domains as true homepages.

---

## R4 · Creative Studio CS-1 + CS-2

**Executor:** **Fable 5 writes `PLAN-07-creative-studio.md`** (converting
`MASTER-PLAN-marketing-creative-studio.md` §7 into the lean executable
spec, per that document's own §11 instruction) **and authors the voice-
doctrine prompt preamble** (`lib/ai/prompts/shared.ts`) — prompt-writing
that encodes taste is Fable-input, not executor-input, the same way this
masterplan's own prose is. Sonnet 5 / GPT 5.6 builds everything else from
PLAN-07 once it exists — routes, UI, the provider abstraction plumbing.

**Objective** — the empty ApprovalsInbox fills with real, venue-grounded
drafts: social captions on demand, a weekly owner digest — approval-gated,
vendor-light, generation quality proven before any send channel exists.

### Strategic & creative direction

**The deep spec already exists — `MASTER-PLAN-marketing-creative-studio.md`
§7 (with §3 voice doctrine, §4.1 sequencing, §5.2 provider abstraction) is
the design document; execute from it.** What R4 adds here is the
chief-architect resolution of the three small calls that document
deliberately left open, so the executor has zero judgment calls left:

1. **Route group: `(owner)`** — resolved. Creative Studio is the venue
   owner's daily tool, sibling to `/home` and `/regulars`, not an HQ/agency
   surface. It lands as `app/(owner)/creative/page.tsx`, appears in the
   owner shell's nav, and registers in `lib/modules.ts` as a `live` module
   (`key: 'creative'`) so tier-gating can price it later. (Overrides
   nothing — the doc recommended exactly this pending confirmation; this is
   the confirmation.)
2. **Digest approval UX: seen, not approved** — resolved. A `digest`-kind
   draft renders as a read-only card and is marked `approved` automatically
   on first view (it is owner-facing content with no external send; forcing
   an approve click on a report is ceremony). The approve/skip button pair
   remains exclusively for kinds that can leave the building.
3. **Model + env**: `AI_DRAFT_MODEL` env var, default to the current
   fast/cheap Claude tier at execution time (the executor consults the
   claude-api skill for the current model id — never hardcodes one from
   memory), `ANTHROPIC_API_KEY` in `.env.example` under a corrected
   "Phase 3" header (fixing the Phase-4 drift in the same commit, per that
   doc's §1.2 instruction).

Voice bar restated in one line for the executor: every draft must read like
it was written by someone who has stood behind that counter — grounded in
real rows, short, warm, never inventing a special or a reward the database
doesn't hold.

### Implementation spec

Execute `MASTER-PLAN-marketing-creative-studio.md` §7.4 phases CS-1 then
CS-2, with §5.2's `lib/ai/provider.ts` abstraction, §7.5's edge cases
(rate-limit via the events-table window pattern, `prompt_ctx` traceability,
venue-timezone week checks), and §7.6's visible-stub rules, as written.
Convert it into a lean executable `PLAN-07-creative-studio.md` (ground
truth / non-goals / numbered steps / acceptance) as the first commit of the
work, per that document's own §11 instruction — the strategic doc stays the
reference; executors run on the lean spec.

### ✅ Acceptance checklist

- [ ] `MASTER-PLAN-marketing-creative-studio.md` §7.7 criteria 1–5 and 7,
      unchanged, all green (criterion 6 belongs to CS-3, deferred to N2).
- [ ] The three resolutions above are implemented exactly (route group,
      digest-seen UX, env naming) — no re-opened decisions.
- [ ] `PLAN-07-creative-studio.md` exists and an executor could run CS-1
      from it without opening the strategic doc.
- [ ] `.env.example` Phase-4→Phase-3 header drift fixed in the same PR.
- [ ] A generation with the API key absent renders the STUBBED state, never
      a silent no-op (visible-stub rule §7.6 proven, not assumed).

**Dependencies** — needs: `ANTHROPIC_API_KEY` (owner, minutes — the one
vendor-ish decision this tier contains, already recommended in the strategic
doc's §4.2/§9.4). Unlocks: N2 site-copy, N3 digest delivery, N5's referral
copy generation, and — most importantly — the owner's daily habit that makes
the eventual M-1 vendor decision feel obvious instead of risky.

---

# SECTION 3 — 🟡 NEXT: per-system specifications

_The compounding tier. Two of these (N4 onboarding checklist, N5 referral
engine) are new systems with full specs here; the rest strengthen or resolve
what existing documents already carry._

---

## N1 · M-1 email nudges (the loop-closer)

**Executor:** **Fable 5 writes `PLAN-08-marketing-nudges.md`** and designs
the eligibility-query compliance test (§5.3's pre-M-1 test) personally —
this is real money-adjacent, consent-bearing infrastructure and the one
place in the 🟡 tier where the _design_ of the safety check matters as
much as its implementation. Sonnet 5 builds from PLAN-08. **Never assign
this task, or any part of it, to a light/mechanical tier** — the
eligibility query is the compliance boundary (§below); a model without
full context on the consent doctrine can silently weaken it. Fable
reviews the eligibility query and unsubscribe route before merge,
regardless of which model built them.

**Objective** — the graph's insight finally reaches the member: approved
win-back and slow-day messages go out by email, consent-gated at the SQL
level, and returning visits land back in the graph.

### Strategic & creative direction

**The deep spec exists — `MASTER-PLAN-marketing-creative-studio.md` §6 (with
§5.1 comms abstraction and §5.3 compliance design) is the design document.**
This masterplan resolves its flagged origination question and adds the
sender-identity work that document deliberately left out:

1. **Campaign origination: draft-first, resolved.** A campaign's message
   body originates from an approved `ai_drafts` row (traceability via
   `messages.ai_draft_id`) as the primary and default flow. Manual compose
   exists as a secondary path but creates its own `ai_drafts` row
   (`kind` matching the campaign type, `output` = the typed text, status
   straight to `edited`→approval) so that **every** send still passes the
   same approval door and carries the same traceability — one pipeline, not
   two. No send may ever have both `campaign_id` and `ai_draft_id` null.
2. **Sender identity is part of the build, not an afterthought.** Resend
   requires a verified sending domain. Recommendation: send from the aro
   product domain (e.g. `hello@` on the platform's domain) with the venue's
   name as the friendly-from ("The Roastery via aro") — venues do not bring
   their own domains in release-one (that's a Pro-tier future). Exact domain
   choice is an owner decision (register entry D-10); SPF/DKIM setup is an
   owner dashboard task the executor documents step-by-step in the build
   log, then verifies with a real delivery to a non-Resend inbox.
3. **The eligibility query is the compliance boundary.** Restated because it
   is the one place a weaker executor can quietly destroy trust: recipients
   come from ONE server-side query whose `WHERE` enforces venue scope AND
   `consent_ts IS NOT NULL` AND not-unsubscribed. No application-layer
   filtering on top of a broader query. The §5.3 pre-M-1 test (a
   consent-NULL member never appears in an eligible count) is written and
   green **before** the send route exists.

### Implementation spec

Execute `MASTER-PLAN-marketing-creative-studio.md` §6.4 phases 1–8 as
written (comms provider abstraction → compliance test → campaigns page +
module entry → send pipeline → unsubscribe route → nudge button →
verify-live extension → build log), with the two resolutions above folded
in. Convert to a lean `PLAN-08-marketing-nudges.md` executable spec as the
first commit, same pattern as R4's PLAN-07. The send button always shows the
exact eligible-recipient count and requires a typed confirmation for sends
above 50 recipients (a fat-finger guard proportionate to a café's list
size — cheap, encoded here so the executor doesn't debate it).

### ✅ Acceptance checklist

- [ ] `MASTER-PLAN-marketing-creative-studio.md` §6.6 criteria 1–6,
      unchanged, all green.
- [ ] Every `messages` row traces to an `ai_draft_id` (draft-first proven —
      including manually composed sends).
- [ ] Sending domain verified; a real delivery lands in a Gmail/Outlook
      inbox (not spam) with a working unsubscribe link in the footer.
- [ ] > 50-recipient sends require the typed confirmation; the eligible
      count shown matches a hand-run SQL count.
- [ ] `PLAN-08-marketing-nudges.md` exists; executor-runnable standalone.

**Dependencies** — needs: owner vendor decision D-1 (Resend account + domain
D-10) and compliance sign-off D-2. Unlocks: N3 digest delivery rails, N6
SMS, the full win-back loop, and the first honest "aro brought Maya back"
story for the agency funnel.

---

## N2 · CS-3 site-copy assist

**Executor:** Sonnet 5 / GPT 5.6. Small, fully specced, no open calls.

**Objective** — the Website settings tab drafts taglines and about-text in
the venue's voice, making onboarding faster and sites better.

Spec: `MASTER-PLAN-marketing-creative-studio.md` §7.4.5 as written
(pre-fills the form field, never auto-saves; approval = pre-fill; the
existing Settings save flow and its gate untouched), plus the §7.3
`site_copy` CHECK-constraint migration (constraint name verified live:
`ai_drafts_kind_check`). No open calls remain. **Acceptance**: that doc's
§7.7 criterion 6 plus the migration mirrored into `aro_schema.sql` and
advisor-checked. **Dependencies** — needs R3 + R4; unlocks faster venue
activation (feeds N4's checklist completion rate).

---

## N3 · Digest delivery (the owner's inbox habit)

**Executor:** Sonnet 5 / GPT 5.6. New table + the repo's first cron
justify the mid tier over light, but the spec below is fully literal
(exact migration, exact idempotency key, exact trigger condition) — no
Fable authoring needed before building.

**Objective** — every venue owner receives their weekly one-number digest by
email without opening the app; the platform proves its value on a schedule.

### Strategic & creative direction

CS-2 generates the digest **on first open of Creative Studio each week** —
deliberately cron-free. That design has a blind spot this system exists to
close: the fading owner. The owner who stops opening the app is exactly the
one who needs the digest most, and generation-on-view never reaches them.
N3 inverts the trigger: the machine now initiates contact weekly. This is
the platform's own win-back campaign, run on its own owners — and it's why
this lands before SMS or autopilot: retention of paying venues outranks
everything in the 🟡 tier.

The digest email is NOT a CASL marketing problem: it is operational service
communication to the account holder about their own business data.
Nonetheless it carries a working "pause these emails" preference link —
trust is a design material, not just a legal boundary. **The agency variant
rides the same rails**: aro_admin receives a weekly agency digest (new leads
count, venue activation states, platform totals) — this is R1's permanent
alarm arriving on schedule.

### Implementation spec

1. **Scheduling: Vercel Cron** (`vercel.json` cron → `app/api/cron/weekly-
digest/route.ts`), the repo's first cron — justified because the
   snapshot-on-first-read pattern cannot reach a user who never reads.
   The route is idempotent and self-authenticating (`CRON_SECRET` env,
   timing-safe compare — same pattern as `/api/leads`). Runs hourly on
   Mondays UTC; for each venue whose **venue-local** time has passed Monday
   08:00 and which has no digest sent this venue-local week, it: generates
   the digest draft if CS-2 hasn't already (same `venue_week_stats` → prompt
   path), renders it into the email template, sends via the N1
   `CommsProvider`, records a `messages` row (`channel:'email'`, linked
   `ai_draft_id`, member_id null — schema check: `messages.member_id` is
   NOT NULL, so owner-directed mail needs its own ledger: add a minimal
   `owner_notifications` table (venue_id, kind, week, sent_to, sent_at,
   UNIQUE(venue_id, kind, week)) in the same migration — do NOT bend the
   member-messages table to hold non-members).
2. **Recipient**: the venue's active owner membership's auth email
   (server-side join, service role). Multiple owners → all of them.
   No owner email on file → skip + `digest.skipped` event, surfaced in the
   agency digest (an unreachable owner is a churn signal the agency should
   see).
3. **Content contract**: subject is the number itself ("4 regulars came
   back this week at The Roastery"); body is the CS-2 narrative + the three
   tiles + one warm CTA into `/home`. First names only for any member
   mentioned. Empty-data week → the warm onboarding framing, never
   "0 regulars" (the email equivalent of the empty-state doctrine).
4. **Failure modes**: Resend failure → log + `digest.failed` event + retry
   on the next hourly pass (the UNIQUE week key makes retries safe); three
   consecutive failed weeks for a venue → flagged in the agency digest.
   Cron route death mid-run is safe by construction (per-venue idempotency,
   no batch transaction).
5. New event types: `digest.sent`, `digest.skipped`, `digest.failed` (+
   labels).

### ✅ Acceptance checklist

- [ ] One digest email per venue per venue-local week, proven by running
      the cron route three times in one day (UNIQUE key holds, one send).
- [ ] Venue-local Monday logic tested with an injected timezone (the
      Sunday-23:30 class of bug from Plan 4 cannot recur here).
- [ ] Empty-data venue receives the warm framing, not zeros.
- [ ] Pause link works; paused owners are skipped with an event.
- [ ] aro_admin agency digest includes: new leads this week (R1's alarm),
      venues with zero visits this week, digest-failure flags.
- [ ] `owner_notifications` migration: RLS deny-all + service-role-only,
      mirrored, advisor-checked; `verify-live.mjs` extended (anon denied).

**Dependencies** — needs: N1's comms provider + R4's digest generation.
Unlocks: L2's future autopilot has a proven "platform initiates contact
safely" precedent; the agency funnel gets its standing heartbeat.

---

## N4 · 7-day onboarding checklist (activation engine)

**Executor:** Sonnet 5 / GPT 5.6. Read-model over existing data, zero
migration, low blast-radius — literal enough for the mid tier without
needing a Fable-authored intermediate spec.

**Objective** — a newly signed venue reaches its first regular-making
habits in week one: QR printed, first member, first visit, first reward,
staff PIN set, website on — with zero manual bookkeeping.

### Strategic & creative direction

The master plan promised "7-day guided onboarding (Restolabs-style
checklist)" and never specced it. Signed-but-never-activated is the silent
churn path: a venue that never prints its QR never populates its graph,
never sees the ONE number move, and quietly cancels. The design principle
that makes this aro rather than generic SaaS: **every checklist item is
derived from the graph, never self-reported.** No checkboxes the owner
ticks — the machine already knows whether a member has joined. Honest
progress, the same doctrine as derived balances. The checklist is also the
agency's onboarding script: the 7-day guided onboarding the owner sells is
this screen, walked through together.

### Implementation spec

1. **`lib/onboarding.ts`** (`import 'server-only'`): one function
   `getOnboardingState(venueId)` returning the six items, each
   `{ key, done, href }`, derived in ONE query round-trip where possible:
   - `qr_ready`: the venue has viewed/printed the QR page (see item 2) —
     derived from a `qr.viewed` event existing for the venue.
   - `first_member`: members beyond seed exist (`count > 0` excluding
     seed-flagged rows; for real venues simply `count > 0`).
   - `first_visit`: any `visits` row.
   - `first_reward`: any active `rewards` row.
   - `staff_pin`: any membership with `pin_updated_at` set.
   - `site_live`: `site_profile.site_enabled = true` (post-R3).
2. **Printable QR page** — `app/(owner)/qr/page.tsx`: server component,
   renders the venue's `/join/[slug]` URL as a large print-optimized QR
   (reuses `lib/qr.ts`, no new dependency), venue name above, "scan to join
   the club" line below, `@media print` styles that strip nav/chrome. Emits
   `qr.viewed` on render. This is the physical-world bridge — the single
   highest-leverage artifact in the whole activation flow is a piece of
   paper by the register.
3. **Checklist card on `/home`**: renders above the stats when <6 items
   done and not dismissed; each undone item is a link to the exact screen
   that completes it (QR page, rewards page, staff page, Website tab…).
   Completed items show as warm checked lines, not confetti. When all six
   complete: one quiet congratulatory line for a week, then gone. Dismissal
   (allowed only from 4+ done) emits `onboarding.dismissed` — event-derived
   state, no new column, matching the spine doctrine.
4. New event types: `qr.viewed`, `onboarding.dismissed` (+ labels).
5. No migration. No new table. This entire system is a read-model over
   existing data — that is the point.

### ✅ Acceptance checklist

- [ ] Every item derives from live data; a fresh venue shows 0/6 without
      any setup; the seeded Roastery shows its true state.
- [ ] QR page prints cleanly (print-preview screenshot or DOM assertion on
      `@media print` rules) and its QR scans to the correct join URL
      (decode-verify with the same jsQR method used when `lib/qr.ts` was
      built).
- [ ] Completing an item flips it with no manual action (e.g. recording a
      visit at the counter flips `first_visit` on next `/home` load).
- [ ] Dismissal persists via event; card gone after 6/6 + 7 days.
- [ ] Staff-role users never see the checklist (owner/manager surface).

**Dependencies** — needs: R3 for the `site_live` item (ship with 5 items if
sequenced earlier; add the sixth when R3 lands). Unlocks: activation rate
as a real agency metric (visible in N3's agency digest), higher N5 referral
quality (activated owners refer).

---

## N5 · Referral engine

**Executor:** Sonnet 5 / GPT 5.6, with a mandatory Fable 5 pre-merge review
of the once-only-credit logic specifically (step 4 below) — a ledger
double-credit bug here is a real money leak, even at café scale, and the
fraud-resistance property (reward-on-visit-not-join) must survive whatever
idempotency approach the builder chooses.

**Objective** — the pass in every member's pocket and the results screen in
every owner's hand become acquisition channels: member-refers-member with
points, owner-refers-owner into the leads inbox.

### Strategic & creative direction

Two loops, deliberately minimal in release-one:

**Member loop.** The web pass is already a bearer URL members carry — the
referral mechanic rides it. "Bring a friend" on the pass shares the join
URL with the referrer's identity attached. The reward moment is **the
friend's first visit, not their join** — joins are free to farm, visits
require a human at a counter; anchoring the reward to a recorded visit
makes fraud unprofitable by design rather than by policing. Ground truth
making this cheap: `points_ledger.reason` already allows `'referral'`
(verified in the PLAN-00 ground-truth notes) — the schema anticipated this.

**Owner loop.** An activated owner is the agency's best salesperson. A
"know another café owner?" line in HQ shares the AURA diagnostic URL with a
`ref` attribution that lands inside the lead's `answers`/payload — the
agency sees who referred whom in the inbox and handles the relationship
humanly. No automated B2B outreach, no incentive mechanics in release-one:
attribution first, incentives when there's volume to incentivize.

### Implementation spec

1. **Migration** (one file): `members.referred_by_member_id UUID NULL
REFERENCES members(member_id) ON DELETE SET NULL` + index. RLS/grants
   unchanged (column rides existing policies; server-only writes). Mirror,
   apply via MCP, advisor-check.
2. **Share surface on the pass** (`app/pass/[serial]/page.tsx`): a "Bring a
   friend — you both get closer to a reward" block. Share URL:
   `/join/[slug]?ref=<referrer pass_serial>`. Web Share API with
   copy-to-clipboard fallback; no new dependency.
3. **Join capture** (`app/api/join/route.ts`): accept optional `ref`;
   resolve pass_serial → member of the SAME venue (cross-venue or unknown
   ref: ignore silently, never error the join); ignore self-referral;
   record `referred_by_member_id` on NEW members only (an existing member
   re-joining via a referral link must not be claimed). Emit
   `referral.recorded`.
4. **Reward on first visit** (`app/api/counter/visit/route.ts`): when a
   visit is a member's FIRST (idempotency-safe: check under the same
   insert), and `referred_by_member_id` is set, insert one referrer ledger
   row (`reason:'referral'`, configurable points via
   `loyalty_config.referral_points`, default 5) guarded by uniqueness
   (`points_ledger` dedupe: one referral credit per referred member —
   enforce with a partial-unique or an existence check inside the visit
   transaction path). Emit `referral.rewarded`. The pass page shows the
   referrer a quiet "+N — you brought a friend" line in their history.
5. **Owner loop**: HQ Settings or `/home` footer line linking
   `aura.../diagnostic?ref=<venue slug>`; AURA forwards `ref` inside the
   existing lead payload (an AURA-repo one-liner rides the R1 fix); HQ
   leads inbox renders the attribution. `leads.source` CHECK already
   includes `'other'` — no schema change; the ref lives in the payload.
6. New event types: `referral.recorded`, `referral.rewarded` (+ labels).

### ✅ Acceptance checklist

- [ ] Referred join records the referrer; self-referral and cross-venue
      refs are silently ignored; the join NEVER fails because of a bad ref.
- [ ] Referrer credited exactly once, on first visit only — proven by
      replaying the same first-visit `visit_uuid` three times and by a
      second visit (no double credit either way).
- [ ] Ledger rows carry `reason='referral'`; balances reflect via the view;
      `verify-live.mjs` extended with the once-only referral check.
- [ ] Share block works pre-hydration (plain link fallback), Web Share on
      mobile, clipboard on desktop.
- [ ] Owner-referred lead arrives with attribution visible in the inbox.

**Dependencies** — needs: R4 proven (a working loop to refer INTO), R1 (the
owner loop lands in a working inbox). Unlocks: compounding acquisition on
both funnels at near-zero marginal cost.

---

## N6 · M-2 SMS

**Executor:** Sonnet 5, with Fable 5 reviewing the STOP webhook and the
TCPA-consent path before merge — same class of risk as N1, never a
light-tier task, never merged without that review regardless of builder.

Spec: `MASTER-PLAN-marketing-creative-studio.md` §6 M-2 scope as written —
Twilio adapter behind the same `CommsProvider`, STOP-webhook
(signature-verified) wired to the same revocation path as unsubscribe,
TCPA-strict consent (the §5.3 combined bar already designs for it), SMS
character budget enforced at generation time. The member-profile "Send a
nudge" button (already rendered disabled) goes live here. **Acceptance**:
§6.6 plus a sandbox STOP round-trip before any real-venue send.
**Dependencies** — N1 + owner SMS vendor decision D-1b. Unlocks: the
highest-converting reactivation channel, priced accordingly.

---

## N7 · Phase 4 billing & module activation

**Executor:** **Fable 5 must write the full executable spec** once D-12
(pricing) lands — what follows here is direction-level prose and is
**not buildable by any executor tier as written**. Once Fable's spec
exists: Sonnet 5 builds it, with Fable reviewing the webhook-driven
status-transition logic before merge (billing is a money surface).

**Objective** — tier assignment stops being a manual toggle: Stripe Billing
subscriptions map to module sets, dunning states surface, upsells become a
product surface instead of a conversation.

Direction-level spec (full executable spec written when D-12 pricing
lands): Stripe Billing (reusing R2's account) with one Product per tier,
`organizations.billing_status` (already in schema: trial/active/past_due/
canceled) driven by subscription webhooks through the existing
signature-verified webhook path; tier→module mapping as a pure function in
`lib/modules.ts`-adjacent code (`lib/tiers.ts`) consumed by
`enabledModules()`; HQ client profile gets tier assignment UI (aro_admin
only); client nav renders locked modules as warm upsell states ("part of
Growth — ask your aro contact"), never hidden, never dead. Dunning:
`past_due` shows an owner-facing banner, never a lockout in release-one
(agency relationship handles recovery humanly). **Acceptance sketch**:
webhook-driven status transitions proven in Stripe test clock; module
gating flips within one request of a tier change; no venue ever loses
loyalty-core (Starter floor is permanent). **Dependencies** — R2, owner
pricing decision D-12.

---

## N8 · PLAN-06 HQ aro refit

**Executor:** spec author — Fable 5 or Sonnet 5 (screen-inventory work,
low judgment); builder — **Kimi K3-class / light tier**. This is the
sweet spot for the smallest capable model: every commit is style-only,
every pass/fail gate is a grep, and a mistake is visible immediately
(a leftover `coffee-` class fails the gate). See §Executor Model
Assignments for the literal per-screen instructions this tier requires.

**Objective** — the HQ screens stop wearing the legacy coffee/cream skin;
one brand everywhere becomes literally true.

Direction-level spec: write `PLAN-06-hq-refit.md` first (screen inventory
via grep of non-aro color classes; per-screen mechanical migration; zero
logic changes in refit commits — style-only diffs, enforced by review);
migrate in nav order (dashboard → clients → members → staff → settings →
rest); per-screen grep gate (zero `coffee-`/`cream-`/`dark-` classes
remaining) + contrast verification on the aro palette per WCAG 2.1 AA
(the cream/terracotta pairs must be _measured_, not assumed — any failing
pair gets an ink-derived accessible variant added to the token set, never
an off-system hex). Schedule as filler between revenue items. **Acceptance
sketch**: per-screen grep gates green; measured contrast table in the build
log; zero behavioral diffs (`npm run build` + smoke unchanged).
**Dependencies** — none; pure debt paydown.

---

## N9 · Birthday capture

**Executor:** spec — done, this document (literal); builder — **Sonnet 5 /
GPT 5.6**. Consent/abuse-adjacent (a member-editable date field needs the
one-shot guard reviewed) — not a light-tier task despite its small size.

**Objective** — every member's birthday is captured once, warmly, on the
surface they already hold — filling the `campaigns.type='birthday'` slot
the schema has allowed since Phase 2 with no capture path ever built.

### Strategic & creative direction

The birthday message is hospitality's highest-converting send, and this is
the cheapest possible way to earn the data: ask once, on the pass, only
when unset, framed as a reward ("there's a free drink in it") rather than
a form. No second touchpoint is needed — the diner-facing join flow stays
deliberately one-field per its own doctrine; this is the pass page's job,
not the join page's.

**Privacy-by-design, non-negotiable**: store month + day only, **never
year**. No age-bearing data exists to leak, to subpoena, or to misuse —
this is a design constraint, not an oversight, and any future rework of
this feature must preserve it.

### Implementation spec

1. **Migration**: `members.birthday_month SMALLINT CHECK (birthday_month
BETWEEN 1 AND 12)`, `members.birthday_day SMALLINT CHECK (birthday_day
BETWEEN 1 AND 31)` — both nullable, no cross-field "valid for this
   month" constraint (Feb 30 typed by a client bug should fail the day-31
   check trivially; exact calendar validity is enforced in the API layer,
   not the DB, per the existing validate-in-code convention). RLS/grants
   unchanged — the columns ride the existing `members` policies; only
   server code ever writes them. Mirror to `aro_schema.sql`, apply via
   MCP, advisor-check.
2. **Ask block on the pass** (`app/pass/[serial]/page.tsx`): renders only
   when both fields are null. Two small selects (month, day — no free-text
   date input, no year field anywhere in the UI). Submits to the new
   route; on success the block replaces itself with a quiet "🎂 saved —
   see you then" line, matching the pass page's existing warm-confirmation
   tone (no confetti — confetti stays reserved per the aro motion doctrine
   for order-placed/reward-redeemed only).
3. **Write path**: `POST /api/pass/[serial]/birthday` body
   `{month: number, day: number}`. Resolve the member by `pass_serial`
   (same bearer-token lookup `getPass()` in the page already performs —
   reuse it, don't refetch differently). **One-shot**: reject with 409 if
   either field is already set (corrections happen through owner HQ later,
   not through the public bearer link — prevents a lost/shared pass link
   from being used to grief a member's data). Validate real calendar
   dates (reject e.g. month=2/day=30) with a small pure function in
   `lib/` (not inline in the route) so it's independently testable.
   Rate-limit via the same events-table window-counting pattern already
   used in `/api/join` (a public bearer-token endpoint needs the same
   abuse guard). Emit `member.birthday_set`.
4. **Sends**: nothing sends from this task. The `winback`/`birthday`
   campaign type becomes usable only once N1 (M-1 email nudges) ships;
   N9 only makes the data exist.
5. New event type: `member.birthday_set` (+ label).

### ✅ Acceptance checklist

- [ ] Fields are one-shot: a second POST with either field already set
      returns 409 and does not overwrite.
- [ ] Invalid calendar dates (Feb 30, day 32, month 13) rejected with a
      clear 400, never silently clamped.
- [ ] `grep -rn "birthday_year\|birthdate\|date_of_birth" app lib supabase`
      returns nothing — proves no year/full-date field was ever added
      anywhere in the stack.
- [ ] Ask block disappears once set; reappears never (not on next visit,
      not on next pass load).
- [ ] Rate limit triggers on rapid-repeat POSTs from the same IP hash.
- [ ] `verify-live.mjs` extended: anon cannot read `birthday_month`/`_day`
      outside the server path (confirms no accidental public grant).
- [ ] Migration mirrored + advisor-checked; build green.

**Dependencies** — needs: nothing to build (capture is fully
self-contained). Unlocks: N1's birthday campaign type once email sends
exist; feeds N3's digest ("3 birthdays this week" is free once both exist).

---

# SECTION 4 — ⚪ LATER: direction specs

_Deliberately direction-level: full production specs for scale
infrastructure written now would be false precision. Each entry states the
shape, the doctrine it must inherit, and the gate that turns it into a full
spec._

## L1 · Voice agent (phone → the same RPCs)

The shape: an inbound phone number per venue (Vapi/Retell/Bland-class
vendor) whose agent is a thin voice skin over capabilities that already
exist — availability via the reservation slot logic, booking via
`create_reservation` (idempotent by `client_uuid`, exactly as the widget
calls it), FAQ answers grounded in `site_profile`/hours/menu data. Behind
`lib/voice/provider.ts` (the provider-abstraction doctrine's third
application). Every call emits transcript-bearing events; every booking is
indistinguishable in the data from a widget booking (`source` marks it).
Inbound-first is a hard rule: outbound calling is a _send channel_ and
inherits the full §5.3 consent + approval doctrine before the first dial.
Cost ceiling thinking: per-minute vendor pricing makes this the first
module whose COGS is per-use — it likely lands as a Pro-tier feature
(N7's mechanics make that pricable). **Gate**: D-13 vendor decision +
M-1/M-2 running clean on a real venue. The doctrine to write into its
future spec now: **the agent never invents availability** — it books
through the same atomic RPC or it takes a message; a double-booked table
by a robot voice is an owner-trust extinction event.

## L2 · Campaign autopilot (M-3)

The trust gate made concrete for the future spec: per-venue, per-campaign-
type opt-in (a real owner click on a real settings surface, logged as an
event with the consenting user id); weekly send cap per member across ALL
autopilot campaigns; every autopilot send still creates the standard
draft/message trail (audit parity with manual); a one-tap global pause per
venue; automatic pause on anomaly (bounce/unsub spike). Autopilot is
earned per-venue, never a platform default. **Gate**: months of manual
M-1/M-2 history + explicit owner go-ahead per venue.

## L3 · Wallet passes

Stubs exist (`app/api/wallet/*`, honest 501s). Full spec when Apple/Google
developer accounts exist (D-14): PassKit signing + Google Wallet JWT
issuance behind the existing routes, pass updates pushed on balance change
(webhook/APNs plumbing is the real work — a stale wallet balance is worse
than no wallet pass). The web pass remains the canonical fallback forever
(no-wallet phones exist). **Gate**: D-14 + evidence members ask for it
(an events-derived count of wallet-button taps on the pass page — add the
tap event cheaply during R-tier work if desired).

## L4 · Review-response & GBP automation

Drafted review replies are a natural `ai_drafts` kind (`review_reply`) —
the approval inbox pattern extends without new UX invention. The gate is
the Google Business Profile API relationship (D-15), which has real
approval friction. Until then the GBP guidance doc (R3/PLAN-05 deliverable)
covers the manual path. When specced: replies are drafted-never-auto-posted
(same choke-point doctrine), grounded in the actual review text + venue
voice.

## L5 · Churn prediction beyond `member_status`

The honest position: new/regular/fading/lost from real cadence math IS the
churn model at current scale, and it's explainable to an owner in one
sentence — which a gradient-boosted score is not. Revisit only with
multi-venue volume, and only if the fading list demonstrably misses churn
the owner cares about. The bar any ML must clear: **more actionable than
the why-sentence, while staying as explainable.**

## L6 · Phase 6–8 + i18n

Unchanged doctrine per `PHASE-6-COMMERCE-CANDIDATES.md` (gateway #2,
delivery dispatch, POS-lite, white-label apps) — the re-evaluation trigger
stands (≥1 real venue, owner checking the ONE number weekly). i18n: the
string-discipline rule (R3.3) applies to every new surface from now on;
the full i18n go/no-go (D-16) is a market question (which market forces
FR-first?), not a technical one.

---

# SECTION 5 — OPEN DECISIONS REGISTER (consolidated)

_Single source of truth for what's blocked on whom. Merges the 7 decisions
from `MASTER-PLAN-marketing-creative-studio.md` §9 (statuses updated —
three are now resolved) with the new ones this masterplan surfaces. "Owner
action" = minutes of dashboard work; "owner decision" = a real choice._

| ID   | Decision                                                  | Status                                | Recommendation                                 | Unblocks             |
| ---- | --------------------------------------------------------- | ------------------------------------- | ---------------------------------------------- | -------------------- |
| D-1  | Email vendor commitment (account + API key)               | **Open — owner decision**             | Resend, as long-stubbed                        | N1, N3, N6           |
| D-1b | SMS vendor commitment                                     | Open — owner decision (can trail D-1) | Twilio                                         | N6                   |
| D-2  | CASL/CAN-SPAM/TCPA compliance sign-off on the §5.3 design | Open — owner (+counsel if desired)    | Design to the stricter combined bar as staged  | First real send (N1) |
| D-3  | Creative Studio route group                               | ✅ **Resolved** (R4)                  | `(owner)` group                                | —                    |
| D-4  | LLM provider + model tier                                 | Recommended; needs key                | Anthropic API, fast tier, `AI_DRAFT_MODEL` env | R4 (CS-1/CS-2)       |
| D-5  | Send-volume cost absorption vs pass-through               | Open — owner pricing call             | Absorb inside Growth tier at café volumes      | N7 pricing copy      |
| D-6  | Digest approval UX                                        | ✅ **Resolved** (R4)                  | Seen-not-approved                              | —                    |
| D-7  | Campaign origination                                      | ✅ **Resolved** (N1)                  | Draft-first; manual compose creates a draft    | —                    |
| D-8  | Stripe production keys + webhook endpoint                 | **Open — owner action (~30 min)**     | Do it this week; R2 is zero-code revenue       | R2                   |
| D-9  | AURA Production env parity confirmation                   | **Open — owner action (~10 min)**     | Do it first; R1 is a revenue leak              | R1                   |
| D-10 | Sending domain + from-address identity                    | Open — owner decision                 | Platform domain, venue friendly-from           | N1                   |
| D-11 | `CRON_SECRET` + Vercel cron enablement                    | Owner action at N3 time               | Standard                                       | N3                   |
| D-12 | Tier prices (Starter/Growth/Pro numbers)                  | Open — owner decision                 | Structure is locked; numbers are the call      | N7                   |
| D-13 | Voice vendor selection                                    | Open — deferred by design             | Evaluate Vapi/Retell/Bland at gate time        | L1                   |
| D-14 | Apple/Google developer accounts                           | Open — deferred                       | Only when wallet demand is evidenced           | L3                   |
| D-15 | Google Business Profile API relationship                  | Open — deferred                       | Manual guidance path meanwhile                 | L4                   |
| D-16 | i18n go/no-go + first locale                              | Open — market question                | String discipline now; decide on market pull   | L6                   |

**The two to do this week are D-8 and D-9** — both are owner actions
measured in minutes, and together they turn on the two revenue paths the
code already supports.

---

# SECTION 6 — HORIZON 3: vision candidates (not buildable)

_These are recorded so the vision isn't lost — not because they're next.
**Stricter than ⚪ LATER**: ⚪ items at least get a direction paragraph an
executor can eventually build from once their gate opens. Horizon 3 items
get no direction spec at all, on purpose — writing one now would be false
precision about problems that don't exist yet at this scale. Same
preservation doctrine as `PHASE-6-COMMERCE-CANDIDATES.md`: capture the
idea, state its trigger, move on. **No executor tier, including Fable 5,
builds anything from this section without first writing a full strategic
diagnosis the way `MASTER-PLAN-marketing-creative-studio.md` did for
Marketing & Creative Studio** — that document is the model for how a
Horizon 3 item earns its way into a real sequence._

**H1 · Cross-venue intelligence flywheel.** Anonymized benchmarking
("cafés your size see 34% two-week return; you're at 21%") turns the
aggregate of many venues' loyalty graphs into a second moat no POS-led or
ordering-led competitor can copy — they don't have cadence-level loyalty
data to aggregate. **Trigger**: ≥20 live venues with real trade history.
**Doctrine any future spec must inherit**: aggregate-only outputs, a
minimum-venue-count floor before any comparison is shown (never expose a
single other venue's numbers), per-venue opt-out, and never member-level
data crossing venue boundaries under any circumstance.

**H2 · Multi-location groups.** `organizations` already sits above
`venues` in the schema, but cross-location loyalty (do points earned at
location A work at location B?) has no designed answer. **Trigger**: the
first real client opens a second location and asks. **Doctrine**: this is
a product decision the owner makes deliberately when it's real, not a
default — a hasty "yes, of course" could break the per-venue tenant
isolation principle (`MASTER-PLAN-aro.md` §4.1) in ways that are expensive
to unwind.

**H3 · Gift cards / stored value.** The classic café cash-flow instrument
(revenue in December, redemption in February) and a natural fit for the
append-only ledger discipline already in place. **Trigger**: repeated real
demand from live venues AND a liability/compliance review (stored value is
regulated money in most jurisdictions). **Doctrine**: never built
casually, never built before D-2-class compliance sign-off exists for it
specifically — it is a heavier compliance surface than email/SMS.

**H4 · Data export.** A CSV export of a venue's own members/visits inside
HQ — the smallest item on this list (roughly a day of work) and the first
candidate worth promoting into 🟡 the moment a sales conversation needs it.
It makes the locked "100% merchant data ownership" positioning
(`MASTER-PLAN-aro.md` §1) literally demonstrable instead of only claimed.
**Trigger**: none required beyond bandwidth — this is the one Horizon 3
item that could be promoted on request rather than waiting for a market
signal.

**H5 · Events & community layer.** Cupping nights, live music, classes —
cafés already run these; RSVP-as-visits feeds the graph, and it's the
warmest possible campaign content once N1 exists. The feature that would
make aro read as a community operating system rather than a transaction
one. **Trigger**: post-N1, real owner demand (not speculative).

---

# SECTION 7 — EXECUTOR MODEL ASSIGNMENTS

_The owner's requirement, applied across every phase above: no task is
assigned to a tier that would have to imagine its way through a gap in
the spec. Detailed enough for a lower-tier model to execute perfectly;
not detailed to the point of overkill on tasks that don't need it._

### Tiering doctrine (binding — read before assigning or reassigning any task)

1. **Fable 5 — architect tier.** Strategy, lean-spec authoring (turning a
   strategic document into an executable `PLAN-NN`), resolving open design
   decisions, and any task touching **money, consent, or compliance
   design** (not just implementation — the _design_ of the safety check).
   Fable's output is what gives lower tiers zero imagination to fill in;
   Fable never delegates the writing of a spec it hasn't fully thought
   through, the same standard this masterplan itself was held to.
2. **Sonnet 5 / GPT 5.6 — senior executor tier.** Full-feature builds from
   an executor-grade spec. This is the tier the whole corpus targets by
   default — `MASTER-PLAN-aro.md`'s opening line says specs are written
   "so a mid-tier model (Sonnet 5, GPT 5.6) can implement... without
   judgment calls." **Floor tier for anything touching migrations, authz,
   money, or consent code** — even when Fable designed the safety check,
   Sonnet/GPT build the surrounding feature.
3. **Kimi K3 / light tier — mechanical executor.** Reserved for tasks that
   are simultaneously: (a) purely mechanical — a known transform applied
   repeatedly, (b) pass/fail verifiable by grep or a single query, and
   (c) zero design freedom — there is exactly one correct output per
   input. **Never** assign this tier anything touching auth, money,
   consent, migrations, or a public API surface, regardless of how small
   the diff looks. N8 (HQ refit) is the only 🔴/🟡/⚪ task in this
   masterplan that qualifies.
4. **Escalate, never improvise.** Every phase inherits `MASTER-PLAN-aro.md`
   §5's STOP-and-flag protocol. A lower-tier executor that hits a genuine
   judgment call (a schema surprise, a contradiction between this doc and
   the repo, an ambiguous edge case the spec didn't cover) escalates to
   Fable 5 rather than guessing — guessing on a money/consent surface is
   exactly the failure mode the tiering exists to prevent.
5. **Review gates.** Every execution self-reviews with
   `/code-review --level medium` pre-commit (existing house rule,
   unchanged). Beyond that: Fable 5 personally reviews the specific
   named surfaces called out per-task below (N1's eligibility query, N5's
   once-only credit, N6's STOP webhook, N7's billing transitions) before
   merge — regardless of which model wrote the code, because the risk
   lives in the logic, not the author.

### Assignment table

| Task                                                                      | Spec author                                                                                   | Builder                                                                      | Why this split                                                                                                          |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| R1 lead-leak fix                                                          | Fable 5 (done, this doc)                                                                      | Sonnet 5 / GPT 5.6                                                           | Literal runbook; escalate to Fable only if steps 1–3 don't isolate the fault                                            |
| R2 Stripe keys                                                            | Fable 5 (done)                                                                                | Sonnet 5 / GPT 5.6 (verification only)                                       | Owner does the env work; model work is a literal test-then-live sequence                                                |
| R3 client websites                                                        | Fable 5 (`PLAN-05`, pre-written for this tier)                                                | Sonnet 5 / GPT 5.6                                                           | Spec chain already complete — no further authoring needed                                                               |
| R4 Creative Studio                                                        | **Fable 5 must write `PLAN-07`** + the voice-doctrine prompt preamble                         | Sonnet 5 / GPT 5.6 builds from `PLAN-07`                                     | Prompt-writing that encodes taste is Fable-input, not executor-input                                                    |
| N1 email nudges                                                           | **Fable 5 must write `PLAN-08`** + the eligibility-query compliance test                      | Sonnet 5 (never light-tier)                                                  | Consent-bearing infrastructure; Fable reviews the eligibility query + unsubscribe route pre-merge regardless of builder |
| N2 site-copy                                                              | Fable 5 (done, small)                                                                         | Sonnet 5 / GPT 5.6                                                           | Fully specced, no open calls                                                                                            |
| N3 digest delivery                                                        | Fable 5 (done, this doc, literal)                                                             | Sonnet 5 / GPT 5.6                                                           | New table + first cron justify mid-tier; spec is literal enough to need no further authoring                            |
| N4 onboarding checklist                                                   | Fable 5 (done, this doc, literal)                                                             | Sonnet 5 / GPT 5.6                                                           | Read-model only, zero migration, low blast radius                                                                       |
| N5 referral engine                                                        | Fable 5 (done, this doc, literal)                                                             | Sonnet 5 / GPT 5.6, **Fable pre-merge review of the once-only-credit logic** | Ledger double-credit is a real money leak even at café scale                                                            |
| N6 SMS                                                                    | Fable 5 (points to §6 M-2)                                                                    | Sonnet 5, **Fable reviews STOP webhook + TCPA path pre-merge**               | Same risk class as N1; never light-tier                                                                                 |
| N7 billing                                                                | **Fable 5 must write the full spec** when D-12 lands — currently **not buildable as written** | Sonnet 5, **Fable reviews webhook-driven status transitions pre-merge**      | Money surface; direction-level prose is not an executable spec                                                          |
| N8 HQ refit                                                               | Fable 5 or Sonnet 5 writes the screen inventory                                               | **Kimi K3-class / light tier**                                               | Style-only diffs, grep-gated, mistake-evident — the one genuine light-tier task in this document                        |
| N9 birthday capture                                                       | Fable 5 (done, this doc, literal)                                                             | Sonnet 5 / GPT 5.6                                                           | Small but consent/abuse-adjacent (one-shot guard) — not light-tier                                                      |
| ⚪ L1–L6 (all)                                                            | **Fable 5 only**, when each gate opens                                                        | Not yet assigned                                                             | Direction paragraphs are Fable-input; no lower tier builds from them as written                                         |
| Horizon 3 (all)                                                           | **Fable 5 only**, and only after writing a full strategic diagnosis                           | Not applicable                                                               | Not buildable at all — see Section 6's own rule                                                                         |
| Misc: seed data extensions, doc formatting sweeps, string-hoisting passes | —                                                                                             | **Kimi K3-class / light tier**                                               | Grep-verifiable, zero design freedom, matches N8's profile                                                              |

**The detail-level rule, stated once for reuse:** a task may only be
assigned to a given tier if the spec it runs on leaves that tier zero
imagination to fill in. Where this table says "Fable must write PLAN-NN
first," that authoring step is part of the task's dependency chain, not an
optional nicety — assigning the direction-level prose directly to a
lower tier is the protocol violation this section exists to prevent.

---

## How an executor consumes this document

1. Read `MASTER-PLAN-aro.md` (§4/§5 binding) — then this document's vision
   and your assigned system's section — then the deep spec it points to,
   if any. Nothing here overrides §4/§5; conflicts stop the work.
2. Systems marked "spec exists — execute as written" (R3, R4, N1, N2, N6)
   mean exactly that: the pointed-at document is the contract; this one
   adds only the listed deltas and resolutions.
3. New-system specs here (R1, R2, N3, N4, N5, N9) are executable directly,
   but each still gets a lean `PLAN-NN` file + `BUILD-LOG` per the house
   pattern when its build starts.
4. ⚪ items and Horizon 3 items are NOT buildable from this document — ⚪
   explicitly requires a future full spec once its gate opens; Horizon 3
   requires a full strategic diagnosis before even that. Building either
   from the paragraphs above is a protocol violation. Check **Section 7**
   before assigning any task to a model — the tier a task is written for
   is not optional, and the review gates it names are not skippable.
5. Every schema-touching system extends `scripts/verify-live.mjs`. Every
   system emits its named events. Every acceptance checklist is pass/fail —
   a partially-green checklist is a not-done system.
