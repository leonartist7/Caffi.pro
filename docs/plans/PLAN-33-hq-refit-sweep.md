# PLAN-33 — HQ aro refit, part 3: settings/staff/rewards + repo-wide sweep

Lane C, `MASTER-PLAN-v2R-remastered.md` §6, executing v2 §N8. Last of three
sequential style-only PRs. Depends on PLAN-31/32 for the sweep to be
meaningful (see below).

## Ground truth (branch fresh off `main`)

- The 3 files v2R names: `app/(dashboard)/settings/page.tsx`,
  `staff/page.tsx`, `rewards/page.tsx`. All confirmed non-empty
  `coffee-*`/`cream-*`/`dark-*` hits before starting.
- **Real gap found during the sweep, not scheduled into any of
  PLAN-31/32/33's file lists**: `app/(dashboard)/layout-client.tsx` still
  had 2 legacy-token hits (`bg-gradient-to-br from-amber-50 ... dark:from-
dark-950 ...` on the shell wrapper, `border-coffee-200/50 dark:border-
dark-700` on the header). It's explicitly Lane C's file (owned per the
  lane's file list) and was in this document's own preflight inventory of
  "the 18 files PLAN-31/32/33 must touch" — but never actually got
  assigned to one of the three PRs' file lists. Caught by running the
  sweep, not by re-reading the inventory carefully enough beforehand.
  Fixed here rather than left for a fourth PR, since it's a 2-line,
  unambiguously style-only change and PLAN-33 is explicitly "the sweep."
- **Verifying the sweep required a temporary local merge.** PLAN-31 and
  PLAN-32 are separate, still-unmerged PRs (each branched fresh off
  `main`, per the lane's own branching rule), so a repo-wide grep on a
  branch forked from `main` alone would still show every file _they_
  already refit as if it were unrefit — a false positive, not a real gap.
  Verified the true combined state by locally merging
  `origin/sonnet/lane-c-plan31-refit-components` and
  `origin/sonnet/lane-c-plan32-refit-hq-pages` into a scratch state,
  running the sweep there, then resetting back to a clean `PLAN-33`
  branch (`git reset --hard` to the pre-merge commit) before committing
  — the merge was verification-only and was never pushed. The real
  `layout-client.tsx` gap above was only visible in that combined state.

## Design

- `settings/page.tsx`, `staff/page.tsx`, `rewards/page.tsx`: full token
  swap per PLAN-31's established map. `staff/page.tsx` notably had _no_
  `dark:` variants to begin with (built later than the others) but still
  used numbered `coffee-*` classes and plain Tailwind `gray-*`/`blue-*` —
  both brought onto `aro` tokens for the same "premium, consistent"
  reason `SkeletonLoader.tsx` was in PLAN-31 (a refit page sitting next to
  already-refit cards shouldn't have a visibly different, generic-gray
  skeleton or info-card style).
- `rewards/page.tsx`'s `getRewardTypeColor` (3 reward types: `coupon`,
  `free_item`, `discount`) maps onto `aro-plum`/`aro-honey`/`aro-sage`
  respectively — a per-page semantic choice, not required to match
  PLAN-32's `activity/page.tsx` action-color mapping hue-for-hue (that
  page's 7-action mapping used plum/honey differently); each page's
  mapping is internally consistent and AA-safe on its own, cross-page hue
  parity is a possible future polish pass, not a requirement here.
- `staff/page.tsx`'s "Invited" status badge reuses `bg-aro-plum
text-white` (4.55:1, the same pairing already measured in PLAN-31's
  corrected table) rather than introducing a new pairing.
- "OUT OF STOCK" overlay badge (`rewards/page.tsx`) moves from
  `bg-red-600 text-white` to `bg-aro-rose text-aro-ink` — white-on-rose
  was already measured and rejected in PLAN-31 (2.61:1); ink-on-rose
  (6.15:1) is the established safe replacement, reused here rather than
  re-measured.
- `layout-client.tsx`: the shell background gradient
  (`from-amber-50 via-orange-50 to-yellow-50`, an off-token gradient that
  never used `coffee-*` naming but was never on-system either) becomes
  solid `bg-aro-cream`; the header's `dark:` variants are dropped per the
  established "aro has no dark mode" finding from PLAN-31.

## ✅ Acceptance

- [ ] `grep -rE 'coffee-[0-9]|cream-[0-9]|\bdark-[0-9]'` across the 4 files
      (3 named + `layout-client.tsx`) → nothing.
- [ ] **Repo-wide**: `grep -rE 'coffee-[0-9]|cream-[0-9]|\bdark-[0-9]' app
components --include=*.tsx`, run against the true combined state of
      PLAN-31 + PLAN-32 + PLAN-33 (not this branch alone, which doesn't
      contain the other two PRs) → returns **only**
      `app/shop/[slug]/error.tsx` (Lane B, explicitly excluded). Lane A's
      two members files (`app/(dashboard)/members/page.tsx`,
      `members/[id]/page.tsx`) are **already clean** — zero hits, not
      merely excused — confirming v2R's note that PLAN-11 already refit
      them.
- [ ] `git diff` contains no changes outside `className` string values and
      cosmetic line-wrap shifts (verified by reading the whole diff,
      filtered, before commit).
- [ ] `npm run build` + `tsc --noEmit` green.
