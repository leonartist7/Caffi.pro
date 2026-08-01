import { NextRequest, NextResponse } from 'next/server'
import { requireVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { INVENTORY_UNITS, type InventoryItemWithStock } from '@/lib/inventory/types'

const ITEM_COLUMNS =
  'item_id, venue_id, name, unit, cost_per_unit_cents, par_level, is_active, created_at, updated_at'

export async function GET(request: NextRequest) {
  const gate = await requireVenueRole(request.nextUrl.searchParams.get('venue_id'), [
    'owner',
    'manager',
  ])
  if (!gate.ok) return gate.response

  const admin = getSupabaseAdmin()
  const { data: items, error } = await admin
    .from('inventory_items')
    .select(ITEM_COLUMNS)
    .eq('venue_id', gate.ctx.venueId)
    .order('name')
  if (error) {
    console.error('[inventory/items] list failed:', error)
    return NextResponse.json({ error: 'Failed to load inventory items' }, { status: 500 })
  }

  const itemRows = items ?? []
  if (itemRows.length === 0) return NextResponse.json({ items: [] })

  // On-hand is always derived from movements, never stored — same doctrine
  // as member_balances. One aggregate query for every item in the venue.
  const { data: movements, error: movementError } = await admin
    .from('inventory_movements')
    .select('item_id, qty')
    .eq('venue_id', gate.ctx.venueId)
  if (movementError) {
    console.error('[inventory/items] movement aggregate failed:', movementError)
    return NextResponse.json({ error: 'Failed to load stock levels' }, { status: 500 })
  }

  const onHandByItem = new Map<string, number>()
  for (const movement of movements ?? []) {
    onHandByItem.set(movement.item_id, (onHandByItem.get(movement.item_id) ?? 0) + movement.qty)
  }

  const hydrated: InventoryItemWithStock[] = itemRows.map(item => {
    const onHand = onHandByItem.get(item.item_id) ?? 0
    return {
      ...item,
      on_hand: onHand,
      below_par: item.par_level !== null && onHand < item.par_level,
    }
  })
  return NextResponse.json({ items: hydrated })
}

export async function POST(request: NextRequest) {
  let body: {
    venue_id?: string
    name?: string
    unit?: string
    cost_per_unit_cents?: number | null
    par_level?: number | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const gate = await requireVenueRole(body.venue_id, ['owner', 'manager'])
  if (!gate.ok) return gate.response
  if (!body.name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!body.unit || !INVENTORY_UNITS.includes(body.unit as (typeof INVENTORY_UNITS)[number])) {
    return NextResponse.json(
      { error: `unit must be one of ${INVENTORY_UNITS.join(', ')}` },
      { status: 400 }
    )
  }
  if (
    body.cost_per_unit_cents !== undefined &&
    body.cost_per_unit_cents !== null &&
    (!Number.isInteger(body.cost_per_unit_cents) || body.cost_per_unit_cents < 0)
  ) {
    return NextResponse.json(
      { error: 'cost_per_unit_cents must be a non-negative integer' },
      { status: 400 }
    )
  }
  if (
    body.par_level !== undefined &&
    body.par_level !== null &&
    (typeof body.par_level !== 'number' || body.par_level < 0)
  ) {
    return NextResponse.json({ error: 'par_level must be a non-negative number' }, { status: 400 })
  }

  const { data, error } = await getSupabaseAdmin()
    .from('inventory_items')
    .insert({
      venue_id: gate.ctx.venueId,
      name: body.name.trim(),
      unit: body.unit,
      cost_per_unit_cents: body.cost_per_unit_cents ?? null,
      par_level: body.par_level ?? null,
    })
    .select(ITEM_COLUMNS)
    .single()

  if (error || !data) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'That inventory item already exists' }, { status: 409 })
    }
    console.error('[inventory/items] insert failed:', error)
    return NextResponse.json({ error: 'Failed to create inventory item' }, { status: 500 })
  }

  await emitEvent({
    type: 'inventory.item_created',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { item_id: data.item_id, name: data.name },
  })
  return NextResponse.json({ item: { ...data, on_hand: 0, below_par: false } }, { status: 201 })
}
