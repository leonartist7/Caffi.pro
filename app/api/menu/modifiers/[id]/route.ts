import { NextRequest, NextResponse } from 'next/server'
import { requireRowVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const MODIFIER_COLUMNS =
  'modifier_id, group_id, venue_id, name, price_delta_cents, is_active, sort_order'

async function itemIdForModifier(modifierId: string): Promise<string | null> {
  const admin = getSupabaseAdmin()
  const { data: modifier } = await admin
    .from('modifiers')
    .select('group_id')
    .eq('modifier_id', modifierId)
    .maybeSingle()
  if (!modifier) return null
  const { data: group } = await admin
    .from('modifier_groups')
    .select('item_id')
    .eq('group_id', modifier.group_id)
    .maybeSingle()
  return group?.item_id ?? null
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole(
    'modifiers',
    'modifier_id',
    params.id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!gate.ok) return gate.response

  let body: { name?: string; price_delta_cents?: number; is_active?: boolean; sort_order?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (body.name !== undefined) {
    if (!body.name.trim())
      return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
    update.name = body.name.trim()
  }
  if (body.price_delta_cents !== undefined) {
    if (!Number.isInteger(body.price_delta_cents)) {
      return NextResponse.json({ error: 'price_delta_cents must be an integer' }, { status: 400 })
    }
    update.price_delta_cents = body.price_delta_cents
  }
  if (body.is_active !== undefined) update.is_active = Boolean(body.is_active)
  if (body.sort_order !== undefined) {
    if (!Number.isInteger(body.sort_order)) {
      return NextResponse.json({ error: 'sort_order must be an integer' }, { status: 400 })
    }
    update.sort_order = body.sort_order
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const itemId = await itemIdForModifier(params.id)
  const { data, error } = await getSupabaseAdmin()
    .from('modifiers')
    .update(update)
    .eq('modifier_id', params.id)
    .select(MODIFIER_COLUMNS)
    .single()
  if (error || !data) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'That modifier already exists' }, { status: 409 })
    }
    console.error('[menu/modifiers] update failed:', error)
    return NextResponse.json({ error: 'Failed to update modifier' }, { status: 500 })
  }

  await emitEvent({
    type: 'menu.item_updated',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { item_id: itemId, modifier_updated: params.id },
  })
  return NextResponse.json({ modifier: data })
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole(
    'modifiers',
    'modifier_id',
    params.id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!gate.ok) return gate.response

  const itemId = await itemIdForModifier(params.id)
  const { error } = await getSupabaseAdmin().from('modifiers').delete().eq('modifier_id', params.id)
  if (error) {
    console.error('[menu/modifiers] delete failed:', error)
    return NextResponse.json({ error: 'Failed to delete modifier' }, { status: 500 })
  }

  await emitEvent({
    type: 'menu.item_updated',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { item_id: itemId, modifier_deleted: params.id },
  })
  return NextResponse.json({ ok: true })
}
