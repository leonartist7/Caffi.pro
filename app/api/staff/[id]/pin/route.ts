import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireRowVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'

/**
 * POST /api/staff/[id]/pin — sets the counter PIN for a staff membership.
 * Delegates the actual hash to set_counter_pin (SECURITY DEFINER, bcrypt
 * via pgcrypto) so the hash never touches application code. The RPC itself
 * also enforces role='staff' and 4-8 digits — this route's own regex check
 * gives a friendlier 400 before that round trip, not the source of truth.
 */
const PIN_RE = /^[0-9]{4,6}$/

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole(
    'memberships',
    'membership_id',
    params.id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!gate.ok) return gate.response

  let body: { pin?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body.pin !== 'string' || !PIN_RE.test(body.pin)) {
    return NextResponse.json({ error: 'PIN must be 4-6 digits' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { error } = await admin.rpc('set_counter_pin', {
    p_membership_id: params.id,
    p_pin: body.pin,
  })

  if (error) {
    // set_counter_pin raises if the membership isn't role='staff' — surface
    // that as a client error rather than a generic 500.
    const message = error.message.includes('not a staff membership')
      ? 'Only staff-role members can have a counter PIN'
      : 'Failed to set PIN'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  void emitEvent({
    type: 'staff.pin_set',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { membership_id: params.id },
  })

  return NextResponse.json({ ok: true })
}
