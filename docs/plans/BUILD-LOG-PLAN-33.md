# BUILD-LOG-PLAN-33 — HQ aro refit, part 3: settings/staff/rewards + sweep

## What shipped

Style-only token refit of the 3 pages v2R names plus
`app/(dashboard)/layout-client.tsx` (a real gap the sweep found — see
`PLAN-33-hq-refit-sweep.md`). This is the last of the three sequential
refit PRs; PLAN-31/32/33 together take the HQ dashboard shell off
`coffee-*`/`cream-*`/`dark-*` entirely except Lane B's
`app/shop/[slug]/error.tsx`.

## Verified here

- `grep -rnE 'coffee-[0-9]|cream-[0-9]|\bdark-[0-9]'` across all 4 files —
  zero hits.
- **Repo-wide sweep, verified against the true combined state.** PLAN-31
  and PLAN-32 are both still-open, unmerged PRs; a sweep on a branch
  forked from `main` alone would falsely flag every file they already
  fixed. Verified properly: locally merged
  `origin/sonnet/lane-c-plan31-refit-components` and
  `origin/sonnet/lane-c-plan32-refit-hq-pages` into a scratch commit
  (resolved the STATUS.md conflict arbitrarily since the merge was
  never going to be pushed), ran the sweep there, found the real
  `layout-client.tsx` gap, fixed it, re-ran the sweep clean, then
  `git reset --hard` back to the pre-merge commit and re-applied only
  this PR's 4 files before committing. The verification merge was never
  pushed and touches nothing in the final commit.
- Final repo-wide result: `grep -rE 'coffee-[0-9]|cream-[0-9]|\bdark-[0-9]'
app components --include=*.tsx` (combined state) → **only**
  `app/shop/[slug]/error.tsx` (Lane B, expected and excluded per v2R).
  Lane A's `app/(dashboard)/members/page.tsx` and `members/[id]/page.tsx`
  returned **zero** hits — already refit by PLAN-11, not merely excused.
- Full diff reviewed with the same className/style/text-content filter
  used in PLAN-31/32 — nothing structural remained.
- `npx tsc --noEmit` — clean (`.next` cleared first).
- `npx eslint` — clean on all 4 files.
- `npm run build` — clean.
- Every new contrast pairing in this PR reuses one already measured and
  passing in PLAN-30/31 (`bg-aro-plum text-white`: 4.55:1;
  `bg-aro-rose text-aro-ink`: 6.15:1; etc.) — no new pairing needed fresh
  measurement.

## NOT verified here

- No screenshot/DOM assertion — same reasoning and same sandbox
  limitation as PLAN-31/32 (no live Supabase service-role key for an
  authenticated click-through; no layout/spacing/breakpoint class was
  touched on any of the 4 files).

## This closes out the N8 HQ refit (PLAN-31/32/33)

Combined across all three PRs: 18 files refit
(11 shared components + 8 pages, including the `layout-client.tsx` gap
found here), zero `coffee-*`/`cream-*`/`dark-*` remaining repo-wide except
Lane B's one file, three real accessibility bugs found and fixed
(the Soon-badge contrast failure in both PLAN-30 and PLAN-31, and a
would-have-shipped failure caught before commit in PLAN-32), and two
hand-calculation transcription errors corrected after switching to a
verification script.
