import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireRowVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'

/**
 * PATCH: owner closes a stuck-open shift. Writes ONLY `ended_at` (and
 * appends `note`) on the original row — started_at/membership_id/source/
 * shift_id are all untouched, and the original stays a `source: 'counter'`
 * row (correction is who touched it, not a new record — see PLAN-35.md).
 * Only valid while the shift is still open; already-closed shifts can't be
 * rewritten here (use "add missed shift" for a separate uncaptured period).
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const authz = await requireRowVenueRole(
    'staff_shifts',
    'shift_id',
    params.id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!authz.ok) return authz.response

  let body: { ended_at?: string; note?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.ended_at) {
    return NextResponse.json({ error: 'ended_at is required' }, { status: 400 })
  }
  const endedAt = new Date(body.ended_at)
  if (Number.isNaN(endedAt.getTime())) {
    return NextResponse.json({ error: 'Invalid ended_at' }, { status: 400 })
  }
  if (endedAt.getTime() > Date.now()) {
    return NextResponse.json({ error: 'ended_at cannot be in the future' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: shift } = await admin
    .from('staff_shifts')
    .select('shift_id, started_at, ended_at, membership_id, note')
    .eq('shift_id', params.id)
    .single()
  if (!shift) {
    return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
  }
  if (shift.ended_at) {
    return NextResponse.json({ error: 'Shift is already closed' }, { status: 409 })
  }
  if (endedAt < new Date(shift.started_at)) {
    return NextResponse.json({ error: 'ended_at must be on or after started_at' }, { status: 400 })
  }

  const correctionNote = body.note?.trim()
  const mergedNote = correctionNote
    ? [shift.note, `[owner correction] ${correctionNote}`].filter(Boolean).join(' — ')
    : shift.note

  const { error } = await admin
    .from('staff_shifts')
    .update({ ended_at: endedAt.toISOString(), note: mergedNote })
    .eq('shift_id', params.id)
    .is('ended_at', null)

  if (error) {
    console.error('[staff/shifts/[id]] close stuck shift failed:', error.message)
    return NextResponse.json({ error: 'Could not close shift' }, { status: 500 })
  }

  void emitEvent({
    type: 'shift.corrected',
    actor: `user:${authz.ctx.user.id}`,
    venueId: authz.ctx.venueId,
    payload: { action: 'closed_stuck', shift_id: params.id, membership_id: shift.membership_id },
  })

  return NextResponse.json({ ok: true })
}
