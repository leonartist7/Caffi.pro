import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireRowVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'

/**
 * PATCH/DELETE for a single staff membership. Row-scoped authz resolves
 * the membership's venue_id first (memberships uses venue_id, not the
 * legacy tenant_id column — see the venueColumn param on
 * requireRowVenueRole) so a guessed membership id can't be actioned
 * cross-venue.
 */
const VALID_ROLES = ['owner', 'manager', 'staff'] as const

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole(
    'memberships',
    'membership_id',
    params.id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!gate.ok) return gate.response

  let body: { role?: string; full_name?: string; is_active?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // A manager can only touch staff-role rows — mirrors the "managers can
  // only invite staff" rule from createInvite, but re-checked against the
  // TARGET row's current role, not just the role being requested. Without
  // this, a manager could deactivate/rename an owner via is_active/
  // full_name alone (no role field), since those fields aren't otherwise
  // role-gated.
  if (gate.ctx.role === 'manager') {
    const { data: target } = await admin
      .from('memberships')
      .select('role')
      .eq('membership_id', params.id)
      .single()
    if (target?.role !== 'staff') {
      return NextResponse.json(
        { error: 'Managers can only modify staff-role members' },
        { status: 403 }
      )
    }
  }

  const update: Record<string, unknown> = {}
  if (body.role !== undefined) {
    if (!VALID_ROLES.includes(body.role as (typeof VALID_ROLES)[number])) {
      return NextResponse.json(
        { error: `role must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      )
    }
    if (gate.ctx.role === 'manager' && body.role !== 'staff') {
      return NextResponse.json(
        { error: 'Managers can only assign the staff role' },
        { status: 403 }
      )
    }
    update.role = body.role
  }
  if (body.full_name !== undefined) update.full_name = body.full_name || null
  if (body.is_active !== undefined) update.is_active = Boolean(body.is_active)

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('memberships')
    .update(update)
    .eq('membership_id', params.id)
    .select('membership_id, role, full_name, is_active')
    .single()

  if (error || !data) {
    console.error('[staff] update failed:', error)
    return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 })
  }

  void emitEvent({
    type: body.is_active === false ? 'staff.deactivated' : 'staff.updated',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { membership_id: params.id, fields: Object.keys(update) },
  })

  return NextResponse.json({ staff: data })
}

/**
 * DELETE only removes PENDING invites (user_id IS NULL) — an accepted
 * member has real history hanging off their membership_id (visits they
 * logged, redemptions they processed at the counter) that must survive.
 * Deactivation for accepted members goes through PATCH { is_active: false }
 * instead; this route refuses with 409 rather than silently reinterpreting
 * DELETE as deactivate.
 */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole(
    'memberships',
    'membership_id',
    params.id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!gate.ok) return gate.response

  const admin = getSupabaseAdmin()
  const { data: existing, error: fetchError } = await admin
    .from('memberships')
    .select('membership_id, user_id, role')
    .eq('membership_id', params.id)
    .single()
  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
  }

  // Same "managers only touch staff-role rows" rule as PATCH — a manager
  // must not be able to revoke a pending owner/manager invite.
  if (gate.ctx.role === 'manager' && existing.role !== 'staff') {
    return NextResponse.json(
      { error: 'Managers can only modify staff-role members' },
      { status: 403 }
    )
  }

  if (existing.user_id) {
    return NextResponse.json(
      { error: 'This member has already accepted their invite — deactivate instead of deleting.' },
      { status: 409 }
    )
  }

  const { error } = await admin.from('memberships').delete().eq('membership_id', params.id)
  if (error) {
    console.error('[staff] invite revoke failed:', error)
    return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 })
  }

  void emitEvent({
    type: 'staff.deactivated',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { membership_id: params.id, invite_revoked: true },
  })
  return NextResponse.json({ ok: true })
}
