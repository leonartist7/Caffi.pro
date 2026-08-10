# PLAN-14 — Birthday + anniversary

Lane A, `MASTER-PLAN-v2R-remastered.md` §6. Executes `MASTER-PLAN-v2` §N9
as written (one-shot capture, month + day only, no year field anywhere,
409 on second write, pure calendar validation, rate-limited via the
events-table window pattern, `member.birthday_set` event) plus the
anniversary variant, which needs no capture at all — `members.created_at`
already holds the join date.

## Design

**No scheduler existed in this repo before this PR** — no `vercel.json`,
no `app/api/cron/*`, `CRON_SECRET` documented in `.env.example` but wired
to nothing. Built here: `vercel.json` (`0 12 * * *`, daily) →
`/api/cron/loyalty-daily`, gated on `Authorization: Bearer <CRON_SECRET>`.
A missing `CRON_SECRET` renders the visible-stub 503 rather than running
unauthenticated or silently no-op'ing. Because that secret isn't set
anywhere in this environment, an owner-facing "run today's issues now"
button (`/api/loyalty/run-birthday-anniversary`, owner-only) calls the
_exact same_ underlying function the cron calls — not a copy — so
birthday/anniversary issuance is real and testable today, and switches to
fully automatic the moment `CRON_SECRET` is set in Vercel.

**"Today" is always venue-local**, via `getVenueTimezone` (already used
by PLAN-36/37) and a pure `Intl`-based day resolver
(`lib/loyalty/calendar.ts`) — never the cron's UTC instant, which is the
exact bug class v2 §N3 already named. Feb 29 birthdays/anniversaries fire
on Feb 28 in a non-leap year — chosen explicitly, not left to silently
skip three years out of four.

**Idempotency reuses PLAN-13's `period_key`** (`'birthday:<year>'` /
`'anniversary:<year>'`, scoped by `program_id, member_id`) — the same DB
partial unique index, not a new mechanism. A doubled cron run, a same-day
"run now" click after the cron already fired, or next year's issuance are
all handled by the one index, not three different application checks.

**Capture** happens on the pass page itself
(`app/pass/[serial]/page.tsx`): a plain `<form method="post">` to
`/api/pass/[serial]/birthday`, working with zero client JS (redirect-back
pattern, same as `/api/join`). The route 409s a second write attempt at
the database level (`.is('birthday_month', null)` in the `UPDATE`'s
`WHERE`, not just a pre-read check — two concurrent submits from the same
link can't both land).

## Non-goals

- No year is ever asked, stored, or inferable — `members.birthday DATE`
  (the legacy column §5 flags as a schema conflict) is left untouched;
  this PR only ever writes `birthday_month`/`birthday_day`.
- No email/SMS/push reminder — the offer lands on the pass; delivery
  beyond that is v2 §N1/§N6 (blocked) or PLAN-18 (not yet built).

## ✅ Acceptance (v2 §N9 verbatim, plus)

- [ ] One-shot ask on the pass; month + day only; 409 on a second write.
- [ ] Calendar validation is a pure function; a nonexistent date (Feb 30)
      is rejected before the database.
- [ ] Rate-limited via the events-table window pattern.
- [ ] `member.birthday_set` event emitted.
- [ ] Anniversary offers issue on the join-date anniversary in
      venue-local time.
- [ ] A member who joined on Feb 29 gets an anniversary in non-leap
      years, on Feb 28 — the choice stated here and in the build log, not
      left to silently never fire.
- [ ] Design bar (§2).
