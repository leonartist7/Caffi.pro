import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * All owner-dashboard aggregate logic lives here, not in components. Every
 * function takes venueId + timezone explicitly — never infers "current
 * venue" from a global. One RPC round trip for the home page's stats
 * (see supabase/migrations/20260711000002_owner_stats.sql); the SQL
 * function itself does the venue-local week-boundary math so it can't
 * drift from what's actually stored.
 */

/**
 * Resolves the venue an owner/manager session maps to. venue_id NULL on
 * the membership means org-wide (MVP: orgs are 1:1 with venues), so we
 * fall back to that org's one venue. Shared by the (owner) layout gate and
 * every page under it — one definition of "which venue is this owner".
 */
export async function resolveOwnerVenueId(userId: string): Promise<string | null> {
  const admin = getSupabaseAdmin()
  const { data: membership } = await admin
    .from('memberships')
    .select('venue_id, org_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('role', ['owner', 'manager'])
    .limit(1)
    .maybeSingle()
  if (!membership) return null
  if (membership.venue_id) return membership.venue_id
  const { data: venue } = await admin
    .from('venues')
    .select('venue_id')
    .eq('org_id', membership.org_id)
    .limit(1)
    .maybeSingle()
  return venue?.venue_id ?? null
}

export interface VenueWeekStats {
  regularsReturned: number
  membersThisWeek: number
  membersLastWeek: number
  visitsThisWeek: number
  visitsLastWeek: number
  fadingNow: number
  /** null = no snapshot from 7 days ago yet ("first week!" in the UI) */
  fading7dAgo: number | null
  hasAnyData: boolean
}

export async function getVenueWeekStats(
  venueId: string,
  timezone: string
): Promise<VenueWeekStats> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .rpc('venue_week_stats', { p_venue_id: venueId, p_tz: timezone })
    .single()

  if (error || !data) {
    throw new Error(`getVenueWeekStats failed: ${error?.message ?? 'no data'}`)
  }

  const row = data as {
    regulars_returned: number
    members_this_week: number
    members_last_week: number
    visits_this_week: number
    visits_last_week: number
    fading_now: number
    fading_7d_ago: number | null
    has_any_data: boolean
  }

  return {
    regularsReturned: row.regulars_returned,
    membersThisWeek: row.members_this_week,
    membersLastWeek: row.members_last_week,
    visitsThisWeek: row.visits_this_week,
    visitsLastWeek: row.visits_last_week,
    fadingNow: row.fading_now,
    fading7dAgo: row.fading_7d_ago,
    hasAnyData: row.has_any_data,
  }
}

export interface RegularRow {
  memberId: string
  fullName: string | null
  status: 'new' | 'regular' | 'fading' | 'lost'
  visitCount: number
  lastVisitAt: string | null
  cadenceDays: number | null
  daysSinceLast: number | null
  balance: number
}

/** First page (50) of a venue's members joined to derived status + balance. */
export async function listRegulars(
  venueId: string,
  opts: { search?: string; status?: string; limit?: number } = {}
): Promise<RegularRow[]> {
  const admin = getSupabaseAdmin()
  let query = admin
    .from('member_status')
    .select(
      'member_id, status, visit_count, last_visit_at, cadence_days, days_since_last, members!inner(full_name)'
    )
    .eq('venue_id', venueId)
    .order('days_since_last', { ascending: true, nullsFirst: false })
    .limit(opts.limit ?? 50)

  if (opts.status) query = query.eq('status', opts.status)

  const { data, error } = await query
  if (error) throw new Error(`listRegulars failed: ${error.message}`)

  const memberIds = (data ?? []).map(r => r.member_id)
  const { data: balances } = memberIds.length
    ? await admin.from('member_balances').select('member_id, balance').in('member_id', memberIds)
    : { data: [] }
  const balanceByMember = new Map((balances ?? []).map(b => [b.member_id, b.balance]))

  let rows = (data ?? []).map(r => {
    const membersRel = r.members as unknown as { full_name: string | null } | null
    return {
      memberId: r.member_id,
      fullName: membersRel?.full_name ?? null,
      status: r.status as RegularRow['status'],
      visitCount: r.visit_count ?? 0,
      lastVisitAt: r.last_visit_at,
      cadenceDays: r.cadence_days,
      daysSinceLast: r.days_since_last,
      balance: balanceByMember.get(r.member_id) ?? 0,
    }
  })

  if (opts.search) {
    const needle = opts.search.trim().toLowerCase()
    rows = rows.filter(r => r.fullName?.toLowerCase().includes(needle))
  }

  return rows
}

export interface MemberProfile extends RegularRow {
  visits: { ts: string; source: string }[]
  ledger: { createdAt: string; pointsChange: number; reason: string; description: string | null }[]
  whySentence: string
}

/** "Why is Maya fading?" — one source of truth, same math as member_status. */
export function buildWhySentence(
  status: RegularRow['status'],
  cadenceDays: number | null,
  daysSinceLast: number | null
): string {
  if (status === 'new') return 'Just getting started — too early to tell their rhythm yet.'
  if (!cadenceDays || daysSinceLast === null) return 'Not enough visits yet to know their rhythm.'
  const cadence = Math.round(cadenceDays)
  const since = Math.round(daysSinceLast)
  const ratio = cadenceDays > 0 ? daysSinceLast / cadenceDays : 0
  const ratioStr = ratio >= 1.1 ? `, that's ${ratio.toFixed(1)}× their rhythm` : ''
  return `Usually comes every ${cadence} days — last seen ${since} days ago${ratioStr}.`
}

export async function getMemberProfile(
  venueId: string,
  memberId: string
): Promise<MemberProfile | null> {
  const admin = getSupabaseAdmin()

  const { data: statusRow } = await admin
    .from('member_status')
    .select(
      'member_id, status, visit_count, last_visit_at, cadence_days, days_since_last, members!inner(full_name)'
    )
    .eq('venue_id', venueId)
    .eq('member_id', memberId)
    .maybeSingle()
  if (!statusRow) return null

  const [{ data: balRow }, { data: visits }, { data: ledger }] = await Promise.all([
    admin.from('member_balances').select('balance').eq('member_id', memberId).maybeSingle(),
    admin
      .from('visits')
      .select('ts, source')
      .eq('member_id', memberId)
      .eq('venue_id', venueId)
      .order('ts', { ascending: false })
      .limit(90),
    admin
      .from('points_ledger')
      .select('created_at, points_change, reason, description')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const membersRel = statusRow.members as unknown as { full_name: string | null } | null

  return {
    memberId: statusRow.member_id,
    fullName: membersRel?.full_name ?? null,
    status: statusRow.status as RegularRow['status'],
    visitCount: statusRow.visit_count ?? 0,
    lastVisitAt: statusRow.last_visit_at,
    cadenceDays: statusRow.cadence_days,
    daysSinceLast: statusRow.days_since_last,
    balance: balRow?.balance ?? 0,
    visits: (visits ?? []).map(v => ({ ts: v.ts, source: v.source })),
    ledger: (ledger ?? []).map(l => ({
      createdAt: l.created_at,
      pointsChange: l.points_change,
      reason: l.reason,
      description: l.description,
    })),
    whySentence: buildWhySentence(
      statusRow.status as RegularRow['status'],
      statusRow.cadence_days,
      statusRow.days_since_last
    ),
  }
}

// ----------------------------------------------------------------------------
// Pure date helpers (no Supabase dependency — unit-testable with injected
// dates). Mirrors the SQL function's week-boundary logic in TS for anywhere
// that needs it client- or server-side without a round trip.
// ----------------------------------------------------------------------------

/** Venue-local wall-clock parts for a given instant + IANA timezone. */
function localParts(
  date: Date,
  timeZone: string
): { y: number; m: number; d: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  })
  const parts = fmt.formatToParts(date)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  }
  return {
    y: Number(get('year')),
    m: Number(get('month')),
    d: Number(get('day')),
    weekday: weekdayMap[get('weekday')] ?? 1,
  }
}

/**
 * The venue-local Monday 00:00 boundary for the week containing `date`,
 * returned as a real instant (Date/UTC). ISO week (Monday start), matching
 * the SQL function's date_trunc('week', ...).
 */
export function mondayStartInTz(date: Date, timeZone: string): Date {
  const { y, m, d, weekday } = localParts(date, timeZone)
  // Midnight of `date`'s local calendar day, expressed as a UTC guess, then
  // walked back to Monday by subtracting (weekday - 1) days, then corrected
  // for DST by re-deriving local midnight via the offset trick below.
  const daysBack = weekday - 1
  const naiveLocalMidnight = new Date(Date.UTC(y, m - 1, d - daysBack, 0, 0, 0))
  // naiveLocalMidnight is "midnight UTC" on the target calendar day — find
  // the actual UTC instant that reads as local midnight in `timeZone` by
  // measuring the zone's offset at that moment and subtracting it.
  const offsetMs = tzOffsetMs(naiveLocalMidnight, timeZone)
  return new Date(naiveLocalMidnight.getTime() - offsetMs)
}

function tzOffsetMs(date: Date, timeZone: string): number {
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
  const parts = fmt.formatToParts(date)
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0)
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second')
  )
  return asUtc - date.getTime()
}
