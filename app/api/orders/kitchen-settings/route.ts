import { NextRequest, NextResponse } from 'next/server'
import { requireVenueRole } from '@/lib/authz'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { parseKitchenConfig } from '@/lib/orders/kitchen-config'

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
  return NextResponse.json({ kitchen_config: parseKitchenConfig(data?.brand_kit ?? null) })
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    venue_id?: string
    warnAfterMinutes?: number
    urgentAfterMinutes?: number
  }
  const gate = await requireVenueRole(body.venue_id, ['owner', 'manager'])
  if (!gate.ok) return gate.response
  if (
    typeof body.warnAfterMinutes !== 'number' ||
    typeof body.urgentAfterMinutes !== 'number' ||
    body.warnAfterMinutes <= 0 ||
    body.urgentAfterMinutes <= body.warnAfterMinutes
  ) {
    return NextResponse.json(
      { error: 'urgentAfterMinutes must be greater than warnAfterMinutes, both positive' },
      { status: 400 }
    )
  }
  const admin = getSupabaseAdmin()
  const { data: venue } = await admin
    .from('venues')
    .select('brand_kit')
    .eq('venue_id', gate.ctx.venueId)
    .maybeSingle()
  const brandKit = (
    venue?.brand_kit && typeof venue.brand_kit === 'object' ? venue.brand_kit : {}
  ) as Record<string, unknown>
  const nextKitchenConfig = {
    warnAfterMinutes: body.warnAfterMinutes,
    urgentAfterMinutes: body.urgentAfterMinutes,
  }
  const { error } = await admin
    .from('venues')
    .update({ brand_kit: { ...brandKit, kitchen_config: nextKitchenConfig } })
    .eq('venue_id', gate.ctx.venueId)
  if (error) return NextResponse.json({ error: 'Failed to save kitchen settings' }, { status: 500 })
  return NextResponse.json({ kitchen_config: nextKitchenConfig })
}
