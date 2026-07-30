import { NextRequest, NextResponse } from 'next/server'
import { requireAroAdmin } from '@/lib/authz'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { startImpersonation, endImpersonation } from '@/lib/impersonation'
import { emitEvent } from '@/lib/events'

/**
 * PLAN-09: aro_admin "Operate as this venue". Gate first, body second —
 * same order as every other authz-checked route in this codebase.
 */
export async function POST(req: NextRequest) {
  const gate = await requireAroAdmin()
  if (!gate.ok) return gate.response

  const body = await req.json().catch(() => null)
  const venueId = body?.venue_id
  if (typeof venueId !== 'string' || !venueId) {
    return NextResponse.json({ error: 'venue_id is required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: venue } = await admin
    .from('venues')
    .select('venue_id, business_name')
    .eq('venue_id', venueId)
    .maybeSingle()
  if (!venue) {
    return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
  }

  startImpersonation(venue.venue_id, gate.ctx.user.id)

  void emitEvent({
    type: 'admin.impersonation_started',
    actor: `user:${gate.ctx.user.id}`,
    venueId: venue.venue_id,
    payload: { venue_name: venue.business_name },
  })

  return NextResponse.json({ ok: true, venueId: venue.venue_id, venueName: venue.business_name })
}

export async function DELETE() {
  const gate = await requireAroAdmin()
  if (!gate.ok) return gate.response

  endImpersonation()

  void emitEvent({
    type: 'admin.impersonation_ended',
    actor: `user:${gate.ctx.user.id}`,
    venueId: null,
  })

  return NextResponse.json({ ok: true })
}
