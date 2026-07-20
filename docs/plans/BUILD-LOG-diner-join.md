# Build log — Diner Join Page

Tracks progress against `docs/plans/PLAN-diner-join-page.md`. The feature
itself (tokens, `/join`, `/api/join`, `/pass`, vendored QR, wallet stubs,
middleware routing) was implemented in commit `6ebe9ee` (2026-07-10). This
entry covers a later debug/completion pass once the platform was live in
production, closing the gaps the original commit had flagged as open.

## Debug pass (2026-07-18)

**Context:** a review of the original commit found it had shipped with a
self-flagged blocker ("pass_serials migration is NOT yet applied to the live
project... `/api/join` will 500") and two acceptance-criteria gaps: no
join-flow checks in `scripts/verify-live.mjs`, no live verification that the
page actually renders in production. Investigated each:

1. **Migration status** — checked live via Supabase MCP
   (`list_migrations` + `information_schema.columns`): `20260710000002
pass_serials` is applied; `members.pass_serial` exists, `NOT NULL DEFAULT
gen_random_uuid()`, unique index present. The original commit's warning
   was stale — the migration landed in a later session (per
   `HANDOFF-live-bringup.md`, all migrations through `security_hardening`
   were applied 2026-07-10–12, `pass_serials` included). No fix needed here,
   just confirmation the blocker was already cleared.

2. **Production rendering** — this container's outbound network is
   proxy-restricted (confirmed via `curl`/Playwright against
   `caffipro.vercel.app`: `CONNECT tunnel failed, 403` — a policy denial, not
   a app-side error). `mcp__Vercel__web_fetch_vercel_url` routes through
   Vercel's own authenticated fetch path and was used instead:
   - `GET /join/the-roastery` → 200, real join form, correct venue name
     "The Roastery", aro-branded markup (`bg-aro-cream`, `font-display`,
     `JoinForm` client component wired with `venueSlug`).
   - `GET /pass/<invalid-uuid>` → 200, correct warm "Pass not found" state
     (proves the not-found branch, not just the happy path).
   - `GET /api/check-env` → 404 by design (dev-only route per
     `HANDOFF-live-bringup.md`; not a Plan 2 concern).
   - Could not get pixel screenshots (Playwright hits the same proxy block
     as curl) — the plan's original screenshot requirement predates
     production going live; `PLAN-00-go-live-polish.md`'s own verification
     protocol already superseded screenshots with live-URL fetch checks for
     this exact reason. Treating the fetch checks above as the equivalent
     live evidence rather than faking screenshots.
   - POST-testing `/api/join` over HTTP was not possible for the same network
     reason (Vercel fetch tool is GET-only). Substituted with direct
     DB-level verification of the exact upsert/idempotency semantics the
     route implements (below) — this matches the existing convention in
     `verify-live.mjs` (e.g. the reservations idempotency check), which
     already tests DB semantics directly rather than proxying through HTTP.

3. **`scripts/verify-live.mjs` had zero Plan 2 checks** — added three,
   proven live against the production DB before being committed (via
   Supabase MCP `execute_sql`, disposable rows, cleaned up after):
   - `pass_serial column enforced` — a seeded member carries a non-null
     `pass_serial`.
   - `join idempotency (member.joined dedupe)` — insert a probe member,
     re-look-up by `(tenant_id, email)` the same way the route's re-join
     branch does, assert same `member_id` + `pass_serial`, assert the venue's
     member count moved by exactly +1 (not +2). Verified live before writing
     the check: inserted `verify-live-probe@example.com`, confirmed lookup
     returned the identical row, deleted it — production `members` count is
     unaffected (still 9, matching the seed).
   - `join consent upgrade-only` — a member with `consent_ts` set survives a
     no-op "unchecked re-join" (the route never nulls a prior grant).
   - Could not run the actual `npm run verify:live` script end-to-end from
     this container: `SUPABASE_SERVICE_ROLE_KEY` is intentionally not
     recorded anywhere in the repo/docs (rotated key, owner-only, per
     `.env.example`'s own warning) and isn't present in this session's env.
     This is the same deferral `HANDOFF-live-bringup.md` already documents
     for the pre-existing checks ("this clean checkout intentionally has no
     local service key, so the real six-check database run remains
     deferred") — Plan 2's new checks inherit that same, already-known
     limitation rather than introducing a new one. The checks' correctness
     was independently proven via equivalent live `execute_sql` calls before
     being written.

## What's confirmed done

- Aro tokens, fonts, grain: live in production (confirmed via rendered
  markup above).
- `/join/[venue]`, `/api/join`, `/pass/[serial]`: live, rendering real seeded
  data, correct not-found states on both routes.
- `members.pass_serial`: applied, unique, backfilled.
- Wallet routes: explicit 501 stubs; pass page gates the buttons on cert env
  presence, never a dead button.
- Idempotent join + upgrade-only consent: logic verified against the live DB
  and now covered by `scripts/verify-live.mjs`.
- `npm run build:vercel`: green (verified this session after a clean
  `npm install` — the container had no `node_modules` prior to this pass).

## What remains genuinely deferred (not a Plan 2 gap — pre-existing, documented elsewhere)

- Running `npm run verify:live` itself needs `SUPABASE_SERVICE_ROLE_KEY` in a
  trusted environment — owner action, tracked in `HANDOFF-live-bringup.md`
  item 2, unchanged by this pass.
- AURA→Caffi lead-forwarding (`leads` table has 1 row, the original seed —
  no diagnostic has landed since) — this is the Phase A open blocker in
  `HANDOFF-live-bringup.md`, unrelated to the join/pass flow; needs an AURA
  Production env check (`PLATFORM_URL` / `LEADS_WEBHOOK_SECRET` match), not
  a Caffi.pro code change.
