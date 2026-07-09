# PLAN-diner-join-page — Rank 2 of 5

**Goal:** the missing half of the product exists: a diner scans a QR at the
counter and joins in under 5 seconds — one field, CASL consent, instant web
pass. Also ports the aro brand tokens into Tailwind (this is the first screen
built fully on-brand; every later screen reuses the tokens). Wallet
(Apple/Google) buttons ship as visible STUBs behind env checks — the web pass
is real. Depends on: PLAN-live-supabase-bringup (needs live `members`/`visits`).

## Files to touch

- `tailwind.config.ts` (MODIFY — add aro tokens: colors cream `#F3EAD7`, cream-warm `#F7F0DE`, sand `#ECE0C6`, clay `#DECBA6`, espresso `#1F1612`, ink `#2A1F18`, terra `#D67A45`, rose `#DC8B7E`, saffron `#E5B14A`, sage `#9DAA7E`, honey `#E8AC58`; fontFamily display/serif/body/mono per `AURA/app/aura-landing.css` lines 1–30)
- `app/globals.css` (MODIFY — add `.grain` overlay utility copied from `AURA/app/aura-landing.css` §grain; keep opacity ≤ 0.18)
- `app/layout.tsx` (MODIFY — load fonts via `next/font/google`: Bricolage Grotesque, Instrument Serif italic, Inter, JetBrains Mono; expose as CSS vars the tokens reference)
- `app/join/[venue]/page.tsx` (CREATE — server component: venue lookup by slug via service client; 404 state reuses the warm "not found" card pattern from `app/shop/[slug]/`)
- `app/join/[venue]/join-form.tsx` (CREATE — client form: ONE input phone-or-email, name optional second line, CASL checkbox, submit → `/api/join`)
- `app/api/join/route.ts` (CREATE — validate, rate-limit, upsert member, issue pass serial, emit `member.joined` via `lib/events.ts`)
- `app/pass/[serial]/page.tsx` (CREATE — web pass: venue brand colors, member first name, points from `member_balances`, next reward, QR of the serial for counter scan)
- `app/api/wallet/apple/[serial]/route.ts` + `app/api/wallet/google/[serial]/route.ts` (CREATE — if certs env present, 501 with `{stubbed:true}` for now + TODO; the join page renders wallet buttons ONLY when envs exist, else a muted "Wallet passes coming soon" line — never a dead button)
- `middleware.ts` (MODIFY — host `join.aro.club` rewrites `/{venue}` → `/join/{venue}`; and ensure `/join/*`, `/pass/*`, `/api/join` are PUBLIC — excluded from any auth gating)
- `supabase/migrations/20260709000001_pass_serials.sql` (CREATE — `members.pass_serial uuid unique default gen_random_uuid()`, backfill, index; RLS: no anon access — pass page reads via server)
- `scripts/verify-live.mjs` (MODIFY — add join-flow check: POST /api/join twice with same phone → same member id, member count unchanged on second call)

## Steps, in order

1. Tokens + fonts + grain (tailwind.config.ts, globals.css, layout.tsx). Verify by screenshotting `/login` — it should already pick up the body font/background without redesign.
2. Migration for `pass_serial`; regenerate `supabase/aro_schema.sql` mirror; owner applies (same NOTIFY pgrst rule as Plan 1).
3. `/api/join`: zod-style manual validation (no new deps): input `{venue_slug, contact, name?, consent:boolean}`.
   Classify contact: `/^\S+@\S+\.\S+$/` → email, else strip non-digits → phone; normalize phone to E.164 with `+1` default (Canada); reject <10 digits.
   Upsert on `(venue_id, phone)` or `(venue_id, email)` — if the member exists, return the EXISTING member + serial with 200 (idempotent join, no duplicate, no error shown to the diner).
   If `consent === true`, store `consent_ts=now()`, `consent_source='join_page'`, and `consent_text` = the EXACT sentence rendered next to the checkbox (import the same constant into form and route — one source of truth).
   Rate limit: count `member.joined`+`join.attempt` events for this IP hash in the last 10 min via the `events` table (serverless = in-memory counters are useless); >20 → 429.
4. Join page UI: venue name + logo, single input (autofocus, `inputmode=tel`, `autocomplete=tel`), CASL checkbox **unchecked by default**, one terra CTA "Join the club". Total interactive JS small; no modal, no multi-step. Success state = redirect to `/pass/[serial]` with a warm welcome line.
5. Web pass page: server-rendered; big first name, points balance, "next reward at N", QR code of serial (tiny dependency-free QR: use a 1-file SVG QR generator vendored under `lib/qr.ts` — do NOT add a heavy npm package). Add "Add to Apple Wallet / Google Wallet" per stub rule above.
6. Middleware host routing + public-route allowlist. Local test trick: `curl -H 'Host: join.aro.club' localhost:3000/roastery` should rewrite (assert 200 + join markup).
7. Screenshots (mobile viewport 390×844 AND desktop) of: join form, success/pass, duplicate join, invalid phone error, venue-not-found → `docs/audit/after/plan-join/`.

## Edge cases a weaker model would miss

- **Consent is NOT required to join.** CASL gates _marketing messages_, not membership. Requiring the checkbox kills counter conversion and misreads the law. Members with `consent_ts IS NULL` simply never receive campaigns.
- **Idempotent re-join must not overwrite consent**: an existing member re-joining with the box unchecked must NOT null out a previously recorded consent; only upgrade (null→granted), never downgrade silently (downgrade = unsubscribe flow, later plan).
- The join page and pass page must make **zero browser Supabase calls** — anon key gets no table grants for this flow. Everything through the two API routes (server). A weaker model will "conveniently" query venues client-side and reopen the security hole Phase 2 closed.
- **Pass serial is a bearer token** — treat it like one: unguessable uuid, no member enumeration endpoint, pass page shows first name only (never phone/email back to the viewer).
- Phone dedupe uses the NORMALIZED value; store normalized only, or `(venue, phone)` unique constraint will let `403-555-0100` and `+14035550100` both in.
- The `(dashboard)` server-side gate from Phase 2 must not catch `/join` or `/pass` (they're outside the group, but the middleware matcher may not be) — add explicit tests via curl without cookies.
- Café wifi reality: the form must work without JS hydration completing — use a plain `<form action>` POST fallback path (progressive enhancement), not an onClick-only submit.
- Venue slug casing/trailing-slash: normalize lower + trim in lookup.

## Acceptance criteria

1. `curl -X POST /api/join` happy path returns `{serial}`; second identical call returns same serial; DB member count unchanged (verify-live.mjs check green).
2. Consent recorded with exact rendered text; unconsented member row has all three consent fields NULL.
3. Join with JS disabled still lands on the pass page (progressive fallback proven with a `--disable-javascript` Playwright screenshot).
4. Anon Supabase key still reads zero rows on all tables (RLS unchanged — rerun Plan 1's check).
5. Mobile screenshot set present; `npm run build:vercel` green; committed + pushed; events table shows `member.joined` rows.
