# Build log — Creative Studio

Tracks progress against `docs/plans/PLAN-07-creative-studio.md` (CS-1 social
captions, CS-2 weekly digest). One section per phase. Prerequisites: PLAN-00,
PLAN-01, PLAN-02 complete.

**Scope boundary held:** nothing in this work writes to `campaigns` or
`messages`, adds a comms vendor, or touches consent. That is M-1/M-2, still
blocked on open decision D-1 (email/SMS vendor).

## Phase 0 — Spec

- Wrote `PLAN-07-creative-studio.md`, converting
  `MASTER-PLAN-marketing-creative-studio.md` §7 into the lean executable spec
  that document's §11 asked for, carrying MASTER-PLAN-v2 §R4's three
  resolutions (D-3 `(owner)` route group, D-4 OpenAI, D-6 seen-not-approved)
  so the build had no open judgment calls.

## Phase 1 — Provider abstraction

- `lib/ai/errors.ts`: two error classes, deliberately not one.
  `AiProviderConfigurationError` (missing key — a deployment fault) renders
  the STUBBED badge; `AiProviderRequestError` renders the calm retry state.
  Collapsing them would make a missing key look like a transient outage
  forever.
- `lib/ai/provider.ts`: `AiProvider` interface + `getAiProvider()`, mirroring
  `lib/payments/provider.ts`. `GeneratableDraftKind` is deliberately narrower
  than `ai_drafts.kind`'s CHECK constraint — the schema allows `winback`,
  `slowday` and `social_image`, but those have no home until M-1/CS-4, and a
  narrow union is what stops a future caller generating a kind with nowhere
  to go.
- `lib/ai/adapters/openai.ts`: the only file that knows OpenAI exists (D-4),
  implemented over `fetch` rather than the vendor SDK. No dependency was
  added — the request is one JSON POST, and with no SDK in the tree there is
  no vendor type that could leak upward even by accident. Carries a 20s
  `AbortSignal.timeout`, a token cap, and an explicit empty-completion
  rejection so a blank draft can never reach the approvals list.

**Deferred / flagged:** `AI_DRAFT_MODEL` defaults to `gpt-4o-mini` in code.
R4 requires the executor check OpenAI's current catalogue rather than trust a
remembered id, and **this environment has no OpenAI access, so that check was
not performed** — the default is a conservative choice, not a verified-current
one. Whoever adds the production key should set `AI_DRAFT_MODEL` explicitly.
The adapter sends `max_completion_tokens` (the current parameter) and
`temperature: 0.8`; some newer reasoning-tier models reject a non-default
temperature, which is a second reason to pin the model deliberately.

## Phase 2 — Prompt library + context

- `lib/ai/prompts/shared.ts`: the voice doctrine (§3.4) encoded once as a
  shared preamble, so changing how aro sounds is a one-file edit. The
  never-fabricate rule is phrased as a prohibition rather than a preference —
  a made-up "your free latte is waiting" with no reward row behind it is a
  customer-trust incident, not a copy nit.
- `lib/ai/prompts/social-caption.ts`, `digest.ts`: pure functions, no Supabase
  import, so the prompt layer is testable without a database.
- **Self-review caught a real bug before commit:** the digest prompt initially
  passed `regularsReturned` against `membersLastWeek` through the same
  trend-line helper as the other metrics. Those are different measures, and
  `venue_week_stats` has no last-week counterpart for regulars-returned — the
  model would have been handed a fabricated trend for the single number the
  owner cares about most. That figure is now stated flat with an explicit
  instruction not to describe it as rising or falling.
- `lib/ai/context.ts`: `server-only`. Reads `brand_kit.tagline` defensively at
  both the top level and under `site_profile`, so it works before and after
  PLAN-05 lands without a follow-up edit.

## Phase 3 — Generation route

- `lib/ai/drafts.ts`: rate limit, venue-local week digest lookup, insert.
  Lives in `lib/` because `app/api/**/route.ts` may only export handlers.
- Rate limit counts `ai_draft.created` rows in `events` over a rolling hour
  per venue (the `app/api/join/route.ts` pattern — serverless memory is
  useless for this). It **fails open** on a count error: the limiter exists to
  catch a runaway client, not as a security control, and blocking real work
  because an analytics table hiccuped is the worse failure. Noted here
  explicitly so the choice is visible rather than accidental.
- Digest reuse is checked before the rate limit and before any provider call,
  so opening Creative Studio repeatedly in one venue-local week costs zero
  generation calls.
- `prompt_ctx` stores the venue context, the brief, the stats and the resolved
  model id — enough to reconstruct why a draft reads the way it does weeks
  later (§7.5).
- Gate ordering matches the house pattern for body-carried `venue_id` routes
  (`app/api/menu/items/route.ts`, `app/api/rewards/route.ts`): parse, gate,
  then work. Everything downstream uses `gate.ctx.venueId`, never the body
  value. Body key renamed `venueId` → `venue_id` mid-build to match every
  other route's API surface.
- A digest request for a venue with no data returns 409 `{empty:true}` rather
  than generating: a summary of nothing would have to invent something to
  say, which the voice doctrine forbids outright.

**Pre-existing defect fixed:** `app/api/ai-drafts/[id]/route.ts` emitted
`ai_draft.approved` for every status, so the activity feed reported skips and
edits as approvals. Now one event type per outcome, with `ai_draft.skipped`
and `ai_draft.edited` added to `AroEventType` + `EVENT_LABELS`.

## Phase 4 — Creative Studio UI

- `app/(owner)/creative/page.tsx` (D-3) + `components/owner/CreativeStudio.tsx`
  - `components/owner/DraftCard.tsx`.
- Digest renders seen-not-approved (D-6): inserted with `status='approved'`,
  never queued for a click. Generated on first open of the venue-local week
  rather than by a cron, so no background job produces summaries nobody reads.
  Loading, ready, empty, stubbed and failed each get their own honest state.
- **Self-review caught a second real issue:** the studio list initially
  filtered to `status='draft'` like `/home`'s inbox, so approving a caption
  removed it — and with it the copy button. For a caption, approval _means_
  "copy it out" (§3.3), so an approved card that vanishes loses the owner the
  text they just approved. `listStudioDrafts` now keeps `draft`, `approved`
  and `edited`; only skipping removes a card.
- `ApprovalsInbox` gained an optional `kinds` filter rather than being forked,
  per the spec's instruction — two components would have drifted apart.
- `social_image` renders as a visible disabled card (§7.6), never omitted and
  never a dead button.
- Every user-visible string is a named constant, per the i18n-non-retrofit
  discipline in v2 §R3.

## Phase 5 — Wiring

- `lib/modules.ts`: `creative` added to `ModuleKey` and `MODULES` as `live`,
  which is what gives `features_enabled` a key to tier-gate on (R4's stated
  reason for requiring registration).
- **`ModuleDef` gained a `surface` field, and this needs recording.** `MODULES`
  is mapped directly into the HQ `Sidebar` and `MobileNav`, and Creative is
  the first module living in the `(owner)` route group rather than
  `(dashboard)`. Registering it without a split would have put a Creative link
  in HQ nav that sends an aro_admin into the `(owner)` layout gate, which
  resolves no owner/manager venue for them and redirects to `/counter`. The
  `surface: 'hq' | 'owner'` field (defaulting to `'hq'`) plus `hqModules()`
  keeps registration and nav placement independent. This is a small deviation
  from a literal reading of R4 and is flagged rather than silent.
- `app/(owner)/owner-shell.tsx`: the sidebar was `hidden md:flex` with **no
  mobile counterpart**, leaving every owner surface — `/home`, `/regulars`,
  and now `/creative` — unreachable on a phone, which is the device an owner
  actually has during service. Added a sticky top bar and slide-down panel
  carrying the same items, plus `aria-current`/`aria-expanded` and icons.
- `.env.example`: `OPENAI_API_KEY` moved off the stale "Phase 4" header onto
  Phase 3 and `AI_DRAFT_MODEL` documented (the §1.2 drift instruction). The
  same drift fixed in `app/api/invites/route.ts`'s stub string. Resend/Twilio
  headers relabelled Phase 3 M-1/M-2 and marked blocked on D-1.

## Verification

Performed in this environment:

- `npx tsc --noEmit` — green.
- `npm run build` — green; `/creative`, `/api/ai-drafts/generate` and
  `/api/ai-drafts/[id]` all present in the route manifest.
- Provider boundary grep: `api.openai.com` appears only in
  `lib/ai/adapters/openai.ts`; the adapter class is imported only by
  `lib/ai/provider.ts` (the factory, mirroring how `lib/payments/provider.ts`
  imports the Stripe adapter). No route or component imports either.
- Autopilot grep: `autopilot` appears only as a pre-existing event-type name
  and label in `lib/events.ts`. No code path sets it. Criterion 4 met.
- Middleware needs no allowlist change — its matcher covers all paths.

**Not performed — requires credentials this environment does not have.** These
are the acceptance items still owed before the phase can be called live, and
none of them should be assumed to pass:

1. No live Supabase run: the stubbed path, the digest week-reuse behaviour,
   the 429 rate limit and `prompt_ctx` contents have not been exercised
   against a real database.
2. No OpenAI key: no draft has actually been generated, so PLAN-07 acceptance
   criterion 1 — the subjective "does this read like this café wrote it" bar —
   is **unassessed**. That bar is the whole point of CS-1 and needs a human
   read of real output before this ships to a venue.
3. No device testing: the responsive owner shell was built to the breakpoints
   but has not been opened on a real phone or tablet.
4. `scripts/verify-live.mjs` was not extended — CS-1/CS-2 add no
   anon-reachable surface and no consent path, so the existing RLS regression
   net still covers what matters. M-1 is where that script must grow the
   consent-exclusion check (§6.7).
