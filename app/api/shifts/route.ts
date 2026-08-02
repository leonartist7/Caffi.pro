import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'
import { defaultWeekRange, listShiftsForPeriod } from '@/lib/staff-shifts'

/**
 * GET: shift list for a venue-local period (default: current week).
 * POST: owner adds a missed shift the counter never captured — purely
 * additive, `source = 'manual'`, both timestamps required.
 */

export async function GET(request: NextRequest) {
  const venueId = request.nextUrl.searchParams.get('venue_id')
  const authz = await requireVenueRole(venueId, ['owner', 'manager'])
  if (!authz.ok) return authz.response

  const admin = getSupabaseAdmin()
  const { data: venue } = await admin
    .from('venues')
    .select('timezone')
    .eq('venue_id', authz.ctx.venueId)
    .maybeSingle()
  const timezone = venue?.timezone ?? 'America/Edmonton'

  const fromParam = request.nextUrl.searchParams.get('from')
  const toParam = request.nextUrl.searchParams.get('to')
  let from: Date, to: Date
  if (fromParam && toParam) {
    from = new Date(fromParam)
    to = new Date(toParam)
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
      return NextResponse.json({ error: 'Invalid from/to' }, { status: 400 })
    }
  } else {
    ;({ from, to } = defaultWeekRange(timezone))
  }

  try {
    const shifts = await listShiftsForPeriod(authz.ctx.venueId, from, to)
    return NextResponse.json({ shifts, from: from.toISOString(), to: to.toISOString() })
  } catch (err) {
    console.error('[staff/shifts] list failed:', err)
    return NextResponse.json({ error: 'Could not load shifts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let body: {
    venue_id?: string
    membership_id?: string
    started_at?: string
    ended_at?: string
    note?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const authz = await requireVenueRole(body.venue_id, ['owner', 'manager'])
  if (!authz.ok) return authz.response

  if (!body.membership_id || !body.started_at || !body.ended_at) {
    return NextResponse.json(
      { error: 'membership_id, started_at, and ended_at are required' },
      { status: 400 }
    )
  }
  const startedAt = new Date(body.started_at)
  const endedAt = new Date(body.ended_at)
  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) {
    return NextResponse.json({ error: 'Invalid started_at/ended_at' }, { status: 400 })
  }
  if (endedAt < startedAt) {
    return NextResponse.json({ error: 'ended_at must be on or after started_at' }, { status: 400 })
  }
  if (endedAt.getTime() > Date.now()) {
    return NextResponse.json({ error: 'ended_at cannot be in the future' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // membership_id must belong to THIS venue — never trust a bare id.
  const { data: membership } = await admin
    .from('memberships')
    .select('membership_id')
    .eq('membership_id', body.membership_id)
    .eq('venue_id', authz.ctx.venueId)
    .maybeSingle()
  if (!membership) {
    return NextResponse.json({ error: 'Membership not found on this venue' }, { status: 404 })
  }

  const { data: inserted, error } = await admin
    .from('staff_shifts')
    .insert({
      venue_id: authz.ctx.venueId,
      membership_id: body.membership_id,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      source: 'manual',
      note: body.note?.trim() || null,
    })
    .select('shift_id')
    .single()

  if (error) {
    console.error('[staff/shifts] add missed shift failed:', error.message)
    return NextResponse.json({ error: 'Could not add shift' }, { status: 500 })
  }

  void emitEvent({
    type: 'shift.corrected',
    actor: `user:${authz.ctx.user.id}`,
    venueId: authz.ctx.venueId,
    payload: {
      action: 'added_missed',
      shift_id: inserted.shift_id,
      membership_id: body.membership_id,
    },
  })

  return NextResponse.json({ ok: true, shift_id: inserted.shift_id })
}
