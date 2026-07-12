import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { verifyCounterToken, COUNTER_COOKIE } from '@/lib/counter-session'
import { emitEvent } from '@/lib/events'

/**
 * POST /api/counter/redeem — body: { member_id, reward_id }
 *
 * Calls the redeem_reward SQL function: balance check + ledger deduction +
 * redemptions row happen inside ONE Postgres transaction (see migration
 * 20260711000001_counter_rpc.sql) so two staff devices redeeming the same
 * member at once can never both succeed against a balance that covers one.
 *
 * NEVER queued offline — see counter-screen.tsx / offline-queue.ts: an
 * offline client can't know the true balance, so redemptions require a
 * live connection, full stop.
 */
export async function POST(request: NextRequest) {
  const session = verifyCounterToken(request.cookies.get(COUNTER_COOKIE)?.value)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body: { member_id?: string; reward_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.member_id || !body.reward_id) {
    return NextResponse.json({ error: 'member_id and reward_id required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  const { data: member } = await admin
    .from('members')
    .select('member_id')
    .eq('member_id', body.member_id)
    .eq('tenant_id', session.venueId)
    .maybeSingle()
  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  const { data, error } = await admin.rpc('redeem_reward', {
    p_member_id: body.member_id,
    p_reward_id: body.reward_id,
    p_venue_id: session.venueId,
    p_staff_membership_id: session.membershipId,
  })

  if (error) {
    if (error.code === 'P0001') {
      // insufficient_balance — calm 409, not an error toast
      const { data: reward } = await admin
        .from('rewards')
        .select('points_required')
        .eq('reward_id', body.reward_id)
        .maybeSingle()
      const { data: bal } = await admin
        .from('member_balances')
        .select('balance')
        .eq('member_id', body.member_id)
        .maybeSingle()
      const short = Math.max(0, (reward?.points_required ?? 0) - (bal?.balance ?? 0))
      return NextResponse.json(
        { error: 'insufficient_balance', points_short: short },
        { status: 409 }
      )
    }
    if (error.code === 'P0002') {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 })
    }
    if (error.code === 'P0003') {
      return NextResponse.json({ error: 'Reward not available here' }, { status: 403 })
    }
    console.error('[counter/redeem] rpc failed:', error.message)
    return NextResponse.json({ error: 'Redemption failed' }, { status: 500 })
  }

  const row = Array.isArray(data) ? data[0] : data
  void emitEvent({
    type: 'reward.redeemed',
    actor: `membership:${session.membershipId}`,
    venueId: session.venueId,
    payload: {
      member_id: body.member_id,
      reward_id: body.reward_id,
      redemption_id: row?.redemption_id,
    },
  })

  return NextResponse.json({ ok: true, new_balance: row?.new_balance ?? 0 })
}
