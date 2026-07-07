# aro Platform Audit & Rebuild Pack (2026-07-07)

Read in this order:

1. **GAP-TABLE.md** — every feature vs the Blueprint: works / broken / mocked /
   absent, root causes (incl. why Supabase never connected), security findings.
2. **ARCHITECTURE.md** — target stack, schema evolution, RLS design, route map,
   full env-key table, deploy plan.
3. **REBUILD-PLAN.md** — phase-by-phase execution instructions for the building
   model (Phases 2–5, exit criteria, dependency notes).
4. **BEFORE-GALLERY.md** — screenshots of every route as found (`before/`).
5. **IDEAS.md** — last, separate: improvements beyond the agreed plan.

Spec yardstick: `docs/ARO-PLATFORM-BLUEPRINT.md` in the AURA repo (branch with
this same name), plus `AURA-MASTER-STRATEGY.md` and `AURA-COPY-BANK.md`.

Phase 0 log: fresh clone → `npm install` → `npm run build` → **zero fixes
required** (strict TS + ESLint pass). `npm start` serves all routes; capture
harness: `shots.js` (run with `node shots.js docs/audit/after/phase-N`).
