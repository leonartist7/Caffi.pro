import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireRowVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'

/**
 * PATCH /api/ai-drafts/[id] — Approve/Edit/Skip from the ApprovalsInbox.
 * Body: { status: 'approved' | 'edited' | 'skipped', output?: string }
 * Row-scoped authz: resolves the draft's venue first, then requires
 * owner/manager on it — a guessed draft id can't be actioned cross-venue.
 */
const VALID = ['approved', 'edited', 'skipped'] as const

/**
 * Every status used to emit `ai_draft.approved`, so the activity feed
 * reported skips and edits as approvals. One event type per outcome.
 */
const EVENT_BY_STATUS = {
  approved: 'ai_draft.approved',
  edited: 'ai_draft.edited',
  skipped: 'ai_draft.skipped',
} as const

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole(
    'ai_drafts',
    'draft_id',
    params.id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!gate.ok) return gate.response

  let body: { status?: string; output?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.status || !VALID.includes(body.status as (typeof VALID)[number])) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID.join(', ')}` },
      { status: 400 }
    )
  }

  const admin = getSupabaseAdmin()
  const update: Record<string, unknown> = { status: body.status }
  if (body.status === 'edited' && typeof body.output === 'string') {
    update.output = body.output
  }

  const { data, error } = await admin
    .from('ai_drafts')
    .update(update)
    .eq('draft_id', params.id)
    .select('draft_id, status')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }

  void emitEvent({
    type: EVENT_BY_STATUS[body.status as (typeof VALID)[number]],
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { draft_id: params.id, status: body.status },
  })

  return NextResponse.json(data)
}
