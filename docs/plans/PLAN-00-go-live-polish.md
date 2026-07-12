# Go Live + Polish: production cutover, invite loop, Members module, legacy retirement

## Context

The 6-phase HQ Control Center rebuild is complete and pushed on branch `claude/caffi-aura-audit-plan-dgr8wy` (Caffi.pro PR #47, draft). The platform works on the preview URL, but the real production URL (caffipro.vercel.app) still serves the OLD app from `main`. Owner decisions (asked & answered): **ship to production now**; **skip messaging/nudges this phase** (no Resend/Twilio).

What's missing, ranked against the vision (loyalty-first agency CRM, modular per-client evolution):

1. **Production runs the old app** — everything built lives only on a branch.
2. **The invite loop is unusable end-to-end**: `POST /api/staff` creates the invite but never returns the invite URL, and the staff page never shows it — the owner cannot give a new hire their link (email delivery is a stubbed later phase). The accept flow (`app/join-team/[invite]/page.tsx` + `app/api/invites/accept/route.ts`) already works.
3. **No Members surface in the HQ CRM** — the heart of a loyalty CRM (per-client member list, status, points) exists only in the minimal `(owner)/regulars` view, not in the rich HQ UI.
4. **Legacy dead surfaces still ship**: `app/staff/*` old portal (queries dead `staff_users`, superseded by `/counter`) and `app/tenants/[id]` (superseded by `/clients` + Settings).
5. **Deferred verifications**: Phase 3 live staff round-trip; `scripts/verify-live.mjs` (RLS regression script) never written.

## Ground truth the executor must trust (verified this session — do not re-derive)

- **Repo**: `/home/user/Caffi.pro`, branch `claude/caffi-aura-audit-plan-dgr8wy`, PR #47 (draft) → `main`. AURA repo has PR #2 (draft) → `main`, branch of the same name.
- **Live Supabase**: project ref `jjgccfrwjkwknyjtbtxa`. All migrations applied. Seed venue "The Roastery": `venue_id = a0000000-0000-4000-3000-000000000001`, org `a0000000-0000-4000-2000-000000000001`, staff membership `a0000000-0000-4000-9000-000000000003` (PIN 4242).
- **Column-name split (the #1 bug source)**: legacy-renamed tables kept `tenant_id` (= venue id): `members`, `rewards`, `points_ledger`, `tenant_manifests`. Fresh aro tables use `venue_id`: `visits`, `memberships`, `events`, `redemptions`, `campaigns`, `ai_drafts`, `status_snapshots`. The `member_status` VIEW exposes `venue_id` (aliased from members.tenant_id). NEVER normalize; always check `supabase/migrations/20260707000001_aro_platform_schema.sql` before writing a query.
- **Authz helpers** (`lib/authz.ts`): `requireVenueRole(venueId, roles)` (aro_admin passes any venue); `requireRowVenueRole(table, pkColumn, id, roles, venueColumn)` — `venueColumn` defaults to `'tenant_id'`, pass `'venue_id'` explicitly for fresh-schema tables; `requireAroAdmin()`; `isAroAdminUser(userId)` (React-cache()'d, nav-only). All return `{ ok, ctx | response }` — always `if (!gate.ok) return gate.response` BEFORE reading the body or touching the DB.
- **Patterns to copy verbatim**: API route shape/error handling/23505→409/`void emitEvent(...)` from `app/api/clients/route.ts` + `app/api/staff/route.ts`; page fetch/toast pattern from `app/(dashboard)/staff/page.tsx`; modal pattern from the PIN modal in that same file.
- **`lib/invites.ts` `createInvite(authz.ctx, {venueId, email, role, fullName})`** already returns `{ ok, invite: { membership_id, email, role, invite_token } }`. `app/api/invites/route.ts` shows the invite_url construction: `` `${siteUrl}/join-team/${invite_token}` `` with `const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin`.
- **`lib/owner-stats.ts`** exports `listRegulars(venueId, {search?, status?, limit?})` → `RegularRow[]` and `getMemberProfile(venueId, memberId)` → `MemberProfile | null` (visits, ledger, whySentence included). Both use the service-role client; both already select explicit non-PII columns (`full_name` only). REUSE THESE — do not rewrite their queries.
- **`points_ledger` CHECK constraint**: `reason IN ('order','signup_bonus','referral','redemption','adjustment','expiration')` — `'adjustment'` IS allowed (verify with a grep of the migration before relying on it; if the constraint text differs, STOP and flag). Ledger columns: `transaction_id` (uuid pk, default), `tenant_id`, `member_id`, `points_change` (int, signed), `reason`, `description`, `visit_id?`, `staff_membership_id?`, `created_at`. There is NO `balance_after` requirement in the aro schema (it was dropped in the rename migration — verify: grep `balance_after` in `20260707000001`; if it's still NOT NULL, STOP and flag).
- **`lib/modules.ts`**: `MODULES: ModuleDef[]` array (key/label/href/icon/status), `HQ_ITEMS`, `enabledModules()`. Client-importable — NO supabase imports allowed in it.
- **Events**: `lib/events.ts` — extend `AroEventType` union for any new event type BEFORE using it (TS enforces); add a matching entry to `EVENT_LABELS` in the same file.
- **Pre-commit hooks run eslint+prettier+tsc** — commits fail on type errors; prettier may reformat, that's fine.
- **Vercel**: team `team_X1uT5IYWuEZNZ8o54SCyioEu`, Caffi project `prj_RBxxK64vI2TiDGpsek87vvAPfkTj` ("caffi.pro"), AURA project `prj_RP22iVdX9ZDXd1GClg0ASQLQPL7g` ("aura-cafe-diagnostic"). The Caffi project has "Ignored Build Step" enabled: empty commits do NOT trigger builds; env-var changes need a fresh deployment.
- **PR-merge protocol** (from repo instructions): after a PR merges, the designated branch must be restarted from latest main (`git fetch origin main && git checkout -B claude/caffi-aura-audit-plan-dgr8wy origin/main && git push --force-with-lease origin claude/caffi-aura-audit-plan-dgr8wy`) — force-with-lease is fine because at that moment the branch contains only merged history. Follow-up work then gets a NEW draft PR; never stack commits on merged history.
- **Next.js route files may only export HTTP method handlers** — shared shapes/helpers go in `lib/*` (this broke the build once already; `lib/clients.ts` exists for exactly this reason).
- **Supabase `!inner` join typing**: cast through `unknown` (see `listRegulars` / `app/api/analytics/route.ts` for the exact pattern).

## Owner-only prerequisites (Phase A blocks on these — tell the user, do not work around)

1. **Rotate the Supabase service-role key** (burned in git history twice; still outstanding). Dashboard → Settings → API → roll `service_role`; update `SUPABASE_SERVICE_ROLE_KEY` in Vercel (all three environments) and local `.env.local`.
2. **Caffi.pro Vercel Production env**: confirm `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LEADS_WEBHOOK_SECRET` have the **Production** environment checked (Preview was verified; Production may not be). Add `NEXT_PUBLIC_SITE_URL=https://caffipro.vercel.app` (Production).
3. **AURA Vercel Production env**: `PLATFORM_URL=https://caffipro.vercel.app`, `LEADS_WEBHOOK_SECRET` (identical value to Caffi.pro's).
4. **Supabase Auth → URL Configuration**: set Site URL to `https://caffipro.vercel.app`; keep the preview URL and `http://localhost:3000` in the redirect allowlist.

## Implementation

### Phase A — Production cutover (MCP coordination, minimal code)

1. Confirm working tree clean (`git status`) and PR #47 head deployment is READY (Vercel `list_deployments`, or the PR's check runs via `mcp__github__pull_request_read` method `get_check_runs`).
2. Ask the user to confirm the four owner prerequisites above are done (AskUserQuestion, single confirm). Do not merge before confirmation.
3. Mark PR #47 ready: `mcp__github__update_pull_request` with `{owner:'leonartist7', repo:'Caffi.pro', pullNumber:47, draft:false}`. Merge: `mcp__github__merge_pull_request` with `merge_method:'merge'` (NOT squash — per-phase history is the audit trail).
4. Wait for the production deployment: poll `mcp__Vercel__list_deployments` (projectId/teamId above) for a deployment with `"target":"production"` and the merge SHA; wait until `state:"READY"`. If no production build starts within ~3 min (Ignored Build Step quirk), tell the user to hit "Redeploy" on the latest main deployment in the Vercel dashboard — do NOT push junk commits to main.
5. Production smoke test with WebFetch/`mcp__Vercel__web_fetch_vercel_url` against `https://caffipro.vercel.app`:
   - `/login` → 200, contains "aro" sign-in markup (not the old app).
   - `/join/the-roastery` → 200, join form.
   - `/api/check-env` → all three Supabase vars reported present.
   - `/api/clients` (no cookie) → 401 JSON — gate live.
6. AURA: `mcp__github__update_pull_request` draft:false + merge PR #2 (owner `leonartist7`, repo `AURA`) after confirming its two Production env vars. Then end-to-end lead test: fetch AURA's production URL, POST a test diagnostic to its `/api/submit-diagnostic` (shape: see `AURA/app/api/submit-diagnostic/route.ts` — it forwards to the platform), then verify a row landed via the platform: the user checks `/leads`, or query `leads` via Supabase MCP if connected.
7. Branch reset in BOTH repos per PR-merge protocol (exact commands in Ground truth). Open a NEW draft PR for Caffi.pro from the reset branch when Phase B's first commit is ready (title: "feat: go-live polish — invite links, Members module, legacy retirement"). Use `mcp__github__create_pull_request`. Subscribe activity on the new PR; unsubscribe #47 and AURA #2 (`mcp__github__unsubscribe_pr_activity` / the claude-code-remote variants — whichever server is connected).
8. Update `docs/plans/HANDOFF-live-bringup.md`: production live, merge SHAs, prune completed "remaining steps".

### Phase B — Finish the invite loop

1. `app/api/staff/route.ts`:
   - Add at top of file (module scope): nothing new needed — build the URL inside handlers.
   - **POST**: after `createInvite` succeeds, compute `const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin` and add `invite_url: \`${siteUrl}/join-team/${result.invite.invite_token}\``to the returned`staff` object.
   - **GET**: the select already includes... check: it selects `membership_id, role, full_name, invite_email, user_id, is_active, invite_accepted_at, pin_updated_at` — ADD `invite_token` to the select, then in `toStaffShape` include `invite_url` ONLY when `user_id` is null (pending): `m.user_id ? undefined : \`${siteUrl}/join-team/${m.invite_token}\``. `toStaffShape`will need`siteUrl`passed as a param (it's currently a pure function — change signature to`toStaffShape(m, siteUrl)`); never emit `invite_token`itself in the response, only the composed URL. Exposing the URL to the venue's own owner/manager is safe: the route is already role-gated, and`/api/invites/accept` independently re-verifies the signed-in email matches the invite email.
2. `app/(dashboard)/staff/page.tsx`:
   - Extend the `StaffMember` interface with `invite_url?: string`.
   - After a successful invite POST, read `staff.invite_url` from the response and open a new "Invite link" modal (copy the PIN-modal JSX structure in the same file): shows the URL in a readonly input + a "Copy" button (`navigator.clipboard.writeText`, toast "Link copied"). Change the success toast to "Invite created — copy the link below and send it to them." (Nothing is emailed; don't claim it was.)
   - On pending-invite cards (`status === 'invited'`), add a copy-link icon button (reuse `Mail` or add `Link2` from lucide) that copies `staff.invite_url` directly with a toast.
3. Info card text: adjust the sentence to say the link is shared manually until email sending arrives.
4. Live verification (only if Supabase MCP is connected; otherwise document as deferred in the build log — do NOT fake it): POST invite → GET list shows it with an `invite_url` → revoke it (DELETE) → confirm gone. Separately verify PIN flow once on the seeded staff membership via `execute_sql` checking `pin_updated_at` moved after a UI PIN set (user does the click) — or skip with a note.

### Phase C — Members module in the HQ CRM

1. `lib/modules.ts`: add to `MODULES` **as the first entry**: `{ key: 'members', label: 'Members', href: '/members', icon: Users, status: 'live' }`. Add `'members'` to the `ModuleKey` union. Import `Users` from lucide (aliasing note: `HQ_ITEMS` already imports `Users` for Clients — reuse the same import; two nav items may share an icon, that's acceptable, or switch Members to `Contact`/`HeartHandshake` if you prefer distinct icons — pick one and keep it).
2. New `app/api/members/route.ts`:
   - `GET ?venue_id=&status=&search=`: gate `requireVenueRole(venueId, ['owner','manager'])`. Then call `listRegulars(authz.ctx.venueId, { search, status, limit: 100 })` from `lib/owner-stats.ts` (status only when in `['new','regular','fading','lost']`; ignore otherwise). Return `{ members: rows }` — the `RegularRow` shape (`memberId, fullName, status, visitCount, lastVisitAt, cadenceDays, daysSinceLast, balance`) is already camelCase and PII-safe; pass it through untouched.
3. New `app/api/members/[id]/route.ts`:
   - `GET`: gate `requireRowVenueRole('members', 'member_id', params.id, ['owner','manager'])` — DEFAULT venueColumn (`'tenant_id'`) is CORRECT here (members kept tenant_id). Then `getMemberProfile(gate.ctx.venueId, params.id)`; 404 if null; return `{ member: profile }`.
   - `PATCH` body `{ points_delta: number, note?: string }`: same row gate. Validate `Number.isInteger(points_delta) && points_delta !== 0 && Math.abs(points_delta) <= 10000`. If negative, check balance first (`member_balances` view, `.select('balance').eq('member_id', ...)`) and 409 `"Adjustment would make the balance negative"` when `balance + points_delta < 0`. Insert into `points_ledger`: `{ tenant_id: gate.ctx.venueId, member_id: params.id, points_change: points_delta, reason: 'adjustment', description: note?.slice(0,200) || 'Manual adjustment' }`. **Before writing this, grep the migration for the ledger's `reason` CHECK constraint and confirm `'adjustment'` is in the allowed list AND that `balance_after` is not a NOT NULL column; if either fails, STOP and flag in the report — do not write SQL migrations.** Emit `points.adjusted` (already in the `AroEventType` union) with payload `{ member_id, points_delta }`. Return the fresh balance: re-select `member_balances` and include `{ ok: true, balance }`.
4. New `app/(dashboard)/members/page.tsx` (`'use client'`): copy the structural skeleton of `app/(dashboard)/staff/page.tsx` (useTenant guard → skeleton → content). Content: search input + status filter pills (`all|new|regular|fading|lost`) + card grid, each card: initial avatar (same pattern as staff cards), `fullName`, status chip (inline span with the four status colors — do NOT import `components/owner/StatusChip`, it uses aro-brand tokens; make a tiny local `statusColor(status)` map with the HQ coffee/cream palette), `{balance} pts`, `{visitCount} visits`, "last seen X days ago" (`daysSinceLast != null ? Math.round(...) : '—'`). Card click → `router.push(\`/members/${memberId}\`)`. Debounce the search 300ms client-side OR filter client-side over the fetched 100 rows (simplest: pass search/status to the API on change like the activity page does; either is acceptable — pick server-side to match the API you built).
5. New `app/(dashboard)/members/[id]/page.tsx` (`'use client'`, `useParams`): fetch `/api/members/{id}` on mount (needs no venue param — row-gated). Render: name + status chip + `whySentence`; balance + visit count stat pair; visit history (list of `visits[].ts` dates, most recent 20 — a simple list, no SVG dots needed at HQ); points ledger list (reason capitalized, signed points, green/red); an "Adjust points" button → modal (PIN-modal pattern) with a signed integer input + optional note → PATCH → toast with new balance → refetch. Back link to `/members`.
6. Do NOT touch `(owner)/regulars` or `lib/owner-stats.ts` internals (only import them).

### Phase D — Retire legacy dead surfaces

1. Recon first: `grep -rn "StaffAuthContext" app components contexts lib --include='*.ts*'` and `grep -rn "'/staff" app components --include='*.ts*'` to map every consumer before deleting anything.
2. `app/staff/*` (the old portal: login/dashboard/orders/inventory/reports/team + its `page.tsx`): replace `app/staff/page.tsx` AND `app/staff/login/page.tsx` each with a server component: `import { redirect } from 'next/navigation'; export default function X() { redirect('/counter') }`. DELETE the other `app/staff/*` subdirectories and `contexts/StaffAuthContext.tsx` — unless the recon grep shows a consumer outside `app/staff/**`; in that case keep the context file but replace its `staff_users` query with a thrown "retired" error path, and note it.
3. `app/tenants/[id]/page.tsx`: replace with the same one-line `redirect('/clients')` server component. Then delete the now-orphaned 501 stubs: `app/api/menu-items/**`, `app/api/categories/**`, `app/api/locations/**` (6 route files) — re-grep `"api/menu-items\|api/categories\|api/locations"` first to prove `/tenants/[id]` was the last consumer.
4. `app/shop/**` stays untouched (parked commerce; its dead `rewards_catalog` browser query remains flagged-not-fixed — it's behind `ORDERING_ENABLED=false`).
5. Delete stale `.next` before the build if TS complains about removed pages (`rm -rf .next` — known quirk from the diagnostics deletion).

### Phase E — Ops guardrails

1. New `scripts/verify-live.mjs` (plain Node, no new deps — use `@supabase/supabase-js` which is already a dependency, via `createClient`):
   - Reads `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` from env; exits 2 with a clear message if missing.
   - Anon client checks: `venues` select of public columns succeeds (≥1 row); `members` select errors with permission denied (assert error present — the GRANT was never given to anon, stronger than RLS).
   - Service client checks: seed venue row exists by id; `select count` on `memberships` ≥ 3; RPC existence — call `venue_week_stats` with the seed venue id + 'America/Edmonton' and assert it returns a row; call `verify_counter_pin(seed_venue_id, '0000')` and assert it returns empty (function exists, wrong PIN rejected) — never log PINs.
   - Each check prints `PASS`/`FAIL name: detail`; process exits 1 if any FAIL. Add `"verify:live": "node scripts/verify-live.mjs"` to package.json scripts.
2. `docs/plans/BUILD-LOG-hq-modules.md`: append one section per phase (continue the established format: what changed, what the self-review caught, what was verified, anything deferred/flagged).
3. Final report to the user: production URLs live, what they can now do (invite links, Members), what was retired, the one deferred item list.

## Directives for the implementing model (Sonnet 5) — binding

**Order & discipline**

1. Phases strictly A→E. One commit per phase, descriptive `feat(...)`/`fix(...)`/`chore(...)` message, push after each. A phase is done only when `npx tsc --noEmit` AND `npm run build` are green. Never batch phases.
2. Phase A contains NO feature code. It is MCP coordination + one docs edit. If an owner prerequisite is unconfirmed, ask via AskUserQuestion and stop until answered — do not merge a production cutover on assumptions, and do not write code to work around a missing dashboard step.
3. READ every file fully before editing. Before any DB query, confirm column names against `supabase/migrations/20260707000001_aro_platform_schema.sql` (+ `20260706000000` for legacy columns). The tenant_id/venue_id split in Ground truth is normative.
4. Copy the named patterns; invent nothing new: routes ← `app/api/staff/route.ts` & `app/api/clients/route.ts`; pages ← `app/(dashboard)/staff/page.tsx`; modals ← the PIN modal; shared server helpers ← `lib/*` (route files export only HTTP handlers).
5. Scope discipline: no refactors, no restyling, no new dependencies, no new migrations. Two explicit STOP-and-flag tripwires are named in Phase C step 3 (ledger `reason` CHECK; `balance_after` nullability). Hitting either means: report, skip the adjustment feature, continue the rest of Phase C.

**Security invariants (violation = failed phase)** 6. Every new/modified route: gate first (`requireVenueRole` / `requireRowVenueRole` with the CORRECT venueColumn per Ground truth), `return gate.response` on failure, body parsing after. 7. Never return `invite_token` raw, `counter_pin_hash`, or member email/phone in any response. `invite_url` only for pending invites (user_id null) through the owner/manager-gated staff routes. 8. `getSupabaseAdmin()` only in `app/api/**` and server components. `lib/modules.ts` stays supabase-free. 9. Points adjustment: integer, non-zero, |Δ| ≤ 10000, negative-balance 409 check, ledger insert only (never touch a stored balance — balances are the `member_balances` view, derived).

**Verification directives** 10. After each phase run that phase's Verification slice below, not just the build. Self-review each phase's diff with `/code-review --level medium` before committing; fix findings pre-commit and record them in the build log (the previous plan's log shows the expected format — every phase there caught something real; expect the same). 11. If the Supabase MCP or GitHub MCP is disconnected when needed: retry via ToolSearch once; if still down, do not block the whole plan — mark that step deferred in the build log with exactly what remains, and continue. EXCEPTION: Phase A's merge cannot proceed without GitHub MCP; wait/retry for that one. 12. Keep `docs/plans/BUILD-LOG-hq-modules.md` current per phase. It is the handoff artifact.

## Verification

1. **Phase A**: `https://caffipro.vercel.app/login` serves the new app; `/api/check-env` all-green; anonymous `/api/clients` → 401; AURA production diagnostic → row in `leads` (user confirms in `/leads`). Old mocked dashboard unreachable anywhere.
2. **Phase B**: invite a test member → modal shows a `https://caffipro.vercel.app/join-team/<uuid>` link → open in incognito → sign up with that email → accept → staff list shows "Active"; pending-invite card's copy button works; revoke removes it. (User performs the browser half; agent verifies rows via Supabase MCP when available.)
3. **Phase C**: `/members` lists the Roastery's members (~9) with statuses matching `(owner)/regulars`; profile shows whySentence + ledger; +50 adjustment appears in ledger AND `member_balances`; −(balance+1) adjustment → 409; a non-member owner of a different venue → 403 on both member routes (spot-check via a crafted fetch or reasoning over the gate — gate is row-scoped).
4. **Phase D**: `/staff`, `/staff/login`, `/tenants/<any-id>` all redirect; `grep -rn "staff_users" app contexts --include='*.ts*'` returns only `app/shop/**` hits (or zero); `grep -rn "api/menu-items\|api/categories\|api/locations" app components lib` returns zero; build green after `rm -rf .next`.
5. **Phase E**: `npm run verify:live` → all PASS against production env; deliberately unset `SUPABASE_SERVICE_ROLE_KEY` → clean exit-2 error, not a crash.
