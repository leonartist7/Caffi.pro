# BUILD-LOG — PLAN-37 (Hours + tips CSV export)

Branch `sonnet/lane-c-plan37-csv-export`. Zero migrations, zero new
tables. Built on top of PLAN-36's branch (merged in locally) so
`lib/tips/report.ts` resolves for a real typecheck/build against the row
shape this item consumes — see the STATUS.md note on why that merge is
in this branch's history until PR #74 lands on `main`.

## What shipped

- `lib/csv.ts` — the export's own primitives, independent of any
  Supabase import:
  - `escapeCsvField` / `csvRow`: RFC 4180 quote-wrap + doubled embedded
    quotes, triggered by a comma, quote, or newline in the field.
  - `buildCsv(header, rows)`: joins header + data rows with `\r\n`,
    prefixed with a UTF-8 BOM (`﻿`) for Excel compatibility with
    non-ASCII staff names.
  - `centsToDecimalString` / `minutesToHoursDecimalString`: integer-only
    conversions (`(abs - abs % 100) / 100` on an already-100-aligned
    value — exact, not a float division subject to drift), per the
    ground-truth doc's own pseudocode.
- `app/api/tips/export/route.ts` — `GET`, owner-only
  (`requireVenueRole(venueId, ['owner'])`, same gate as PLAN-36's report
  route). Same query-param contract as `/api/tips/allocation` (`basis`,
  `include_owner_manager` — no default, a missing value is a 400 —
  `period_start`/`period_end`, `manual_weights` for the manual basis).
  Calls `runTipReport()` directly; on `ok:true` builds and streams the
  CSV, on a refusal returns the same JSON error shape the report route
  uses. Reads `venues.slug` for the filename (confirmed live `NOT NULL`,
  so no fallback branch needed) and falls back to the venue id only if
  the row lookup itself fails.
- `app/(dashboard)/tips/page.tsx` — an "Export CSV" link next to "Save
  this allocation" in the results header, built from the same
  `buildParams()` the page already uses for the report fetch (so the
  export always reflects the exact period/basis/include-choice/manual-
  weights currently on screen) pointed at `/api/tips/export` — a plain
  `<a href>` rather than a fetch+blob dance, since the route responds
  with `Content-Disposition: attachment` and the browser's existing
  session cookie authenticates it; no client-side CSV assembly at all.
- `lib/events.ts` — `report.exported` added to the Lane C append block
  (alongside PLAN-36's `tip_allocation.saved`), emitted server-side from
  the export route with `report`, `basis`, `period_start`/`period_end`,
  `include_owner_manager`, and `row_count` in the payload — the audit
  trail the ground-truth doc requires for compensation data leaving the
  system.

## CSV shape (the "columns documented" acceptance line)

One row per `TipReportRow`, in this order:

| Column                 | Source                             | Format                                           |
| ---------------------- | ---------------------------------- | ------------------------------------------------ |
| `staff_name`           | `row.fullName ?? row.membershipId` | free text, RFC 4180-escaped                      |
| `role`                 | `row.role`                         | free text                                        |
| `shift_id`             | `row.shiftId`                      | uuid                                             |
| `shift_start`          | `row.startedAt`                    | ISO 8601                                         |
| `shift_end`            | `row.endedAt`                      | ISO 8601                                         |
| `hours`                | `row.countedMinutes`               | decimal string via `minutesToHoursDecimalString` |
| `tip_amount`           | `row.tipCents`                     | decimal string via `centsToDecimalString`        |
| `basis`                | request `basis`                    | `hours` / `equal` / `manual`                     |
| `owner_manager_shifts` | request `include_owner_manager`    | `included` / `excluded`                          |

Every value is read straight off the row `runTipReport()` returns —
nothing is re-derived — so "matches the PLAN-36 report exactly, row for
row" holds by construction. A trailing line after the data rows (its own
CSV row, RFC 4180-escaped) restates the pool total, period, and the
owner/manager choice, and carries the "calculation aid, not a payroll
record" notice into the file itself, not only the report page — the
per-row `owner_manager_shifts` column and this trailing line both record
that choice, satisfying the requirement twice over rather than by
accident.

## Verified

- `npx tsc --noEmit`, `npx eslint`, `npm run build` — all green with
  PLAN-36 merged in; `/api/tips/export` registers as a route.
- `verify-csv.mjs` (ad hoc via `npx tsx`, no test framework in this
  repo, matching PLAN-36's own approach):
  - `centsToDecimalString`: the acceptance line's own named cases
    (`10.10`, whole dollars, zero, sub-dollar, negative, the `$100/3`
    remainder amount) plus an exhaustive round-trip check over
    `[-500000, 500000]` cents (step 7) — every value formats to
    `-?\d+\.\d{2}` and reconstructs to the exact original integer. No
    float artifact anywhere in that range.
  - `minutesToHoursDecimalString`: named cases (`90min → 1.50`,
    `60min → 1.00`, `59min → 0.98`) plus a format check over
    `[0, 600]` minutes.
  - `escapeCsvField`: plain field passes through unquoted; a comma, an
    embedded quote (doubled + wrapped), and an embedded newline each
    trigger correct quoting; non-ASCII (`José`) passes through
    unescaped — the BOM handles encoding, not this function.
  - `buildCsv`: BOM is the literal first character; a zero-row call
    produces a header-only, non-zero-byte CSV (the "empty period"
    acceptance line); a data row containing a comma round-trips through
    quoting correctly.
- Live schema check (Supabase MCP `execute_sql`, `aro-platform`):
  confirmed `venues.venue_id` (not `tenant_id` — this repo's `venues`
  table uses `venue_id` as its own PK column name, unlike the
  legacy-renamed tables that kept `tenant_id`) is the correct join key,
  `slug` is `text NOT NULL`, `currency` is `text` nullable. Caught before
  shipping: an initial draft of the export route queried `venues` by
  `tenant_id`, which doesn't exist on that table — every other
  `venues`-querying route in the codebase (`review-settings`,
  `kitchen-settings`, `activity`, etc.) uses `venue_id`, confirmed by
  grep before the live check settled it.

## Honest gaps

- No live browser click-through of the "Export CSV" link or a real
  downloaded-file inspection in a spreadsheet app — not possible in this
  sandbox (no populated service-role key for a live login session). The
  CSV bytes themselves are verified directly (BOM, escaping, decimal
  exactness); watching Excel/Sheets actually open the file is not the
  same as that.
- The currency gap PLAN-36's build log flagged (`formatCents()`'s CAD
  default vs. the venue's configured currency) is unchanged by this PR —
  it's a display-page concern, and the CSV never renders a currency
  symbol at all (bare decimal strings, by the acceptance line's own
  requirement), so it doesn't apply here. Still owed as PLAN-36's
  follow-up.
- Owner-only denial for `manager`/`staff` roles on the export route is
  verified by code-reading (identical `requireVenueRole(['owner'])` call
  PLAN-36's already-tested report route uses, no new authorization
  logic), not a live multi-role click-through, for the same sandbox
  reason as PLAN-36.
