import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { verifyCounterToken, COUNTER_COOKIE } from '@/lib/counter-session'

/**
 * GET /api/counter/rewards — active rewards for the counter's venue.
 * Small, rarely-changing list; the counter screen fetches once per session
 * and filters to what the selected member can currently afford client-side.
 */
export async function GET(request: NextRequest) {
  const session = verifyCounterToken(request.cookies.get(COUNTER_COOKIE)?.value)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('rewards')
    .select('reward_id, name, points_required')
    .eq('tenant_id', session.venueId)
    .eq('is_active', true)
    .order('points_required', { ascending: true })

  if (error) {
    console.error('[counter/rewards] query failed:', error.message)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }
  return NextResponse.json({ rewards: data ?? [] })
}
