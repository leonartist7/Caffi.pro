/**
 * Pure helpers for reservation availability and venue-local wall-clock times.
 * No Supabase imports — safe for any server route that already loaded config.
 */

import { localParts } from '@/lib/owner-stats'

export type ReservationHours = Record<string, [string, string] | null> | null

export interface ReservationConfig {
  slot_minutes: number
  min_party: number
  max_party: number
  max_advance_days: number
  buffer_minutes: number
  default_duration_minutes: number
  hours: ReservationHours
}

export const DEFAULT_RESERVATION_CONFIG: ReservationConfig = {
  slot_minutes: 30,
  min_party: 1,
  max_party: 8,
  max_advance_days: 30,
  buffer_minutes: 15,
  default_duration_minutes: 90,
  hours: null,
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

export function parseReservationConfig(raw: unknown): ReservationConfig {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    slot_minutes: num(obj.slot_minutes, DEFAULT_RESERVATION_CONFIG.slot_minutes),
    min_party: num(obj.min_party, DEFAULT_RESERVATION_CONFIG.min_party),
    max_party: num(obj.max_party, DEFAULT_RESERVATION_CONFIG.max_party),
    max_advance_days: num(obj.max_advance_days, DEFAULT_RESERVATION_CONFIG.max_advance_days),
    buffer_minutes: num(obj.buffer_minutes, DEFAULT_RESERVATION_CONFIG.buffer_minutes),
    default_duration_minutes: num(
      obj.default_duration_minutes,
      DEFAULT_RESERVATION_CONFIG.default_duration_minutes
    ),
    hours: (obj.hours as ReservationHours) ?? null,
  }
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** Mon=1 … Sun=7 from localParts → mon..sun key. */
export function dayKeyFromWeekday(weekday: number): (typeof DAY_KEYS)[number] {
  // localParts: Mon=1 … Sun=7
  if (weekday === 7) return 'sun'
  return DAY_KEYS[weekday] // mon=1 → index 1
}

/**
 * Build the UTC instant for a venue-local calendar date + HH:MM wall clock.
 */
export function wallTimeToUtc(
  y: number,
  m: number,
  d: number,
  hh: number,
  mm: number,
  timeZone: string
): Date {
  // Same offset trick as mondayStartInTz in owner-stats: guess UTC, measure
  // what that instant reads as in the venue zone, subtract the delta.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const asUtcGuess = Date.UTC(y, m - 1, d, hh, mm, 0)
  const parts = fmt.formatToParts(new Date(asUtcGuess))
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0)
  const asLocalRead = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second')
  )
  const offsetMs = asLocalRead - asUtcGuess
  return new Date(asUtcGuess - offsetMs)
}

/**
 * Generate candidate slot start instants (ISO) for a venue-local calendar day.
 * Does not check table conflicts — caller filters those.
 * Returns { configured: false } when hours is null; empty slots when day closed.
 */
export function slotStartsForDay(opts: {
  dateYmd: string // YYYY-MM-DD venue-local
  timeZone: string
  config: ReservationConfig
  now?: Date
}): { configured: boolean; slots: Date[] } {
  const { dateYmd, timeZone, config, now = new Date() } = opts
  if (!config.hours) return { configured: false, slots: [] }

  const [y, m, d] = dateYmd.split('-').map(Number)
  if (!y || !m || !d) return { configured: true, slots: [] }

  // Weekday for that local calendar day (use noon UTC guess to avoid DST edge).
  const noonProbe = wallTimeToUtc(y, m, d, 12, 0, timeZone)
  const { weekday } = localParts(noonProbe, timeZone)
  const key = dayKeyFromWeekday(weekday)
  const window = config.hours[key]
  if (!window) return { configured: true, slots: [] }

  const [openStr, closeStr] = window
  const [oh, om] = openStr.split(':').map(Number)
  const [ch, cm] = closeStr.split(':').map(Number)
  const open = wallTimeToUtc(y, m, d, oh, om, timeZone)
  const close = wallTimeToUtc(y, m, d, ch, cm, timeZone)
  const stepMs = config.slot_minutes * 60_000
  const slots: Date[] = []
  for (let t = open.getTime(); t < close.getTime(); t += stepMs) {
    const start = new Date(t)
    if (start <= now) continue
    slots.push(start)
  }
  return { configured: true, slots }
}

export function formatInVenueTz(
  isoOrDate: string | Date,
  timeZone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    ...options,
  }).format(date)
}

export function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
  bufferMinutes: number
): boolean {
  const buf = bufferMinutes * 60_000
  return aStart.getTime() < bEnd.getTime() + buf && aEnd.getTime() + buf > bStart.getTime()
}
