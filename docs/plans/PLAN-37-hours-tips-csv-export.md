# PLAN-37 — Hours + tips CSV export

Lane C, `MASTER-PLAN-v2R-remastered.md` §6. A CSV of hours and calculated
tip allocations for a period, for the owner to hand to their accountant or
payroll provider. **A report, not payroll** — which is exactly why it is
buildable while payroll is not.

> **Status: ground truth only.** The implementation is deliberately not
> started. PLAN-37's own acceptance line requires its values to match the
> PLAN-36 report "exactly, row for row", so it consumes PLAN-36's output
> contract directly. PLAN-36 (PR #74) is still awaiting its mandatory
> architect-tier math review; if that review changes the allocation
> output shape, building against the current contract would be wasted.
> The sections below are the parts that are independent of that outcome.

## Ground truth (verified by reading the codebase, before designing)

### The one existing CSV export is not a good precedent — do not copy it

`app/(dashboard)/analytics/page.tsx:98` (`handleExportCSV`) is the only CSV
generation anywhere in the repo. It has three deficiencies that PLAN-37's
own acceptance criteria explicitly rule out:

1. **No BOM.** `new Blob([csvContent], { type: 'text/csv' })` — Excel will
   misread any non-ASCII byte. PLAN-37 handles **staff names**, so an
   accented character (`José`, `Müller`) would render mojibake in the
   accountant's spreadsheet. v2R requires UTF-8 **with** a BOM for exactly
   this reason ("the difference between a working export and a support
   ticket").
2. **No field escaping.** It builds rows with a bare `row.join(',')`. A
   value containing a comma, double-quote, or newline silently corrupts
   the row structure. PLAN-37 emits `full_name`, which is free text a
   human typed — `"Smith, Jr."` alone breaks it. RFC 4180 quoting is
   mandatory here, not optional polish.
3. **Client-side generation.** Fine for four aggregate numbers; wrong for
   compensation data. PLAN-37 must be a server route so (a) the
   owner-only authorization is enforced server-side rather than by hiding
   a button, and (b) `report.exported` is emitted server-side as a real
   audit trail of compensation data leaving the system.

**Pre-existing bug flagged, deliberately not fixed here**: the analytics
export's missing escaping is a genuine (if low-severity) defect in a Lane
C-owned file. It is not fixed in this item because
`app/(dashboard)/analytics/page.tsx` is currently touched by PLAN-32
(PR #70, unmerged) — editing it from a second branch would create a
pointless conflict. Worth a small follow-up once #70 lands.

### What PLAN-36 provides (the contract this consumes)

`lib/tips/report.ts` already returns, per row: `shiftId`, `membershipId`,
`fullName`, `role`, `startedAt`, `endedAt`, `countedMinutes`, `tipCents` —
plus period-level `poolCents`, the excluded canceled/refunded amounts, and
the open-shift/overlap warnings. The export reuses `runTipReport()`
directly rather than re-querying or re-deriving anything, which is how
"values match row for row" is satisfied by construction rather than by two
implementations agreeing.

`role` is on every row because PLAN-36's escalated owner/manager question
resolved to "no default, always visible" — the export must carry it too,
along with which include/exclude choice produced the figures.

### Money and time formatting (integer-exact, no floats)

`lib/money.ts` has `formatCents()`, but it is **`Intl.NumberFormat`-based
and locale-aware** — it emits currency symbols and locale separators
(`$1,234.56`), which is display formatting, not CSV data. A CSV consumed
by a spreadsheet or payroll importer needs a bare decimal string.

So the export needs its own integer→decimal-string conversion, and v2R's
acceptance line is explicit that `10.10` must never render as `10.1` or
`10.100000001`. That rules out any float path:

```
centsToDecimalString(cents):  // integer arithmetic only
    sign  = cents < 0 ? '-' : ''
    abs   = Math.abs(cents)
    whole = (abs - abs % 100) / 100
    frac  = abs % 100
    return `${sign}${whole}.${String(frac).padStart(2, '0')}`
```

Same discipline for hours: `countedMinutes` → `H.HH` via integer division,
never `minutes / 60`.

### Known live-schema facts relevant here

- `venues.slug` is `text NOT NULL` — verified live. It is the natural
  filename component v2R asks for ("filename carries venue slug and
  period"), and being NOT NULL means no fallback branch is needed.
- **`venues.currency` exists** (`text`, nullable) — verified live, and
  this **corrects the characterization in PLAN-36's build log**. That log
  says the report falls back to `formatCents()`'s CAD default because
  `useTenant()`'s `Tenant` type carries no currency field. That is true of
  the _client_ context, but it understates how easy the fix is: the
  currency is already on the venue row the server reads anyway, so
  `runTipReport()` can select and return it with no client-context change
  at all. Folded into PLAN-36's follow-up rather than fixed from this
  branch, since `lib/tips/report.ts` is the file currently under
  architect-tier review.
- Because the column is nullable, any consumer still needs an explicit
  fallback rather than assuming a value is present.

## Acceptance (from the master plan, verbatim)

- [ ] CSV columns documented in the build log; values match the PLAN-36
      report exactly, row for row.
- [ ] Money as decimal strings, never floats; `10.10` never renders as
      `10.1` or `10.100000001`.
- [ ] Filename carries venue slug and period; content is UTF-8 with a BOM
      (Excel compatibility).
- [ ] Export is owner-only and emits `report.exported` with the period in
      the payload — an audit trail for compensation data leaving the
      system.
- [ ] Export of an empty period produces a valid CSV with headers, not a
      zero-byte file.
- [ ] **Design bar** (§2).

## Additions beyond the master plan's list

- [ ] Every field RFC 4180-escaped (quote-wrap + double any embedded
      quote) — non-negotiable given free-text staff names, and the
      specific thing the existing analytics export gets wrong.
- [ ] The "calculation aid, not a payroll record" notice appears in the
      export itself, not only on the report page — v2R requires it "in any
      export", and a CSV that outlives the browser session is exactly
      where a reader might otherwise mistake it for authoritative.
- [ ] The owner/manager include/exclude choice is recorded in the file.
