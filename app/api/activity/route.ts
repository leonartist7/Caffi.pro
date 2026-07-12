import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireVenueRole, requireAroAdmin } from '@/lib/authz'
import { eventLabel, activityAction, activityResourceType } from '@/lib/events'

/**
 * HQ activity API — server-side replacement for the old browser-direct
 * `admin_activity_log` queries (that table doesn't exist; `events` is its
 * replacement, the analytics spine every write already inserts into via
 * lib/events.ts). With `venue_id`, scoped to that venue for its
 * owner/manager (aro_admin passes for any venue). Without `venue_id`, this
 * is the platform-wide feed — aro_admin ONLY, since a plain venue owner
 * must never see another café's activity.
 *
 * Response shape mirrors the pre-existing ActivityLog UI (log_id,
 * admin_email, action, resource_type, description, tenants.business_name)
 * so the page's JSX didn't need to change, only its data layer — `action`/
 * `resource_type` are coarse buckets derived from the dot-namespaced event
 * type (see lib/events.ts), since that table predates the events schema
 * and expects a small fixed vocabulary.
 */

interface EventRow {
  event_id: string
  actor: string | null
  venue_id: string | null
  type: string
  ts: string
}

function actorLabel(actor: string | null): string {
  if (!actor || actor === 'system') return 'System'
  if (actor.startsWith('user:')) return 'Team member'
  if (actor.startsWith('membership:')) return 'Staff'
  if (actor.startsWith('member:')) return 'Diner'
  return actor
}

export async function GET(request: NextRequest) {
  const venueId = request.nextUrl.searchParams.get('venue_id')
  const limitParam = Number(request.nextUrl.searchParams.get('limit'))
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 100

  if (venueId) {
    const authz = await requireVenueRole(venueId, ['owner', 'manager'])
    if (!authz.ok) return authz.response
  } else {
    const authz = await requireAroAdmin()
    if (!authz.ok) return authz.response
  }

  const admin = getSupabaseAdmin()
  let query = admin
    .from('events')
    .select('event_id, actor, venue_id, type, ts')
    .order('ts', { ascending: false })
    .limit(limit)
  if (venueId) query = query.eq('venue_id', venueId)

  const { data, error } = await query
  if (error) {
    console.error('[activity] list failed:', error)
    return NextResponse.json({ error: 'Failed to load activity' }, { status: 500 })
  }
  const events = (data ?? []) as EventRow[]

  // One extra query to resolve venue names for the feed — cheaper than a
  // join per row, and the venue set in any 100-200 row page is small.
  const venueIds = [...new Set(events.map(e => e.venue_id).filter((id): id is string => !!id))]
  const venueNameById = new Map<string, string>()
  if (venueIds.length > 0) {
    const { data: venues } = await admin
      .from('venues')
      .select('venue_id, business_name')
      .in('venue_id', venueIds)
    for (const v of venues ?? []) venueNameById.set(v.venue_id, v.business_name)
  }

  const logs = events.map(e => ({
    log_id: e.event_id,
    tenant_id: e.venue_id,
    admin_email: actorLabel(e.actor),
    action: activityAction(e.type),
    resource_type: activityResourceType(e.type),
    resource_id: null,
    description: eventLabel(e.type),
    created_at: e.ts,
    tenants:
      e.venue_id && venueNameById.has(e.venue_id)
        ? { business_name: venueNameById.get(e.venue_id) as string }
        : null,
  }))

  return NextResponse.json({ logs })
}
