# aro Rebuild Plan — execution order for the building model

> Instructions for the model (Opus/Sonnet) executing the rebuild of Caffi.pro into
> the aro platform. Read first: `AURA/docs/ARO-PLATFORM-BLUEPRINT.md` (spec),
> `GAP-TABLE.md` (what's real), `ARCHITECTURE.md` (target). Voice/brand:
> `AURA-COPY-BANK.md` + tokens from `AURA/app/aura-landing.css`.
>
> **Operating rules (non-negotiable):**
>
> - Structure first, polish second, ideas never mid-phase.
> - Never claim something works without a screenshot or test. Reuse
>   `docs/audit/before/../shots.js` pattern; save proof per phase to
>   `docs/audit/after/phase-N/`.
> - Never fake a connection. Missing key → visible "STUBBED" badge behind a flag,
>   and tell the owner exactly which key unblocks it (table in ARCHITECTURE §5).
> - Ask before anything destructive, paid, or externally visible.
> - Commit per work-item with clear messages; keep `npm run build:vercel` green.

## Phase 2 — Infrastructure (the spine; nothing cosmetic until done)

**2.0 Security triage (day one, before any feature):**

- [x] Tell the owner to **rotate the Supabase service-role + anon keys** (burned in
      git: `.env.local` @ 63d5a96). Add `.env*` to `.gitignore`, remove from tree.
- [x] Delete `lib/supabase.ts` placeholder-fallback; create `lib/supabase-admin.ts`
      with `import 'server-only'`. Fix the 7 client components that import the
      service-role client (route their writes through authenticated API routes or
      the anon client + RLS).
- [x] Add session + role checks to `/api/menu-items|categories|locations` (or fold
      them into RLS'd client queries and delete).
- [x] Remove `/` auth bypass; gate `(dashboard)` and `(owner)` layouts server-side.

**2.1 Supabase connection, done honestly:**

- [x] Fresh env wiring per ARCHITECTURE §5; `/api/check-env` retained in dev only.
- [x] One consolidated schema migration implementing ARCHITECTURE §3 (orgs, venues,
      memberships, members+consent, visits, points_ledger view, campaigns, messages,
      ai_drafts, leads, zones, events; drop mutable balance columns).
- [x] RLS rebuilt from zero; **drop every `DEV:` policy**. Write pgTAP-style or
      script tests proving: staff can't read member contact info, venue A can't see
      venue B, anon can only read what join-page needs (nothing).
- [x] Seed script (idempotent) for dev.

**2.2 Auth & roles (§4):** magic-link + password; memberships with
owner/manager/staff/aro_admin; email invites; **shared-PIN counter login** issuing a
short-lived staff session bound to a venue+device. Multiple owners per venue works.

**2.3 Platform plumbing:** `.env.example` fully documented · Sentry (client+server)
· `events` emitter (`lib/events.ts`) · TanStack Query provider standardization ·
feature flags (`DEMO_MODE`, `ORDERING_ENABLED=false` parks `/shop/*`).

**Exit criteria:** login as owner/manager/staff-PIN all screenshot-proven; RLS test
suite green; build green; keys documented; Sentry receiving a test event.

## Phase 3 — Surfaces on brand (aro tokens on every screen)

Port tokens into `tailwind.config.ts` first (cream/espresso/terra/saffron/sage,
grain utility, Bricolage display + Instrument serif italics + Inter body). Then:

1. **Diner join** `join.aro.club/[venue]`: one field (phone or email), CASL checkbox
   (unchecked default, consent recorded), <5s, then wallet pass issue
   (Apple PassKit + Google Wallet; web-view fallback at `/pass/[serial]`). Wallet
   needs certs — stub with the badge until keys arrive, keep the web pass real.
2. **Counter mode** `/counter`: PIN in → one screen: big search (phone/name/scan) →
   tap member → `+ Visit` / `Redeem` (two taps total). Offline queue in
   localStorage with sync + conflict tolerance. Staff sees name/usual/points only.
3. **Owner home**: THE number ("regulars returned this week" until revenue data
   exists) + 3 tiles (members ↑ / visits ↑ / at-risk ↓) + approvals inbox list.
   30-second glance doctrine; no charts here.
4. **Regulars**: list w/ derived status chips; profile = visits, usual, cadence,
   "why this status" sentence.
5. **Rewards editor** (refit existing), **Campaigns** (templates + autopilot toggles,
   drafts view), **Settings** (make it real: venue, brand kit from
   `tenant_manifests` refit, team, consent/legal, kill switch), **Insights** shell.
6. **HQ** `(hq)`: venues CRUD (refit existing clients/cafes pages), lead inbox
   (wire AURA `/api/submit-diagnostic` → platform `/api/leads` — kills the P0 leak),
   zones, health board, onboarding checklist.

Report per screen: reused / refit / rewritten, and why. Screenshot each.

**Exit criteria:** the loop clicks end-to-end manually: join → visit at counter →
points in ledger → status changes → owner sees the number move. All proven in
`after/phase-3/`.

## Phase 4 — AI layer + integrations (§5, §7 order)

1. `lib/ai.ts` server gateway: per-venue brand-voice profile injected; cost guard
   (per-venue monthly budget row); every output → `ai_drafts` with status lifecycle.
   Features in order: win-back writer (fading trigger) → slow-day booster →
   social caption+image (`gpt-4o` + `gpt-image-1`, warm-palette prompt suffix from
   `AURA-RENDER-PROMPTS.md`) → weekly digest. All land in approvals inbox; nothing
   auto-sends until autopilot toggled.
2. **Resend** (email) + **Twilio** (SMS): send pipeline off approved drafts;
   unsubscribe link/STOP handling; consent checked at send time; kill switch honored.
3. **Stripe Billing**: $149/mo, first month free, month-to-month; webhook →
   org billing status; settings billing page.
4. Vercel crons: Sunday digest, hourly trigger scan (protected by `CRON_SECRET`).

**Exit criteria:** a fading seeded member triggers a draft → owner approves →
real (or stubbed-badge) send recorded in `messages`; Stripe test-mode checkout
completes. Screenshots + webhook logs as proof.

## Phase 5 — Demo-ready (§10)

- Seed **"The Roastery"** (Kensington, Calgary; CAD) — warm, realistic: ~180
  members across statuses, 90 days of visits with believable cadences, rewards,
  campaign history, AI drafts pending approval. `DEMO_MODE` resets nightly.
- Walk the full story: join → visit → fade → nudge → return → the number goes up.
  Screenshot every screen (the "after" gallery), update `BEFORE-AFTER.md`.
- Deploy to Vercel (ask owner for project/domain go-ahead), smoke-test live,
  hand over clickable URL.

## Dependency notes for the scheduler

- 2.0→2.1→2.2 strictly serial. 2.3 parallel with 2.2.
- Phase 3 items 1–2 (diner+counter) before 3–4 (owner screens need loop data).
- Wallet certs and Twilio/Resend/Stripe/OpenAI keys are the only external blocks;
  everything else proceeds with stub badges. Ask for keys at the START of the
  phase that needs them (list in ARCHITECTURE §5).
