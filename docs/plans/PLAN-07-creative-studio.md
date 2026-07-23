# PLAN-07 — Creative Studio (CS-1 social captions + CS-2 weekly digest)

**Status: executable spec.** Lean build spec for `codex/r4-creative-studio`,
derived from `MASTER-PLAN-marketing-creative-studio.md` (the strategic
reference — §§3, 5.2, 7 remain the design authority) and the R4 resolutions in
`MASTER-PLAN-v2-operating-system.md` §2 (route group `(owner)`, digest
seen-not-approved, `AI_DRAFT_MODEL` env). `MASTER-PLAN-aro.md` §4/§5 bind
everything below. Scope: CS-1 + CS-2 only. CS-3 (`site_copy`) is N2, not this
plan.

## Ground truth (re-verified 2026-07-22 against the repo)

- `ai_drafts` exists (`supabase/migrations/20260707000001_aro_platform_schema.sql:410-421`):
  `kind CHECK IN ('winback','slowday','social_caption','social_image','digest')`,
  `status CHECK IN ('draft','approved','edited','skipped','sent')`,
  `prompt_ctx JSONB`. **No migration needed for CS-1/CS-2.**
- `components/owner/ApprovalsInbox.tsx` + `app/api/ai-drafts/[id]/route.ts`
  (PATCH approved/edited/skipped, row-scoped authz via `requireRowVenueRole`
  with `venue_id`) already work — reuse, don't fork.
- `lib/events.ts` already has `ai_draft.created` + `ai_draft.approved` with
  labels. No new event types.
- `getVenueWeekStats(venueId, tz)` (`lib/owner-stats.ts`) wraps the
  `venue_week_stats` RPC — the digest's entire data source, one round trip.
  `mondayStartInTz(date, tz)` in the same file is the pure, injectable
  venue-local Monday-boundary helper.
- Brand voice context: `venues.business_name` + `parseSiteProfile(brand_kit)`
  (`lib/site-profile.ts`, R3) → `tagline`, `about`. Null-safe.
- Rate-limit precedent: `app/api/join/route.ts` — events-table head-count over
  a trailing window → calm 429. Reuse the pattern.
- Provider precedent: `lib/payments/provider.ts` — `server-only`, interface +
  factory, SDK knowledge only inside `lib/<x>/adapters/`.
- No LLM provider wired anywhere today. No Anthropic SDK dependency; the
  adapter calls the Messages API with plain `fetch` (no new dependency).
- Model: `AI_DRAFT_MODEL` env, default `claude-haiku-4-5` (current fast/cheap
  tier per Anthropic's models doc at time of writing; the env var, not code,
  is where the id lives).
- `.env.example` has stale "Phase 4" headers on the OpenAI/Resend/Twilio
  blocks — correct to "Phase 3" in the same commit that adds the new keys.

## Non-goals (binding)

- No `site_copy`, no migration of any kind.
- No email/SMS sending, no `campaigns`/`messages` writes, no cron, no send
  vendor. Generation produces drafts; nothing leaves the building.
- No `social_image` generation — a disabled "coming soon" card only
  (visible-stub doctrine).
- No editable prompt templates, no analytics, no content calendar, no
  auto-posting to social platforms.
- No new dependencies (Anthropic Messages API via `fetch` inside the adapter).

## Phases

### Phase 1 — AI generation infrastructure (`lib/ai/`)

1. `lib/ai/provider.ts` (`import 'server-only'`): `AiProvider` interface —
   `generateDraft(req: { kind: 'social_caption'|'digest'; system: string; prompt: string })`
   → `Promise<{ ok: true; output: string } | { ok: false; error: string }>`.
   `isAiConfigured()` (true iff `ANTHROPIC_API_KEY` set). `getAiProvider()`
   factory. Nothing Anthropic-specific leaves this file's type surface.
2. `lib/ai/adapters/anthropic.ts`: the only file that knows the Anthropic
   API. `POST https://api.anthropic.com/v1/messages` via `fetch`,
   `x-api-key` + `anthropic-version: 2023-06-01` headers, body
   `{ model: process.env.AI_DRAFT_MODEL ?? 'claude-haiku-4-5', max_tokens, system, messages: [{ role: 'user', content: prompt }] }`.
   AbortController ~30s timeout. Extract `content[0].text`. Every failure
   mode (HTTP non-2xx, network, timeout, malformed body) →
   `{ ok: false, error }` with a generic safe message; details logged
   server-side only, never returned to the client.
3. `lib/ai/context.ts` (`server-only`): `getCaptionContext(venueId)` →
   `{ businessName, tagline, about }`; `getDigestContext(venueId, timezone)` →
   `{ businessName, stats }` via `getVenueWeekStats`. Only real rows.
4. `lib/ai/prompts/shared.ts` (`server-only`): `PROMPT_VERSION = 'v1'` and
   the voice-doctrine preamble every builder prepends: warm, concise,
   café-grounded; explicitly forbidden from inventing specials, rewards,
   menu items, dates, or performance claims not present in the context
   (correctness requirement, not style).
5. `lib/ai/prompts/social-caption.ts`, `lib/ai/prompts/digest.ts`: pure
   functions `buildX(context) → { system, prompt }`. No Supabase import.
   Caption: one caption, skimmable, approve-in-seconds. Digest: short
   narrative from the stats (regulars returned, members/visits vs last week,
   fading); warm framing when `hasAnyData` is false — never "0 regulars".
6. `.env.example`: fix the three "Phase 4" headers to "Phase 3"; add
   `ANTHROPIC_API_KEY=` and `AI_DRAFT_MODEL=claude-haiku-4-5` under a
   Phase 3 header with the visible-STUBBED-state comment convention.

### Phase 2 — `POST /api/ai-drafts/generate`

1. Body `{ venueId, kind: 'social_caption', brief }`. Gate
   `requireVenueRole(venueId, ['owner','manager'])` BEFORE reading the body
   fields into any query.
2. Validate: `kind === 'social_caption'` only (digest is page-generated);
   brief trimmed, 3–500 chars → 400 otherwise.
3. Rate limit: head-count `events` where `type='ai_draft.created'`,
   `venue_id`, `ts >= now - 24h`; `>= 10` → calm 429 `{ error, retryable: true }`.
4. `!isAiConfigured()` → 200 `{ stubbed: true, message: 'STUBBED — needs ANTHROPIC_API_KEY (Phase 3)' }`.
5. Build context → prompt → `generateDraft()`. Failure → 502
   `{ error: 'draft_failed', retryable: true }`, no provider internals.
6. Insert `ai_drafts` row: `kind`, `output`, `status: 'draft'`,
   `prompt_ctx: { prompt_version, brief, business_name, tagline, about }`.
7. `void emitEvent({ type: 'ai_draft.created', actor: user:<id>, venueId, payload: { draft_id, kind } })`.
8. Return `{ draft: { draft_id, kind, output } }`.

### Phase 3 — Creative Studio page + weekly digest

1. `app/(owner)/creative/page.tsx` (server, `force-dynamic`): session +
   `resolveOwnerVenueId` (same pattern as `/home`); load venue
   (`business_name, timezone, brand_kit`); load pending `social_caption`
   drafts (`status='draft'`, newest first, limit 10); digest (below); render
   client `<CreativeStudio>`.
2. Digest, once per venue-local week: `weekStart = mondayStartInTz(new Date(), venue.timezone)`;
   latest `ai_drafts` row `kind='digest'` `created_at >= weekStart` wins. If
   none and AI configured: generate via `getDigestContext` + digest prompt,
   insert (`prompt_ctx: { prompt_version, week_start, stats }`), emit
   `ai_draft.created`. Then mark it seen: `status='approved'` where still
   `'draft'`, `void emitEvent('ai_draft.approved', { payload: { draft_id, via: 'digest_view' } })`.
   Rendered read-only — no approve/skip buttons. AI not configured → warm
   stub card. Provider failure → calm inline retry card; the page still
   renders (try/catch, never throw).
3. `app/(owner)/creative/creative-studio.tsx` (client): hoisted `STRINGS`
   const; brief textarea + "Ask aro" button; on success prepend the new
   draft; calm states for empty / loading / retryable error / 429 / stubbed;
   digest card read-only (mono numbers, aro tokens); disabled `social_image`
   coming-soon card; `<ApprovalsInbox kindFilter={['social_caption']}>`.
4. Extend `ApprovalsInbox` with optional `kindFilter?: string[]` +
   `emptyMessage?: string`; defaults preserve `/home` behavior exactly.
5. Nav: add `{ href: '/creative', label: 'Creative' }` to `OwnerShell` NAV;
   register `creative` in `lib/modules.ts` (`ModuleKey` + `MODULES`,
   `status: 'live'`, lucide `Sparkles`, href `/creative`).

### Phase 4 — Build log + PR

1. `docs/plans/BUILD-LOG-creative-studio.md`: per-phase notes, review
   findings, exact checks run, what was not live-verified.
2. Push; draft PR `feat(creative): add venue-grounded captions and weekly digest`.

## Edge cases (from the strategic doc §7.5 — all binding)

- Generation failure is a calm retry state, never an error page, never a
  fake draft.
- Empty/nonsense brief rejected before spending a generation call.
- Rate limit per venue per rolling 24h (10) on the generation endpoint.
- `prompt_ctx` stores the full safe context object, not just the brief.
- Digest week check uses `venues.timezone` via `mondayStartInTz`, never
  server UTC (the Sunday-23:30 class of bug must not recur).
- Digest generate-on-open failure must not break the page.

## Acceptance

1. A real `social_caption` draft from a real brief reads plausibly
   café-written, not AI boilerplate (honest self-assessment; only claimable
   with a keyed environment).
2. Two Creative Studio opens in the same venue-local week → exactly one
   `digest` row.
3. Missing `ANTHROPIC_API_KEY` → `{ stubbed: true }` from the route and a
   visible stub state in the UI; never a silent no-op.
4. Provider failure → calm retry state, no internals leaked.
5. `prompt_ctx` on a generated draft is sufficient to reconstruct the ask.
6. Rate limit: 11th generation inside 24h → 429.
7. `npx tsc --noEmit`, `npm run build`, `npm run lint:strict` green; grep
   gates: no Anthropic reference outside `lib/ai/adapters/anthropic.ts`, no
   `site_copy`, no new migration, no `campaigns`/`messages` writes.
8. Digest marked `approved` on view; read-only in the UI.
9. Build log complete; nothing claimed live-verified that wasn't.
