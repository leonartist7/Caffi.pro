import { NextRequest, NextResponse } from 'next/server'
import { requireRowVenueRole } from '@/lib/authz'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

function target(kind: string) {
  return kind === 'tables'
    ? { table: 'venue_tables', pk: 'table_id' }
    : kind === 'zones'
      ? { table: 'delivery_zones', pk: 'zone_id' }
      : null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { kind: string; id: string } }
) {
  const config = target(params.kind)
  if (!config) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const gate = await requireRowVenueRole(
    config.table,
    config.pk,
    params.id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!gate.ok) return gate.response
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const allowed =
    params.kind === 'tables'
      ? ['label', 'is_active', 'capacity']
      : ['name', 'fee_cents', 'min_order_cents', 'postal_prefixes', 'is_active']
  const update = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)))
  if (params.kind === 'tables' && update.capacity !== undefined) {
    const n = Number(update.capacity)
    if (!Number.isFinite(n) || n < 1) {
      return NextResponse.json({ error: 'capacity must be a positive integer' }, { status: 400 })
    }
    update.capacity = Math.floor(n)
  }
  const { data, error } = await getSupabaseAdmin()
    .from(config.table)
    .update(update)
    .eq(config.pk, params.id)
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  return NextResponse.json({ row: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { kind: string; id: string } }
) {
  const config = target(params.kind)
  if (!config) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const gate = await requireRowVenueRole(
    config.table,
    config.pk,
    params.id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!gate.ok) return gate.response
  const { error } = await getSupabaseAdmin().from(config.table).delete().eq(config.pk, params.id)
  if (error) return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
