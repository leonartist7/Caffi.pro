import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireRowVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'

/**
 * GET  — public status (first-name only, mirrors orders/[id]/status).
 * PATCH — staff status transition, gated + update_reservation_status RPC.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { data, error } = await getSupabaseAdmin()
    .from('reservations')
    .select('reservation_id, status, starts_at, party_size, guest_name')
    .eq('reservation_id', params.id)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
  }

  return NextResponse.json({
    reservation_id: data.reservation_id,
    status: data.status,
    starts_at: data.starts_at,
    party_size: data.party_size,
    first_name: data.guest_name?.trim().split(/\s+/)[0] || 'Guest',
  })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole(
    'reservations',
    'reservation_id',
    params.id,
    ['owner', 'manager', 'staff'],
    'venue_id'
  )
  if (!gate.ok) return gate.response

  let body: { status?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.status) {
    return NextResponse.json({ error: 'status is required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin.rpc('update_reservation_status', {
    p_reservation_id: params.id,
    p_new_status: body.status,
  })

  if (error || !data) {
    const msg = error?.message ?? ''
    if (msg.includes('ILLEGAL_RESERVATION_TRANSITION')) {
      return NextResponse.json({ error: 'That status change is not allowed.' }, { status: 400 })
    }
    if (msg.includes('RESERVATION_NOT_FOUND')) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }
    console.error('[reservations] status update failed:', error)
    return NextResponse.json({ error: 'Failed to update reservation' }, { status: 500 })
  }

  const row = data as {
    reservation_id: string
    status: string
    starts_at: string
    party_size: number
    guest_name: string
  }

  void emitEvent({
    type: 'reservation.status_changed',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: {
      reservation_id: row.reservation_id,
      to: row.status,
    },
  })

  return NextResponse.json({
    reservation_id: row.reservation_id,
    status: row.status,
    starts_at: row.starts_at,
    party_size: row.party_size,
    guest_name: row.guest_name,
  })
}
