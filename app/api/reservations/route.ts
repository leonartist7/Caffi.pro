import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireVenueRole } from '@/lib/authz'
import { parseReservationConfig } from '@/lib/reservations'
import { localParts } from '@/lib/owner-stats'

interface ReservationRow {
  reservation_id: string
  starts_at: string
  party_size: number
  status: string
  guest_name?: string
  duration_minutes?: number
  notes?: string | null
  table_id?: string | null
  source?: string
}

const FRIENDLY: Record<string, { status: number; message: string }> = {
  NO_AVAILABILITY: {
    status: 409,
    message: 'No tables available for that time — try another slot.',
  },
  INVALID_PARTY_SIZE: { status: 400, message: 'Party size is outside this café’s limits.' },
  GUEST_NAME_REQUIRED: { status: 400, message: 'Please enter your name.' },
  GUEST_PHONE_REQUIRED: { status: 400, message: 'Please enter a phone number.' },
  STARTS_AT_IN_PAST: { status: 400, message: 'That time has already passed.' },
  STARTS_AT_TOO_FAR: { status: 400, message: 'That date is too far in advance.' },
  VENUE_NOT_FOUND: { status: 404, message: 'This café is not accepting bookings.' },
}

function mapError(message: string): { status: number; message: string } | null {
  const code = Object.keys(FRIENDLY).find(key => message.includes(key))
  return code ? FRIENDLY[code] : null
}

/**
 * POST — public guest booking (no auth).
 * GET  — staff day list, gated by requireVenueRole.
 */
export async function POST(request: NextRequest) {
  let body: {
    venue_slug?: string
    client_uuid?: string
    guest_name?: string
    guest_phone?: string
    guest_email?: string
    party_size?: number
    starts_at?: string
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
    !body.party_size ||
    !body.starts_at
  ) {
    return NextResponse.json({ error: 'Missing required booking fields' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: venue, error: venueError } = await admin
    .from('venues')
    .select('venue_id, slug')
    .eq('slug', body.venue_slug)
    .maybeSingle()
  if (venueError || !venue) {
    return NextResponse.json({ error: 'This café is not accepting bookings.' }, { status: 404 })
  }

  // Rate limit (join pattern: events-table 10‑min window, >20 → 429).
  // create_reservation inserts reservation.created in SQL without ip_hash; smaller
  // than a p_ip_hash migration is a per-venue window count on those events (see
  // BUILD-LOG). Waitlist uses full IP-hash because emitEvent is route-owned.
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('events')
    .select('event_id', { count: 'exact', head: true })
    .eq('type', 'reservation.created')
    .eq('venue_id', venue.venue_id)
    .gte('ts', tenMinAgo)
  if ((count ?? 0) > 20) {
    return NextResponse.json({ error: 'Too many attempts — try again soon' }, { status: 429 })
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

  const { data, error } = await admin.rpc('create_reservation', {
    p_venue_id: venue.venue_id,
    p_client_uuid: body.client_uuid,
    p_guest_name: body.guest_name,
    p_guest_phone: body.guest_phone,
    p_guest_email: body.guest_email ?? null,
    p_party_size: body.party_size,
    p_starts_at: body.starts_at,
    p_notes: body.notes ?? null,
    p_member_id: memberId,
    p_source: 'guest',
  })

  if (error || !data) {
    const mapped = mapError(error?.message ?? '')
    if (mapped) {
      return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    }
    console.error('[reservations] create failed:', error)
    return NextResponse.json({ error: 'Could not create reservation.' }, { status: 500 })
  }

  const row = data as ReservationRow
  // Public-safe fields only — never echo phone/email.
  return NextResponse.json(
    {
      reservation_id: row.reservation_id,
      starts_at: row.starts_at,
      party_size: row.party_size,
      status: row.status,
    },
    { status: 201 }
  )
}

export async function GET(request: NextRequest) {
  const venueId = request.nextUrl.searchParams.get('venue_id')
  const date = request.nextUrl.searchParams.get('date') // YYYY-MM-DD venue-local
  const status = request.nextUrl.searchParams.get('status')

  const gate = await requireVenueRole(venueId, ['owner', 'manager', 'staff'])
  if (!gate.ok) return gate.response

  const admin = getSupabaseAdmin()
  const { data: venue } = await admin
    .from('venues')
    .select('timezone, reservation_config')
    .eq('venue_id', gate.ctx.venueId)
    .maybeSingle()
  const timeZone = venue?.timezone || 'UTC'
  const config = parseReservationConfig(venue?.reservation_config)

  // Day bounds in venue-local calendar day → UTC range for query.
  const day = date || venueLocalYmd(new Date(), timeZone)
  const [y, m, d] = day.split('-').map(Number)
  const rangeStart = venueDayBound(y, m, d, 0, 0, timeZone)
  const rangeEnd = venueDayBound(y, m, d + 1, 0, 0, timeZone)

  let query = admin
    .from('reservations')
    .select(
      'reservation_id, guest_name, guest_phone, party_size, status, starts_at, duration_minutes, notes, table_id, source, created_at'
    )
    .eq('venue_id', gate.ctx.venueId)
    .gte('starts_at', rangeStart.toISOString())
    .lt('starts_at', rangeEnd.toISOString())
    .order('starts_at', { ascending: true })
    .limit(500)

  if (status && status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) {
    console.error('[reservations] list failed:', error)
    return NextResponse.json({ error: 'Failed to load reservations' }, { status: 500 })
  }

  return NextResponse.json({
    reservations: data ?? [],
    date: day,
    timezone: timeZone,
    max_advance_days: config.max_advance_days,
    hours_configured: config.hours != null,
  })
}

function venueLocalYmd(date: Date, timeZone: string): string {
  const { y, m, d } = localParts(date, timeZone)
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function venueDayBound(
  y: number,
  m: number,
  d: number,
  hh: number,
  mm: number,
  timeZone: string
): Date {
  // Handle day overflow (d+1) via Date.UTC then correct offset.
  const utcGuess = new Date(Date.UTC(y, m - 1, d, hh, mm, 0))
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
  const asUtcGuess = utcGuess.getTime()
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
  return new Date(asUtcGuess - (asLocalRead - asUtcGuess))
}
