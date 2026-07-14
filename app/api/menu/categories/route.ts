import { NextRequest, NextResponse } from 'next/server'
import { requireVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const CATEGORY_COLUMNS =
  'category_id, venue_id, name, display_order, is_active, available_from, available_until, created_at, updated_at'
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/

function optionalTime(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return typeof value === 'string' && TIME_PATTERN.test(value) ? value : undefined
}

export async function GET(request: NextRequest) {
  const gate = await requireVenueRole(request.nextUrl.searchParams.get('venue_id'), [
    'owner',
    'manager',
  ])
  if (!gate.ok) return gate.response

  const { data, error } = await getSupabaseAdmin()
    .from('menu_categories')
    .select(CATEGORY_COLUMNS)
    .eq('venue_id', gate.ctx.venueId)
    .order('display_order')
    .order('name')

  if (error) {
    console.error('[menu/categories] list failed:', error)
    return NextResponse.json({ error: 'Failed to load menu categories' }, { status: 500 })
  }
  return NextResponse.json({ categories: data ?? [] })
}

export async function POST(request: NextRequest) {
  let body: {
    venue_id?: string
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

  const gate = await requireVenueRole(body.venue_id, ['owner', 'manager'])
  if (!gate.ok) return gate.response
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (body.display_order !== undefined && !Number.isInteger(body.display_order)) {
    return NextResponse.json({ error: 'display_order must be an integer' }, { status: 400 })
  }
  const availableFrom = optionalTime(body.available_from)
  const availableUntil = optionalTime(body.available_until)
  if (body.available_from !== undefined && availableFrom === undefined) {
    return NextResponse.json({ error: 'available_from must be a valid time' }, { status: 400 })
  }
  if (body.available_until !== undefined && availableUntil === undefined) {
    return NextResponse.json({ error: 'available_until must be a valid time' }, { status: 400 })
  }

  const { data, error } = await getSupabaseAdmin()
    .from('menu_categories')
    .insert({
      venue_id: gate.ctx.venueId,
      name: body.name.trim(),
      display_order: body.display_order ?? 0,
      is_active: body.is_active ?? true,
      available_from: availableFrom ?? null,
      available_until: availableUntil ?? null,
    })
    .select(CATEGORY_COLUMNS)
    .single()

  if (error || !data) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'That category already exists' }, { status: 409 })
    }
    console.error('[menu/categories] insert failed:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }

  await emitEvent({
    type: 'menu.category_created',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { category_id: data.category_id, name: data.name },
  })
  return NextResponse.json({ category: data }, { status: 201 })
}
