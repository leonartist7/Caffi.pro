# PLAN-32 — HQ aro refit, part 2: dashboard/clients/activity/analytics

Lane C, `MASTER-PLAN-v2R-remastered.md` §6, executing v2 §N8. Second of
three sequential style-only PRs. Depends on PLAN-31 (the shared components
these 4 pages import — `ConfirmDialog` on the clients page — are already
refit).

## Ground truth (branch fresh off `main`)

- The 4 files v2R names: `app/(dashboard)/dashboard/page.tsx`,
  `clients/page.tsx`, `activity/page.tsx`, `analytics/page.tsx`. All
  confirmed non-empty `coffee-*`/`cream-*`/`dark-*` hits before starting.
- `analytics/page.tsx` charts via Recharts (`LineChart`/`BarChart`/
  `PieChart`), which renders raw SVG and takes color **props**
  (`stroke`/`fill`/`contentStyle`), not Tailwind classes — there is no
  `className`-only way to recolor a chart line. Treated as in-scope for
  this style-only PR on the same basis as `iconBgColor`'s default value in
  PLAN-31's `StatCard.tsx`: it's a style _value_, not a prop signature,
  logic branch, or JSX structural change. Every hex used is one of the
  aro palette's own values from `tailwind.config.ts`, not a new off-system
  color.
- Same token map as PLAN-31, extended for a handful of pairings these
  pages needed that didn't come up in the shared components: multi-color
  status pills (`clients` subscription status, `activity` action types)
  and KPI-card accent icons (`analytics`).

## Design

- **Gradient-text headings** (`bg-gradient-to-r from-coffee-700 to-mocha
bg-clip-text text-transparent`) on all 4 pages → solid `font-display
text-aro-ink`, matching PLAN-31's precedent exactly.
- **`clients/page.tsx` status badges** (`getStatusColor`): `active` →
  solid `bg-aro-sage text-aro-ink`; `trial` → solid `bg-aro-honey
text-aro-ink`; `cancelled`/default → `bg-aro-sand text-aro-ink-soft`;
  `suspended` → solid `bg-aro-rose text-aro-ink`. All four pairs reuse
  ratios already measured and passing in PLAN-31/30 (6.15–8.01:1) —
  no new contrast math needed. Stat tiles use the same tinted-bg +
  `text-aro-ink` pattern established fixing the dashboard's "New leads"
  tile below.
- **`dashboard/page.tsx` "New leads" tile**: originally `bg-blue-50
text-blue-600` for both the label and the number. A first pass used
  `bg-aro-plum/10 text-aro-plum` uniformly and **failed AA on
  measurement** (4.03:1, computed with the same Node script used for the
  PLAN-31 correction, before it ever reached a commit) — fixed by keeping
  `aro-plum` on the icon only (graphical, 3:1 threshold, passes) and
  moving the label/number to `text-aro-ink` (14.24:1).
- **`activity/page.tsx`** has 7 action types (`create`/`update`/`delete`/
  `approve`/`suspend`/`resume`/`send`) needing distinct colors; the
  original only used 5 distinct hues (green/blue/red/yellow/purple, with
  `create`/`approve` sharing green and `update`/`resume` sharing blue).
  Mapped 1:1 onto 5 of the 6 aro accent tokens, preserving the original
  semantic groupings: sage (create/approve), plum (update/resume), rose
  (delete), saffron (suspend), honey (send) — `aro-terra` deliberately
  left unused here since it's the primary brand/CTA color elsewhere on
  the same page. Icon circles use a light tint + colored icon (graphical,
  3:1); text badges use the solid-fill + `aro-ink`/`white` pairing already
  measured safe.
- **`analytics/page.tsx`**: `STATUS_COLORS` (member status pie-chart
  segments) and the two chart series colors (member-growth line,
  visits bar) move from arbitrary hex to the aro palette's own hex values
  (documented inline in the file). KPI card icons get one aro accent each
  (plum/terra/sage/honey) instead of raw Tailwind purple/blue/green/coffee.

## Non-goals

- Not touching `app/api/analytics`, `app/api/activity`, or `app/api/clients`
  — this PR is presentation-only.
- Not adding a 6th distinct action color to `activity/page.tsx` by
  introducing an off-system hex — 5 aro accents cover the 5 distinct hues
  the original design actually used; `aro-terra` stays reserved for
  primary actions.

## ✅ Acceptance

- [ ] `grep -rE 'coffee-[0-9]|cream-[0-9]|\bdark-[0-9]'` across the 4 files
      → nothing.
- [ ] `git diff` contains no changes outside `className` string values,
      the documented Recharts color-prop values, and cosmetic line-wrap
      changes prettier made after those edits (verified by reading the
      full diff, filtering out every className/style/text-content line,
      before commit — nothing structural remained).
- [ ] Every new text/background pairing either reuses an already-measured
      pair from PLAN-30/31 or is freshly measured before use (the
      dashboard "New leads" tile fix).
- [ ] `npm run build` + `tsc --noEmit` green; smoke behaviour (date-range
      selector, CSV export, filters, tenant selection gating) unchanged.
