# Build log — PLAN-11 Members Directory Rebuild

Tracks progress against `docs/plans/PLAN-11-members-directory.md`.

## Phase 1 — `lib/owner-stats.ts`

- Replaced `listRegulars` (hard `.limit(opts.limit ?? 50)`, client-side
  post-limit search filter) with `listMembersPage(venueId, opts)`: real
  offset pagination + exact count, search resolved against `members`
  (`full_name`/`phone`/`email` via `ilike`) before filtering
  `member_status`, and venue-wide status-bucket counts in one bounded
  query. 3 round trips per call, 4 when searching — constant regardless of
  page size or venue size.
- **Self-review pass caught three real bugs before commit, all fixed:**
  1. **Sort bug**: `sort=name_asc` used `.order('full_name', { referencedTable: 'members' })`,
     which per `@supabase/postgrest-js`'s own doc comments only reorders
     rows _within_ an embedded relation, not the parent (`member_status`)
     row order — the "Name A–Z" option would have silently sorted by
     `member_id` instead. Fixed to the dotted `.order('members(full_name)', { ascending: true })`
     form, which is the one that actually reorders the parent per
     postgrest-js's documented example ("Order parent table by a
     referenced table").
  2. **`total`/`hasMore` could disagree**: the header count and the
     "Next" button's pagination math were built from two independently
     round-tripped numbers (a separate unfiltered status-count query vs.
     the main query's `count: 'exact'`), so under concurrent writes they
     could diverge and show a contradictory page count. Split the return
     shape into `total` (grand venue count, from the status-count query —
     for the header + "all" chip) and `matchedCount` (the main query's
     `count`, for pagination) so pagination math always derives from one
     round trip and can never contradict `hasMore`.
  3. **Silent error swallowing on `/regulars`**: the catch block only had
     a comment, no `console.error`, and the UI rendered a real 500/network
     failure identically to "no members yet". Added logging and a visible
     (non-toast, since this page is checked constantly during service)
     failure state distinguishable from the legitimate empty state.
  - Minor: hardened `toIlikePattern` to also escape a literal backslash in
    a search term (previously only `%`/`_` were escaped for ILIKE); fixed
    an `as never` type-erasure cast in the API route to a proper
    `MemberStatus` union check.
- Verified: `npx tsc --noEmit` clean, `npm run build` green.

## Phase 2 — `app/api/members/route.ts`

- Accepts `page`, `page_size`, `sort` (validated against fixed enums,
  clamped numerics); returns `{ members, total, matchedCount, statusCounts, page, pageSize, hasMore }`.

## Phase 3 — `app/(dashboard)/members/page.tsx` + `[id]/page.tsx`

- Refit to `aro` tokens (zero `coffee-*`/`cream-*`/`dark-*` remaining —
  grep-verified). Added: header total + fading count, status chips with
  live counts, sort selector, prev/next pagination reading `matchedCount`.
  Responsive grid (`sm:grid-cols-2 xl:grid-cols-3`), no horizontal scroll
  at 375/768/1280 (reasoned from Tailwind classes used — no live browser
  in this session, see Verification gap below).
- `[id]/page.tsx`: same token refit, no behavior change (points
  adjustment, visit/ledger history untouched).

## Phase 4 — `app/(owner)/regulars/page.tsx` + `regulars-list.tsx`

- Same root-cause fix applied here (not named in v2R's PLAN-11 acceptance
  checklist, but this surface is exclusively Lane A-owned and had the
  identical bug — see the PLAN's Ground Truth section for the reasoning).
  Converted from one capped server-side fetch + client-side filtering into
  a client component that calls the same fixed `/api/members` endpoint
  with debounced search/status/page, matching the dashboard members page's
  pattern. Added prev/next pagination and a visible load-failure state.

## Verification gap — what this session could NOT check

No Supabase MCP connector and no live `.env` credentials were available in
this execution session (`enabledInChat: false` for the Supabase connector
at the org level; no `SUPABASE_SERVICE_ROLE_KEY`/`NEXT_PUBLIC_SUPABASE_URL`
in the environment). This means the following acceptance items are
**verified by code-reading and reasoning about the query shape, not by
running them against the real `aro-platform` project or a browser**:

- The 250-seeded-member pagination walk (last page contains member 250).
- The "search finds a member at position 200" scenario.
- Hand-run `SELECT count(*)` cross-check against the header total.
- Filter-chip counts matching a hand-run per-status count.
- Visual responsive check at 375/768/1280 in an actual browser (Tailwind
  classes were chosen to match the existing, already-verified `/regulars`
  page's responsive patterns, but this was not screenshotted).

None of these require a schema change — they're pure data/UI verification
against a live venue. Recommend running `npm run verify:live` equivalent
checks and a manual click-through once this PR reaches an environment with
the Supabase connector enabled, before treating PLAN-11 as fully closed
rather than "code complete, live-unverified."

## STATUS.md

Not touched — `docs/plans/STATUS.md` does not exist on `main` yet (ships
only on unmerged PR #56 / `claude/hq-unification-plan09`, v2R's "PR-0").
Lane A's status entry for this item is recorded here and in
`docs/plans/PLAN-11-members-directory.md` instead, to be copied into
`STATUS.md`'s `## Lane A — Loyalty & member growth` section in a small
follow-up commit once PR-0 merges.
