/**
 * PLAN-14 — pure calendar arithmetic for birthday/anniversary issuance.
 * Zero Supabase imports, zero cron/DB knowledge: given "now" and a venue's
 * IANA timezone, answers "what calendar date is it there right now" and
 * "does this month/day match today, accounting for Feb 29 in a non-leap
 * year." Kept separate from the issuance call site so the date-boundary
 * math (the exact bug class v2 §N3 names — a timezone-naive job firing on
 * the wrong local day) is unit-testable without a database or a clock.
 */

export interface VenueLocalDate {
  year: number
  month: number // 1-12
  day: number // 1-31
}

/** "What day is it, in this venue's own timezone, right now" — never the
 * server's UTC day, which can be a different calendar date entirely near
 * midnight. Uses Intl's timezone database rather than a fixed offset, so
 * DST transitions are handled by the platform, not reimplemented here. */
export function venueLocalDate(now: Date, timezone: string): VenueLocalDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day') }
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** Month 1-12, day 1-31, and the day must actually exist in that month
 * (rejects Feb 30, Apr 31, ...). Feb 29 is accepted — it's a real
 * calendar day, just not one that exists every year; the non-leap-year
 * fallback lives in `occursOn`, not here. */
export function isValidCalendarDay(month: number, day: number): boolean {
  if (!Number.isInteger(month) || month < 1 || month > 12) return false
  if (!Number.isInteger(day) || day < 1) return false
  return day <= DAYS_IN_MONTH[month - 1]
}

/** Does a recorded month/day (birthday, or a join-date anniversary)
 * occur on this venue-local date? A Feb 29 anniversary/birthday is
 * treated as occurring on Feb 28 in a year that has no Feb 29 — chosen
 * explicitly (v2R's own acceptance line: "pick Feb 28 and state the
 * choice"), not left to silently never fire three years out of four. */
export function occursOn(month: number, day: number, today: VenueLocalDate): boolean {
  if (month === 2 && day === 29 && !isLeapYear(today.year)) {
    return today.month === 2 && today.day === 28
  }
  return today.month === month && today.day === day
}
