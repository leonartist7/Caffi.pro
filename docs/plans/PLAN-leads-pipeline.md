# PLAN-leads-pipeline — Rank 5 of 5 (smallest; do any time after Plan 1)

**Goal:** kill the oldest P0 in the whole project: the AURA café-health
diagnostic converts beautifully and then `console.log`s the lead into the
void (`AURA/app/api/submit-diagnostic/route.ts`). After this plan, every
completed diagnostic and demo request lands as a `leads` row in the platform
DB, visible in a minimal HQ lead inbox, and can never be silently lost.
Cross-repo: touches BOTH repos (same branch name in each; AURA gets its own
draft PR). Depends on: PLAN-live-supabase-bringup (leads table live).

## Files to touch — platform (Caffi.pro)

- `app/api/leads/route.ts` (CREATE — POST: shared-secret check, validate, insert `leads`, emit `lead.received`; GET: aro_admin-only list for the inbox)
- `app/(dashboard)/leads/page.tsx` (CREATE — HQ lead inbox: newest first, score badge, contact, per-answer detail expando, status select `new|contacted|booked|closed` PATCH via `app/api/leads/[id]/route.ts` CREATE)
- `supabase/migrations/20260709000004_leads_status.sql` (CREATE — ensure `leads` has: `source text`, `score int`, `contact jsonb`, `answers jsonb`, `status text default 'new'`, `idempotency_key text unique`, `created_at`; RLS: no anon/authenticated access — service-role writes, aro_admin reads via authz'd API only)
- `.env.example` (MODIFY — add `LEADS_WEBHOOK_SECRET` with comment "same value in both repos' envs")
- `scripts/verify-live.mjs` (MODIFY — checks below)

## Files to touch — marketing (AURA repo, /home/user/AURA)

- `app/api/submit-diagnostic/route.ts` (MODIFY — the console.log leak: forward the payload server-to-server to `${PLATFORM_URL}/api/leads` with header `x-aro-leads-secret`; keep a defensive local `console.error` + return-success path if the platform is unreachable — NEVER surface a failure to the diner-facing flow, and never lose the payload silently: on forward failure also write the payload into the response headers? NO — log it as a structured single-line JSON so Vercel logs retain it, and return `{ok:true, queued:false}`)
- `.env.example` / README note (ADD — `PLATFORM_URL`, `LEADS_WEBHOOK_SECRET`)

## Steps, in order

1. Platform migration → regenerate `aro_schema.sql` → owner applies.
2. `POST /api/leads`: verify `x-aro-leads-secret` with `timingSafeEqual` against `LEADS_WEBHOOK_SECRET` (401 otherwise); validate shape `{source:'diagnostic'|'demo_booking', contact:{email?|phone?|name?} (≥1 of email/phone required), score?, answers?, idempotency_key}`; upsert `ON CONFLICT (idempotency_key) DO NOTHING`; 200 either way with `{stored:boolean}`.
3. AURA route: build `idempotency_key` = hash of (contact + started_at) supplied by the client flow if present, else `crypto.randomUUID()`; forward with 3s timeout + one retry; structured log on failure as described.
4. HQ inbox page inside existing `(dashboard)` group (that group is the de-facto HQ per GAP-TABLE): table list, score color (>=70 sage / 40–69 saffron / <40 rose), status dropdown, expandable answers. Gate with `lib/authz.ts` requiring `aro_admin` (or owner-of-nothing fallback denied) — the existing dashboard auth only checks login, so ADD the role check.
5. verify-live checks + screenshots (inbox with 2 seeded leads, detail expando, status change persisted after reload) → `docs/audit/after/plan-leads/`.
6. Two commits/pushes: Caffi.pro branch (existing PR #47 carries it) and AURA branch `claude/caffi-aura-audit-plan-dgr8wy` (create draft PR in AURA — first code change there).

## Edge cases a weaker model would miss

- **Do not post browser → platform.** The diagnostic must forward server-side
  (route → route). Browser-direct means CORS config + the shared secret shipped
  to the client = secret burned. This mistake recreates the exact class of leak Phase 2 cleaned up.
- **The diner-facing flow never fails.** The confetti/thank-you must render even
  if the platform is down; lead durability comes from the retry + structured log,
  not from making the customer see an error.
- **Idempotency, because the diagnostic flow has browser-back + resubmit paths**
  (`DiagnosticFlow.tsx` supports back-nav): same submission twice = one lead row.
- **PII discipline:** leads hold names/emails/phones of prospects. RLS: zero anon
  or generic-authenticated access; only the service role writes and only
  `aro_admin` reads through the role-checked API. A weaker model will add a
  permissive select policy "so the page works" — the page must go through the API instead.
- Secret comparison with `timingSafeEqual` (length-check first), not `===`.
- AURA and Caffi.pro deploy as SEPARATE Vercel projects — `PLATFORM_URL` must be
  an absolute https URL env, not a relative fetch; preview-deploy AURA needs the
  preview platform URL or production one (document choice in .env.example).
- Score can be 0 (falsy) — validate with `typeof === 'number'`, not truthiness.

## Acceptance criteria

1. POST without secret → 401; with secret → row appears; same idempotency_key twice → one row (`verify-live.mjs` asserts all three).
2. Completing the real diagnostic on local AURA (`npm run dev` both apps, PLATFORM_URL=localhost:3000) produces a lead visible in the HQ inbox — screenshot of the inbox showing that exact lead.
3. Kill the platform server, run the diagnostic again: thank-you screen still renders; AURA logs one structured `lead-forward-failed` JSON line containing the full payload.
4. Non-admin owner session GETs `/api/leads` → 403.
5. Both repos: build green, committed, pushed; AURA draft PR opened with body describing the leak fix.
