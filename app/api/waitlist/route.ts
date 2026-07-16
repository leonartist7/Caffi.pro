import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'
import { localParts } from '@/lib/owner-stats'

/**
 * POST — public guest self-add (same-day waitlist).
 * GET  — staff list for today, gated.
 */
export async function POST(request: NextRequest) {
  let body: {
    venue_slug?: string
    client_uuid?: string
    guest_name?: string
    guest_phone?: string
    party_size?: number
    notes?: string
    member_pass_serial?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (
    !body.venue_slug ||
    !body.client_uuid ||
    !body.guest_name ||
    !body.guest_phone ||
    !body.party_size
  ) {
    return NextResponse.json({ error: 'Missing required waitlist fields' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: venue } = await admin
    .from('venues')
    .select('venue_id')
    .eq('slug', body.venue_slug)
    .maybeSingle()
  if (!venue) {
    return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
  }

  let memberId: string | null = null
  if (body.member_pass_serial) {
    const { data: member } = await admin
      .from('members')
      .select('member_id')
      .eq('tenant_id', venue.venue_id)
      .eq('pass_serial', body.member_pass_serial)
      .maybeSingle()
    memberId = member?.member_id ?? null
  }

  const { data, error } = await admin
    .from('waitlist_entries')
    .insert({
      venue_id: venue.venue_id,
      client_uuid: body.client_uuid,
      guest_name: body.guest_name.trim(),
      guest_phone: body.guest_phone.trim(),
      party_size: body.party_size,
      notes: body.notes?.trim() || null,
      member_id: memberId,
      status: 'waiting',
    })
    .select('waitlist_id, status, party_size, joined_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      const { data: existing } = await admin
        .from('waitlist_entries')
        .select('waitlist_id, status, party_size, joined_at')
        .eq('venue_id', venue.venue_id)
        .eq('client_uuid', body.client_uuid)
        .maybeSingle()
      if (existing) {
        return NextResponse.json({ entry: existing }, { status: 200 })
      }
      return NextResponse.json({ error: 'Already on the waitlist' }, { status: 409 })
    }
    console.error('[waitlist] insert failed:', error)
    return NextResponse.json({ error: 'Could not join waitlist' }, { status: 500 })
  }

  void emitEvent({
    type: 'waitlist.joined',
    actor: memberId ? `member:${memberId}` : 'guest',
    venueId: venue.venue_id,
    payload: { waitlist_id: data.waitlist_id, party_size: data.party_size },
  })

  return NextResponse.json({ entry: data }, { status: 201 })
}

export async function GET(request: NextRequest) {
  const venueId = request.nextUrl.searchParams.get('venue_id')
  const gate = await requireVenueRole(venueId, ['owner', 'manager', 'staff'])
  if (!gate.ok) return gate.response

  const admin = getSupabaseAdmin()
  const { data: venue } = await admin
    .from('venues')
    .select('timezone')
    .eq('venue_id', gate.ctx.venueId)
    .maybeSingle()
  const timeZone = venue?.timezone || 'UTC'
  const { y, m, d } = localParts(new Date(), timeZone)
  // Approximate today start/end in venue TZ via ISO filter on joined_at.
  const dayStartGuess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
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
  const asUtcGuess = dayStartGuess.getTime()
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
  const rangeStart = new Date(asUtcGuess - (asLocalRead - asUtcGuess))
  const rangeEnd = new Date(rangeStart.getTime() + 24 * 60 * 60 * 1000)

  const status = request.nextUrl.searchParams.get('status')
  let query = admin
    .from('waitlist_entries')
    .select(
      'waitlist_id, guest_name, guest_phone, party_size, status, notes, joined_at, created_at'
    )
    .eq('venue_id', gate.ctx.venueId)
    .gte('joined_at', rangeStart.toISOString())
    .lt('joined_at', rangeEnd.toISOString())
    .order('joined_at', { ascending: true })
    .limit(250)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  } else {
    query = query.in('status', ['waiting', 'notified', 'seated'])
  }

  const { data, error } = await query
  if (error) {
    console.error('[waitlist] list failed:', error)
    return NextResponse.json({ error: 'Failed to load waitlist' }, { status: 500 })
  }
  return NextResponse.json({ entries: data ?? [], timezone: timeZone })
}
