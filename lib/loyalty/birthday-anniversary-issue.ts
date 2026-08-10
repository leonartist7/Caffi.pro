import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { getVenueTimezone } from '@/lib/owner-stats'
import { venueLocalDate, occursOn, isLeapYear } from './calendar'
import { issueMemberOffer } from './issue'
import { emitEvent } from '@/lib/events'

/**
 * PLAN-14 — birthday + anniversary issuance. Called daily by
 * `/api/cron/loyalty-daily` and, for a single venue, by the owner's
 * "run today's issues now" button (same underlying function either way —
 * the button is not a shortcut, it's a real path through the same code).
 *
 * "Today" is always computed in the venue's own configured timezone
 * (`getVenueTimezone`), never the server's or the caller's — the exact
 * bug class `MASTER-PLAN-v2-operating-system.md` §N3 names (a
 * timezone-naive job firing on the wrong local day near midnight).
 *
 * `period_key = '<type>:<year>'` scoped by `(program_id, member_id)` is
 * the DB-level "at most once per member per program per year" guarantee
 * (PLAN-13's `uq_member_offers_program_member_period`) — a cron that
 * double-fires on the same day, or runs both the scheduled trigger and a
 * manual "run now" the same day, issues nothing the second time.
 */

interface ProgramRow {
  program_id: string
  type: 'birthday' | 'anniversary'
  config: { default_points_value?: number; default_value_cents?: number } | null
}

function rewardFromConfig(config: ProgramRow['config']): {
  pointsValue: number | null
  valueCents: number | null
} {
  const pointsValue =
    typeof config?.default_points_value === 'number' ? config.default_points_value : null
  const valueCents =
    typeof config?.default_value_cents === 'number' ? config.default_value_cents : null
  return { pointsValue, valueCents }
}

async function issueForMembers(
  admin: SupabaseClient,
  venueId: string,
  program: ProgramRow,
  memberIds: string[],
  year: number
): Promise<number> {
  const { pointsValue, valueCents } = rewardFromConfig(program.config)
  if (pointsValue == null && valueCents == null) return 0

  let issued = 0
  for (const memberId of memberIds) {
    const result = await issueMemberOffer(admin, {
      venueId,
      memberId,
      programId: program.program_id,
      pointsValue,
      valueCents,
      periodKey: `${program.type}:${year}`,
    })
    if (result.issued) {
      issued++
      void emitEvent({
        type: 'offer.issued',
        actor: `system:${program.type}`,
        venueId,
        payload: {
          offer_id: result.offer.offerId,
          member_id: memberId,
          program_id: program.program_id,
        },
      })
    } else if (result.reason === 'error') {
      console.error(`[${program.type}-issue] failed for member`, memberId, result.message)
    }
    // 'duplicate_period' is expected on a re-run within the same year.
  }
  return issued
}

async function issueBirthdayOffers(
  admin: SupabaseClient,
  venueId: string,
  program: ProgramRow,
  today: { year: number; month: number; day: number }
): Promise<number> {
  // A Feb 29 birthday "occurs" on Feb 28 in a non-leap year (calendar.ts's
  // occursOn doctrine) — so on that specific day, both exact matches and
  // Feb 29 records both count as "today."
  const matches: { month: number; day: number }[] = [{ month: today.month, day: today.day }]
  if (today.month === 2 && today.day === 28 && !isLeapYear(today.year)) {
    matches.push({ month: 2, day: 29 })
  }

  const orFilter = matches
    .map(m => `and(birthday_month.eq.${m.month},birthday_day.eq.${m.day})`)
    .join(',')
  const { data: members, error } = await admin
    .from('members')
    .select('member_id')
    .eq('tenant_id', venueId)
    .or(orFilter)
  if (error) {
    console.error('[birthday-issue] member lookup failed:', error.message)
    return 0
  }

  return issueForMembers(
    admin,
    venueId,
    program,
    (members ?? []).map(m => m.member_id),
    today.year
  )
}

async function issueAnniversaryOffers(
  admin: SupabaseClient,
  venueId: string,
  program: ProgramRow,
  timezone: string,
  today: { year: number; month: number; day: number }
): Promise<number> {
  // No stored month/day for the join date — members.created_at already
  // gives it for free, so this scans the venue's members rather than
  // querying by column. Fine at café scale (matches the appreciation
  // batch's own in-memory cohort filtering); would need pagination past
  // a few thousand members per venue.
  const { data: members, error } = await admin
    .from('members')
    .select('member_id, created_at')
    .eq('tenant_id', venueId)
    .limit(5000)
  if (error) {
    console.error('[anniversary-issue] member lookup failed:', error.message)
    return 0
  }

  const matchingIds = (members ?? [])
    .filter(m => {
      const joined = venueLocalDate(new Date(m.created_at), timezone)
      return occursOn(joined.month, joined.day, today)
    })
    .map(m => m.member_id)

  return issueForMembers(admin, venueId, program, matchingIds, today.year)
}

export interface BirthdayAnniversaryRunResult {
  venueId: string
  birthdayIssued: number
  anniversaryIssued: number
}

/** Runs both program types for one venue — the shared body behind both
 * the daily cron (loops every venue with an active program) and the
 * owner's single-venue "run now" button. */
export async function runBirthdayAnniversaryForVenue(
  admin: SupabaseClient,
  venueId: string
): Promise<BirthdayAnniversaryRunResult> {
  const timezone = await getVenueTimezone(venueId)
  const today = venueLocalDate(new Date(), timezone)

  const { data: programs, error } = await admin
    .from('loyalty_programs')
    .select('program_id, type, config')
    .eq('venue_id', venueId)
    .eq('status', 'active')
    .in('type', ['birthday', 'anniversary'])
  if (error) {
    console.error('[birthday-anniversary-issue] program lookup failed:', error.message)
    return { venueId, birthdayIssued: 0, anniversaryIssued: 0 }
  }

  let birthdayIssued = 0
  let anniversaryIssued = 0
  for (const program of (programs ?? []) as ProgramRow[]) {
    if (program.type === 'birthday') {
      birthdayIssued += await issueBirthdayOffers(admin, venueId, program, today)
    } else {
      anniversaryIssued += await issueAnniversaryOffers(admin, venueId, program, timezone, today)
    }
  }
  return { venueId, birthdayIssued, anniversaryIssued }
}

/** Every venue with at least one active birthday/anniversary program —
 * the cron's fan-out. */
export async function runBirthdayAnniversaryForAllVenues(
  admin: SupabaseClient
): Promise<BirthdayAnniversaryRunResult[]> {
  const { data: venueRows, error } = await admin
    .from('loyalty_programs')
    .select('venue_id')
    .eq('status', 'active')
    .in('type', ['birthday', 'anniversary'])
  if (error) {
    console.error('[birthday-anniversary-issue] venue lookup failed:', error.message)
    return []
  }
  const venueIds = Array.from(new Set((venueRows ?? []).map(v => v.venue_id as string)))

  const results: BirthdayAnniversaryRunResult[] = []
  for (const venueId of venueIds) {
    results.push(await runBirthdayAnniversaryForVenue(admin, venueId))
  }
  return results
}
