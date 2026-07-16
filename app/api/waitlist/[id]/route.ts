import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireRowVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'

/** Legal transitions: waiting→notified→seated, waiting→canceled, any→expired. */
function isLegalWaitlistTransition(from: string, to: string): boolean {
  if (from === to) return true
  if (to === 'expired') return true
  if (from === 'waiting' && (to === 'notified' || to === 'canceled' || to === 'seated')) return true
  if (from === 'notified' && (to === 'seated' || to === 'canceled')) return true
  return false
}

/**
 * PATCH — staff waitlist status. Simple gated update (no SECURITY DEFINER);
 * mirrors app/api/staff/[id] style simple status PATCHes.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole(
    'waitlist_entries',
    'waitlist_id',
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
  const { data: existing, error: fetchError } = await admin
    .from('waitlist_entries')
    .select('waitlist_id, status')
    .eq('waitlist_id', params.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const from = existing.status as string
  if (!isLegalWaitlistTransition(from, body.status)) {
    return NextResponse.json({ error: 'That status change is not allowed.' }, { status: 400 })
  }

  if (from === body.status) {
    return NextResponse.json({ entry: existing })
  }

  const { data, error } = await admin
    .from('waitlist_entries')
    .update({ status: body.status })
    .eq('waitlist_id', params.id)
    .select('waitlist_id, status, guest_name, party_size, joined_at')
    .single()

  if (error || !data) {
    console.error('[waitlist] status update failed:', error)
    return NextResponse.json({ error: 'Failed to update waitlist entry' }, { status: 500 })
  }

  void emitEvent({
    type: 'waitlist.status_changed',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { waitlist_id: data.waitlist_id, from, to: data.status },
  })

  return NextResponse.json({ entry: data })
}
