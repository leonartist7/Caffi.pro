import { NextRequest, NextResponse } from 'next/server'
import { requireRowVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { INVENTORY_UNITS } from '@/lib/inventory/types'

const ITEM_COLUMNS =
  'item_id, venue_id, name, unit, cost_per_unit_cents, par_level, is_active, created_at, updated_at'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole(
    'inventory_items',
    'item_id',
    params.id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!gate.ok) return gate.response

  let body: {
    name?: string
    unit?: string
    cost_per_unit_cents?: number | null
    par_level?: number | null
    is_active?: boolean
  }
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
  if (body.unit !== undefined) {
    if (!INVENTORY_UNITS.includes(body.unit as (typeof INVENTORY_UNITS)[number])) {
      return NextResponse.json(
        { error: `unit must be one of ${INVENTORY_UNITS.join(', ')}` },
        { status: 400 }
      )
    }
    update.unit = body.unit
  }
  if (body.cost_per_unit_cents !== undefined) {
    if (
      body.cost_per_unit_cents !== null &&
      (!Number.isInteger(body.cost_per_unit_cents) || body.cost_per_unit_cents < 0)
    ) {
      return NextResponse.json(
        { error: 'cost_per_unit_cents must be a non-negative integer' },
        { status: 400 }
      )
    }
    update.cost_per_unit_cents = body.cost_per_unit_cents
  }
  if (body.par_level !== undefined) {
    if (body.par_level !== null && (typeof body.par_level !== 'number' || body.par_level < 0)) {
      return NextResponse.json(
        { error: 'par_level must be a non-negative number' },
        { status: 400 }
      )
    }
    update.par_level = body.par_level
  }
  if (body.is_active !== undefined) update.is_active = Boolean(body.is_active)
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await getSupabaseAdmin()
    .from('inventory_items')
    .update(update)
    .eq('item_id', params.id)
    .select(ITEM_COLUMNS)
    .single()
  if (error || !data) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'That inventory item already exists' }, { status: 409 })
    }
    console.error('[inventory/items] update failed:', error)
    return NextResponse.json({ error: 'Failed to update inventory item' }, { status: 500 })
  }

  await emitEvent({
    type: 'inventory.item_updated',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { item_id: params.id, fields: Object.keys(update) },
  })
  return NextResponse.json({ item: data })
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole(
    'inventory_items',
    'item_id',
    params.id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!gate.ok) return gate.response

  const admin = getSupabaseAdmin()
  const { data: item } = await admin
    .from('inventory_items')
    .select('name')
    .eq('item_id', params.id)
    .maybeSingle()
  const { error } = await admin.from('inventory_items').delete().eq('item_id', params.id)
  if (error) {
    // inventory_movements_venue_item_fk is ON DELETE RESTRICT — an item
    // with movement history cannot be deleted. That is the correct
    // behaviour (history must not silently vanish), not a bug to work
    // around. Turn off the item instead.
    if (error.code === '23503') {
      return NextResponse.json(
        {
          error: 'This item has stock history and cannot be deleted. Mark it inactive instead.',
        },
        { status: 409 }
      )
    }
    console.error('[inventory/items] delete failed:', error)
    return NextResponse.json({ error: 'Failed to delete inventory item' }, { status: 500 })
  }

  await emitEvent({
    type: 'inventory.item_deleted',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { item_id: params.id, name: item?.name },
  })
  return NextResponse.json({ ok: true })
}
