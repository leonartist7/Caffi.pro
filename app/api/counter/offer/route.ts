import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { verifyCounterToken, COUNTER_COOKIE } from '@/lib/counter-session'
import { isOfferExpired } from '@/lib/loyalty/offers'

/**
 * GET /api/counter/offer?code=XXXX — read-only lookup, used by the
 * counter UI to show what a code resolves to (member's first name,
 * program, value) before the barista commits to redeeming it. Never
 * touches redeemed_at.
 */
export async function GET(request: NextRequest) {
  const session = verifyCounterToken(request.cookies.get(COUNTER_COOKIE)?.value)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const code = request.nextUrl.searchParams.get('code')?.trim().toUpperCase()
  if (!code) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: offer } = await admin
    .from('member_offers')
    .select('offer_id, member_id, program_id, value_cents, points_value, status, expires_at')
    .eq('venue_id', session.venueId)
    .eq('code', code)
    .maybeSingle()

  if (!offer) {
    return NextResponse.json({ error: 'offer_not_found' }, { status: 404 })
  }

  const [{ data: member }, { data: program }] = await Promise.all([
    admin.from('members').select('full_name').eq('member_id', offer.member_id).maybeSingle(),
    admin.from('loyalty_programs').select('name').eq('program_id', offer.program_id).maybeSingle(),
  ])

  const expired = isOfferExpired(offer)

  return NextResponse.json({
    offer_id: offer.offer_id,
    member_first_name: member?.full_name?.split(' ')[0] ?? null,
    program_name: program?.name ?? null,
    value_cents: offer.value_cents,
    points_value: offer.points_value,
    status: offer.status,
    already_redeemed: offer.status === 'redeemed',
    expired,
    void: offer.status === 'void',
  })
}
