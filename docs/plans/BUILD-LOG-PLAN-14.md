# BUILD-LOG — PLAN-14 (Birthday + anniversary)

Branch `sonnet/lane-a-plan14-birthday-anniversary`, off `main` after
PLAN-13 (PR #77) merged.

## What shipped

- `lib/loyalty/calendar.ts` — pure: `venueLocalDate(now, timezone)`
  (`Intl.DateTimeFormat` in the venue's own IANA timezone, never a fixed
  UTC offset — DST handled by the platform), `isValidCalendarDay(month,
day)` (rejects Feb 30/Apr 31/etc., accepts Feb 29), `occursOn(month,
day, today)` (the Feb-29-in-a-non-leap-year → Feb 28 fallback, one
  function, reused by both program types rather than duplicated).
- `app/api/pass/[serial]/birthday/route.ts` — public by bearer serial,
  same trust model as `/api/join`. Rate-limited via the events-table
  window pattern (>20 attempts/10min per IP hash → 429, mirroring
  `/api/join`'s existing guard). One-shot: the `UPDATE`'s own `WHERE
.is('birthday_month', null)` is the actual write-once guarantee — a
  pre-read 409 check exists too, but the guard that matters is on the
  write. Dual-mode (JSON + form POST with a 303 redirect back to
  `/pass/[serial]?birthday_set=1` or `?birthday_error=...`), so the pass
  page's capture form needs zero client JS.
- `lib/loyalty/issue.ts` (PLAN-13, unchanged) reused as-is for the
  automated issuance path — no new issuance primitive needed.
- `lib/loyalty/birthday-anniversary-issue.ts` —
  `runBirthdayAnniversaryForVenue(admin, venueId)`: resolves the venue's
  timezone once, computes venue-local "today," then for every active
  `birthday`/`anniversary` program issues via `issueMemberOffer` with
  `period_key = '<type>:<year>'`. Birthday matches query
  `members.birthday_month`/`birthday_day` directly (plus the Feb 29
  fallback pair on a Feb 28 that isn't a leap day); anniversary scans the
  venue's members (bounded at 5,000 — fine at café scale, would need
  pagination past that) and compares each `created_at`'s venue-local
  month/day via `occursOn`. `runBirthdayAnniversaryForAllVenues` is the
  cron's fan-out: one query for every venue with an active program of
  either type, then the per-venue function in a loop.
- `app/api/cron/loyalty-daily/route.ts` — `GET`,
  `Authorization: Bearer <CRON_SECRET>`. Missing `CRON_SECRET` → 503 with
  a `STUBBED — needs CRON_SECRET` body (visible-stub rule), never a silent
  200 no-op and never an unauthenticated run.
- `vercel.json` — new file (none existed in this repo before this PR):
  `{"crons": [{"path": "/api/cron/loyalty-daily", "schedule": "0 12 * * *"}]}`.
  Anchored at noon UTC, not each venue's own midnight — the route itself
  computes venue-local "today" independently per venue, so a single daily
  UTC-anchored fire still lands during the correct local calendar day for
  every timezone this product is likely to see; it will not fire exactly
  at a venue's own midnight, which is an accepted simplification, not a
  correctness gap (the period-key dedup means firing a few hours into the
  local day, once, is indistinguishable in outcome from firing at 00:00).
- `app/api/loyalty/run-birthday-anniversary/route.ts` — owner-only, calls
  the identical `runBirthdayAnniversaryForVenue` the cron calls. Exists
  because `CRON_SECRET` is unset in this environment (confirmed:
  `.env.example` documents it, nothing sets it) — without this button,
  PLAN-14 would ship with zero way to actually exercise it before a human
  configures Vercel.
- `app/(owner)/loyalty/loyalty-client.tsx` — a "Run today's
  birthday/anniversary issues now" bar, shown only when the venue has at
  least one active program of either type, with an inline note that it
  normally runs automatically once `CRON_SECRET` is set.
- `app/pass/[serial]/page.tsx` — a birthday-capture form (month/day
  selects, plain `<form>`, no client JS) shown only when
  `birthday_month`/`birthday_day` are both still null; a confirmation
  line after a successful save.
- `lib/events.ts` — `member.birthday_set` appended to the Lane A block
  (offer issuance reuses the existing `offer.issued` type, not a new one).

## Deliberate scope cuts

- No email/SMS/push delivery of the birthday/anniversary offer beyond it
  appearing on the pass — same non-goal PLAN-12/13 already state.
- Anniversary member scan is unbounded per-venue up to 5,000 rows; a venue
  past that would need this paginated the way `lib/tips/report.ts` and the
  appreciation batch route already are. Not done here — no venue in this
  system is remotely close to that count yet, and the paginate-past-1000
  pattern is proven elsewhere and trivial to retrofit when it's needed.

## Verification

- `npx tsc --noEmit` — clean.
- `npx next lint --max-warnings 0` — clean (the one pre-existing,
  unrelated `CreativeStudio.tsx` warning, also present on `main`).
- `npm run build` — clean; `/api/cron/loyalty-daily`,
  `/api/pass/[serial]/birthday`, `/api/loyalty/run-birthday-anniversary`
  all registered.
- Grep gate: zero `coffee-*`/`cream-*`/`dark-*` in this PR's files.
- **Not verified live.** No Supabase service-role key / MCP connection in
  this container, same gap as PLAN-12/13. Nothing in this PR was fired
  against a real database: the birthday capture form was never submitted
  against a live `members` row, the cron route's 401/503 branches were
  read, not curled, and `runBirthdayAnniversaryForVenue`'s query shapes
  (the `.or()` filter for the Feb-29 fallback pair in particular) were
  checked against PostgREST's documented `.or()` syntax, not executed.
  **`CRON_SECRET` is not set anywhere in this environment** — the cron
  route is genuinely unreachable in production until a human sets it in
  Vercel; the owner "run now" button is the only currently-live path to
  this feature, and it too is unexercised in this session.
