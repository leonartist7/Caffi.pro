import { NextRequest, NextResponse } from 'next/server'
import { requireVenueRole } from '@/lib/authz'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { parseTipConfig } from '@/lib/orders/tip-config'

export async function GET(request: NextRequest) {
  const gate = await requireVenueRole(request.nextUrl.searchParams.get('venue_id'), [
    'owner',
    'manager',
  ])
  if (!gate.ok) return gate.response
  const { data } = await getSupabaseAdmin()
    .from('venues')
    .select('brand_kit')
    .eq('venue_id', gate.ctx.venueId)
    .maybeSingle()
  return NextResponse.json({ tip_config: parseTipConfig(data?.brand_kit ?? null) })
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    venue_id?: string
    delivery_enabled?: boolean
  }
  const gate = await requireVenueRole(body.venue_id, ['owner', 'manager'])
  if (!gate.ok) return gate.response
  if (typeof body.delivery_enabled !== 'boolean') {
    return NextResponse.json({ error: 'delivery_enabled must be a boolean' }, { status: 400 })
  }
  const admin = getSupabaseAdmin()
  const { data: tipConfigJson, error } = await admin.rpc('set_venue_tip_delivery_enabled', {
    p_venue_id: gate.ctx.venueId,
    p_delivery_enabled: body.delivery_enabled,
  })
  if (error) return NextResponse.json({ error: 'Failed to save tip settings' }, { status: 500 })
  if (tipConfigJson === null)
    return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
  return NextResponse.json({ tip_config: parseTipConfig({ tip_config: tipConfigJson }) })
}
