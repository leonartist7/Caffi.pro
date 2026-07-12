import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Building2, Users, Activity, Inbox, Plus, ArrowRight } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { mondayStartInTz } from '@/lib/owner-stats'

/**
 * Role dispatch: owner/manager -> the real (owner)/home; anyone else
 * without an aro_admin membership -> /counter, same "wrong door" pattern
 * as the (owner) layout. aro_admin lands here for real: the HQ overview
 * (platform-wide totals, recent activity, per-client snapshot) — not a
 * redirect, since this IS the operator's home.
 */
export const dynamic = 'force-dynamic'

// Platform-wide reference timezone for the week-bucket tiles on this
// aggregate view (individual venues use their own timezone on their own
// /home page — this page reports across all of them at once).
const HQ_REFERENCE_TZ = 'America/Edmonton'

const EVENT_LABELS: Record<string, string> = {
  'member.joined': 'New member joined',
  'visit.recorded': 'Visit recorded',
  'reward.redeemed': 'Reward redeemed',
  'points.adjusted': 'Points adjusted',
  'campaign.created': 'Campaign created',
  'campaign.autopilot_toggled': 'Campaign autopilot toggled',
  'message.sent': 'Message sent',
  'ai_draft.created': 'AI draft created',
  'ai_draft.approved': 'AI draft approved',
  'invite.created': 'Staff invited',
  'invite.accepted': 'Staff invite accepted',
  'counter.login': 'Counter login',
  'client.created': 'Client created',
  'client.updated': 'Client updated',
  'client.deleted': 'Client deleted',
  'lead.received': 'New lead received',
  'seed.applied': 'Seed data applied',
  'sentry.test': 'Sentry test event',
}

function eventLabel(type: string): string {
  return EVENT_LABELS[type] ?? type
}

interface EventRow {
  event_id: string
  actor: string | null
  venue_id: string | null
  type: string
  ts: string
}

export default async function DashboardHome() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: memberships } = await admin
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const roles = new Set((memberships ?? []).map(m => m.role))
  if (roles.has('owner') || roles.has('manager')) redirect('/home')
  if (!roles.has('aro_admin')) redirect('/counter')

  // ---- aro_admin: HQ overview ----------------------------------------
  const weekStart = mondayStartInTz(new Date(), HQ_REFERENCE_TZ)
  const lastWeekStart = new Date(weekStart.getTime() - 7 * 86_400_000)

  // PostgREST caps unbounded selects at its configured max-rows (commonly
  // 1000) and truncates silently rather than erroring — so member/visit
  // totals need an explicit head-count query (exact, not an estimate) in
  // addition to the row fetch used for per-venue bucketing. If either
  // fetch below hits that same cap, the totals tile still reports the
  // true count while the per-venue breakdown is what degrades gracefully.
  const [
    venuesRes,
    memberRows,
    memberCountRes,
    visitRows,
    visitsThisWeekCountRes,
    newLeadsRes,
    eventsRes,
  ] = await Promise.all([
    admin
      .from('venues')
      .select('venue_id, business_name, slug, created_at')
      .order('created_at', { ascending: false }),
    admin.from('members').select('member_id, tenant_id').limit(5000),
    admin.from('members').select('member_id', { count: 'exact', head: true }),
    admin
      .from('visits')
      .select('visit_id, venue_id, ts')
      .gte('ts', lastWeekStart.toISOString())
      .limit(5000),
    admin
      .from('visits')
      .select('visit_id', { count: 'exact', head: true })
      .gte('ts', weekStart.toISOString()),
    admin.from('leads').select('lead_id', { count: 'exact', head: true }).eq('status', 'new'),
    admin
      .from('events')
      .select('event_id, actor, venue_id, type, ts')
      .order('ts', { ascending: false })
      .limit(15),
  ])

  const venues = venuesRes.data ?? []
  const members = memberRows.data ?? []
  const visits = visitRows.data ?? []
  const newLeadsCount = newLeadsRes.count ?? 0
  const events = (eventsRes.data ?? []) as EventRow[]
  // Exact platform-wide totals from head-counts (never truncated); the row
  // fetches above are ONLY used for the per-venue breakdown below, where a
  // 5000-row cap is an acceptable early-stage bound.
  const totalMembersExact = memberCountRes.count ?? members.length
  const visitsThisWeekExact = visitsThisWeekCountRes.count

  const venueNameById = new Map(venues.map(v => [v.venue_id, v.business_name]))

  const memberCountByVenue = new Map<string, number>()
  for (const m of members) {
    memberCountByVenue.set(m.tenant_id, (memberCountByVenue.get(m.tenant_id) ?? 0) + 1)
  }

  let visitsThisWeek = 0
  let visitsLastWeek = 0
  const visitsThisWeekByVenue = new Map<string, number>()
  const weekStartMs = weekStart.getTime()
  for (const v of visits) {
    const ts = new Date(v.ts).getTime()
    if (ts >= weekStartMs) {
      visitsThisWeek++
      visitsThisWeekByVenue.set(v.venue_id, (visitsThisWeekByVenue.get(v.venue_id) ?? 0) + 1)
    } else {
      visitsLastWeek++
    }
  }

  // Headline tiles use the exact head-counts (never truncated); the
  // week-over-week loop above is only used for the delta trend and the
  // per-venue breakdown, both of which tolerate the 5000-row bound.
  const totalMembers = totalMembersExact
  const visitsThisWeekDisplay = visitsThisWeekExact ?? visitsThisWeek
  const visitsDeltaPct =
    visitsLastWeek > 0
      ? Math.round(((visitsThisWeek - visitsLastWeek) / visitsLastWeek) * 100)
      : null

  return (
    <div>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-coffee-700 to-mocha bg-clip-text text-transparent">
          HQ Overview
        </h1>
        <p className="text-coffee-600 dark:text-cream-400 mt-1 lg:mt-2 text-sm lg:text-lg">
          Every client, at a glance
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-5 h-5 lg:w-6 lg:h-6 text-coffee-600 dark:text-cream-400" />
            <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400">Clients</p>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100">
            {venues.length}
          </p>
        </div>

        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 lg:w-6 lg:h-6 text-coffee-600 dark:text-cream-400" />
            <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400">Members</p>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100">
            {totalMembers}
          </p>
        </div>

        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 lg:w-6 lg:h-6 text-coffee-600 dark:text-cream-400" />
            <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400">
              Visits this week
            </p>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100">
            {visitsThisWeekDisplay}
          </p>
          {visitsDeltaPct !== null && (
            <p className="text-xs text-coffee-500 dark:text-cream-500 mt-1">
              {visitsDeltaPct >= 0 ? '↑' : '↓'} {Math.abs(visitsDeltaPct)}% vs last week
            </p>
          )}
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3 mb-2">
            <Inbox className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
            <p className="text-xs lg:text-sm text-blue-600 dark:text-blue-400">New leads</p>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-blue-700 dark:text-blue-400">
            {newLeadsCount}
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Link
          href="/clients"
          className="flex items-center justify-center gap-2 bg-gradient-coffee text-cream-100 font-semibold py-2.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Add client
        </Link>
        <Link
          href="/leads"
          className="flex items-center justify-center gap-2 bg-white/80 dark:bg-dark-800/80 border border-coffee-200/50 dark:border-dark-700 text-coffee-700 dark:text-cream-300 font-semibold py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md transition-all text-sm"
        >
          <Inbox className="w-4 h-4" />
          View leads
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clients at a glance */}
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-coffee-900 dark:text-cream-100">
              Clients at a glance
            </h2>
            <Link
              href="/clients"
              className="text-xs text-coffee-500 dark:text-cream-500 hover:text-coffee-700 dark:hover:text-cream-300 flex items-center gap-1"
            >
              All clients <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {venues.length === 0 ? (
            <p className="text-sm text-coffee-500 dark:text-cream-500 py-6 text-center">
              No clients yet — add your first one.
            </p>
          ) : (
            <div className="space-y-2">
              {venues.slice(0, 8).map(v => (
                <div
                  key={v.venue_id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-coffee-50/60 dark:bg-dark-900/40"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-coffee-900 dark:text-cream-100 truncate">
                      {v.business_name}
                    </p>
                    <p className="text-xs text-coffee-500 dark:text-cream-500">{v.slug}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-coffee-600 dark:text-cream-400 flex-shrink-0">
                    <span>{memberCountByVenue.get(v.venue_id) ?? 0} members</span>
                    <span>{visitsThisWeekByVenue.get(v.venue_id) ?? 0} visits/wk</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <h2 className="text-lg font-bold text-coffee-900 dark:text-cream-100 mb-4">
            Recent activity
          </h2>
          {events.length === 0 ? (
            <p className="text-sm text-coffee-500 dark:text-cream-500 py-6 text-center">
              Nothing yet — activity across all clients will show up here.
            </p>
          ) : (
            <div className="space-y-2">
              {events.map(e => (
                <div
                  key={e.event_id}
                  className="flex items-center justify-between text-sm border-b border-coffee-100 dark:border-dark-700 pb-2 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-coffee-900 dark:text-cream-100">{eventLabel(e.type)}</p>
                    {e.venue_id && venueNameById.get(e.venue_id) && (
                      <p className="text-xs text-coffee-500 dark:text-cream-500 truncate">
                        {venueNameById.get(e.venue_id)}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-coffee-400 dark:text-cream-600 flex-shrink-0 ml-3">
                    {new Date(e.ts).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
