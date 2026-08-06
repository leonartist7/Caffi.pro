# BUILD-LOG-PLAN-32 — HQ aro refit, part 2: dashboard/clients/activity/analytics

## What shipped

Style-only token refit of the 4 HQ pages v2R names. Full token map and
design rationale in `PLAN-32-hq-refit-pages.md`.

## Verified here

- `grep -rnE 'coffee-[0-9]|cream-[0-9]|\bdark-[0-9]'` across all 4 files —
  zero hits.
- Full diff reviewed with a filter that strips every className/style/
  hex-prop/text-content line — nothing structural remained (confirmed by
  grepping the diff for anything outside those categories before commit;
  the only residual matches were text content lines that shifted position
  because removing a multi-class gradient-text wrapper let prettier
  collapse a 3-line JSX element to one line — not a content change).
- `npx tsc --noEmit` — clean (`.next` cleared first, same stale-cache
  reason as PLAN-31).
- `npx eslint` — clean on all 4 files.
- `npm run build` — clean.
- **Contrast bug caught before it shipped**, not after: a first pass at
  `dashboard/page.tsx`'s "New leads" tile used `bg-aro-plum/10
text-aro-plum` uniformly. Measured with the same Node script from the
  PLAN-31 correction _before_ committing — 4.03:1, fails AA. Fixed by
  keeping the icon plum (graphical, 3:1 threshold, passes) and switching
  the label/number to `text-aro-ink` (14.24:1) before this file was ever
  staged.
- `clients/page.tsx` and `activity/page.tsx`'s status/action badges reuse
  only pairings already measured and passing in PLAN-30/31
  (`bg-aro-sage`/`bg-aro-honey`/`bg-aro-rose` + `text-aro-ink`: 6.15–8.01:1;
  `bg-aro-sand` + `text-aro-ink-soft`: 6.63:1) — no new contrast math
  needed for those.

## NOT verified here

- No screenshot/DOM assertion at 375/768/1280 — same reasoning as
  PLAN-31 (no layout/spacing/breakpoint class touched on any of these 4
  files, only color/border tokens and chart color props) and the same
  sandbox limitation (no live Supabase service-role key for an
  authenticated click-through).
- Chart rendering itself (Recharts `LineChart`/`BarChart`/`PieChart` with
  the new color props) wasn't visually inspected in a browser — only
  confirmed the prop values are syntactically valid hex strings and that
  `tsc`/`build`/`eslint` don't flag anything.
