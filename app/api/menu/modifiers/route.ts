import { NextRequest, NextResponse } from 'next/server'
import { requireRowVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const MODIFIER_COLUMNS =
  'modifier_id, group_id, venue_id, name, price_delta_cents, is_active, sort_order'

export async function POST(request: NextRequest) {
  let body: {
    group_id?: string
    name?: string
    price_delta_cents?: number
    is_active?: boolean
    sort_order?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.group_id) return NextResponse.json({ error: 'group_id is required' }, { status: 400 })

  const gate = await requireRowVenueRole(
    'modifier_groups',
    'group_id',
    body.group_id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!gate.ok) return gate.response
  if (!body.name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (body.price_delta_cents !== undefined && !Number.isInteger(body.price_delta_cents)) {
    return NextResponse.json({ error: 'price_delta_cents must be an integer' }, { status: 400 })
  }
  if (body.sort_order !== undefined && !Number.isInteger(body.sort_order)) {
    return NextResponse.json({ error: 'sort_order must be an integer' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: group } = await admin
    .from('modifier_groups')
    .select('item_id')
    .eq('group_id', body.group_id)
    .single()
  const { data, error } = await admin
    .from('modifiers')
    .insert({
      group_id: body.group_id,
      venue_id: gate.ctx.venueId,
      name: body.name.trim(),
      price_delta_cents: body.price_delta_cents ?? 0,
      is_active: body.is_active ?? true,
      sort_order: body.sort_order ?? 0,
    })
    .select(MODIFIER_COLUMNS)
    .single()
  if (error || !data) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'That modifier already exists' }, { status: 409 })
    }
    console.error('[menu/modifiers] insert failed:', error)
    return NextResponse.json({ error: 'Failed to create modifier' }, { status: 500 })
  }

  await emitEvent({
    type: 'menu.item_updated',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { item_id: group?.item_id, modifier_created: data.modifier_id },
  })
  return NextResponse.json({ modifier: data }, { status: 201 })
}
