import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { verifyCounterToken, COUNTER_COOKIE } from '@/lib/counter-session'
import { emitEvent } from '@/lib/events'

/**
 * POST /api/counter/redeem-offer — body: { code }
 *
 * Calls redeem_member_offer (see migration 20260810000000_plan12_offer_engine.sql
 * for the full state machine). Same trust model as /api/counter/redeem:
 * the counter PIN session authenticates the request, the RPC itself locks
 * the offer row and is the actual source of the once-only guarantee — not
 * an application-level check.
 */
export async function POST(request: NextRequest) {
  const session = verifyCounterToken(request.cookies.get(COUNTER_COOKIE)?.value)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body: { code?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const code = body.code?.trim().toUpperCase()
  if (!code) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin.rpc('redeem_member_offer', {
    p_venue_id: session.venueId,
    p_code: code,
    p_staff_membership_id: session.membershipId,
  })

  if (error) {
    if (error.code === 'P0002') {
      return NextResponse.json({ error: 'offer_not_found' }, { status: 404 })
    }
    if (error.code === 'P0004') {
      return NextResponse.json({ error: 'offer_void' }, { status: 409 })
    }
    if (error.code === 'P0001') {
      void emitEvent({
        type: 'offer.expired',
        actor: `membership:${session.membershipId}`,
        venueId: session.venueId,
        payload: { code },
      })
      return NextResponse.json({ error: 'offer_expired' }, { status: 409 })
    }
    console.error('[counter/redeem-offer] rpc failed:', error.message)
    return NextResponse.json({ error: 'Redemption failed' }, { status: 500 })
  }

  const row = Array.isArray(data) ? data[0] : data

  // A fresh redemption gets the event; a replay (already_redeemed) wrote
  // nothing, so it gets nothing new to log either.
  if (row && !row.already_redeemed) {
    void emitEvent({
      type: 'offer.redeemed',
      actor: `membership:${session.membershipId}`,
      venueId: session.venueId,
      payload: { offer_id: row.offer_id, member_id: row.member_id, program_id: row.program_id },
    })
  }

  return NextResponse.json({
    ok: true,
    already_redeemed: Boolean(row?.already_redeemed),
    value_cents: row?.value_cents ?? null,
    points_value: row?.points_value ?? null,
  })
}
