# aro Platform Architecture (target) — built from Caffi.pro

> Companion to `GAP-TABLE.md` (what is) — this is _what it becomes_. The executing
> model follows `REBUILD-PLAN.md` phase by phase; this doc is the reference for
> stack, schema, env, and deploy decisions. Yardstick: `AURA/docs/ARO-PLATFORM-BLUEPRINT.md`.

## 1 · Repo & domain strategy (decided — don't relitigate)

- **Caffi.pro = the platform repo** → deploys to `app.aro.club` (owner/staff/HQ)
  and serves `join.aro.club/{venue}` (diner join) via middleware host routing —
  the middleware already does host-based rewrites for custom domains; extend it.
- **AURA = marketing repo** → `aro.club` (landing `/ultimate`, `/diagnostic`).
  Diagnostic submissions POST to the platform's `/api/leads` (fixes the console.log leak).
- Brand: port design tokens from `AURA/app/aura-landing.css` (`--cream #F3EAD7`,
  `--espresso #1F1612`, `--terra #D67A45`, `--saffron`, `--sage`, grain overlay,
  Bricolage/Instrument/Inter/JetBrains type stack) into Caffi.pro's
  `tailwind.config.ts` as the single theme. No blue/teal, ever.

## 2 · Stack (mostly already true)

Next.js 14 App Router · React 18 · TypeScript strict · Tailwind 3.4 (aro tokens) ·
Supabase (Postgres/Auth/Storage, `@supabase/supabase-js` v2 — add `@supabase/ssr`
for cookie-based server sessions) · TanStack Query everywhere (kill raw useEffect
fetches) · React Hook Form + Sonner · Recharts · Vercel (+ Vercel Cron) · Sentry ·
OpenAI (server-only `lib/ai.ts`) · Resend + Twilio · Stripe Billing.

**Client/server rule (the one that broke this app):**

- Browser: ONLY the anon client (`utils/supabase/client.ts`), protected by real RLS.
- Server (API routes / server components / crons): service-role client from
  `lib/supabase-admin.ts`, never importable from a `'use client'` file — enforce
  with `import 'server-only'`. Delete `lib/supabase.ts`'s placeholder-fallback;
  missing env = throw at boot, loudly.
- All third-party keys (OpenAI/Twilio/Resend/Stripe/wallet certs) live only in API
  routes / crons. Nothing but `NEXT_PUBLIC_SUPABASE_URL/_ANON_KEY` and
  `NEXT_PUBLIC_SITE_URL` is ever exposed.

## 3 · Schema evolution (migrate, don't reset)

Keep `tenant_id` spine; evolve to Blueprint §6:

```
organizations (new)            -- billing entity; MVP: 1:1 with tenants
tenants → venues (rename/alias)-- slug, brand_kit jsonb, zone_id, kill_switch bool
locations                      -- fold into venues (one row per physical site)
staff_users → memberships      -- (user_id, org_id, venue_id?, role) role: owner|manager|staff|aro_admin
                               -- + counter_pin (hashed) for shared-device login
users → members                -- diners: phone/email, name?, birthday?, venue_id,
                               --   consent_ts, consent_text, consent_source (CASL)
                               -- DROP loyalty_points/lifetime_points (derive from ledger)
visits (new)                   -- member, venue, ts, source: scan|manual|order
loyalty_transactions → points_ledger -- append-only; balance = SUM(delta); DB view member_balances
rewards_catalog → rewards      -- venue, threshold, label
redemptions (new)              -- member, reward, staff_membership, ts
campaigns (new)                -- venue, type: winback|birthday|streak|slowday, status, autopilot bool
messages (new)                 -- member, campaign, channel sms|email, body, ai_draft_id?, sent_at, opened, unsub token
ai_drafts (new)                -- venue, kind, prompt_ctx jsonb, output, status: draft|approved|edited|skipped|sent
leads (new)                    -- diagnostic + demo bookings (from aro.club)
zones (new)                    -- neighbourhood, cap, city
events (new)                   -- actor, venue, type, payload jsonb, ts (analytics spine)
```

Member status is **derived, never stored**: SQL view `member_status`
(new <3 visits · regular · fading = missed 2× own median cadence · lost >60d).
Keep the cadence math in one SQL function so "why did Maya get this?" is answerable.

**RLS, rebuilt from zero** (drop every existing policy incl. all `DEV:` ones):

- JWT custom claim `memberships` (or lookup table) → policy pattern:
  `venue_id IN (select venue_id from memberships where user_id = auth.uid())`.
- Staff counter sessions: short-lived Supabase session for a device user whose
  membership role=staff; RLS limits to members/visits/redemptions of their venue,
  and column-level: staff never reads member email/phone (Blueprint §8).
- Diner join page uses NO client DB access: posts to `/api/join` (server, validated,
  rate-limited) — anon key never needs insert rights on members.
- `aro_admin` role bypass via service-role on server only.

## 4 · Route map (target)

```
app.aro.club
  /login  /join-team/[invite]                    auth (magic link + password)
  /(owner)/home        ONE number + 3 tiles + approvals inbox
  /(owner)/regulars    list + /regulars/[id] profile (status, visits, usual)
  /(owner)/campaigns   templates, autopilot toggles, previews
  /(owner)/rewards     tiers editor (guardrailed templates)
  /(owner)/studio      AI social image + caption, brand kit
  /(owner)/insights    weekly digest archive, four loop metrics
  /(owner)/settings    venue, brand kit, team & roles, billing, consent/legal, kill switch
  /counter             staff mode: PIN login → search → +visit / redeem (2 taps)
  /(hq)/*              aro_admin: venues, leads, zones, health, onboarding checklists, impersonate
join.aro.club/[venue]  diner join (1 field + CASL) → wallet pass
  /pass/[serial]       web fallback pass
api: /api/join /api/leads /api/counter/* /api/ai/* /api/stripe/webhook
     /api/wallet/apple/* /api/wallet/google/* /api/cron/{digest,campaigns}
Legacy /shop/[slug]/* PWA: parked behind feature flag ORDERING_ENABLED=false (phase-2 promise).
```

## 5 · Env keys (complete `.env.example` — server-side unless NEXT_PUBLIC)

| Key                                                                       | Needed from phase | Notes                                                                                        |
| ------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`              | 2                 | **rotate current keys first — service key is burned in git history**                         |
| `SUPABASE_SERVICE_ROLE_KEY`                                               | 2                 | server only                                                                                  |
| `NEXT_PUBLIC_SITE_URL`                                                    | 2                 |                                                                                              |
| `SENTRY_DSN` (+ `NEXT_PUBLIC_SENTRY_DSN`)                                 | 2                 |                                                                                              |
| `OPENAI_API_KEY`                                                          | 4                 | via `lib/ai.ts` only                                                                         |
| `RESEND_API_KEY`                                                          | 4                 | email nudges + digest                                                                        |
| `TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER`                               | 4                 | SMS                                                                                          |
| `STRIPE_SECRET_KEY/WEBHOOK_SECRET` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 4                 | $149/mo, first month free                                                                    |
| `APPLE_PASS_CERT_P12_BASE64/PASSWORD/TEAM_ID/PASS_TYPE_ID`                | 3                 | wallet                                                                                       |
| `GOOGLE_WALLET_ISSUER_ID/SA_KEY_JSON`                                     | 3                 | wallet                                                                                       |
| `CRON_SECRET`                                                             | 4                 | protect cron routes                                                                          |
| `DEMO_MODE` / `ORDERING_ENABLED`                                          | 2                 | flags; every stubbed integration renders a visible "stubbed" badge — never fake a connection |

## 6 · Deploy

Vercel, single project for Caffi.pro with `app.aro.club` + `join.aro.club` domains
(middleware branches on host); AURA stays its own project on `aro.club`.
Vercel Cron: Sunday digest, hourly campaign-trigger scan, nightly demo-venue reset.
Sentry on both. PostHog (or events table only) for the four loop metrics:
joins/venue/week · visit-scan rate · nudge→return conversion · redemption rate.
