import { NextRequest, NextResponse } from 'next/server'
import { requireRowVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole(
    'menu_item_ingredients',
    'id',
    params.id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!gate.ok) return gate.response

  let body: { qty_per_unit?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  // qty_per_unit only — never re-point item_id/inventory_item_id/venue_id.
  if (typeof body.qty_per_unit !== 'number' || !(body.qty_per_unit > 0)) {
    return NextResponse.json({ error: 'qty_per_unit must be a positive number' }, { status: 400 })
  }

  const { data, error } = await getSupabaseAdmin()
    .from('menu_item_ingredients')
    .update({ qty_per_unit: body.qty_per_unit })
    .eq('id', params.id)
    .select('id, venue_id, item_id, inventory_item_id, qty_per_unit')
    .single()
  if (error || !data) {
    console.error('[menu/ingredients] update failed:', error)
    return NextResponse.json({ error: 'Failed to update ingredient' }, { status: 500 })
  }

  await emitEvent({
    type: 'menu.item_updated',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { item_id: data.item_id, ingredient_updated: params.id },
  })
  return NextResponse.json({ ingredient: data })
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole(
    'menu_item_ingredients',
    'id',
    params.id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!gate.ok) return gate.response

  const admin = getSupabaseAdmin()
  const { data: ingredient } = await admin
    .from('menu_item_ingredients')
    .select('item_id')
    .eq('id', params.id)
    .maybeSingle()
  const { error } = await admin.from('menu_item_ingredients').delete().eq('id', params.id)
  if (error) {
    console.error('[menu/ingredients] delete failed:', error)
    return NextResponse.json({ error: 'Failed to remove ingredient' }, { status: 500 })
  }

  await emitEvent({
    type: 'menu.item_updated',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { item_id: ingredient?.item_id, ingredient_deleted: params.id },
  })
  return NextResponse.json({ ok: true })
}
