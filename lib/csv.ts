/**
 * RFC 4180 CSV encoding, integer-exact money/duration decimal strings, and
 * a UTF-8 BOM prefix. No float path anywhere — a spreadsheet or payroll
 * importer reading this file gets exactly the cents/minutes the caller
 * gives it, never a rounding artifact.
 */

const BOM = '﻿'

// A field starting with one of these is interpreted as a formula by
// Excel/Sheets/LibreOffice when the file is opened, not just displayed as
// text — OWASP's CSV-injection neutralization. `staff_name` is owner/
// manager-editable (app/api/staff/[id]/route.ts), so a manager account is
// enough to reach this; prefixing a bare `'` forces spreadsheet software
// to render the value literally without changing what a CSV parser reads.
const FORMULA_PREFIX = /^[=+\-@\t\r]/

/** Quote-wraps and escapes a single CSV field per RFC 4180, and neutralizes
 * leading formula-trigger characters so a spreadsheet never executes a cell. */
export function escapeCsvField(value: string): string {
  const safe = FORMULA_PREFIX.test(value) ? `'${value}` : value
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`
  }
  return safe
}

/** One CSV row from already-stringified cell values. */
export function csvRow(cells: (string | number)[]): string {
  return cells.map(c => escapeCsvField(String(c))).join(',')
}

/** Joins a header row and data rows into a full CSV document with a leading UTF-8 BOM. */
export function buildCsv(header: string[], rows: (string | number)[][]): string {
  const lines = [csvRow(header), ...rows.map(csvRow)]
  return BOM + lines.join('\r\n') + '\r\n'
}

/** Integer cents -> a bare decimal string ("1234" -> "12.34"), never a float division. */
export function centsToDecimalString(cents: number): string {
  if (!Number.isSafeInteger(cents))
    throw new Error('centsToDecimalString: cents must be a safe integer')
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const whole = (abs - (abs % 100)) / 100
  const frac = abs % 100
  return `${sign}${whole}.${String(frac).padStart(2, '0')}`
}

/** Integer minutes -> a bare decimal hours string ("90" -> "1.50"), never a float division. */
export function minutesToHoursDecimalString(minutes: number): string {
  if (!Number.isSafeInteger(minutes) || minutes < 0) {
    throw new Error('minutesToHoursDecimalString: minutes must be a non-negative safe integer')
  }
  const wholeHours = (minutes - (minutes % 60)) / 60
  const remainderMinutes = minutes % 60
  const hundredths = (remainderMinutes * 100 - ((remainderMinutes * 100) % 60)) / 60
  return `${wholeHours}.${String(hundredths).padStart(2, '0')}`
}
