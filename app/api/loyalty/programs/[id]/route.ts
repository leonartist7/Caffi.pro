import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireRowVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'

const PROGRAM_COLUMNS = 'program_id, venue_id, type, name, status, config, created_at, updated_at'

const VALID_STATUSES = ['draft', 'active', 'paused', 'archived'] as const

/**
 * Status transitions only — a program's type/name/config are set at
 * creation. `draft -> active`, `active <-> paused`, and any non-archived
 * status -> `archived` are all allowed; the DB's own CHECK constraint is
 * the actual guard against an invalid status value, this just returns a
 * clean 400 before hitting it.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole(
    'loyalty_programs',
    'program_id',
    params.id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!gate.ok) return gate.response

  let body: { status?: string; config?: Record<string, unknown> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as (typeof VALID_STATUSES)[number])) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }
    update.status = body.status
  }
  if (body.config !== undefined) update.config = body.config

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }
  update.updated_at = new Date().toISOString()

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('loyalty_programs')
    .update(update)
    .eq('program_id', params.id)
    .select(PROGRAM_COLUMNS)
    .single()

  if (error || !data) {
    console.error('[loyalty/programs] update failed:', error)
    return NextResponse.json({ error: 'Failed to update program' }, { status: 500 })
  }

  if (body.status !== undefined) {
    void emitEvent({
      type: 'program.status_changed',
      actor: `user:${gate.ctx.user.id}`,
      venueId: gate.ctx.venueId,
      payload: { program_id: params.id, status: body.status },
    })
  }

  return NextResponse.json({ program: data })
}
