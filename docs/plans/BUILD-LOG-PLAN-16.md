# BUILD-LOG — PLAN-16 (Survey promotions)

Branch `sonnet/lane-a-plan16-survey-promotions`, off `main` after PLAN-15
(PR #79) merged. Zero migrations — `survey_responses` (PLAN-10) already
had everything this item needs.

## What shipped

- `lib/loyalty/survey.ts` — pure: `isValidSurveyConfig` (3–5 questions,
  unique ids, a `choice` question always has ≥2 non-empty options) and
  `validateSurveyAnswers` (every question answered; a `choice` answer
  must be one of that question's own configured options, never an
  arbitrary string).
- `app/api/pass/[serial]/survey/route.ts` — public by bearer serial, dual
  mode (JSON + form POST, `q_<questionId>` fields reconstructed into the
  same answers map). Inserts `survey_responses`; a `23505` there (already
  responded) is a calm "already completed" message, not a 500. Issues an
  offer only after that insert succeeds, using
  `period_key = 'survey_completion'`.
- `app/pass/[serial]/survey/[programId]/page.tsx` — plain-form survey
  page, zero client JS. Shows "already answered" if the member's own
  response already exists (checked server-side before rendering the
  form, not just relying on the submit route's own 409).
- `app/pass/[serial]/page.tsx` — lists this member's still-open (active,
  not-yet-answered) surveys with a link to each.
- `app/api/loyalty/survey-responses/route.ts` — owner/manager GET,
  returns raw `answers` per response, unmodified.
- `app/(owner)/loyalty/loyalty-client.tsx` — a question builder in the
  create-program form for `type: 'survey'` (add/remove up to 5 questions,
  text or multiple-choice, comma-separated options), and a "View
  responses" panel per survey program showing every response verbatim.
- `lib/events.ts` — `survey.completed` appended to the Lane A block.

## Deliberate scope cuts (stated in the spec doc, repeated here for the log)

- **Results view ships verbatim, not aggregated.** The acceptance line
  asks for per-question aggregates (e.g. a count breakdown for `choice`
  answers); what's here is a plain list of every response's answers.
  Verbatim free-text display (the more safety-critical half of that
  acceptance line — never summarized or AI-routed) is fully met; the
  aggregation half is not. Flagged rather than shipped as a rushed
  bar chart.
- No anonymous (non-pass) survey entry point — only "reachable from the
  pass" was built, matching the stated scope.

## Verification

- `npx tsc --noEmit` — clean.
- `npx next lint --max-warnings 0` — clean (the one pre-existing,
  unrelated `CreativeStudio.tsx` warning, also present on `main`).
- `npm run build` — clean; `/api/pass/[serial]/survey`,
  `/pass/[serial]/survey/[programId]`, `/api/loyalty/survey-responses`
  all registered.
- Grep gate: zero `coffee-*`/`cream-*`/`dark-*` in this PR's files.
- **Not verified live.** No Supabase service-role key / MCP connection in
  this container, same gap as every Lane A PR this session. The
  `survey_responses` unique-index replay behavior, the question-builder
  round trip, and the survey form page were all argued from the code and
  the PLAN-10 schema, not fired against a real database or exercised in a
  browser.
