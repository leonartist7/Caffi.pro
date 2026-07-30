# PLAN-11 — Members Directory Rebuild

> Executor: read `docs/plans/MASTER-PLAN-aro.md` FIRST (§4/§5 binding). Read
> `docs/plans/MASTER-PLAN-v2-operating-system.md` and
> `docs/plans/MASTER-PLAN-v2R-remastered.md` §1 item 2 and §6 Lane A
> PLAN-11 before touching any file — this document is the lean spec those
> sections require, not a replacement for them. Lane A owns this work
> exclusively. Branch: `sonnet/lane-a-plan11-members-directory` off
> `origin/main`. Depends on: nothing (no schema, no other PR).

## Ground truth (re-verified 2026-07-30)

- `lib/owner-stats.ts:113` — `listRegulars` hard-caps at `.limit(opts.limit ?? 50)`
  with no offset, no total count.
- `lib/owner-stats.ts:140` — `opts.search` filters `rows` **client-side in
  the server function, after the DB limit already truncated the set** — a
  member past the cap can never be found by search.
- `.order('days_since_last', { ascending: true, nullsFirst: false })` —
  never-visited members (`days_since_last IS NULL`, zero rows in `visits`)
  sort last and, combined with the cap, silently vanish once a venue passes
  the limit.
- `members.phone` and `members.email` already exist as base-table columns
  with indexes `idx_members_tenant_phone`, `idx_members_tenant_email`
  (`supabase/aro_schema.sql:338-339`) — **no migration needed** for phone/
  email search.
- `member_status` (`supabase/aro_schema.sql:633`) is a `VIEW` (not a table)
  built from `members` via `LEFT JOIN LATERAL` — every member appears in it
  exactly once regardless of visit count, so a zero-visit member already
  has a row (`status='new'`, `days_since_last=NULL`). No lookup change
  needed to make them appear; only the cap/search bugs hide them.
- **Same underlying bug, second surface**: `app/(owner)/regulars/page.tsx`
  calls `listRegulars(venueId)` with the same default limit and does
  client-side search/filter on the same already-capped array
  (`app/(owner)/regulars/regulars-list.tsx`). This file is not named in
  `MASTER-PLAN-v2R-remastered.md`'s PLAN-11 acceptance checklist (which
  only greps `app/(dashboard)/members`), but `app/(owner)/regulars/**` is
  exclusively Lane A-owned and is the **owner's own daily-use surface** —
  arguably a worse instance of the exact same revenue-leak bug than the HQ
  copy. Fixing `listRegulars`'s root cause and leaving this call site on
  the old capped/client-filtered path would ship a "fixed" library function
  next to a page that still exhibits the bug. **Decision, recorded here
  rather than guessed silently: PLAN-11 fixes both surfaces.** This widens
  scope slightly beyond v2R's literal acceptance-checklist file list; it
  does not touch any file outside Lane A's ownership.
- No Supabase MCP connector available in this execution session
  (`enabledInChat: false` at the org level) — this PLAN needs **no schema
  change**, so that limitation does not block it. It does mean the
  acceptance items requiring a live 250-member seed and hand-run SQL counts
  **cannot be executed against the real `aro-platform` project from this
  session** — recorded honestly in the build log as unverified-live, not
  silently assumed to pass.

## Non-goals

- No new database table, column, or RPC. This is a query-shape and UI fix
  on existing schema.
- No change to `member_status`'s derivation logic (new/regular/fading/lost
  thresholds) — that math is correct and out of scope.
- No infinite-scroll UI; simple page-number pagination (prev/next + page
  count) is sufficient and matches this product's existing UI conventions
  (no other Lane A surface uses infinite scroll).
- Does not touch `getMemberProfile` / the member detail page's data shape
  — only the list/search/pagination path.

## Design

- **Offset pagination, not literal keyset**, with the tradeoff stated
  plainly per v2R §6 PLAN-11 step 1's own escape hatch ("Offset pagination
  is acceptable only if the count query proves venue sizes are small").
  This is a single-venue café loyalty member list; realistic member counts
  for an independent café are hundreds to low thousands, not millions.
  `member_status` is a view with per-member `LATERAL` joins that must be
  evaluated for every matching row to determine sort order regardless of
  whether the page is fetched by offset or by a keyset predicate — at this
  scale the two approaches cost the same, and offset pagination is far
  simpler to reason about correctly (keyset over a nullable computed
  column needs NULL-safe tuple comparisons that PostgREST does not expose
  cleanly). Documented here as a deliberate choice, not an oversight — if
  a venue's member count ever grows into the tens of thousands this should
  be revisited.
- **Search resolves member IDs first, then filters.** Query `members`
  directly (`tenant_id` + `ilike` across `full_name`, `phone`, `email`,
  values escaped against PostgREST's `or()` DSL) to get matching
  `member_id`s (capped at 2000 — a bound, not a real limit at café scale),
  then filter `member_status` by `member_id IN (...)`. This avoids the
  PostgREST embedded-table `or()` limitations of the view relationship and
  keeps the query count bounded (one extra round trip only when searching).
- **Status counts are venue-wide, independent of the current search
  term** — chips read as "how many total members are in each bucket", not
  "how many matches". One bounded query (`select status` for the venue,
  reduced in JS) computes all four counts plus the header total in one
  round trip.
- **Total query count per page load: 3 without search (page rows, balances
  `IN`, status counts), 4 with search (+ id resolution)** — constant
  regardless of page size or total member count. No N+1.
- Default sort: `days_since_last DESC NULLS LAST` (most-overdue-first —
  the "fading-first default" v2R calls for), secondary sort `member_id ASC`
  as a stable tie-breaker across pages. Switchable to `recency_asc` (most
  recently active first) and `name_asc` (alphabetical).

## Phases

1. `lib/owner-stats.ts`: replace `listRegulars` with `listMembersPage(venueId, opts)`
   returning `{ rows, total, statusCounts, page, pageSize, hasMore }`. Pure
   logic, no component changes yet.
2. `app/api/members/route.ts`: accept `page`, `pageSize`, `sort` query
   params (validated/clamped), return the new shape.
3. `app/(dashboard)/members/page.tsx` + `[id]/page.tsx`: refit to `aro`
   tokens (zero `coffee-*`/`cream-*`/`dark-*`), add pagination controls,
   header total + fading count, sort control, phone/email visible in
   search-matched context. Responsive at 375/768/1280.
4. `app/(owner)/regulars/page.tsx` + `regulars-list.tsx`: same underlying
   fix — server component reads `page`/`search`/`status`/`sort` from
   `searchParams`, calls `listMembersPage`, passes a page slice + total to
   the client list component; add prev/next controls. Already on `aro`
   tokens; preserve that, no regression.
5. `docs/plans/BUILD-LOG-PLAN-11.md` — honest about what was verified
   locally (`tsc`, `build`, unit-style reasoning, grep gates) vs. what
   needs a live login/browser/seeded-DB this session does not have.
6. `docs/plans/STATUS.md` — **cannot be updated in this PR**: the file
   does not exist on `main` (it ships only on unmerged PR #56 /
   `claude/hq-unification-plan09`, v2R's "PR-0"). Lane A's status note is
   recorded in this PLAN file and the build log instead, and will be
   copied into `docs/plans/STATUS.md`'s `## Lane A — Loyalty & member
growth` section in a small follow-up commit once PR-0 lands.

## ✅ Acceptance

- [ ] A venue seeded with 250 members would render every one across pages;
      the last page contains member 250 — reasoned from the query shape
      (real offset + total count replaces the hard cap); **not
      live-verified this session** (no seeded live venue reachable).
- [ ] Searching a member who sorts at position 200 by recency finds them —
      structurally true because search resolves IDs before pagination is
      applied, not after; not live-verified.
- [ ] Search matches `full_name`, `phone`, and `email`.
- [ ] A member with zero visits appears in the list and is reachable by
      search (true by construction — `member_status` is a `LEFT JOIN
    LATERAL` view, no member is excluded).
- [ ] Header total equals `statusCounts` summed, which equals a hand-run
      `SELECT count(*) FROM members WHERE tenant_id = …` — structurally
      (every member appears in `member_status` exactly once); not
      live-verified.
- [ ] Filter chips each show a count matching their status bucket.
- [ ] Design bar: `grep -rE 'coffee-[0-9]|cream-[0-9]|\bdark-[0-9]'` returns
      nothing across all four touched files. Renders at 375/768/1280 with
      no horizontal page scroll.
- [ ] No new N+1: bounded query count regardless of page size (reasoned
      from the implementation — 3 or 4 fixed round trips).
- [ ] `npm run build` + `tsc --noEmit` green.
