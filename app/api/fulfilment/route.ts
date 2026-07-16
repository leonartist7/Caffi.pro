import { NextRequest, NextResponse } from 'next/server'
import { requireVenueRole } from '@/lib/authz'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const gate = await requireVenueRole(request.nextUrl.searchParams.get('venue_id'), [
    'owner',
    'manager',
  ])
  if (!gate.ok) return gate.response
  const admin = getSupabaseAdmin()
  const [{ data: tables }, { data: zones }] = await Promise.all([
    admin.from('venue_tables').select('*').eq('venue_id', gate.ctx.venueId).order('label'),
    admin.from('delivery_zones').select('*').eq('venue_id', gate.ctx.venueId).order('name'),
  ])
  return NextResponse.json({ tables: tables ?? [], zones: zones ?? [] })
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const gate = await requireVenueRole(body.venue_id as string, ['owner', 'manager'])
  if (!gate.ok) return gate.response
  const kind = body.kind
  if (kind === 'table') {
    if (typeof body.label !== 'string' || !body.label.trim())
      return NextResponse.json({ error: 'label is required' }, { status: 400 })
    const capacityRaw = body.capacity
    const capacity =
      typeof capacityRaw === 'number' && Number.isFinite(capacityRaw) && capacityRaw > 0
        ? Math.floor(capacityRaw)
        : typeof capacityRaw === 'string' && Number(capacityRaw) > 0
          ? Math.floor(Number(capacityRaw))
          : 2
    const { data, error } = await getSupabaseAdmin()
      .from('venue_tables')
      .insert({
        venue_id: gate.ctx.venueId,
        label: body.label.trim(),
        is_active: body.is_active ?? true,
        capacity,
      })
      .select('*')
      .single()
    if (error)
      return NextResponse.json(
        { error: error.code === '23505' ? 'That table already exists' : 'Failed to create table' },
        { status: error.code === '23505' ? 409 : 500 }
      )
    return NextResponse.json({ table: data }, { status: 201 })
  }
  if (kind === 'zone') {
    if (typeof body.name !== 'string' || !body.name.trim())
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    const { data, error } = await getSupabaseAdmin()
      .from('delivery_zones')
      .insert({
        venue_id: gate.ctx.venueId,
        name: body.name.trim(),
        fee_cents: body.fee_cents,
        min_order_cents: body.min_order_cents,
        postal_prefixes: body.postal_prefixes,
        is_active: body.is_active ?? true,
      })
      .select('*')
      .single()
    if (error) return NextResponse.json({ error: 'Failed to create zone' }, { status: 500 })
    return NextResponse.json({ zone: data }, { status: 201 })
  }
  return NextResponse.json({ error: 'kind must be table or zone' }, { status: 400 })
}
