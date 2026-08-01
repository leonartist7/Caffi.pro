import { NextRequest, NextResponse } from 'next/server'
import { requireVenueRole } from '@/lib/authz'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isHttpsUrl, parseReviewConfig } from '@/lib/orders/review-config'

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
  return NextResponse.json({ review_config: parseReviewConfig(data?.brand_kit ?? null) })
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    venue_id?: string
    url?: string | null
  }
  const gate = await requireVenueRole(body.venue_id, ['owner', 'manager'])
  if (!gate.ok) return gate.response
  const url = typeof body.url === 'string' ? body.url.trim() : null
  if (url && !isHttpsUrl(url)) {
    return NextResponse.json({ error: 'The review link must start with https://' }, { status: 400 })
  }
  const admin = getSupabaseAdmin()
  const { data: reviewProfileJson, error } = await admin.rpc('set_venue_review_url', {
    p_venue_id: gate.ctx.venueId,
    p_url: url || null,
  })
  if (error) return NextResponse.json({ error: 'Failed to save review settings' }, { status: 500 })
  if (reviewProfileJson === null)
    return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
  return NextResponse.json({
    review_config: parseReviewConfig({ review_profile: reviewProfileJson }),
  })
}
