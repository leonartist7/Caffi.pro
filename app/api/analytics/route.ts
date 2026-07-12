import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireVenueRole } from '@/lib/authz'
import { mondayStartInTz } from '@/lib/owner-stats'

/**
 * Loyalty analytics for a single venue — replaces the old orders/revenue
 * analytics page's data source (orders/order_items/categories/locations
 * don't exist in the live schema; nothing under this venue has ever
 * placed an "order" here, this is a loyalty platform). `days` controls
 * the KPI-tile totals (matches the page's existing date-range selector);
 * the two trend charts are always the last 12 venue-local weeks, per the
 * plan's own spec — a fixed comparison window regardless of the selector.
 */

const WEEKS = 12
// Points Issued/Redeemed are headline KPI tiles (not just chart trend
// data), so a silent truncation here is worse than on the 12-week charts
// below — PostgREST/Supabase has no exact-count equivalent for a signed
// SUM the way { count: 'exact', head: true } covers plain row counts, so
// this generous cap + a loud server-side warning is the mitigation until
// this route gets a dedicated aggregate RPC.
const POINTS_ROW_CAP = 10_000
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function weekLabel(weekStart: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', day: 'numeric' }).format(
    weekStart
  )
}

export async function GET(request: NextRequest) {
  const venueId = request.nextUrl.searchParams.get('venue_id')
  const authz = await requireVenueRole(venueId, ['owner', 'manager'])
  if (!authz.ok) return authz.response

  const daysParam = Number(request.nextUrl.searchParams.get('days'))
  const days = [7, 30, 90, 365].includes(daysParam) ? daysParam : 30

  const admin = getSupabaseAdmin()
  const { data: venue } = await admin
    .from('venues')
    .select('timezone')
    .eq('venue_id', authz.ctx.venueId)
    .single()
  const timezone = venue?.timezone ?? 'America/Edmonton'

  const now = new Date()
  const rangeStart = new Date(now.getTime() - days * 86_400_000)
  const thisWeekStart = mondayStartInTz(now, timezone)
  const twelveWeeksAgo = new Date(thisWeekStart.getTime() - (WEEKS - 1) * 7 * 86_400_000)

  const [
    totalMembersRes,
    visitsInRangeCountRes,
    visitsInRangeRowsRes,
    pointsInRangeRes,
    visits12wkRes,
    members12wkRes,
    statusRowsRes,
  ] = await Promise.all([
    admin
      .from('members')
      .select('member_id', { count: 'exact', head: true })
      .eq('tenant_id', authz.ctx.venueId),
    admin
      .from('visits')
      .select('visit_id', { count: 'exact', head: true })
      .eq('venue_id', authz.ctx.venueId)
      .gte('ts', rangeStart.toISOString()),
    admin
      .from('visits')
      .select('ts')
      .eq('venue_id', authz.ctx.venueId)
      .gte('ts', rangeStart.toISOString())
      .limit(5000),
    admin
      .from('points_ledger')
      .select('points_change')
      .eq('tenant_id', authz.ctx.venueId)
      .gte('created_at', rangeStart.toISOString())
      .limit(POINTS_ROW_CAP),
    admin
      .from('visits')
      .select('ts')
      .eq('venue_id', authz.ctx.venueId)
      .gte('ts', twelveWeeksAgo.toISOString())
      .limit(5000),
    admin
      .from('members')
      .select('created_at')
      .eq('tenant_id', authz.ctx.venueId)
      .gte('created_at', twelveWeeksAgo.toISOString())
      .limit(5000),
    admin
      .from('member_status')
      .select('member_id, status, visit_count, members!inner(full_name)')
      .eq('venue_id', authz.ctx.venueId),
  ])

  // Weekly buckets, oldest first, labeled by each week's venue-local Monday.
  const weekStarts = Array.from(
    { length: WEEKS },
    (_, i) => new Date(twelveWeeksAgo.getTime() + i * 7 * 86_400_000)
  )
  function bucketByWeek(timestamps: string[]): number[] {
    const counts = new Array(WEEKS).fill(0)
    for (const ts of timestamps) {
      const t = new Date(ts).getTime()
      for (let i = WEEKS - 1; i >= 0; i--) {
        if (t >= weekStarts[i].getTime()) {
          counts[i]++
          break
        }
      }
    }
    return counts
  }

  const visitCounts = bucketByWeek((visits12wkRes.data ?? []).map(v => v.ts))
  const memberCounts = bucketByWeek((members12wkRes.data ?? []).map(m => m.created_at))
  const visitsByWeek = weekStarts.map((w, i) => ({
    name: weekLabel(w, timezone),
    visits: visitCounts[i],
  }))
  const memberGrowth = weekStarts.map((w, i) => ({
    name: weekLabel(w, timezone),
    newMembers: memberCounts[i],
  }))

  const pointsRows = pointsInRangeRes.data ?? []
  if (pointsRows.length === POINTS_ROW_CAP) {
    console.warn(
      `[analytics] points_ledger row cap (${POINTS_ROW_CAP}) hit for venue ${authz.ctx.venueId}, days=${days} — pointsIssued/pointsRedeemed below may undercount`
    )
  }
  const pointsIssued = pointsRows.reduce(
    (sum, r) => sum + (r.points_change > 0 ? r.points_change : 0),
    0
  )
  const pointsRedeemed = pointsRows.reduce(
    (sum, r) => sum + (r.points_change < 0 ? -r.points_change : 0),
    0
  )

  // Most active weekday in range, from real visit timestamps — replaces
  // the old page's hardcoded "Saturday +23%" placeholder.
  const weekdayCounts = new Array(7).fill(0)
  for (const v of visitsInRangeRowsRes.data ?? []) {
    const day = new Date(v.ts).toLocaleString('en-US', { timeZone: timezone, weekday: 'long' })
    const idx = WEEKDAY_NAMES.indexOf(day)
    if (idx >= 0) weekdayCounts[idx]++
  }
  const maxWeekdayCount = Math.max(...weekdayCounts)
  const mostActiveDay =
    maxWeekdayCount > 0 ? WEEKDAY_NAMES[weekdayCounts.indexOf(maxWeekdayCount)] : null

  interface StatusRow {
    member_id: string
    status: string
    visit_count: number | null
    members: { full_name: string | null } | null
  }
  // Supabase types a `!inner` join as an array even for a 1:1 FK; cast
  // through unknown (same pattern as lib/owner-stats.ts's listRegulars).
  const statusRows = (statusRowsRes.data ?? []) as unknown as StatusRow[]
  const statusCounts: Record<string, number> = { new: 0, regular: 0, fading: 0, lost: 0 }
  for (const r of statusRows) {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1
  }
  const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({ status, count }))

  const topMembers = [...statusRows]
    .sort((a, b) => (b.visit_count ?? 0) - (a.visit_count ?? 0))
    .slice(0, 5)
    .map(r => ({
      memberId: r.member_id,
      fullName: r.members?.full_name ?? 'Member',
      visitCount: r.visit_count ?? 0,
    }))

  const regularsRate =
    statusRows.length > 0 ? Math.round((statusCounts.regular / statusRows.length) * 100) : null

  return NextResponse.json({
    totals: {
      totalMembers: totalMembersRes.count ?? 0,
      visitsInRange: visitsInRangeCountRes.count ?? 0,
      pointsIssued,
      pointsRedeemed,
    },
    memberGrowth,
    visitsByWeek,
    statusBreakdown,
    topMembers,
    mostActiveDay,
    regularsRate,
  })
}
