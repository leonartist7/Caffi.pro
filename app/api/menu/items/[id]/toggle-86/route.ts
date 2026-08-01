import { NextRequest, NextResponse } from 'next/server'
import { requireRowVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const ITEM_COLUMNS =
  'item_id, venue_id, category_id, name, description, price_cents, image_url, is_active, sort_order, dietary_tags, created_at, updated_at, is_86ed, auto_86ed'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole(
    'menu_items',
    'item_id',
    params.id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!gate.ok) return gate.response

  let body: { is_86ed?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (typeof body.is_86ed !== 'boolean') {
    return NextResponse.json({ error: 'is_86ed must be a boolean' }, { status: 400 })
  }

  // A manual decision always outranks an automatic one: this endpoint
  // always clears auto_86ed, whichever direction it's toggling.
  const { data, error } = await getSupabaseAdmin()
    .from('menu_items')
    .update({ is_86ed: body.is_86ed, auto_86ed: false })
    .eq('item_id', params.id)
    .select(ITEM_COLUMNS)
    .single()
  if (error || !data) {
    console.error('[menu/items] toggle-86 failed:', error)
    return NextResponse.json({ error: 'Failed to update item availability' }, { status: 500 })
  }

  await emitEvent({
    type: body.is_86ed ? 'menu.item_86ed' : 'menu.item_restored',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { item_id: params.id, name: data.name, auto: false },
  })
  return NextResponse.json({ item: data })
}
