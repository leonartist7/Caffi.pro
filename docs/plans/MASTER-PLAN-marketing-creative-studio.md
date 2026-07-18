# aro — Marketing & Creative Studio: Diagnosis, Creative Vision & Implementation Plan

**Status: strategic + pre-execution planning document. Not a green light to build.** Written 2026-07-18 for a future Fable-tier reader (owner, or a later Fable 5 session) to read, argue with, enrich, and eventually convert into an executable `PLAN-NN-*.md` once the vendor decisions in §9 are made. Everything below is grounded in the live repo as of this date — every schema claim was checked against `supabase/migrations/*.sql` and, where noted, against the live Supabase project (`jjgccfrwjkwknyjtbtxa`) directly. Nothing here should be treated as already built. Where this document recommends something, it says so explicitly — it does not present opinion as fact.

**Relationship to other docs.** `docs/plans/MASTER-PLAN-aro.md` is still the constitution — its §4 architecture principles and §5 execution protocol bind everything proposed here without exception. This document is a deep-dive expansion of two roadmap lines from that file:

- §6 **Phase 3 — Marketing & nudges** (currently ⏸ DEFERRED, owner decision 2026-07-17: "Needs a real email/SMS vendor account... and consent/compliance calls before a spec can be written responsibly").
- The **"creative studio"** half of §6 Phase 5's title (`docs/plans/PLAN-05-client-websites.md` covers only the _website_ half; "creative studio" was named in the roadmap commit but never specified — this document is that specification).

This document does not override the Phase 3 deferral. It exists so that when the owner is ready to un-defer it, the thinking is already done and an executor can move straight to building instead of re-deriving strategy under time pressure. §9 lists exactly what decision unlocks execution.

---

## 1 · Executive diagnosis

### 1.1 What already exists — the schema was built for this, nothing else was

This is the single most important finding in this document: **the database already encodes a specific, coherent vision for AI-assisted marketing that nobody ever wrote down or built the other 90% of.** Evidence, table by table (`supabase/migrations/20260707000001_aro_platform_schema.sql` §9, lines 396–436):

| Object                                           | What it already assumes                                                                                                                                                               | Where                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `campaigns.type`                                 | `CHECK (type IN ('winback','birthday','streak','slowday'))`                                                                                                                           | line 399                       |
| `campaigns.autopilot`                            | a boolean already exists to let a campaign send without a human click — **not yet used anywhere**, and this document recommends it stay unused for the entirety of release-one (§5.4) | line 402                       |
| `ai_drafts.kind`                                 | `CHECK (kind IN ('winback','slowday','social_caption','social_image','digest'))`                                                                                                      | line 411                       |
| `ai_drafts.status`                               | `'draft' \| 'approved' \| 'edited' \| 'skipped' \| 'sent'` — a full human-approval lifecycle                                                                                          | line 413                       |
| `messages.channel`                               | `CHECK (channel IN ('sms','email'))`                                                                                                                                                  | line 424                       |
| `messages.unsub_token`                           | already `NOT NULL DEFAULT uuid_generate_v4()` on every message row                                                                                                                    | line 429                       |
| `members.consent_ts/consent_text/consent_source` | already captured at join (`app/api/join/route.ts`), `consent_source CHECK (... IN ('join_page','counter','import','other'))`                                                          | `20260707000001` lines 188–191 |

Read together, this is a design for exactly two things this document is about: a **generation engine** (`ai_drafts` — winback nudges, slow-day promos, social captions, social _images_, and a weekly owner digest, each starting as a `draft` a human must approve) and a **distribution engine** (`campaigns` for the sending logic/type, `messages` for the actual per-member send record, with unsubscribe and consent already load-bearing in the schema, not bolted on later).

The application layer built exactly one piece of this vision: `components/owner/ApprovalsInbox.tsx` + `app/api/ai-drafts/[id]/route.ts` (PATCH `status`) + a query in `app/(owner)/home/page.tsx` that reads `ai_drafts WHERE status='draft'`. That's it. Confirmed by exhaustive search — **zero** routes or pages reference `campaigns`, `messages`, or an AI generation call anywhere in `app/` or `lib/`:

```
find app -iname "*campaign*"   → (nothing)
find app -iname "*creative*"   → (nothing)
find app -iname "*message*"    → (nothing)
grep -rl "anthropic\|openai" app/ lib/ package.json → (nothing — no LLM provider wired at all)
```

The `ApprovalsInbox` empty state ("aro's suggestions will appear here") is not a placeholder for _some future phase_ — it is, right now, in production, permanently empty, because nothing has ever written a row into `ai_drafts`. It is a beautifully built front door to a room that was never furnished.

### 1.2 The naming drift that will confuse whoever picks this up

`.env.example` (lines 41–47) stubs `RESEND_API_KEY` and `TWILIO_ACCOUNT_SID`/`AUTH_TOKEN`/`FROM_NUMBER` under a comment header reading **"Phase 4"**. `MASTER-PLAN-aro.md` §6 calls the same work **"Phase 3 — Marketing & nudges."** `app/api/invites/route.ts` line 40 also says `email_delivery: 'STUBBED — needs RESEND_API_KEY (Phase 4)'`. These are the same phase under two different numbers from two different points in the roadmap's history (the roadmap was reordered on 2026-07-17, promoting Client Websites ahead of Marketing; the env file predates that reorder and was never touched). **Whoever executes this must update `.env.example`'s comment headers to say "Phase 3" in the same commit that adds any new env var**, or the drift compounds.

### 1.3 Why this stalled, and what specifically un-stalls it

`MASTER-PLAN-aro.md` §6 gives the deferral reason precisely: _"Needs a real email/SMS vendor account (Resend and/or Twilio) and consent/compliance calls before a spec can be written responsibly — an executor cannot make those decisions."_ That's still true today. Nothing in this document changes it. What this document adds is everything that does **not** require that decision first — the architecture, the schema deltas, the UX, the creative vision, the compliance design (which is jurisdiction-aware but vendor-agnostic) — so that once the owner picks a vendor, only the adapter-writing and account-wiring remain, not the thinking.

### 1.4 The real product insight hiding in the schema

`ai_drafts.kind` already spans two different jobs that a lesser plan would have kept separate: **marketing content** (`winback`, `slowday`) and **owner-facing content** (`digest`) and **brand content that isn't a nudge at all** (`social_caption`, `social_image`). That third bucket is the "creative studio" the roadmap commit named but never scoped — it's not a subset of marketing, it's a sibling. A café owner opening "Creative Studio" wants Instagram captions for today's pastry case and a rewritten homepage tagline; they are not thinking about win-back campaigns at that moment. Conflating the two into one "Marketing" tab would bury the creative, low-stakes, high-frequency use case under the compliance-heavy, occasional one. **This document's central structural recommendation (§4.1, §6, §7) is to build them as two surfaces sharing one generation engine and one approval mechanism**, not one feature.

---

## 2 · Competitive & positioning analysis (marketing/creative slice)

This extends `MASTER-PLAN-aro.md` §1's fault-line table for the two modules in scope here. It does not introduce new unverified competitor claims beyond what's already asserted as locked doctrine in that file — it applies the same positioning to this specific slice.

| Fault line                                 | The trap                                                                                                                                                                                                       | aro's stance here                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marketing as a paid add-on                 | Toast charges ~$50/mo for marketing on top of the base platform; most competitors treat "email a customer" as a premium unlock                                                                                 | Marketing & Creative Studio are **Growth-tier**, not a separate SKU (master plan §2) — bundled the moment a venue is on Growth, no metered send fees passed through as a separate line item to the café (aro absorbs Resend/Twilio cost inside the flat tier, or the tier price already accounts for typical café volume — a pricing call for the owner, not this document) |
| Generic AI content                         | Most "AI marketing" tools generate generic, brand-voice-blind copy that owners have to heavily edit or discard                                                                                                 | Every generation call is grounded in the venue's own data: `brand_kit`/`site_profile` (tagline, about text — the venue's own words, once Phase 5 ships), recent `member_status` distribution, actual visit patterns, real active `rewards` — never a template with `{business_name}` swapped in                                                                             |
| Send-and-hope                              | Most SMB marketing tools let anyone hit send with zero compliance gate beyond a checkbox at signup                                                                                                             | Every send in release-one passes through the same human-approval choke-point already half-built (`ai_drafts.status`), with consent state visible at the point of approval, not just at collection time                                                                                                                                                                      |
| Website and marketing as separate products | Competitors like BentoBox (website+ordering) and Toast (marketing) sell these as different SKUs from different vendors, so a café's site copy and its email copy drift out of brand-voice sync within a season | aro's Creative Studio is the **single content-generation surface** for both — a tagline drafted for the homepage and a caption drafted for Instagram come from the same engine, reading the same brand context, so voice never drifts between surfaces                                                                                                                      |

---

## 3 · Creative vision — "aro's Creative Studio"

### 3.1 What it is

A small, focused room inside the owner's HQ where **the venue's own voice, amplified** — never a stranger's voice, never a generic marketing-bot voice — produces short pieces of content a busy owner can approve in the time it takes to read them. It is not a content calendar. It is not a CRM. It is not Canva. It is closer to: _a barista who's worked here three years and knows exactly how to describe today's special, drafts it for you, and waits for your nod before it goes anywhere._

### 3.2 What it is not (guardrails against scope creep, binding on any executor)

- Not a scheduling/calendar tool. Release-one has no "queue this for Thursday" — a draft is approved and sent (or copied) now, or it sits.
- Not a social media _publisher_. aro drafts a caption; the owner copies it into Instagram themselves in release-one (posting-API integrations are a real Phase 6+ candidate, not this one — see `PHASE-6-COMMERCE-CANDIDATES.md`'s pattern of deliberately deferring platform integrations until the core loop is proven).
- Not an image editor. `social_image` stays a visible "coming soon" stub (§7.6) until an image-generation or stock-asset vendor decision is made — same discipline as the Apple/Google Wallet stubs in `app/api/wallet/*`.
- Not autonomous. `campaigns.autopilot` exists in the schema; this document explicitly recommends it stays off in the UI for the entire scope described here. Every send starts as a human's click.

### 3.3 The core structural insight, restated as a design rule

**Creative Studio generates. Marketing distributes. `ai_drafts.status='draft'→'approved'` is the one door between them.** A `winback`-kind draft, once approved, is what a `campaigns`/`messages` send pipeline picks up and actually delivers. A `social_caption`-kind draft, once approved, has nowhere to "send" to in release-one — approval just means "this is good, copy it out." A `digest`-kind draft is approved once (or auto-marked approved, since it's addressed to the owner, not a member — no external send-consent question applies) and rendered read-only. Same table, same UI shell, three different post-approval fates. This is why `ai_drafts` was designed as one polymorphic table instead of three — the original schema author already saw this; the plan below just makes it real.

### 3.4 Voice & tone doctrine for AI-generated content

Every generated draft must read like it was written by someone who has actually stood behind that café's counter — because it's built from that café's actual data, not a template:

1. **Grounded, never generic.** A winback draft references the member's _actual_ usual order if known (`member_status`/order history once Phase 1 ordering data exists), the venue's actual name and tone (from `site_profile.tagline`/`about` once Phase 5 ships — until then, `business_name` alone), never "Hey there! We miss you! 🎉" boilerplate.
2. **Short.** SMS drafts respect a hard character budget appropriate to a single SMS segment (mention this constraint to the model explicitly at generation time — do not silently truncate after the fact, which produces broken sentences). Email and social drafts stay skimmable — a busy owner approves in seconds, not minutes.
3. **On-brand color of language, not on-brand hex codes.** The AI has no opinion about `aro-terra` vs `aro-sage` — that's the UI's job, per master plan §3. What it must respect is warmth: never corporate, never pushy, never falsely urgent ("LAST CHANCE!!") — this is a café thanking a regular for existing, not a flash-sale email.
4. **Always editable before send.** `ai_drafts.status='edited'` exists in the schema for exactly this — the owner can rewrite the draft's `output` text before approving; this is not optional polish, it is the design's actual safety valve against a bad generation going out verbatim.
5. **Never fabricate specifics.** If the prompt-construction layer (§7.4) doesn't have real data for a claim (a specific reward name, a specific day's special), the draft must not invent one. Ground every generation call in real rows, and instruct the model explicitly not to invent details it wasn't given — this is a correctness requirement, not a style preference, because a fabricated "your free latte is waiting" that isn't backed by a real redeemable reward is a customer-trust incident, not a copy nit.

### 3.5 UX principles specific to this surface (extends master plan §3)

- **The empty state is the pitch.** `ApprovalsInbox`'s existing empty state already nails this ("aro's suggestions will appear here") — Creative Studio's own empty/first-run state should follow the same warmth, e.g. "Your first suggestion arrives after your circle has a few weeks of visits to learn from" rather than a blank generator form staring back at a new owner.
- **One approve action, one skip action, always visible together.** Never a draft the owner can only approve or only dismiss — `ApprovalsInbox`'s two-button pattern (`act(id, 'approved'|'skipped')`) is already correct and should be the template for every new surface here, not reinvented.
- **The generation trigger is a request, never a promise.** "Ask aro for a caption" beats "Generate" — sets the expectation that a human reviews before anything is real, consistent with master plan §3 rule 5 (visible stub over silent fake) applied to AI output specifically: an ungenerated/failed draft shows a plain retry state, never a fake placeholder caption.

---

## 4 · Strategic recommendation

### 4.1 Sequencing recommendation

Build **Creative Studio's generation engine and the `social_caption` + `digest` kinds first**, deliberately _before_ wiring any external send capability (email/SMS). Reasoning:

1. It requires **zero vendor decision** — no Resend, no Twilio, only an LLM provider choice (§5.2), which is a smaller, lower-stakes decision than a paid-send-volume commercial vendor relationship, and one this document can responsibly recommend a default for (Claude via the Anthropic API — see §5.2).
2. It proves the generation quality and the approval UX with **zero compliance risk** — a caption or a digest that sits unsent if the owner skips it has caused no harm. A winback SMS that goes out with a consent bug is a real incident. Prove the engine on the low-stakes kinds first.
3. It gives the owner something to react to (real generated drafts, in the existing `ApprovalsInbox`) _before_ asking them to commit to an email/SMS vendor — which may make that decision easier, not harder, once they've seen the quality of what would be sent.
4. It is the natural extension of Phase 5 (§6, Master Plan) which will already be live by the time this is picked up — `site_profile.tagline`/`about` (Phase 5, §7.4 below) become the brand-voice grounding data for every subsequent generation.

Only after that foundation is proven should `winback`/`slowday` kinds and the actual `campaigns`→`messages` send pipeline be built (Marketing & Nudges proper, §6) — and that half genuinely cannot start without the owner's vendor decision (§9.1).

Suggested sub-phase order (each independently shippable, each gets its own commit/PR per master plan §5 discipline):

| Sub-phase          | What ships                                                                                                                                                                                               | Blocked on                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **CS-1**           | LLM provider abstraction (`lib/ai/provider.ts`) + `generateDraft()` engine + `social_caption` kind end-to-end + Creative Studio page (new, not just the existing inbox)                                  | LLM provider choice only (§5.2) — no owner vendor account needed                                            |
| **CS-2**           | `digest` kind — weekly owner-facing summary, reusing `venue_week_stats` (§7.4.3)                                                                                                                         | CS-1                                                                                                        |
| **CS-3**           | `site_copy` kind (new — not in the current CHECK constraint, needs a migration) — "AI suggest" button inside Phase 5's Website settings tab                                                              | CS-1, and Phase 5 (`PLAN-05-client-websites.md`) shipped                                                    |
| **M-1**            | Email adapter (Resend) wired via `lib/comms/provider.ts`; `winback`/`slowday` kinds; real `campaigns`/`messages` send pipeline; unsubscribe flow                                                         | **Owner vendor decision (§9.1)**                                                                            |
| **M-2**            | SMS adapter (Twilio); STOP/consent handling; member-profile "Send a nudge" button (already stubbed disabled in `app/(owner)/regulars/[id]/page.tsx` per `PLAN-owner-home-regulars.md` step 5) wired live | M-1, **owner SMS vendor decision**                                                                          |
| **M-3**            | Campaign autopilot (the `campaigns.autopilot` flag, finally used) — explicitly the LAST sub-phase, only after M-1/M-2 have run manually-approved for a real stretch of time on a real venue              | M-1, M-2, and an explicit owner go-ahead — this is not a technical gate, it's a trust gate                  |
| **CS-4 (stretch)** | `social_image` kind                                                                                                                                                                                      | An image-generation or stock-asset vendor decision — not scoped further here; flag and re-plan when reached |

### 4.2 Vendor decision framework (presented to the owner, not decided here)

This document takes no position that overrides the owner's authority to choose vendors or the master plan's explicit rule that an executor cannot make this call. What it provides is the decision framework so the choice is fast once the owner is ready:

**Email — Resend (already stubbed in `.env.example`).** Fits the codebase's existing abstraction discipline (`lib/payments/provider.ts` precedent) cleanly; has a generous free tier suitable for early real-venue volume; developer-friendly API matching the rest of this stack's taste. Alternative worth naming: **Postmark** (stronger deliverability reputation for transactional-adjacent mail, slightly pricier). Recommendation: start with Resend as already stubbed; the `lib/comms/provider.ts` abstraction (§5.1) makes switching later a contained change, not a rewrite.

**SMS — Twilio (already stubbed).** The default in almost every SMB stack for a reason (coverage, STOP-handling infrastructure, established compliance tooling). Alternative worth naming: **Vonage/MessageBird** if Twilio's Canadian long-code pricing becomes a concern at scale. Recommendation: start with Twilio as already stubbed.

**Neither vendor decision is technically hard to reverse** given the adapter pattern below — the real cost of getting this wrong is commercial (contract terms, per-message pricing at the venue counts aro eventually reaches), which is exactly the kind of call master plan §5.5 reserves for the owner, not an executor.

**LLM provider for generation — this document DOES recommend a default**, because unlike email/SMS it carries no external commercial-account or compliance weight beyond an API key, and a default unblocks CS-1 immediately: **the Anthropic API (Claude)**, using a fast/cheap model tier (e.g. Haiku-class) for draft generation given the short-copy, high-frequency, cost-sensitive nature of this workload, with the model identifier itself configurable via env var (`AI_DRAFT_MODEL` or similar) rather than hardcoded — so a future session can upgrade the tier without a code change. This project's own tooling already documents Claude API integration patterns (see the `claude-api` skill available in this environment) — the executor implementing `lib/ai/provider.ts` should consult it for current model IDs, pricing, and prompt-caching guidance rather than guessing.

### 4.3 Cost model sketch (directional only — not a commitment)

Rough shape, to size the decision, not to price a contract:

- **Generation (Claude API):** short-copy drafts at a small-model tier are inexpensive per draft; the real lever is _frequency_ (one digest/week + a handful of caption requests/week per venue vs. many). Order-of-magnitude: this is a "cents per venue per week" workload, not a material cost line, provided auto-generation cadence (§7.4.5) stays deliberately light (no background cron generating dozens of unused drafts nobody asked for).
- **Email (Resend):** free tier likely covers early real-venue volume entirely; becomes a real line item only once venue count and per-venue send frequency both scale.
- **SMS (Twilio):** the most expensive per-unit channel by a wide margin industry-wide — this is the strongest argument for sequencing SMS (M-2) after email (M-1) proves the pipeline, and for the compliance layer (§5.3) being airtight before the more expensive channel goes live, since a bad send costs real money per recipient, not just reputation.

### 4.4 Build-vs-defer table

| Feature                                                         | Recommendation                                   | Why                                                                                                                                           |
| --------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `social_caption` generation                                     | Build now (CS-1)                                 | Zero vendor risk, proves the engine, high owner delight-per-effort                                                                            |
| `digest` generation                                             | Build now (CS-2)                                 | Reuses `venue_week_stats` entirely — almost free given Phase 4 already built the aggregation                                                  |
| `site_copy` assist                                              | Build after Phase 5 ships (CS-3)                 | Natural extension, small scope, ties the two roadmap lines together as the roadmap commit intended                                            |
| `winback`/`slowday` + real sends                                | Build only after owner vendor decision (M-1/M-2) | Explicit master-plan deferral; compliance-critical                                                                                            |
| `campaigns.autopilot`                                           | Defer indefinitely past M-2                      | Trust must be earned with a manual track record first; no technical blocker, a judgment one                                                   |
| `social_image`                                                  | Defer, no sub-phase assigned                     | New vendor decision not yet framed; revisit after CS-1–CS-3 ship and there's real signal owners want it                                       |
| Social _posting_ API integration (auto-publish to Instagram/FB) | Defer to Phase 6+                                | Matches `PHASE-6-COMMERCE-CANDIDATES.md`'s existing discipline of not adding third-party platform integrations before the core loop is proven |
| Content calendar / scheduling                                   | Defer, not currently scoped anywhere             | Real feature, real future work, but scope creep on top of an already two-module document — flag for its own future plan if the owner wants it |

---

## 5 · Shared infrastructure (both modules depend on this)

### 5.1 `lib/comms/provider.ts` — email/SMS abstraction

Mirrors the `PaymentProvider` doctrine already locked in master plan §4.7 (`lib/payments/provider.ts`, Stripe as adapter #1). No route or component may ever import `resend` or `twilio` SDK types directly — everything goes through:

```ts
// lib/comms/provider.ts — shape sketch, not final
export interface CommsProvider {
  sendEmail(
    to: string,
    subject: string,
    body: string,
    opts: { unsubToken: string }
  ): Promise<{ ok: true; providerId: string } | { ok: false; error: string }>
  sendSms(
    to: string,
    body: string,
    opts: { unsubToken: string }
  ): Promise<{ ok: true; providerId: string } | { ok: false; error: string }>
}
```

Adapters: `lib/comms/adapters/resend.ts`, `lib/comms/adapters/twilio.ts` — each STUBBED (visible `{stubbed:true}` response, matching the wallet-route convention in `app/api/wallet/*`) until the corresponding env var is present, never a silent no-op that fakes success.

### 5.2 `lib/ai/provider.ts` — generation abstraction

Same pattern, one level up the stack:

```ts
// lib/ai/provider.ts — shape sketch
export interface DraftRequest {
  kind: 'winback' | 'slowday' | 'social_caption' | 'digest' | 'site_copy' // 'social_image' excluded until CS-4
  venueId: string
  context: Record<string, unknown> // shape defined per-kind in lib/ai/prompts/*.ts (§7.4.1)
}
export interface AiProvider {
  generateDraft(
    req: DraftRequest
  ): Promise<{ ok: true; output: string } | { ok: false; error: string }>
}
```

This abstraction exists even though only one provider is recommended (§4.2), for the same reason `PaymentProvider` exists even with only Stripe live today: master plan §4.7's binding principle is "no route or component ever imports a gateway SDK directly," and that principle does not become optional just because there's currently one implementation.

### 5.3 Consent & compliance layer — the part that must be right before anything sends

This is the highest-stakes section of this document. Get this wrong and it is not a bug, it is a legal exposure and a trust breach.

**Jurisdictional scope.** The seed venue is Calgary, Canada (`timezone: 'America/Edmonton'`) — **CASL** (Canada's Anti-Spam Legislation) governs commercial electronic messages by default. If/when aro venues expand into the US, **CAN-SPAM** (email) and **TCPA** (SMS, materially stricter than CAN-SPAM on consent) both apply. This document recommends building to the **stricter combined bar** from day one rather than a Canada-only design that needs retrofitting:

1. **Consent is opt-in, never opt-out-by-default**, already true at the schema level (`members.consent_ts` starts `NULL`, per `app/api/join/route.ts`'s existing "upgrade-only, never required to join" logic) — the send pipeline must treat `consent_ts IS NULL` as a hard block, not a soft warning. A `messages` row must never be created for a member with no consent timestamp, full stop — this is a `WHERE` clause in the send-eligibility query, not a UI warning the owner can click past.
2. **Every message carries a working unsubscribe path** — `messages.unsub_token` already exists; this document specifies a new public route `app/api/unsubscribe/[token]/route.ts` (GET, no auth — the token _is_ the auth, same bearer-token discipline as `pass_serial`) that sets `members.consent_ts = NULL` (a real revocation, not a flag layered on top) and records the revocation via `emitEvent`. Every sent email footer and every SMS body must include this link/STOP instruction — enforced at the template-rendering layer (§6.4.4), not left to each campaign author to remember.
3. **STOP-word handling for SMS is not optional** — Twilio (and any SMS vendor) has this infrastructure built in on their side, but the _webhook_ that receives a STOP reply and calls the same unsubscribe path above must be built here (`app/api/webhooks/sms-inbound/route.ts`, signature-verified against the vendor's webhook secret, same `timingSafeEqual` discipline as `app/api/leads/route.ts`'s existing shared-secret pattern).
4. **Consent text must be retained verbatim**, already true (`members.consent_text`) — never allow a compliance audit to ask "what exactly did this member agree to" and have no answer. This is why `consent_text` was designed as a stored string, not a boolean; preserve that.
5. **A message must record what it was sent for.** `messages.campaign_id`/`ai_draft_id` are both nullable FKs already in the schema for exactly this traceability — every send must populate at least one, never both null (a send with no traceable origin is a compliance dead-end).

**A non-negotiable pre-M-1 acceptance test** (write this before the first real send ships, not after): seed a member with `consent_ts = NULL`, attempt to send a campaign to the venue's full member list, assert the query eligible-recipient count _excludes_ that member and the assertion is on the actual SQL `WHERE`, not on an application-layer filter that could be bypassed by a different code path later.

### 5.4 The approval choke-point doctrine (binding)

Restated because it is the single most important guardrail in this entire document: **in the scope covered here, nothing external ever sends without a specific human clicking "approve" on that specific draft, for that specific send.** No batch-approve-all. No autopilot (§4.1's M-3 gate). No "approve this campaign type forever." The `ai_drafts.status` lifecycle (`draft→approved|edited|skipped`, then `sent` once the send pipeline consumes it) is the technical embodiment of this; the UI must never offer a shortcut around it. This is not a release-one training-wheels constraint to be removed later for convenience — re-read master plan §7's binding security baseline before ever proposing autopilot-by-default, and even then, that is an explicit, logged, reversible per-venue-per-campaign-type opt-in, never a platform default.

---

## 6 · Module A — Marketing & Nudges (Phase 3)

_Blocked on §9.1. Everything below is pre-staged thinking, not a build order until that decision lands._

### 6.1 Ground truth (re-verify before executing — schema may have shifted)

- `campaigns`, `ai_drafts`, `messages` tables exist, RLS'd to `authenticated` (owner/manager, no anon) per `supabase/migrations/20260707000002_aro_rls.sql` lines 204–227 — confirm the exact policy text hasn't changed before writing new routes against it.
- `members.consent_ts/consent_text/consent_source` exist and are populated by the live join flow (`app/api/join/route.ts`) — real data exists today, not just schema.
- `ApprovalsInbox` + `app/api/ai-drafts/[id]/route.ts` PATCH already work for `approved`/`skipped` transitions — reuse, do not rebuild.
- `lib/events.ts` already has `campaign.created`, `campaign.autopilot_toggled`, `message.sent`, `ai_draft.created`, `ai_draft.approved` event types wired with labels — extend, don't duplicate.
- `app/(owner)/regulars/[id]/page.tsx` (per `PLAN-owner-home-regulars.md` step 5) has a "Send a nudge" quick action already rendered **disabled** with a tooltip "campaigns arrive in the next phase" — this is the exact wire-up point for M-2's live nudge button; find and flip it, don't build a parallel entry point.
- `.env.example` stubs exist for `RESEND_API_KEY`, `TWILIO_ACCOUNT_SID`/`AUTH_TOKEN`/`FROM_NUMBER` — fix the "Phase 4" comment drift (§1.2) in the same commit that adds any new comms env var.

### 6.2 Non-goals for release-one of this module

- No autopilot (§5.4, §4.1 M-3).
- No campaign scheduling calendar — a campaign is created and sent (to its eligible recipients, now), not queued for a future date/time in release-one.
- No A/B subject-line testing, no open/click analytics dashboards beyond the `messages.opened_at` column already in schema (populate it if the email vendor's webhook provides it cheaply; do not build tracking-pixel infrastructure from scratch for this).
- No push notifications (`lib/modules.ts` already lists a `notifications` module as `coming_soon`, platform-wide-parked — do not conflate it with this module).

### 6.3 Schema deltas needed

Likely none beyond what already exists for the core send pipeline — the schema was over-built for this relative to the app layer (§1.1). The one likely real addition: an index if send-eligibility queries (§5.3) turn out to need one at scale (`CREATE INDEX ON members(tenant_id, consent_ts) WHERE consent_ts IS NOT NULL` or similar) — write this only if `EXPLAIN ANALYZE` on real seed-scale data shows it's needed, per master plan §4.9's migration discipline; don't speculatively add an index nobody's proven necessary yet.

### 6.4 Phase breakdown (once §9.1 is answered)

1. **Comms provider abstraction** (§5.1) + Resend adapter, env-gated stub-if-missing.
2. **Send-eligibility query + the pre-M-1 compliance test** (§5.3) — build the test before the feature that could fail it.
3. **Campaigns page** (`app/(dashboard)/campaigns/page.tsx`, new `lib/modules.ts` entry `key: 'campaigns'`) — list existing campaigns, create one (`type`, `name`, template — reuses an approved `ai_drafts` row as the starting template text, or a manual compose path), a **"Send" button that shows the exact eligible-recipient count before confirming** (never a blind send — the owner must see "this will reach 47 members" before committing).
4. **Send pipeline**: server route `app/api/campaigns/[id]/send/route.ts` — resolves eligible members (consent + venue scope), for each: renders the template with member-specific fields (first name, points balance — same PII-safe fields already used elsewhere, never raw phone/email in the rendered _body_ beyond what the member already knows about themselves), calls `CommsProvider`, inserts a `messages` row per recipient (`status` reflecting the provider's immediate response; a webhook can update to `sent`/`failed` asynchronously if the vendor supports delivery webhooks — don't block the request on that).
5. **Unsubscribe route** (§5.3.2) + STOP webhook (§5.3.3).
6. **Member-profile nudge button** — flip the existing disabled stub in `app/(owner)/regulars/[id]/page.tsx`, gated the same `owner|manager` way every other write action in that file already is.
7. **`scripts/verify-live.mjs` extension** (master plan §7 binding requirement): anon denied on `campaigns`/`messages` (already true via RLS, just assert it); consent-excluded-member send-eligibility check (the §5.3 pre-M-1 test, promoted into the permanent regression net); unsubscribe token round-trip (revoke via token, re-check `consent_ts IS NULL`).
8. **`docs/plans/BUILD-LOG-marketing-nudges.md`** — one section per phase, per convention.

### 6.5 Edge cases a weaker executor would miss

- **Double-unsubscribe is idempotent** — hitting an already-used `unsub_token` a second time must not error; it's already revoked, return the same "you're unsubscribed" confirmation page.
- **A member who unsubscribes mid-send-batch**: if the send pipeline is mid-loop over recipients when a STOP arrives, the in-flight batch was already eligibility-checked at query time — this is acceptable (a single race-window message, not a repeated violation) but the _next_ campaign must re-check freshly, never cache an eligibility list across sends.
- **Venue-scoped, always** — a campaign send route must verify every recipient's `tenant_id` matches the campaign's `venue_id` before rendering/sending anything, same discipline as every other row-gated route (master plan §4.1); a campaign is not a platform-wide broadcast tool, ever.
- **Rendering must not leak other members' data** — the per-recipient template render happens server-side per recipient in a loop, never a single batch-rendered email with all recipients' names visible to each other (no BCC-as-a-shortcut that leaks the full recipient list in headers either — use the provider's per-message send API, not a single multi-recipient call).
- **Twilio/Resend webhook signature verification is mandatory** (master plan §7) before trusting any inbound delivery-status or STOP-reply payload — never process an unsigned webhook body.

### 6.6 Acceptance criteria (once built)

1. A member with `consent_ts IS NULL` never appears in an eligible-recipient count or receives a message — proven by the `verify-live.mjs` check, not just manual QA.
2. Unsubscribing via the token immediately excludes that member from any subsequent send, verified by re-running the eligibility query after a token-based revoke.
3. Every `messages` row traces to a `campaign_id` or `ai_draft_id` — no orphan sends.
4. `campaigns.autopilot` remains unreachable from the UI (grep confirms no code path sets it `true` outside a manual DB action) through the end of M-2.
5. STOP-word webhook round-trip verified against the vendor's sandbox/test mode before any real-venue send.
6. Build green, `docs/plans/BUILD-LOG-marketing-nudges.md` complete.

---

## 7 · Module B — Creative Studio

_CS-1/CS-2 are NOT blocked on a vendor decision — the primary near-term-executable content of this whole document._

### 7.1 Ground truth

- `ai_drafts` table + `ApprovalsInbox` component + PATCH route already exist and work (§6.1) — Creative Studio is a NEW page that reads/writes the same table with a generation trigger added, not a new table.
- No LLM provider is wired anywhere in the codebase today (§1.1) — this is greenfield.
- `venue_week_stats(venue_id, tz)` RPC (`supabase/migrations/20260711000002_owner_stats.sql`) already returns everything a `digest` draft needs in one round trip: `regulars_returned, members_this_week, members_last_week, visits_this_week, visits_last_week, fading_now, fading_7d_ago, has_any_data` — CS-2 is close to a formatting exercise on top of data that already exists, not new aggregation work.
- `member_status` view (`20260707000001` lines 493–512) gives per-member `status`/`cadence_days`/`days_since_last` — the exact grounding data a `winback` draft (M-1, not CS) will eventually need; CS-1's `social_caption` kind does not need this, keep its context minimal.
- `lib/owner-stats.ts` already exists server-side with `import 'server-only'` — any new AI context-gathering functions belong alongside it or in a new `lib/ai/context.ts` following the same `server-only` discipline, never callable from a client component.

### 7.2 Non-goals for release-one of this module

- No `social_image` (§4.4 — deferred, no vendor framed).
- No direct social-platform posting (§3.2 — copy-out only).
- No content calendar/scheduling (§4.4).
- No fine-tuning or venue-specific model customization — one shared model, grounded per-call by real venue data injected into the prompt, not a per-venue trained model (that's a scale/cost problem for a much later stage, if ever).
- No user-editable prompt templates in release-one (an owner cannot write their own generation instructions) — the prompt library (§7.4.1) is code, versioned in the repo, not a database-editable feature yet.

### 7.3 Schema deltas needed

One migration, small: add `'site_copy'` to `ai_drafts.kind`'s CHECK constraint (currently `winback, slowday, social_caption, social_image, digest` — needs `site_copy` for CS-3). Everything else CS-1/CS-2 need already exists. Exact migration shape:

```sql
-- supabase/migrations/<timestamp>_ai_drafts_site_copy_kind.sql
ALTER TABLE ai_drafts DROP CONSTRAINT ai_drafts_kind_check;
ALTER TABLE ai_drafts ADD CONSTRAINT ai_drafts_kind_check
    CHECK (kind IN ('winback','slowday','social_caption','social_image','digest','site_copy'));
```

(Constraint name verified live against `jjgccfrwjkwknyjtbtxa` on 2026-07-18 via `pg_constraint` — `ai_drafts_kind_check` is correct today. Re-verify at execution time regardless, per the standing rule that ground-truth claims in these documents can drift; this one just happens to already be checked rather than guessed.)

### 7.4 Phase breakdown

#### 7.4.1 The prompt-construction library (`lib/ai/prompts/*.ts`)

One pure-function file per `kind`, each shaped `buildPrompt(context: KindSpecificContext): string`, no Supabase import (context is gathered by the caller and passed in — keeps the prompt layer testable without a DB). This is where the voice doctrine (§3.4) is encoded as system-prompt instructions, once, shared across all kinds via a common preamble function (`lib/ai/prompts/shared.ts`) that every kind-specific builder calls first — so a voice-doctrine change is a one-file edit, not a five-file hunt.

#### 7.4.2 `social_caption` — the CS-1 flagship

Context needed: `business_name`, `site_profile.tagline` (once Phase 5 exists; `null`-safe before then), a short freeform "what's this post about" input from the owner (a text box — "today's special is a maple oat latte," "we're closed Monday for the holiday") — this is the one kind in release-one with a human-provided creative brief, not a fully autonomous trigger, because a caption is fundamentally about _something specific happening today_ that no database table tracks. Generation is triggered by an explicit "Ask aro for a caption" button, not a background cron — respects §3.5's "request, never a promise" principle and avoids generating unused drafts nobody asked for (§4.3's cost discipline).

Flow: owner types the brief in the Creative Studio page → `POST /api/ai-drafts/generate` `{venueId, kind:'social_caption', brief}` → route gates `requireVenueRole(['owner','manager'])` → calls `lib/ai/context.ts` to gather `business_name`/`tagline` → calls `lib/ai/prompts/social-caption.ts` → calls `AiProvider.generateDraft()` → inserts `ai_drafts` row `status='draft'` → `emitEvent('ai_draft.created', ...)` → returns the new draft to the client, which renders it immediately in the same approve/skip pattern as `ApprovalsInbox` (reuse the component, don't fork it — see §7.4.4).

#### 7.4.3 `digest` — the CS-2 quick win

Weekly, one per venue, generated on-demand when the owner opens Creative Studio and no digest exists for the current venue-local week yet (mirrors the `status_snapshots` "first-call-per-day" cron-free pattern already established in `venue_week_stats` — apply the same trick: a `digest`-kind draft's `created_at` week is checked before generating a new one, so opening the page twice in the same week doesn't waste a generation call). Context: the full `venue_week_stats` row, formatted into a short narrative ("12 regulars came back this week, up from 8 last week — Tuesday was your slowest day") rather than the raw numbers, which the owner already sees on `/home`. This draft's approval semantics are simpler than the others (§3.3) — no external send exists for a digest in release-one; "approve" just means "seen," and this document recommends auto-marking it `approved` on open/view rather than making the owner click through a formality, revisiting `ApprovalsInbox`'s UI for this one kind specifically (a "seen" state, not a real approve/skip choice) — flag this as a UX judgment call for whoever builds it, not a hard requirement.

#### 7.4.4 The Creative Studio page itself

New route `app/(owner)/creative/page.tsx` (or `app/(dashboard)/creative/page.tsx` — **open question, see §9.3**: does this belong in the owner-facing `(owner)` group per `PLAN-owner-home-regulars.md`'s pattern, or the HQ `(dashboard)` group? This document leans `(owner)` — Creative Studio is a venue owner's daily tool, not an HQ/agency-admin surface — but flags it explicitly for confirmation rather than deciding unilaterally, since it affects `lib/modules.ts` wiring and nav placement). Structure: a brief-input box + "Ask aro" button for `social_caption`, a digest card (auto-generated per §7.4.3), and the existing `ApprovalsInbox`-pattern list of any other pending drafts — **extend `ApprovalsInbox` to accept a `kind` filter prop rather than forking a second component**, since the approve/skip mechanics are identical across kinds; only the surrounding page chrome differs.

#### 7.4.5 `site_copy` (CS-3, after Phase 5 ships)

An "AI suggest" button inside Phase 5's Website settings tab (`app/(dashboard)/settings/page.tsx`, the tab `PLAN-05-client-websites.md` Phase 4 adds) next to the `tagline`/`about` fields — generates a `site_copy`-kind draft grounded in `business_name` + whatever the owner has already typed elsewhere on the form (menu category names if available, once Phase 1 ordering's menu data exists) + the same brief-style freeform input as `social_caption` ("what should this café's site say about itself"). Approving a `site_copy` draft **pre-fills the form field, it does not auto-save** — the owner still clicks the existing Settings "Save" button, preserving the existing PATCH flow from `PLAN-05-client-websites.md` Phase 1 untouched. This is the concrete, load-bearing link between "client websites" and "creative studio" that the roadmap commit named together but never connected.

### 7.5 Edge cases a weaker executor would miss

- **Generation failure is not an error page** — if `AiProvider.generateDraft()` returns `ok:false` (rate limit, API outage, malformed response), the UI shows a calm "Couldn't draft that just now — try again" with a retry button, never a raw error, never a fake fallback draft.
- **A `social_caption` brief with no real content** (owner submits an empty or nonsense brief) should be validated client-and-server-side with a minimum-length/non-empty check before spending a generation call — cheap guard, real cost discipline (§4.3).
- **Rate-limit per venue per day** on the generation endpoint (same `events`-table window-counting pattern already established in `app/api/join/route.ts`'s rate limiter — reuse the pattern, don't invent a second one) — protects against a runaway client bug or a bored staff member spamming "Ask aro" fifty times in a row.
- **`ai_drafts.prompt_ctx` (already a JSONB column) should store the actual context object passed into the prompt**, not just the brief text — this is the same traceability principle as `messages.campaign_id`/`ai_draft_id` (§5.3.5): if a draft reads oddly weeks later, `prompt_ctx` is how anyone reconstructs why the model said what it said, without needing to have logged the raw LLM request/response separately.
- **The digest's "first call this week" check must use the venue's own timezone** (`venues.timezone`, already the pattern from `venue_week_stats`), not server UTC — same class of bug the master plan already flagged as product-correctness-critical for Phase 4's "ONE number."

### 7.6 Visible-stub requirements (binding, not optional)

- `social_image`: the Creative Studio page shows a card for it, greyed/disabled, with copy like "Image generation is coming — for now, captions are ready" — never omitted entirely (owners should know it's planned) and never a dead button that does nothing on click.
- Any kind whose generation call fails due to a missing `AI_DRAFT_MODEL`/API-key env var (a genuinely mis-configured deployment, not a transient failure) must render the same STUBBED-badge convention used elsewhere (`app/api/wallet/*`, `app/api/invites/route.ts`'s `email_delivery` field) — `{stubbed:true, message:'...'}` — never silently do nothing.

### 7.7 Acceptance criteria

1. A real `social_caption` draft, generated from a real typed brief on a real seeded venue, reads as plausibly written by that café (subjective, but the bar is: an outside reviewer reading it blind should not immediately peg it as AI boilerplate) — this is a judgment call for whoever ships it to self-assess honestly, per master plan §5.3's "treat a clean review with suspicion" doctrine applied to output quality, not just code correctness.
2. Opening Creative Studio twice in the same venue-local week does not generate two `digest` drafts (verified by checking `ai_drafts` row count for `kind='digest'` in the current week after two page loads).
3. Generation failure (simulate by pointing `AI_DRAFT_MODEL`/API key at an invalid value) shows the calm retry state, not a crash, not a fake draft.
4. `prompt_ctx` on a real generated draft contains enough to reconstruct what was asked (manual inspection).
5. Rate limit triggers correctly under a rapid-repeat test (mirrors `verify-live.mjs`'s existing rate-limit-adjacent checks in spirit, even if this one is more naturally an integration test than a live-DB check).
6. `site_copy` kind (CS-3 only): approving a suggestion pre-fills the Settings form field without auto-saving; existing Save flow unchanged and still gated the same way.
7. Build green; `docs/plans/BUILD-LOG-creative-studio.md` complete, one section per CS sub-phase.

---

## 8 · Cross-module integration points

- Creative Studio's `winback`/`slowday` kinds (built as part of Module A once vendor-unblocked, §4.1) are the one place the two modules' schemas touch: a `winback` draft, once approved, is what seeds a `campaigns` row's `template` field or is attached directly as the `messages.body` for that send — **decide at M-1 execution time** whether a campaign always originates from an approved draft (cleaner traceability, matches `messages.ai_draft_id`'s existence) or can also be manually composed with no draft at all (more flexible, but `ai_draft_id` would be null and `campaign_id` would need to be the sole traceability anchor for that path) — this document recommends the draft-originated path as the default and primary flow, with manual compose as a secondary path that still requires the same approval semantics, not a bypass.
- Both modules share `emitEvent`/`EVENT_LABELS` (`lib/events.ts`) — no new event-spine mechanism, extend the existing `AroEventType` union (already has every event type this document's phases need — `campaign.created`, `campaign.autopilot_toggled`, `message.sent`, `ai_draft.created`, `ai_draft.approved` — confirm at execution time whether `ai_draft.skipped`/`ai_draft.edited` are worth adding for completeness; not currently present).
- Both modules share the `(owner)` vs `(dashboard)` nav-placement open question (§9.3) — resolve it once, apply consistently to Creative Studio's page AND Module A's Campaigns page, don't let them land in different route groups by accident.

---

## 9 · Open decisions required (explicit — do not proceed past these without an answer)

1. **Email/SMS vendor commitment** (blocks all of Module A, §6): confirm Resend + Twilio (this document's recommendation, §4.2) or name an alternative, and actually create the vendor accounts + get real API keys into `.env.local`/Vercel envs. This is the master-plan-locked deferral (§1.3) — nothing in Module A starts without this.
2. **CASL/CAN-SPAM/TCPA compliance sign-off**: this document designs to what it believes is the stricter combined bar (§5.3), but it is not legal advice and this repo has no lawyer in the loop. The owner (or counsel) should confirm the consent/unsubscribe design in §5.3 actually satisfies real obligations before the first real-venue send, especially if/when aro expands past Canada.
3. **Creative Studio's route group**: `(owner)` or `(dashboard)`? (§7.4.4) This document recommends `(owner)` but flags it as a genuine open call, not a foregone conclusion.
4. **LLM provider + model tier**: this document recommends Claude/Anthropic API at a fast/cheap tier (§4.2) as a default to unblock CS-1 without waiting on a vendor-account-style decision — confirm or override before writing `lib/ai/provider.ts`.
5. **Pricing/tier mechanics for send volume**: does aro absorb Resend/Twilio costs inside the flat Growth-tier price (master plan §2), or pass through metered costs above some included volume? Not a technical question — a business-model question this document deliberately does not answer, flagged for the owner.
6. **`digest` approval UX**: auto-mark-approved-on-view vs. requiring an explicit click (§7.4.3) — small UX call, flagged rather than decided.
7. **Campaign origination**: draft-required vs. manual-compose-allowed (§8) — flagged rather than decided.

---

## 10 · Risks & guardrails (summary — full detail in-line above)

- **Compliance risk is the dominant risk of this entire document** — §5.3 is not optional reading for whoever executes Module A; a consent bug here is not a typical software bug.
- **Cost runaway risk** is real but small and containable — the rate-limit + on-demand-not-cron generation triggers (§7.5) are the two guardrails; do not remove either for "convenience" without re-reading §4.3.
- **Voice/quality risk** — generic AI output would undermine the entire creative-studio premise (§3); §3.4's grounding-in-real-data rule is the mitigation, and §7.7's acceptance criterion #1 is a deliberately subjective, non-skippable quality bar, not a checkbox.
- **Scope-creep risk** — both modules' §Non-goals sections exist because this document already anticipated exactly the kind of feature-creep ("just add scheduling," "just let it auto-post to Instagram") that would blow past what's been thought through here. An executor tempted to add something not listed above should treat that temptation as a signal to write a NEW plan document, not silently expand this one's scope mid-build.
- **Trust risk (autopilot)** — §5.4 and §4.1's M-3 gate exist because sending on a member's behalf without a human click, even once, even by accident, is the kind of mistake that ends an owner's trust in the whole product. There is no technical reason to ever soften this gate quickly; soften it slowly, deliberately, and only with real manual-approval track record behind it.

---

## 11 · Suggested roadmap placement

Recommend `MASTER-PLAN-aro.md` §6 gets updated, when this document is accepted, as follows (do not edit that file as part of accepting this document without owner sign-off — this is a suggestion for the edit, not the edit itself):

- Phase 3's entry expands from a single deferred line to reference this document plus a note that CS-1/CS-2/CS-3 (the Creative Studio sub-phases) are **not** blocked on the same vendor decision as M-1/M-2/M-3 and could, if the owner wants forward progress before the vendor decision is made, be pulled forward as their own mini-phase — similar to how Phase 5 was itself pulled forward ahead of Phase 3/4 on 2026-07-17 for exactly this kind of "doesn't need a new vendor account" reasoning (§4.1 makes this argument in full).
- Once CS-1 through CS-3 are scoped as executable, they should get their own `PLAN-0X-creative-studio.md` file in this document's style (Ground truth / Non-goals / numbered phases / edge cases / acceptance criteria) — this document is intentionally one level more strategic than that; a future Fable 5 session converting this into an executable spec should keep the diagnosis/vision/recommendation sections (§1–4) here as the reference doc and write the leaner executable spec separately, the same relationship `MASTER-PLAN-aro.md` already has to each `PLAN-NN-*.md`.

---

## 12 · Appendix — quick-reference inventory

**Files this document expects a future executor to create** (none created by this document itself — planning only):

- `lib/comms/provider.ts`, `lib/comms/adapters/resend.ts`, `lib/comms/adapters/twilio.ts`
- `lib/ai/provider.ts`, `lib/ai/context.ts`, `lib/ai/prompts/shared.ts`, `lib/ai/prompts/social-caption.ts`, `lib/ai/prompts/digest.ts`, `lib/ai/prompts/site-copy.ts`, `lib/ai/prompts/winback.ts`, `lib/ai/prompts/slowday.ts`
- `app/api/ai-drafts/generate/route.ts`
- `app/(owner)/creative/page.tsx` (or `(dashboard)` — §9.3)
- `app/(dashboard)/campaigns/page.tsx`, `app/api/campaigns/route.ts`, `app/api/campaigns/[id]/send/route.ts`
- `app/api/unsubscribe/[token]/route.ts`, `app/api/webhooks/sms-inbound/route.ts`
- `supabase/migrations/<ts>_ai_drafts_site_copy_kind.sql`
- `docs/plans/BUILD-LOG-marketing-nudges.md`, `docs/plans/BUILD-LOG-creative-studio.md`

**Event types likely worth adding to `lib/events.ts`'s `AroEventType`** (confirm actual need at execution time, don't add speculatively): `ai_draft.skipped`, `ai_draft.edited`, `unsubscribe.recorded`, `sms.stop_received`.

**Existing assets this document leans on heavily — read these files first, in this order, before writing any code from this plan:**

1. `docs/plans/MASTER-PLAN-aro.md` (binding principles)
2. `components/owner/ApprovalsInbox.tsx` + `app/api/ai-drafts/[id]/route.ts` (the one real precedent)
3. `supabase/migrations/20260707000001_aro_platform_schema.sql` §9 (lines ~396–436, the campaigns/ai_drafts/messages block) + `20260707000002_aro_rls.sql` lines 204–227 (the grants)
4. `supabase/migrations/20260711000002_owner_stats.sql` (`venue_week_stats` — the digest's data source)
5. `app/api/join/route.ts` (the consent-recording precedent) + `app/api/leads/route.ts` (the shared-secret webhook-verification precedent)
6. `lib/payments/provider.ts` (the abstraction pattern to mirror for `lib/comms/provider.ts` and `lib/ai/provider.ts`)
7. `docs/plans/PLAN-05-client-websites.md` (for the CS-3 `site_copy` integration point specifically)
