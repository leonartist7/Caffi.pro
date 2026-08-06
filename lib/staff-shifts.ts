import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { mondayStartInTz } from '@/lib/owner-stats'

/**
 * Time-clock read model (PLAN-35). Duration is always computed here, never
 * stored — `staff_shifts` only ever carries `started_at`/`ended_at`.
 */

/** An open shift older than this is flagged for owner review, never auto-closed. */
export const STALE_SHIFT_HOURS = 12

export interface ShiftRow {
  shiftId: string
  membershipId: string
  fullName: string | null
  startedAt: string
  endedAt: string | null
  source: 'counter' | 'manual'
  note: string | null
  durationMinutes: number | null
  isStale: boolean
}

export function computeDurationMinutes(startedAt: string, endedAt: string | null): number | null {
  if (!endedAt) return null
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  return Math.max(0, Math.round(ms / 60000))
}

export function isStaleOpenShift(startedAt: string, endedAt: string | null): boolean {
  if (endedAt) return false
  const ageMs = Date.now() - new Date(startedAt).getTime()
  return ageMs > STALE_SHIFT_HOURS * 3600 * 1000
}

/** Venue-local week (Mon 00:00 -> next Mon 00:00) containing `now`, as UTC instants. */
export function defaultWeekRange(
  timeZone: string,
  now: Date = new Date()
): { from: Date; to: Date } {
  const from = mondayStartInTz(now, timeZone)
  const to = new Date(from.getTime() + 7 * 86400000)
  return { from, to }
}

interface RawShiftRow {
  shift_id: string
  membership_id: string
  started_at: string
  ended_at: string | null
  source: string
  note: string | null
  memberships: { full_name: string | null } | { full_name: string | null }[] | null
}

export async function listShiftsForPeriod(
  venueId: string,
  from: Date,
  to: Date
): Promise<ShiftRow[]> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('staff_shifts')
    .select('shift_id, membership_id, started_at, ended_at, source, note, memberships(full_name)')
    .eq('venue_id', venueId)
    .gte('started_at', from.toISOString())
    .lt('started_at', to.toISOString())
    .order('started_at', { ascending: false })

  if (error) throw new Error(`listShiftsForPeriod failed: ${error.message}`)

  return ((data ?? []) as unknown as RawShiftRow[]).map(row => {
    const rel = Array.isArray(row.memberships) ? row.memberships[0] : row.memberships
    return {
      shiftId: row.shift_id,
      membershipId: row.membership_id,
      fullName: rel?.full_name ?? null,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      source: row.source as 'counter' | 'manual',
      note: row.note,
      durationMinutes: computeDurationMinutes(row.started_at, row.ended_at),
      isStale: isStaleOpenShift(row.started_at, row.ended_at),
    }
  })
}
