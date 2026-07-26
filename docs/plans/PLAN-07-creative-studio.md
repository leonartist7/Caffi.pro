# PLAN-07 — Creative Studio (CS-1 social captions + CS-2 weekly digest)

> Executor: read `docs/plans/MASTER-PLAN-aro.md` FIRST (§4 architecture
> principles and §5 execution protocol are binding here and not repeated in
> full), then `MASTER-PLAN-v2-operating-system.md` §R4 for the three resolved
> decisions. The strategic reference document is
> `MASTER-PLAN-marketing-creative-studio.md` — this file is the lean
> executable spec it asked for in its own §11. Where the two differ on a
> detail, the resolved decisions in v2 §R4 win.

## Context & goal

`ai_drafts` has existed since the first schema migration and has never held a
single row. `components/owner/ApprovalsInbox.tsx` renders a warm empty state
in production for a table nothing writes to. This plan furnishes that room:
the venue's own voice, generated from the venue's own rows, approved by a
human before it goes anywhere.

Scope is **CS-1 + CS-2 only**. No sends, no vendor accounts, no compliance
surface — that is M-1/M-2, still blocked on the owner's email/SMS vendor
decision (open decision D-1). Creative Studio is deliberately the half of
Phase 3 that needs no vendor account, so generation quality gets proven
before any message can leave the building.

## Resolved decisions (do not re-litigate)

| #   | Decision           | Resolution                                                               |
| --- | ------------------ | ------------------------------------------------------------------------ |
| D-3 | Route group        | `(owner)` — `app/(owner)/creative/page.tsx`, sibling to `/home`          |
| D-4 | LLM provider       | **OpenAI**, `OPENAI_API_KEY` + `AI_DRAFT_MODEL` (owner call, 2026-07-20) |
| D-6 | Digest approval UX | **Seen, not approved** — auto-marked `approved` on first view, no click  |

## Non-goals (do not build these — flag, don't self-expand)

- No `winback` / `slowday` kinds. They imply a send path; the send path is M-1.
- No `campaigns` or `messages` writes. Zero rows in either table from this plan.
- No `site_copy` kind and no migration to add it — that is CS-3, gated on
  PLAN-05 shipping. `ai_drafts.kind`'s CHECK constraint is untouched by this
  plan because `social_caption` and `digest` are already in it.
- No `social_image` generation. A visible, disabled "coming soon" card only.
- No scheduling, no content calendar, no social-platform posting API.
- No autopilot. `campaigns.autopilot` stays unreachable from any UI.
- No user-editable prompt templates. Prompts are versioned code.
- No batch-approve. One draft, one decision, per §5.4's choke-point doctrine.

## Ground truth (verified against the repo 2026-07-25)

- `ai_drafts`: `draft_id PK · venue_id · kind · prompt_ctx JSONB · output TEXT ·
status · created_at · updated_at`. `kind` CHECK already allows
  `winback, slowday, social_caption, social_image, digest`. `status` CHECK
  allows `draft, approved, edited, skipped, sent`. Index on
  `(venue_id, status)`. Fresh table → **`venue_id`**, never `tenant_id`.
- `app/api/ai-drafts/[id]/route.ts` PATCH already handles
  `approved|edited|skipped` with `requireRowVenueRole('ai_drafts', 'draft_id',
id, ['owner','manager'], 'venue_id')`. Reuse it. **Known defect to fix in
  this plan**: it emits `ai_draft.approved` for every status including
  `skipped` and `edited`, so the activity feed misreports skips as approvals.
- `components/owner/ApprovalsInbox.tsx` — the approve/skip precedent. Extend
  with an optional `kind` filter rather than forking a second component.
- `lib/authz.ts` — `requireVenueRole(venueId, roles)`. Gate BEFORE reading the
  body; `if (!gate.ok) return gate.response`.
- `lib/events.ts` — `AroEventType` union + `EVENT_LABELS` must both be
  extended in the same file or TS fails. `ai_draft.created` and
  `ai_draft.approved` already exist.
- `lib/owner-stats.ts` — `getVenueWeekStats(venueId, timezone)` wraps the
  `venue_week_stats` RPC and returns every number the digest needs in one
  round trip. `mondayStartInTz(date, tz)` gives the venue-local week boundary.
  Both are `server-only`. Do not write a second timezone helper.
- Rate-limit precedent: `app/api/join/route.ts` counts rows in `events` over a
  time window (`.gte('ts', ...)`) rather than using serverless memory. Reuse
  the shape.
- Stub precedent: `lib/payments/adapters/stripe.ts` throws a typed
  `PaymentProviderConfigurationError('STUBBED — needs STRIPE_SECRET_KEY')`
  when env is missing. Mirror this exactly for the AI provider.
- Abstraction precedent: `lib/payments/provider.ts` — interface + `getProvider()`
  factory, adapters under `lib/payments/adapters/`. No route or component may
  import an OpenAI SDK or call `api.openai.com` directly.
- `app/(owner)/owner-shell.tsx` — nav is a hardcoded `NAV` array and the
  sidebar is `hidden md:flex` **with no mobile alternative**, so owner
  surfaces are currently unreachable on a phone. This plan fixes that.
- `lib/modules.ts` — `ModuleKey` union + `MODULES` array. No supabase import
  (it is imported by client components).
- `.env.example` already stubs `OPENAI_API_KEY` under a **"Phase 4"** header —
  the numbering drift called out in the strategic doc §1.2. Fix to "Phase 3"
  in the same commit that adds `AI_DRAFT_MODEL`.

## Phase 1 — Provider abstraction (`lib/ai/`)

1. `lib/ai/errors.ts` — `AiProviderConfigurationError` (missing env, a
   deployment fault) and `AiProviderRequestError` (transient upstream fault).
   Two classes because the UI treats them differently: the first renders the
   STUBBED badge, the second renders the calm retry state.
2. `lib/ai/provider.ts` — `DraftKind`, `DraftRequest`, `AiProvider` interface
   (`generateDraft(req): Promise<{ok:true;output:string} | {ok:false;...}>`),
   and `getAiProvider()`. `import 'server-only'`.
3. `lib/ai/adapters/openai.ts` — the only file that knows OpenAI exists.
   Implemented over `fetch` against the Chat Completions endpoint; **no SDK
   dependency added**. Reads `OPENAI_API_KEY` (throws
   `AiProviderConfigurationError` when absent) and `AI_DRAFT_MODEL` (defaults
   to a fast/cheap tier). Sends an explicit timeout via `AbortSignal`, caps
   `max_tokens`, and rejects an empty completion rather than returning `''`.

## Phase 2 — Prompt library + context (`lib/ai/prompts/`, `lib/ai/context.ts`)

4. `lib/ai/prompts/shared.ts` — the voice doctrine (strategic doc §3.4) as one
   shared system preamble, so changing the voice is a one-file edit. Must
   encode: grounded never generic; short; warm not corporate; **never invent a
   special, price, or reward the caller did not supply**. Pure functions, no
   Supabase import, unit-testable.
5. `lib/ai/prompts/social-caption.ts` — `buildSocialCaptionPrompt(ctx)`.
6. `lib/ai/prompts/digest.ts` — `buildDigestPrompt(ctx)`; turns the
   `venue_week_stats` row into a narrative brief, and states explicitly that
   the numbers given are the only numbers that may appear.
7. `lib/ai/context.ts` — `server-only`; gathers `business_name`, `slug`,
   `timezone`, and (null-safe, pre-PLAN-05) `brand_kit.tagline`. Returns a
   plain object that is stored verbatim into `prompt_ctx`.

## Phase 3 — Generation route

8. `lib/ai/drafts.ts` — `server-only` helpers: the events-window rate limit,
   the venue-local "already have a digest this week?" check, and the insert.
   Lives in `lib/` because `app/api/**/route.ts` may only export handlers.
9. `app/api/ai-drafts/generate/route.ts` — `POST {venueId, kind, brief?}`.
   Order is load-bearing: gate → parse → validate → rate-limit → context →
   prompt → provider → insert → `emitEvent('ai_draft.created')` → return.
   - `kind` restricted to `social_caption | digest` (not the full union).
   - `social_caption` requires a brief of 3–280 chars after trim.
   - Rate limit: 20 `ai_draft.created` events per venue per rolling hour → 429.
   - Digest: if one already exists for the venue-local week, return it with
     `{reused:true}` instead of spending a generation call.
   - Missing env → `{stubbed:true, message}` at HTTP 200 with no row written.
   - `prompt_ctx` stores the full context object plus the brief, per §7.5.
10. Fix the PATCH route's event type so `skipped` and `edited` emit their own
    event types instead of all reporting as `ai_draft.approved`.

## Phase 4 — Creative Studio UI

11. `app/(owner)/creative/page.tsx` — server component. Resolves venue the
    same way `/home` does, fetches drafts + the current week's digest, renders
    the client shell. `export const dynamic = 'force-dynamic'`.
12. `components/owner/CreativeStudio.tsx` — client. The brief composer ("Ask
    aro for a caption"), the draft list, the digest card, the `social_image`
    stub card. Every user-visible string hoisted to a `STRINGS` constant per
    the i18n-non-retrofit discipline in v2 §R3.
13. `components/owner/DraftCard.tsx` — one card, three post-approval fates
    (§3.3): captions get approve/skip/edit + copy-to-clipboard, digests render
    read-only. Approve/skip/edit reuse the existing PATCH route.
14. Extend `ApprovalsInbox` with an optional `kind` prop. Do not fork it.
15. Responsive: single column and one-thumb on phones, two columns from `md`.
    The composer stays reachable without scrolling past the draft list on
    small screens.

## Phase 5 — Wiring

16. `lib/modules.ts` — add `creative` to `ModuleKey` and a `live` entry.
17. `app/(owner)/owner-shell.tsx` — add Creative to `NAV`, and add the missing
    mobile nav so every owner surface is reachable on a phone.
18. `.env.example` — `OPENAI_API_KEY` header corrected to Phase 3,
    `AI_DRAFT_MODEL` documented, STUBBED convention noted.
19. `lib/events.ts` — add `ai_draft.skipped`, `ai_draft.edited` (+ labels).

## Verification

1. `npx tsc --noEmit` and `npm run build` green.
2. With no `OPENAI_API_KEY`: the page renders, "Ask aro" returns
   `{stubbed:true}`, a visible STUBBED badge shows, **no `ai_drafts` row is
   written**, and nothing crashes.
3. With a bad key: the calm retry state renders, not a raw error, not a fake
   draft.
4. An empty or 2-character brief is rejected client- and server-side before
   any generation call is spent.
5. Loading Creative Studio twice in the same venue-local week yields exactly
   one `digest` row (`{reused:true}` on the second call).
6. `prompt_ctx` on a generated row contains the context object and the brief.
7. Rate limit returns 429 on the 21st generation in an hour for one venue.
8. Skipping a draft emits `ai_draft.skipped`, not `ai_draft.approved`.
9. A cross-venue `draft_id` in PATCH still 403s (unchanged authz).
10. Phone viewport: nav reachable, composer usable one-thumb, no horizontal
    scroll at 360px.

## Acceptance criteria

Strategic doc §7.7 criteria 1–5 and 7, plus: the `social_image` stub is
visible and disabled (never omitted, never a dead button); `campaigns.autopilot`
remains unreachable (grep proves no code path sets it true); the build log
`docs/plans/BUILD-LOG-creative-studio.md` has one section per phase.
