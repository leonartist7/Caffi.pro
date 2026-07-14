import { NextRequest, NextResponse } from 'next/server'
import { requireRowVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GROUP_COLUMNS = 'group_id, venue_id, item_id, name, min_select, max_select, created_at'

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
  const { data: groups, error } = await admin
    .from('modifier_groups')
    .select(GROUP_COLUMNS)
    .eq('item_id', params.id)
    .eq('venue_id', gate.ctx.venueId)
    .order('created_at')
  if (error) {
    console.error('[menu/modifier-groups] list failed:', error)
    return NextResponse.json({ error: 'Failed to load modifier groups' }, { status: 500 })
  }
  return NextResponse.json({ groups: groups ?? [] })
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

  let body: { name?: string; min_select?: number; max_select?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  const minSelect = body.min_select ?? 0
  const maxSelect = body.max_select ?? 1
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

  const { data, error } = await getSupabaseAdmin()
    .from('modifier_groups')
    .insert({
      venue_id: gate.ctx.venueId,
      item_id: params.id,
      name: body.name.trim(),
      min_select: minSelect,
      max_select: maxSelect,
    })
    .select(GROUP_COLUMNS)
    .single()
  if (error || !data) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'That modifier group already exists' }, { status: 409 })
    }
    console.error('[menu/modifier-groups] insert failed:', error)
    return NextResponse.json({ error: 'Failed to create modifier group' }, { status: 500 })
  }

  await emitEvent({
    type: 'menu.item_updated',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { item_id: params.id, modifier_group_created: data.group_id },
  })
  return NextResponse.json({ group: { ...data, modifiers: [] } }, { status: 201 })
}
