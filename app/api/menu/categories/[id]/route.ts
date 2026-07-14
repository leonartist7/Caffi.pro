import { NextRequest, NextResponse } from 'next/server'
import { requireRowVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const CATEGORY_COLUMNS =
  'category_id, venue_id, name, display_order, is_active, available_from, available_until, created_at, updated_at'
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/

function parseTime(value: unknown): { valid: boolean; value: string | null } {
  if (value === null || value === '') return { valid: true, value: null }
  return typeof value === 'string' && TIME_PATTERN.test(value)
    ? { valid: true, value }
    : { valid: false, value: null }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole(
    'menu_categories',
    'category_id',
    params.id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!gate.ok) return gate.response

  let body: {
    name?: string
    display_order?: number
    is_active?: boolean
    available_from?: string | null
    available_until?: string | null
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
  if (body.display_order !== undefined) {
    if (!Number.isInteger(body.display_order)) {
      return NextResponse.json({ error: 'display_order must be an integer' }, { status: 400 })
    }
    update.display_order = body.display_order
  }
  if (body.is_active !== undefined) update.is_active = Boolean(body.is_active)
  for (const field of ['available_from', 'available_until'] as const) {
    if (body[field] !== undefined) {
      const parsed = parseTime(body[field])
      if (!parsed.valid) {
        return NextResponse.json({ error: `${field} must be a valid time` }, { status: 400 })
      }
      update[field] = parsed.value
    }
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await getSupabaseAdmin()
    .from('menu_categories')
    .update(update)
    .eq('category_id', params.id)
    .select(CATEGORY_COLUMNS)
    .single()

  if (error || !data) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'That category already exists' }, { status: 409 })
    }
    console.error('[menu/categories] update failed:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }

  await emitEvent({
    type: 'menu.category_updated',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { category_id: params.id, fields: Object.keys(update) },
  })
  return NextResponse.json({ category: data })
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole(
    'menu_categories',
    'category_id',
    params.id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!gate.ok) return gate.response

  const admin = getSupabaseAdmin()
  const { data: category } = await admin
    .from('menu_categories')
    .select('name')
    .eq('category_id', params.id)
    .maybeSingle()
  const { error } = await admin.from('menu_categories').delete().eq('category_id', params.id)
  if (error) {
    console.error('[menu/categories] delete failed:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }

  await emitEvent({
    type: 'menu.category_deleted',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { category_id: params.id, name: category?.name },
  })
  return NextResponse.json({ ok: true })
}
