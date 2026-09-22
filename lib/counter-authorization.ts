import 'server-only'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { COUNTER_COOKIE, type CounterSession, verifyCounterToken } from '@/lib/counter-session'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

type CounterGate =
  | { ok: true; session: CounterSession }
  | { ok: false; response: NextResponse }

/**
 * Counter cookies are short-lived, but a staff membership can be revoked
 * between PIN login and an operational action. Re-check the stored active
 * membership and venue binding on every kitchen/counter request.
 */
export async function requireActiveCounterSession(request: NextRequest): Promise<CounterGate> {
  const session = verifyCounterToken(request.cookies.get(COUNTER_COOKIE)?.value)
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  }

  const { data, error } = await getSupabaseAdmin()
    .from('memberships')
    .select('membership_id')
    .eq('membership_id', session.membershipId)
    .eq('venue_id', session.venueId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('[counter/auth] membership verification failed:', error.message)
    return { ok: false, response: NextResponse.json({ error: 'Counter authorization failed' }, { status: 500 }) }
  }
  if (!data) {
    return { ok: false, response: NextResponse.json({ error: 'Counter access has been revoked' }, { status: 403 }) }
  }
  return { ok: true, session }
}
