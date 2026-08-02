# PLAN-31 — HQ aro refit, part 1: shared components

Lane C, `MASTER-PLAN-v2R-remastered.md` §6, executing v2 §N8 (re-prioritized
per `STATUS.md`). First of three sequential style-only PRs. Components
first, deliberately — `Sidebar`/`MobileNav`/`StatCard`/etc. are imported by
the pages PLAN-32/33 refit next, so doing them first shrinks those diffs.

## Ground truth (branch fresh off `main`, PLAN-30 not required — no file overlap)

- Verified scope via `grep -rlE 'coffee-[0-9]|cream-[0-9]|\bdark-[0-9]'` on
  exactly the 11 files v2R names: `Sidebar.tsx`, `MobileNav.tsx`,
  `StatCard.tsx`, `SkeletonLoader.tsx`, `ThemeToggle.tsx`,
  `TenantSelector.tsx`, `ConfirmDialog.tsx`, `ComingSoon.tsx`,
  `LiveClock.tsx`, `app/error.tsx`, `app/(dashboard)/error.tsx`. All 11
  confirmed non-empty hits.
- **Confirmed by grep, not assumed**: zero files that already use any
  `aro-*` token class anywhere also use a `dark:` variant class. Every
  surface built on the aro system to date (Lane A/B's ~46 files) has
  dropped Tailwind's `dark:` variant entirely — the aro palette is a
  single warm cream/ink system, not a light/dark pair. This PR's refit
  follows that established precedent: `dark:*` classes are deleted, not
  translated to an `aro-dark-*` token that doesn't exist.
- `ThemeToggle.tsx`'s `useTheme()`/`toggleTheme()` logic is untouched (out
  of scope per the style-only constraint) — after this PR its click handler
  still flips theme context state, but nothing in an aro-token page
  responds to it, same as every other aro page today. Not a regression
  this PR introduces; a pre-existing consequence of the wider migration
  that predates Lane C.

## Token map applied (documented once, used consistently across all three refit PRs)

| Legacy                                                                                      | aro replacement                                               | Notes                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `coffee-50`/`cream-50`/`cream-100` (page bg)                                                | `aro-cream` / `aro-cream-warm`                                | Matches `owner-shell.tsx`'s existing split (page `bg-aro-cream`, chrome `bg-aro-cream-warm`).                                                                                      |
| `coffee-100`/`coffee-200` (borders)                                                         | `aro-hairline`                                                |                                                                                                                                                                                    |
| `coffee-100`/`coffee-200` (light fills)                                                     | `aro-sand`                                                    |                                                                                                                                                                                    |
| `coffee-300`/`coffee-400`                                                                   | `aro-clay` / `aro-muted`                                      |                                                                                                                                                                                    |
| `coffee-500`/`coffee-600`                                                                   | `aro-muted`                                                   |                                                                                                                                                                                    |
| `coffee-700`                                                                                | `aro-ink-soft`                                                |                                                                                                                                                                                    |
| `coffee-800`/`coffee-900`/`coffee-950`                                                      | `aro-ink`                                                     |                                                                                                                                                                                    |
| `cream-100`...`cream-500` (text on a colored/dark surface)                                  | `white` (on solid colored bg) or dropped (was dark-mode-only) | Matches the already-established `text-white` on `bg-aro-terra`/`bg-aro-plum` precedent in `owner-shell.tsx`.                                                                       |
| `bg-gradient-coffee`                                                                        | `bg-aro-terra` (solid)                                        | The system doesn't use brand gradients elsewhere; solid fills are the precedent (`owner-shell.tsx`, `regulars-list.tsx`).                                                          |
| `from-coffee-700 to-mocha` gradient-text wordmark                                           | solid `text-aro-ink`                                          | Gradient text is dropped for the same reason; wordmark text content is unchanged (content isn't a className — out of scope for a style-only PR).                                   |
| `bg-gray-200`/`border-gray-200`/`divide-gray-200` (generic Tailwind gray, `SkeletonLoader`) | `bg-aro-sand` / `border-aro-hairline` / `divide-aro-hairline` | Not `coffee-*` literally, but a skeleton that doesn't match the card surfaces it sits inside (`bg-white border-aro-hairline`) fails the design bar's "premium, consistent" clause. |
| `text-yellow-400` (Sun icon) / `text-indigo-600` (Moon icon)                                | `text-aro-saffron` / `text-aro-plum`                          | On-token equivalents already in the palette for a warm/cool icon pair.                                                                                                             |
| `bg-red-100`/`text-red-700` (negative trend, error banners)                                 | solid `bg-aro-rose` + `text-aro-ink`                          | See contrast table below — white-on-rose fails AA (2.6:1); ink-on-rose passes (6.1:1).                                                                                             |
| `bg-green-100`/`text-green-700` (positive trend)                                            | solid `bg-aro-sage` + `text-aro-ink`                          | Ink-on-sage passes AA (6.5:1) — see table.                                                                                                                                         |

## Design (files, each style-only: className values only, zero logic/prop/JSX-structure changes)

- `components/Sidebar.tsx`, `components/MobileNav.tsx`: full token swap per
  the map above; `dark:` variants and the `custom-scrollbar` dark-mode
  block in `Sidebar.tsx`'s `<style jsx>` deleted (scrollbar color moves to
  a single aro-toned thumb, no light/dark branch).
- `components/StatCard.tsx`: token swap; `iconBgColor` default prop value
  restyled from a coffee gradient to an aro-toned wash
  (`bg-aro-terracotta/15`); trend badges move to the solid rose/sage + ink
  pairing above.
- `components/SkeletonLoader.tsx`: `bg-gray-200` → `bg-aro-sand`,
  `border-gray-200`/`divide-gray-200` → `aro-hairline`, `dark:` deleted
  throughout all eight exported skeleton variants.
- `components/ThemeToggle.tsx`: className only — icon colors move to
  saffron/plum, background/border move to aro tokens, `dark:` deleted.
  Hook/handler untouched.
- `components/TenantSelector.tsx`: full token swap across button, portal
  dropdown, list rows, empty state, and footer — same map, `dark:` deleted.
- `components/ConfirmDialog.tsx`: token swap; the three `variant` color
  sets (`danger`/`warning`/`info`) move off raw Tailwind red/orange/blue
  onto `aro-rose`/`aro-honey`/`aro-plum` respectively, keeping the
  three-way semantic distinction the component's own logic (untouched)
  already switches on.
- `components/ComingSoon.tsx`: token swap on the icon tile and text.
- `components/LiveClock.tsx`: token swap; the "Brew Excellence Daily ☕"
  copy is unchanged (content, not a class).
- `app/error.tsx`, `app/(dashboard)/error.tsx`: token swap on both error
  boundaries, including the dev-only error detail panel (kept on a rose
  tint rather than raw red for the same reason as the trend badges).

## Non-goals

- No behavior, prop, or JSX-structure change anywhere in this PR — verified
  by re-reading the full diff before commit (§7 standing gate).
- Not touching any file outside the 11 named above — `Coffee`/`Menu` icon
  _imports_ that become unused after the token/wordmark restyle are removed
  (import cleanup is mechanical, not a logic change), but no other file is
  touched.
- Not fixing `ThemeToggle`'s now-fully-decorative-on-aro-pages behavior —
  flagged, not this PR's problem to solve (that's a product decision about
  whether dark mode is retired outright, owned by whoever chartered the aro
  migration, not a style-only refit PR).

## Contrast table (measured, WCAG 2.1 AA — relative luminance per the W3C

formula, computed from the exact hex values in `tailwind.config.ts`)

| Pair                                                              | Foreground L | Background L | Ratio      | AA (4.5:1 normal text)?                                                       |
| ----------------------------------------------------------------- | ------------ | ------------ | ---------- | ----------------------------------------------------------------------------- |
| `text-aro-ink` (#2A1F18) on solid `bg-aro-rose` (#DC8B7E)         | 0.0154       | 0.3519       | **6.15:1** | ✅ Pass                                                                       |
| `text-aro-ink` (#2A1F18) on solid `bg-aro-sage` (#9DAA7E)         | 0.0154       | 0.3744       | **6.49:1** | ✅ Pass                                                                       |
| `text-white` on solid `bg-aro-rose` (#DC8B7E) — rejected          | 1.0          | 0.3519       | 2.61:1     | ❌ Fail — not used                                                            |
| `text-aro-ink` on `bg-aro-honey` (#E8AC58, ConfirmDialog warning) | 0.0154       | 0.4870       | **8.34:1** | ✅ Pass                                                                       |
| `text-white` on `bg-aro-plum` (#8D6B8D, ConfirmDialog info)       | 1.0          | 0.1414       | **5.51:1** | ✅ Pass — already in production use (impersonation banner, `owner-shell.tsx`) |

Icon-only (non-text) elements against a light tint background (e.g. an
alert icon on `bg-aro-rose/15`) are graphical, not text — WCAG 1.4.11's
3:1 non-text threshold applies, comfortably met by a saturated
`text-aro-rose` icon against a pale tint of the same hue; not separately
tabulated above since it isn't a text pair.

## ✅ Acceptance

- [ ] `grep -rE 'coffee-[0-9]|cream-[0-9]|\bdark-[0-9]'` across the 11 files
      → nothing.
- [ ] `git diff` for this PR contains no changes outside `className`
      string values, unused-import removal, and the token map — verified
      by reading the whole diff before commit.
- [ ] Contrast table above recorded (this file + build log).
- [ ] Every refitted component renders correctly at 375/768/1280 — no new
      horizontal scroll.
- [ ] `npm run build` + `tsc --noEmit` green; smoke behaviour (nav
      open/close, theme toggle click, confirm dialog open/close, skeleton
      render) unchanged.
