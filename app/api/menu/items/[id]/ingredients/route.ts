import { NextRequest, NextResponse } from 'next/server'
import { requireRowVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Recipe links for one menu item. Tenant coherence is a DB guarantee — the
 * composite FK on menu_item_ingredients(venue_id, inventory_item_id) makes
 * a cross-venue link physically unrepresentable (23503 on attempt). This
 * route's only job is to never take venue_id from the request body.
 */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole(
    'menu_items',
    'item_id',
    params.id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!gate.ok) return gate.response

  const admin = getSupabaseAdmin()
  const { data: ingredients, error } = await admin
    .from('menu_item_ingredients')
    .select('id, venue_id, item_id, inventory_item_id, qty_per_unit')
    .eq('item_id', params.id)
    .eq('venue_id', gate.ctx.venueId)
  if (error) {
    console.error('[menu/ingredients] list failed:', error)
    return NextResponse.json({ error: 'Failed to load recipe' }, { status: 500 })
  }

  // The full active catalogue for this venue, for the ingredient picker —
  // avoids a second round trip through the separate inventory-items list
  // API (owned by PLAN-23) for what is here just a name/unit lookup.
  const { data: availableItems } = await admin
    .from('inventory_items')
    .select('item_id, name, unit')
    .eq('venue_id', gate.ctx.venueId)
    .eq('is_active', true)
    .order('name')

  return NextResponse.json({
    ingredients: (ingredients ?? []).map(row => {
      const inventoryItem = (availableItems ?? []).find(i => i.item_id === row.inventory_item_id)
      return {
        ...row,
        inventory_item_name: inventoryItem?.name,
        inventory_item_unit: inventoryItem?.unit,
      }
    }),
    available_inventory_items: availableItems ?? [],
  })
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole(
    'menu_items',
    'item_id',
    params.id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!gate.ok) return gate.response

  let body: { inventory_item_id?: string; qty_per_unit?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.inventory_item_id) {
    return NextResponse.json({ error: 'inventory_item_id is required' }, { status: 400 })
  }
  if (typeof body.qty_per_unit !== 'number' || !(body.qty_per_unit > 0)) {
    return NextResponse.json({ error: 'qty_per_unit must be a positive number' }, { status: 400 })
  }

  const { data, error } = await getSupabaseAdmin()
    .from('menu_item_ingredients')
    .insert({
      venue_id: gate.ctx.venueId,
      item_id: params.id,
      inventory_item_id: body.inventory_item_id,
      qty_per_unit: body.qty_per_unit,
    })
    .select('id, venue_id, item_id, inventory_item_id, qty_per_unit')
    .single()
  if (error || !data) {
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'That ingredient is already on this recipe' },
        { status: 409 }
      )
    }
    if (error?.code === '23503') {
      return NextResponse.json(
        { error: 'That inventory item is not in this venue' },
        { status: 400 }
      )
    }
    console.error('[menu/ingredients] insert failed:', error)
    return NextResponse.json({ error: 'Failed to add ingredient' }, { status: 500 })
  }

  await emitEvent({
    type: 'menu.item_updated',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { item_id: params.id, ingredient_created: data.id },
  })
  return NextResponse.json({ ingredient: data }, { status: 201 })
}
