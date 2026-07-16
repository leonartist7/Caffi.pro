import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { intervalsOverlap, parseReservationConfig, slotStartsForDay } from '@/lib/reservations'

/**
 * Public GET — open slot start-times for a venue-local calendar day.
 * Read-only conflict checks; never calls locking find_available_table.
 */
export async function GET(request: NextRequest) {
  const venueSlug = request.nextUrl.searchParams.get('venue_slug')
  const partySize = Number(request.nextUrl.searchParams.get('party_size') || '0')
  const date = request.nextUrl.searchParams.get('date') // YYYY-MM-DD

  if (!venueSlug || !date || !Number.isFinite(partySize) || partySize < 1) {
    return NextResponse.json(
      { error: 'venue_slug, party_size, and date (YYYY-MM-DD) are required' },
      { status: 400 }
    )
  }

  const admin = getSupabaseAdmin()
  const { data: venue, error: venueError } = await admin
    .from('venues')
    .select('venue_id, timezone, reservation_config')
    .eq('slug', venueSlug)
    .maybeSingle()

  if (venueError || !venue) {
    return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
  }

  const config = parseReservationConfig(venue.reservation_config)
  const timeZone = venue.timezone || 'UTC'
  const { configured, slots: candidates } = slotStartsForDay({
    dateYmd: date,
    timeZone,
    config,
  })

  if (!configured) {
    return NextResponse.json({ configured: false, slots: [] as string[] })
  }
  if (candidates.length === 0) {
    return NextResponse.json({ configured: true, slots: [] as string[] })
  }

  if (partySize < config.min_party || partySize > config.max_party) {
    return NextResponse.json({ configured: true, slots: [] as string[] })
  }

  const dayStart = candidates[0]
  const dayEnd = new Date(
    candidates[candidates.length - 1].getTime() + config.default_duration_minutes * 60_000
  )

  const [{ data: tables }, { data: reservations }] = await Promise.all([
    admin
      .from('venue_tables')
      .select('table_id, capacity')
      .eq('venue_id', venue.venue_id)
      .eq('is_active', true)
      .gte('capacity', partySize),
    admin
      .from('reservations')
      .select('table_id, starts_at, duration_minutes, status')
      .eq('venue_id', venue.venue_id)
      .in('status', ['confirmed', 'seated'])
      .gte('starts_at', new Date(dayStart.getTime() - config.buffer_minutes * 60_000).toISOString())
      .lte('starts_at', dayEnd.toISOString()),
  ])

  const activeTables = tables ?? []
  if (activeTables.length === 0) {
    return NextResponse.json({ configured: true, slots: [] as string[] })
  }

  const open: string[] = []
  for (const start of candidates) {
    const end = new Date(start.getTime() + config.default_duration_minutes * 60_000)
    const freeTable = activeTables.some(table => {
      const conflicts = (reservations ?? []).filter(
        r =>
          r.table_id === table.table_id &&
          intervalsOverlap(
            start,
            end,
            new Date(r.starts_at),
            new Date(new Date(r.starts_at).getTime() + (r.duration_minutes || 90) * 60_000),
            config.buffer_minutes
          )
      )
      return conflicts.length === 0
    })
    if (freeTable) open.push(start.toISOString())
  }

  return NextResponse.json({ configured: true, slots: open })
}
