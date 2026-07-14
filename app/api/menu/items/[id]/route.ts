import { NextRequest, NextResponse } from 'next/server'
import { requireRowVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const ITEM_COLUMNS =
  'item_id, venue_id, category_id, name, description, price_cents, image_url, is_active, sort_order, dietary_tags, created_at, updated_at'

function normalizeTags(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some(tag => typeof tag !== 'string')) return null
  return [...new Set(value.map(tag => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 20)
}

function normalizeImageUrl(value: unknown): { valid: boolean; value: string | null } {
  if (value === null || value === '') return { valid: true, value: null }
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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole(
    'menu_items',
    'item_id',
    params.id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!gate.ok) return gate.response

  let body: {
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

  const update: Record<string, unknown> = {}
  if (body.name !== undefined) {
    if (!body.name.trim())
      return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
    update.name = body.name.trim()
  }
  if (body.description !== undefined) update.description = body.description?.trim() || null
  if (body.price_cents !== undefined) {
    if (!Number.isInteger(body.price_cents) || body.price_cents < 0) {
      return NextResponse.json(
        { error: 'price_cents must be a non-negative integer' },
        { status: 400 }
      )
    }
    update.price_cents = body.price_cents
  }
  if (body.sort_order !== undefined) {
    if (!Number.isInteger(body.sort_order)) {
      return NextResponse.json({ error: 'sort_order must be an integer' }, { status: 400 })
    }
    update.sort_order = body.sort_order
  }
  if (body.is_active !== undefined) update.is_active = Boolean(body.is_active)
  if (body.category_id !== undefined) {
    if (body.category_id) {
      const { data, error } = await getSupabaseAdmin()
        .from('menu_categories')
        .select('category_id')
        .eq('category_id', body.category_id)
        .eq('venue_id', gate.ctx.venueId)
        .maybeSingle()
      if (error || !data) {
        return NextResponse.json(
          { error: 'category does not belong to this venue' },
          { status: 400 }
        )
      }
    }
    update.category_id = body.category_id || null
  }
  if (body.image_url !== undefined) {
    const image = normalizeImageUrl(body.image_url)
    if (!image.valid)
      return NextResponse.json({ error: 'image_url must be HTTP(S)' }, { status: 400 })
    update.image_url = image.value
  }
  if (body.dietary_tags !== undefined) {
    const tags = normalizeTags(body.dietary_tags)
    if (!tags) return NextResponse.json({ error: 'dietary_tags must be strings' }, { status: 400 })
    update.dietary_tags = tags
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await getSupabaseAdmin()
    .from('menu_items')
    .update(update)
    .eq('item_id', params.id)
    .select(ITEM_COLUMNS)
    .single()
  if (error || !data) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'That menu item already exists' }, { status: 409 })
    }
    console.error('[menu/items] update failed:', error)
    return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 })
  }

  await emitEvent({
    type: 'menu.item_updated',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { item_id: params.id, fields: Object.keys(update) },
  })
  return NextResponse.json({ item: data })
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole(
    'menu_items',
    'item_id',
    params.id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!gate.ok) return gate.response

  const admin = getSupabaseAdmin()
  const { data: item } = await admin
    .from('menu_items')
    .select('name')
    .eq('item_id', params.id)
    .maybeSingle()
  const { error } = await admin.from('menu_items').delete().eq('item_id', params.id)
  if (error) {
    console.error('[menu/items] delete failed:', error)
    return NextResponse.json({ error: 'Failed to delete menu item' }, { status: 500 })
  }

  await emitEvent({
    type: 'menu.item_deleted',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { item_id: params.id, name: item?.name },
  })
  return NextResponse.json({ ok: true })
}
