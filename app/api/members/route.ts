import { NextRequest, NextResponse } from 'next/server'
import { requireVenueRole } from '@/lib/authz'
import { listRegulars } from '@/lib/owner-stats'

const STATUSES = new Set(['new', 'regular', 'fading', 'lost'])

export async function GET(request: NextRequest) {
  const venueId = request.nextUrl.searchParams.get('venue_id')
  const gate = await requireVenueRole(venueId, ['owner', 'manager'])
  if (!gate.ok) return gate.response

  const status = request.nextUrl.searchParams.get('status') ?? undefined
  const search = request.nextUrl.searchParams.get('search') ?? undefined
  try {
    const members = await listRegulars(gate.ctx.venueId, {
      status: status && STATUSES.has(status) ? status : undefined,
      search,
      limit: 100,
    })
    return NextResponse.json({ members })
  } catch (error) {
    console.error('[members] list failed:', error)
    return NextResponse.json({ error: 'Failed to load members' }, { status: 500 })
  }
}
