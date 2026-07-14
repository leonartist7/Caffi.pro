import { NextRequest, NextResponse } from 'next/server'
import { requireVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const ITEM_COLUMNS =
  'item_id, venue_id, category_id, name, description, price_cents, image_url, is_active, sort_order, dietary_tags, created_at, updated_at'
const GROUP_COLUMNS = 'group_id, venue_id, item_id, name, min_select, max_select, created_at'
const MODIFIER_COLUMNS =
  'modifier_id, group_id, venue_id, name, price_delta_cents, is_active, sort_order'

function normalizeTags(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some(tag => typeof tag !== 'string')) return null
  return [...new Set(value.map(tag => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 20)
}

function normalizeImageUrl(value: unknown): { valid: boolean; value: string | null } {
  if (value === null || value === undefined || value === '') return { valid: true, value: null }
  if (typeof value !== 'string') return { valid: false, value: null }
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol)
      ? { valid: true, value: url.toString() }
      : { valid: false, value: null }
  } catch {
    return { valid: false, value: null }
  }
}

async function categoryBelongsToVenue(categoryId: string, venueId: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from('menu_categories')
    .select('category_id')
    .eq('category_id', categoryId)
    .eq('venue_id', venueId)
    .maybeSingle()
  return !error && Boolean(data)
}

export async function GET(request: NextRequest) {
  const gate = await requireVenueRole(request.nextUrl.searchParams.get('venue_id'), [
    'owner',
    'manager',
  ])
  if (!gate.ok) return gate.response

  const admin = getSupabaseAdmin()
  const { data: items, error: itemError } = await admin
    .from('menu_items')
    .select(ITEM_COLUMNS)
    .eq('venue_id', gate.ctx.venueId)
    .order('sort_order')
    .order('name')
  if (itemError) {
    console.error('[menu/items] list failed:', itemError)
    return NextResponse.json({ error: 'Failed to load menu items' }, { status: 500 })
  }

  const itemRows = items ?? []
  if (itemRows.length === 0) return NextResponse.json({ items: [] })

  const itemIds = itemRows.map(item => item.item_id)
  const { data: groups, error: groupError } = await admin
    .from('modifier_groups')
    .select(GROUP_COLUMNS)
    .eq('venue_id', gate.ctx.venueId)
    .in('item_id', itemIds)
    .order('created_at')
  if (groupError) {
    console.error('[menu/items] modifier groups failed:', groupError)
    return NextResponse.json({ error: 'Failed to load modifiers' }, { status: 500 })
  }

  const groupRows = groups ?? []
  const groupIds = groupRows.map(group => group.group_id)
  const { data: modifiers, error: modifierError } = groupIds.length
    ? await admin
        .from('modifiers')
        .select(MODIFIER_COLUMNS)
        .eq('venue_id', gate.ctx.venueId)
        .in('group_id', groupIds)
        .order('sort_order')
        .order('name')
    : { data: [], error: null }
  if (modifierError) {
    console.error('[menu/items] modifiers failed:', modifierError)
    return NextResponse.json({ error: 'Failed to load modifiers' }, { status: 500 })
  }

  const hydratedGroups = groupRows.map(group => ({
    ...group,
    modifiers: (modifiers ?? []).filter(modifier => modifier.group_id === group.group_id),
  }))
  return NextResponse.json({
    items: itemRows.map(item => ({
      ...item,
      modifier_groups: hydratedGroups.filter(group => group.item_id === item.item_id),
    })),
  })
}

export async function POST(request: NextRequest) {
  let body: {
    venue_id?: string
    category_id?: string | null
    name?: string
    description?: string | null
    price_cents?: number
    image_url?: string | null
    is_active?: boolean
    sort_order?: number
    dietary_tags?: string[]
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const gate = await requireVenueRole(body.venue_id, ['owner', 'manager'])
  if (!gate.ok) return gate.response
  if (!body.name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!Number.isInteger(body.price_cents) || (body.price_cents as number) < 0) {
    return NextResponse.json(
      { error: 'price_cents must be a non-negative integer' },
      { status: 400 }
    )
  }
  if (body.sort_order !== undefined && !Number.isInteger(body.sort_order)) {
    return NextResponse.json({ error: 'sort_order must be an integer' }, { status: 400 })
  }
  if (body.category_id && !(await categoryBelongsToVenue(body.category_id, gate.ctx.venueId))) {
    return NextResponse.json({ error: 'category does not belong to this venue' }, { status: 400 })
  }
  const image = normalizeImageUrl(body.image_url)
  if (!image.valid)
    return NextResponse.json({ error: 'image_url must be HTTP(S)' }, { status: 400 })
  const tags = normalizeTags(body.dietary_tags ?? [])
  if (!tags) return NextResponse.json({ error: 'dietary_tags must be strings' }, { status: 400 })

  const { data, error } = await getSupabaseAdmin()
    .from('menu_items')
    .insert({
      venue_id: gate.ctx.venueId,
      category_id: body.category_id || null,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      price_cents: body.price_cents,
      image_url: image.value,
      is_active: body.is_active ?? true,
      sort_order: body.sort_order ?? 0,
      dietary_tags: tags,
    })
    .select(ITEM_COLUMNS)
    .single()

  if (error || !data) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'That menu item already exists' }, { status: 409 })
    }
    console.error('[menu/items] insert failed:', error)
    return NextResponse.json({ error: 'Failed to create menu item' }, { status: 500 })
  }

  await emitEvent({
    type: 'menu.item_created',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { item_id: data.item_id, name: data.name },
  })
  return NextResponse.json({ item: { ...data, modifier_groups: [] } }, { status: 201 })
}
