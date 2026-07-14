import { NextRequest, NextResponse } from 'next/server'
import { requireRowVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GROUP_COLUMNS = 'group_id, venue_id, item_id, name, min_select, max_select, created_at'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole(
    'modifier_groups',
    'group_id',
    params.id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!gate.ok) return gate.response

  let body: { name?: string; min_select?: number; max_select?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: current, error: currentError } = await admin
    .from('modifier_groups')
    .select('item_id, min_select, max_select')
    .eq('group_id', params.id)
    .single()
  if (currentError || !current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const update: Record<string, unknown> = {}
  if (body.name !== undefined) {
    if (!body.name.trim())
      return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
    update.name = body.name.trim()
  }
  const minSelect = body.min_select ?? current.min_select
  const maxSelect = body.max_select ?? current.max_select
  if (!Number.isInteger(minSelect) || minSelect < 0) {
    return NextResponse.json(
      { error: 'min_select must be a non-negative integer' },
      { status: 400 }
    )
  }
  if (!Number.isInteger(maxSelect) || maxSelect < minSelect) {
    return NextResponse.json(
      { error: 'max_select must be an integer at least min_select' },
      { status: 400 }
    )
  }
  if (body.min_select !== undefined) update.min_select = minSelect
  if (body.max_select !== undefined) update.max_select = maxSelect
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('modifier_groups')
    .update(update)
    .eq('group_id', params.id)
    .select(GROUP_COLUMNS)
    .single()
  if (error || !data) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'That modifier group already exists' }, { status: 409 })
    }
    console.error('[menu/modifier-groups] update failed:', error)
    return NextResponse.json({ error: 'Failed to update modifier group' }, { status: 500 })
  }

  await emitEvent({
    type: 'menu.item_updated',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { item_id: current.item_id, modifier_group_updated: params.id },
  })
  return NextResponse.json({ group: data })
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole(
    'modifier_groups',
    'group_id',
    params.id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!gate.ok) return gate.response

  const admin = getSupabaseAdmin()
  const { data: current } = await admin
    .from('modifier_groups')
    .select('item_id')
    .eq('group_id', params.id)
    .maybeSingle()
  const { error } = await admin.from('modifier_groups').delete().eq('group_id', params.id)
  if (error) {
    console.error('[menu/modifier-groups] delete failed:', error)
    return NextResponse.json({ error: 'Failed to delete modifier group' }, { status: 500 })
  }

  await emitEvent({
    type: 'menu.item_updated',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { item_id: current?.item_id, modifier_group_deleted: params.id },
  })
  return NextResponse.json({ ok: true })
}
