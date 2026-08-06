# BUILD-LOG-PLAN-31 — HQ aro refit, part 1: shared components

## Post-review correction (found while working PLAN-32)

The "Soon" badge pairing this PR shipped for `Sidebar.tsx`/`MobileNav.tsx`
(`bg-aro-sand` + `text-aro-muted`) measured **4.38:1** via a precise script
— under the 4.5:1 WCAG AA floor for normal-size text (the PLAN file's
contrast table above only tabulated the _new_ rose/sage/honey/plum pairs
this PR introduced; this pre-existing pairing, copied verbatim from the
pre-refit `Sidebar.tsx`, wasn't re-measured against its new `aro-sand`
background at the time). Fixed by swapping to `text-aro-ink-soft`
(6.63:1). Same fix applied to `owner-shell.tsx` in PLAN-30, which shipped
the identical pairing.

## What shipped

Style-only token refit of the 11 files v2R names: `components/Sidebar.tsx`,
`MobileNav.tsx`, `StatCard.tsx`, `SkeletonLoader.tsx`, `ThemeToggle.tsx`,
`TenantSelector.tsx`, `ConfirmDialog.tsx`, `ComingSoon.tsx`, `LiveClock.tsx`,
`app/error.tsx`, `app/(dashboard)/error.tsx`. Full token map is in
`PLAN-31-hq-refit-shared-components.md`.

## Verified here

- `grep -rnE 'coffee-[0-9]|cream-[0-9]|\bdark-[0-9]'` across all 11 files —
  zero hits.
- Full diff read end-to-end before commit: every changed line is a
  `className` string value, a `<style jsx>` CSS value, an `iconBgColor`
  default prop _value_ (still just a string, not a prop signature change),
  or an unused-icon-import removal (`Sun`/`Moon` icons in `Sidebar.tsx` were
  already imported and stayed; no import was actually dropped in the end —
  `Coffee` stayed too, since the brand mark icon itself is unchanged, only
  its surrounding classes). No hook, handler, conditional, or JSX element
  was added/removed/reordered.
- `npx tsc --noEmit` — clean (had to `rm -rf .next` first; a stale
  `.next/types` cache from the PLAN-30 branch referenced routes that don't
  exist on this fresh-off-`main` branch and produced false `TS2307`
  errors — not a real type error, a build-cache artifact from switching
  branches in the same sandbox).
- `npx eslint` — clean on all 11 files.
- `npm run build` — clean.
- Contrast for every new text/background pair introduced — measured via
  the W3C relative-luminance formula against the exact hex values in
  `tailwind.config.ts`, table in the PLAN file. All five pairs pass WCAG AA
  (4.5:1); one candidate pairing (white text on solid `aro-rose`, 2.61:1)
  was tried and rejected in favor of `aro-ink` text on the same background
  (6.15:1) before it ever reached a component.

## Design decision, stated plainly: dark mode is fully retired on any aro-token surface

Confirmed by grep before writing a single line: **zero** of the ~46 files
already on the aro token system anywhere in the repo use a `dark:` variant
class. The aro palette (`tailwind.config.ts`) has no dark counterpart to
`aro-cream`/`aro-ink` — it's one warm palette, not a light/dark pair. This
PR's refit follows that established precedent exactly: every `dark:` class
across all 11 files is deleted, not translated.

**Consequence, not fixed here (out of a style-only PR's scope):**
`ThemeToggle.tsx`'s `useTheme()`/`toggleTheme()` hook and click handler are
completely untouched — the component still flips theme context state on
click — but after this PR, zero pixels on an aro-token page respond to that
state change (they never did on any _other_ already-refit page either; this
PR doesn't introduce the gap, it just extends the existing one to three more
files). Whether to retire `ThemeContext` outright, or build a genuine
`aro-dark-*` token set, is a product decision above a style-only refit PR —
flagged in STATUS.md for whoever owns that call.

## NOT verified here

- No screenshot/DOM assertion at 375/768/1280 — none of these 11 files
  changed layout classes (flex/grid/spacing/breakpoint utilities), only
  color/border/shadow tokens, so the existing responsive behavior is
  structurally unchanged. Confirmed by the diff review above (no layout
  utility class appears in any hunk), not by a rendered screenshot — this
  sandbox has no live Supabase service-role key (same gap as PLAN-30's
  build log), so an authenticated click-through wasn't possible.
