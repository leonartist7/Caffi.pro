# Caffi.pro → aro Platform Audit — THE GAP TABLE

> Audit of this repo against `AURA/docs/ARO-PLATFORM-BLUEPRINT.md` (§9 checklist).
> Date: 2026-07-07. Method: full build + headless-browser run of every route
> (screenshots in `docs/audit/before/`) + static analysis of all code and SQL.
> Statuses: **works / broken / mocked / absent**.

## 0 · Headline verdicts

1. **It builds and runs clean.** `npm run build` passes with zero fixes on a fresh
   clone (TypeScript strict, ESLint). The problem was never the build.
2. **The "never connected" mystery is solved — three stacked causes** (§2 below).
   It is a config/architecture fix, not a rewrite, as predicted.
3. **Tenancy exists and is real** (`tenant_id` FK + index on every table). The model
   is single-level (`tenants`), not the Blueprint's org→venue→role model, but it is
   retrofittable, not a rebuild.
4. **Security is the worst area**: service-role key committed to git, unauthenticated
   API routes running as service-role, RLS disabled by "DEV" policies, auth bypassed
   at the root route.
5. **The persona is wrong.** Caffi.pro is a _super-admin_ console (you managing many
   café clients) + a per-café ordering PWA. The Blueprint's three users — owner
   glance-dashboard, staff counter mode, diner join/wallet — are all absent as such.

## 1 · Feature inventory vs Blueprint §3

| Blueprint surface                                    | Repo reality                                                                        | Status                            | Root cause / notes                                                                                                                     |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| §3.1 Diner join page (`join.aro.club/{venue}`)       | `app/shop/[slug]/signup` — full account signup (email+password), not one-field join | **absent** (adjacent code exists) | Built as e-commerce account creation; no CASL consent, no <5s flow                                                                     |
| §3.1 Wallet pass (Apple/Google)                      | Nothing                                                                             | **absent**                        | Never started                                                                                                                          |
| §3.1 SMS/email nudges                                | `push_campaigns` table + `/notifications` UI (FCM-oriented)                         | **mocked**                        | UI writes to table; no send pipeline, no Twilio/Resend, no consent fields                                                              |
| §3.2 Staff counter mode (PIN, 2-tap)                 | `app/staff/*` — kitchen dashboard: orders, inventory, reports, team                 | **absent** (different product)    | Staff area is order-fulfilment, not visit/redeem counter; login is email+password, no PIN/shared device                                |
| §3.3 Owner home = ONE number + approvals inbox       | `/dashboard`                                                                        | **mocked**                        | 100% hardcoded static numbers (€2,400, 1,234 users, fake activity feed); zero Supabase queries; renders without login                  |
| §3.3 Regulars list (fading detection)                | `/clients` lists **tenants** (cafés), not diners; `users` table exists in DB        | **absent**                        | No diner-facing CRM screen; no derived status (new/regular/fading/lost) anywhere                                                       |
| §3.3 Campaigns (win-back, birthday, slow-day)        | `/notifications` push-campaign composer                                             | **broken/mocked**                 | Writes via client Supabase (fails, see §2); no triggers, no AI, no channels                                                            |
| §3.3 Rewards editor                                  | `/rewards` + `rewards_catalog` table                                                | **broken**                        | Real UI + table; all reads/writes fail (connection, §2); model is points-store redemption catalog, close to spec                       |
| §3.3 Content studio (AI)                             | Nothing                                                                             | **absent**                        | No AI code anywhere in repo (no OpenAI dep, no `lib/ai.ts`)                                                                            |
| §3.3 Insights / weekly digest                        | `/analytics` (Recharts over orders)                                                 | **broken**                        | Real queries, fail on connection; no digest, no email                                                                                  |
| §3.3 Settings (brand kit, team, billing)             | `/settings`                                                                         | **mocked**                        | Static form, zero persistence (0 queries)                                                                                              |
| §3.4 aro HQ admin                                    | The whole `(dashboard)` group _is_ effectively HQ (manage tenants/cafés)            | **broken**                        | Right idea, wrong framing; no lead inbox, no zones, no onboarding checklist, no impersonation                                          |
| §3.5 Landing + diagnostic                            | Lives in AURA repo (kept as marketing site)                                         | works (there)                     | `submit-diagnostic` still `console.log`s leads — P0, but in AURA repo                                                                  |
| Ordering PWA (`/shop/[slug]`) — not in Blueprint MVP | Menu, cart, checkout, order tracking, loyalty page                                  | **broken**                        | Most complete feature set in repo; all data calls fail (§2). Blueprint marks direct ordering "phase 2 promise" — park it, don't delete |

## 2 · Why Supabase "never connected" — root-cause chain

Three independent faults; any one produces "the app doesn't work":

1. **Wrong client in the browser (the big one).** `lib/supabase.ts` creates a client
   from `SUPABASE_SERVICE_ROLE_KEY` — a server-only var. It is imported by **client
   components** (`components/menu/MenuItemModal.tsx`, `CategoryModal`, `CouponModal`,
   `RewardModal`, `NotificationModal`, `LocationModal`, `app/(dashboard)/diagnostics/page.tsx`).
   In the browser that env var doesn't exist, so the file silently substitutes
   `https://placeholder.supabase.co` + `placeholder-key-for-build` → every write from
   those modals goes to a non-existent host and fails with `TypeError: Failed to fetch`.
   Exactly the failure captured in `before/capture-log.json` on every dashboard route.
2. **RLS wars ended in surrender.** History shows repeated 400s from RLS
   (20+ FIX*\*/NUCLEAR*\*.sql docs), "fixed" by `20250110000001_dev_mode_rls.sql`,
   which adds `USING (true)` anon read/write policies on **every table**. If applied
   to the live project, the DB has no security; if not applied, the original broken
   policies still 400 legitimate queries. Either way: not production-viable.
3. **Env-key confusion between deploys.** Both `SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_URL` variants exist, `FIX_VERCEL_ENV_VARS.md` documents the
   Vercel envs having been wrong, and `/api/check-env` exists purely to debug this.
   `utils/supabase/client.ts` (the correct anon client) throws at _render time_ if the
   `NEXT_PUBLIC_*` pair is missing on Vercel.

**Fix shape (Phase 2):** one anon browser client + one server client behind
API routes only; delete the placeholder-fallback pattern (fail loud); rebuild RLS
from scratch on JWT claims; document every key in `.env.example`.

_Container note: this audit environment's egress proxy blocks `_.supabase.co`, so
the live project itself couldn't be probed from here; the captured fetch failures
are environmental, but the placeholder-client fault above is deterministic in any
browser regardless.\*

## 3 · Data model vs Blueprint §6 / tenancy vs §4

DB: 14 tables (`complete_setup.sql` + 25 migrations). Every table carries
`tenant_id UUID NOT NULL REFERENCES tenants` with an index. **Multi-venue within a
tenant exists** via `locations`.

| Blueprint §6                                      | Repo                                                                                                                 | Verdict                                                                                                                            |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `organizations` → `venues`                        | Single `tenants` (+ `locations` for physical sites)                                                                  | **Gap**: no org layer; rename/alias `tenants`→org, `locations`→venues, or accept tenant=org for MVP. Decide before any new code    |
| `users` + `memberships` (user, org, venue?, role) | `staff_users` (role enum owner/manager/barista/kitchen/cashier + permission booleans) and separate `users` (=diners) | **Close**: roles exist server-side in DB but are **not enforced server-side in app code**; no invites; no shared-PIN counter login |
| `members` (diners w/ consent fields)              | `users` (phone/email/name, favorites)                                                                                | **Gap**: no `consent_ts/consent_text/source`, no birthday, no CASL anything                                                        |
| `visits`                                          | none — only `orders`                                                                                                 | **absent**: the core loop object doesn't exist; visits must be trackable without an order                                          |
| `points_ledger` (append-only)                     | `loyalty_transactions` **plus mutable `users.loyalty_points` balance column**                                        | **Violation of the explicit §6 rule**: balance must be derived from ledger; migration needed                                       |
| `rewards`, `redemptions`                          | `rewards_catalog`, redemptions inside `loyalty_transactions`                                                         | acceptable, needs `staff_user` attribution                                                                                         |
| `campaigns`, `messages`, `ai_drafts`              | `push_campaigns` only                                                                                                | **mostly absent**                                                                                                                  |
| `leads`, `zones`, `events`                        | none                                                                                                                 | **absent** (leads currently die in AURA's `console.log`)                                                                           |
| Derived member status (new/regular/fading/lost)   | none                                                                                                                 | **absent** — the heart of the product                                                                                              |

Other model notes: `country DEFAULT 'France'`, € currency across UI — built for a
different market; Calgary/CAD constants needed. `tenant_manifests` (PWA manifests
per shop) is salvageable for the brand-kit concept.

## 4 · Security audit

| Finding                                                                                                                                                                                                                                                             | Severity                                  | Evidence                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Supabase service-role key committed to git** (`.env.local`, commit 63d5a96) — full-DB bypass of all RLS for anyone with repo access                                                                                                                               | **critical**                              | Rotate the key in Supabase dashboard immediately; purge file from history or accept and rotate; add `.env*` to `.gitignore`                                                    |
| **API routes are unauthenticated service-role proxies.** `/api/menu-items`, `/api/categories`, `/api/locations` accept any `tenant_id` param, no session check, execute with service role → full cross-tenant read/write for anonymous internet users once deployed | **critical**                              | `app/api/*/route.ts`                                                                                                                                                           |
| **DEV RLS policies open every table** to anon (`USING (true)` on tenants, orders, loyalty, staff…)                                                                                                                                                                  | **critical** (if applied to live project) | `supabase/migrations/20250110000001_dev_mode_rls.sql`                                                                                                                          |
| **Auth bypassed by design**: `/` redirects straight to `/dashboard` ("DEVELOPMENT MODE: Skip login" TODO); `(dashboard)` layout renders without session; middleware does no auth (only domain rewrites)                                                             | **high**                                  | `app/page.tsx`, screenshots `before/dashboard.png` (full render, no login)                                                                                                     |
| Service-role key selected client-side by design (`lib/supabase.ts`)                                                                                                                                                                                                 | high                                      | see §2.1                                                                                                                                                                       |
| No input validation layer on API routes (raw body → insert)                                                                                                                                                                                                         | medium                                    | `app/api/menu-items/route.ts`                                                                                                                                                  |
| `/api/check-env` publicly reports env presence/lengths                                                                                                                                                                                                              | low                                       | Fine for debug; remove in prod                                                                                                                                                 |
| Positive notes                                                                                                                                                                                                                                                      | —                                         | Real Supabase password auth on `/login` + `/staff/login` (staff routes actually gate, see `before/staff_*.png`); no other secrets found in history; Husky+strict TS discipline |

## 5 · Quality notes (§9 "Quality")

- **Deployability: excellent.** Clean build, strict TS, ESLint, Prettier, Husky. Best asset.
- **Error/empty states:** shop 404 state is graceful ("Coffee Shop Not Found");
  dashboard pages render skeletons then fail silently to console — no user-facing
  error surface. Sonner is installed and used inconsistently.
- **Design system:** consistent warm/cream Tailwind theme (accidentally close to aro's
  temperature — port is a re-token job, not a re-skin); components are page-local
  one-offs, no shared UI library; dark-mode toggle exists.
- **State:** TanStack Query only used in `hooks/useMenuQueries.ts`; everything else raw
  `useEffect` fetches. Context for auth/tenant/cart/theme is fine.
- **Docs debt:** ~30 panic-fix .md/.sql files in repo root — archive them.

## 6 · Salvage verdict

| Keep as-is                                                 | Refit                                                            | Rewrite/new                                                              |
| ---------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Build toolchain, TS/lint config                            | Schema (add org layer, visits, ledger-only points, consent)      | RLS from zero                                                            |
| `utils/supabase/client.ts`, middleware domain-rewrite idea | Auth contexts (add server-side enforcement, PIN counter session) | All owner screens per §3.3 doctrine                                      |
| Shop PWA codebase (park for phase-2 ordering)              | `staff_users` roles → memberships                                | Diner join + wallet pass, counter mode, AI layer, campaigns/messages, HQ |
| Screenshot/before harness (`docs/audit/`)                  | `tenant_manifests` → brand kit                                   | `leads`, `zones`, `events`, digest                                       |
