# BUILD-LOG — PLAN-15 (Referral engine)

Branch `sonnet/lane-a-plan15-referral-engine`, off `main` after PLAN-14
(PR #78) merged.

## What shipped

- **Migration** `20260810210000_plan15_referral_credit.sql`:
  `points_ledger.referred_member_id` + `uq_points_ledger_referral_award`
  (partial unique, `WHERE referred_member_id IS NOT NULL AND reason =
'referral'`) — the structural once-only guarantee for the points-reward
  path. The value-reward path needs no migration; it reuses PLAN-13's
  `member_offers.period_key` mechanism as-is.
- `lib/loyalty/referral-credit.ts` — `creditReferralOnFirstVisit()`:
  resolves the referred member's `referred_by_member_id`, looks up the
  venue's active `referral` program, and either issues a `member_offers`
  offer (`period_key = 'referral:<referredMemberId>'`) or inserts a
  `points_ledger` row (guarded by the new partial unique index, `23505`
  treated as idempotent no-op — the same pattern `/api/counter/visit`
  already uses for its own dedup). No credit at all if no active
  `referral` program exists.
- `app/api/counter/visit/route.ts` — one new call, fire-and-forget:
  `wasNew && count === 1` (both already computed by this route) triggers
  `creditReferralOnFirstVisit`, never awaited into the response so a
  referral-credit failure can't fail the visit itself.
- `app/api/join/route.ts` — optional `ref` (referrer's `pass_serial`),
  resolved scoped to the venue already looked up in the same request.
  Unknown/cross-venue → silently `null`, never blocks the join. Written
  into `referred_by_member_id` only inside the new-member `INSERT`. Emits
  `referral.recorded` when a new member's join carried a resolved ref.
- `app/join/[venue]/page.tsx` / `join-form.tsx` — `ref` read from the
  page's `searchParams`, threaded through as a hidden form field so the
  no-JS POST path carries it too, not just the hydrated fetch path.
- `app/pass/[serial]/share-referral.tsx` — new client island: Web Share
  API where available, clipboard fallback otherwise (mirrors
  `DraftCard.tsx`'s existing clipboard pattern — no new dependency).
- `app/pass/[serial]/page.tsx` — added `venues.slug` to the existing venue
  query, builds the referral URL
  (`<origin>/join/<slug>?ref=<pass_serial>`, same
  `NEXT_PUBLIC_SITE_URL`-first / request-origin-fallback convention
  `/api/staff` and `/api/invites` already use), renders `ShareReferral`.
- `lib/events.ts` — `referral.recorded`, `referral.rewarded` appended to
  the Lane A block.

## Architect-tier review (mandatory for this item — v2 §7)

Done as a genuinely separate pass after the build, re-reading the credit
logic cold rather than trusting the build-time reasoning. Findings are in
`PLAN-15-referral-engine.md`'s own "Architect-tier review findings"
section: one dead-code removal (a redundant `transaction_id` generation
that fought the column's own `DEFAULT`), the race-safety argument
re-verified against the actual index definitions rather than re-assumed,
and one low-severity edge case flagged (not fixed) — two simultaneous
active `referral` programs on one venue silently withholds the credit
rather than double-crediting, which is the correct failure direction for
a money-adjacent path but is a real, if minor, gap.

## Deliberate scope cut

- **The owner loop (v2 §N5 step 5) is not built.** It requires a one-line
  change in the AURA repository (`ref` forwarded into the lead payload),
  which is not accessible from this session, and its own prerequisite
  (R1, the AURA lead-forwarding fix) is still "not done" per `STATUS.md`.
  Flagged explicitly per this session's instruction to report
  vendor/cross-repo blockers rather than guess at them or fake the
  integration.

## Verification

- `npx tsc --noEmit` — clean.
- `npx next lint --max-warnings 0` — clean (the one pre-existing,
  unrelated `CreativeStudio.tsx` warning, also present on `main`).
- `npm run build` — clean; every touched/new route registers.
- Grep gate: zero `coffee-*`/`cream-*`/`dark-*` in this PR's files.
- **Not verified live.** No Supabase service-role key / MCP connection in
  this container, same gap as every Lane A PR this session. The
  concurrent-first-visit race, the partial-unique-index backstop actually
  firing on a real `23505`, the join-with-ref flow, and the share button's
  Web Share/clipboard behavior are all argued from the code and the index
  definitions, not fired against a real database or exercised in a
  browser.
