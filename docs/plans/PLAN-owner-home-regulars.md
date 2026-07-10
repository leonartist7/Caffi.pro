# PLAN-owner-home-regulars — Rank 4 of 5

**Goal:** the owner opens the app and in 30 seconds knows "it's working": home
= ONE number ("regulars returned this week") + three tiles (members ↑ /
visits ↑ / at-risk ↓) + an approvals inbox shell; plus the **Regulars** screen
— the living list with derived status chips and a per-member profile that can
answer "why is Maya fading?" in one sentence. This is the screen that renews
subscriptions. Depends on: PLAN-live-supabase-bringup (uses `member_status` +
`member_balances` views); best after Plans 2–3 so real joins/visits exist.

## Files to touch

- `app/(owner)/layout.tsx` (CREATE — new route group per ARCHITECTURE §4: server-gated like `(dashboard)` — copy its auth pattern; sidebar: Home, Regulars, Rewards, Campaigns, Settings; aro tokens, warm, minimal)
- `app/(owner)/home/page.tsx` (CREATE — server component; all aggregates via ONE server function)
- `app/(owner)/regulars/page.tsx` (CREATE — list w/ status chips + search + status filter)
- `app/(owner)/regulars/[id]/page.tsx` (CREATE — profile: visits timeline, points history from ledger, usual, cadence, the "why" sentence)
- `lib/owner-stats.ts` (CREATE — `import 'server-only'`; all SQL/aggregate logic lives here, NOT in components; every function takes `venueId` + `timezone`)
- `supabase/migrations/20260709000003_owner_stats.sql` (CREATE — SQL function `venue_week_stats(venue_id, tz)` returning the one number + tile values in a single round trip; and index `visits(venue_id, member_id, ts desc)` if absent)
- `app/(dashboard)/dashboard/page.tsx` (MODIFY — the old fully-mocked screen: replace body with a redirect to `/home` for owner/manager roles; HQ users keep their `(dashboard)` screens. DELETE the hardcoded €2,400 mock block entirely — no dead mock left in tree)
- `components/owner/StatTile.tsx`, `components/owner/StatusChip.tsx`, `components/owner/ApprovalsInbox.tsx` (CREATE — inbox reads `ai_drafts where status='draft'`; renders items with Approve/Edit/Skip buttons that PATCH `ai_drafts.status` via a small `app/api/ai-drafts/[id]/route.ts` (CREATE) using `lib/authz.ts`; list is empty until Phase-4 AI writes drafts — design the empty state warmly: "aro's suggestions will appear here")
- `scripts/verify-live.mjs` (MODIFY — stats assertions below)

## Definitions (implement EXACTLY these — this is the product's honesty)

- **THE number** = count of distinct members with ≥1 visit in the venue-local
  current week (Mon 00:00, venue tz) whose _previous_ visit gap ≥ 1.5× their
  own median cadence — i.e. people who were drifting and came back. Label:
  "regulars returned this week".
- **Tiles:** members ↑ = new members this week vs last; visits ↑ = visits this
  week vs last; at-risk ↓ = current count of `member_status = 'fading'` vs 7
  days ago (needs a tiny nightly snapshot: add `status_snapshots(venue_id, day,
fading_count)` to the migration, populated by the stats function on first
  call per day — no cron dependency yet).
- **"Why" sentence template:** "Usually comes every {median_gap} days — last
  seen {days_since} days ago{, that's {ratio}× their rhythm | }." Values from
  the same SQL the status chip uses. One source of truth: `member_status` view.

## Steps, in order

1. Migration (stats fn + snapshot table + index); regenerate `aro_schema.sql`; owner applies.
2. `lib/owner-stats.ts` wrapping the SQL fn; unit-test the week-boundary math with injected dates (pure TS date helpers, no dep).
3. `(owner)` layout + home page + tiles + inbox shell + drafts PATCH route.
4. Regulars list: server-render first page (50) from `member_status` joined to `member_balances`; chips: new (sand), regular (sage), fading (saffron), lost (muted ink). Client search filters within venue via API route (same masked-contact rule as counter? NO — owner role legitimately sees full contact per Blueprint §8; staff don't. Gate by role in the route).
5. Profile page: visit dots timeline (pure SVG, no chart lib), ledger table, the why-sentence, quick actions placeholder ("Send a nudge" disabled with "campaigns arrive in the next phase" tooltip — visible stub rule).
6. Old mock dashboard removed/redirected. Grep the tree for `2,400|1,234|Blue Bottle` to prove no mock remnants.
7. Screenshots: home with seeded data, home empty-venue state, regulars all-statuses, one fading profile with why-sentence, approvals empty state → `docs/audit/after/plan-owner/`.

## Edge cases a weaker model would miss

- **Timezone is product-correctness here:** "this week" must be the venue's
  local week (`venues.timezone`, default `America/Edmonton` — add column in the
  migration if missing). UTC weeks make Sunday-evening visits count into next
  week and the owner's number lies. All date math in SQL uses `AT TIME ZONE`.
- **Members with <3 visits have no meaningful cadence** — median of 1 gap is
  noise. `member_status` already calls them `new`; the returned-regulars count
  must exclude them (a brand-new member's 2nd visit is lovely but is not a
  "regular returned"). Don't double-count them into THE number to make it look better.
- **Empty venue ≠ zeros dashboard.** A venue with no data yet shows a warm
  onboarding state ("Your circle starts with the first scan — print your QR")
  with a link to the join page QR, not `0 / 0 / 0`, which reads as "product is broken".
- **Views don't aggregate cheaply at scale** — the per-member cadence view over
  a venue is fine at hundreds of members, but the home page must make ONE RPC
  round trip (the SQL function), not N queries per tile. A weaker model will
  fire six client-side TanStack queries; the doctrine is server component + one fn.
- Comparisons need guards: last week = 0 → show "first week!" not `+∞%`.
- The at-risk tile trend needs the snapshot table because `member_status` is a
  point-in-time view — you cannot compute "fading count 7 days ago" retroactively. Snapshot-on-first-read keeps it cron-free for now.
- Owner vs manager both see these screens (memberships role check allows both); staff role must get 403/redirect to `/counter` — test it.

## Restolabs feature alignment (2026-07-10)

Competitor scan (Restolabs) requested feature parity; decision was loyalty-first
— defer their commerce stack, cherry-pick what already fits this plan's design:

- **"Real-Time Analytics"** — Restolabs sells a broad metrics dashboard. This
  plan deliberately does NOT do that (see Edge cases: "views don't aggregate
  cheaply", "ONE RPC round trip"). The one-number philosophy stays; do not
  add a metrics-dashboard tab to satisfy this. Deeper trend analytics, if
  wanted later, is a new Phase 6+ screen — not a change to `/home`.
- **"Customer Data Ownership"** — already exceeded by design: owner role sees
  full member contact + history (step 4), no third party ever holds it. No
  change needed.
- **"Branded Loyalty Program... automated rewards and targeted promotions"**
  — `ApprovalsInbox` (step 3) reading `ai_drafts`, plus the `campaigns` table
  already scaffolded in the Phase 2 schema, are aro's answer to this; they
  just aren't populated until a later AI-drafting phase. No new work here —
  confirms the existing design already covers it.

## Acceptance criteria

1. verify-live.mjs: seed a member with known visit pattern (e.g. visits every 7d, then a 12d gap, then a visit this week) → stats fn counts exactly 1 returned regular; a 2-visit newbie this week counts 0.
2. Week boundary test: visit at Sunday 23:30 venue-time lands in the correct week (unit test with injected tz).
3. Screenshots per step 7; empty-state screenshot shows onboarding copy, not zeros.
4. `grep -r "2,400\|Blue Bottle" app/ components/` returns nothing; staff-role access to `/home` redirects to `/counter` (curl with staff session proves).
5. Build green; one RPC round trip on home confirmed (log the fn call count in dev); committed + pushed.
