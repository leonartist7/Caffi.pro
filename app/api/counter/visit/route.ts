import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { verifyCounterToken, COUNTER_COOKIE } from '@/lib/counter-session'
import { emitEvent } from '@/lib/events'

/**
 * POST /api/counter/visit — record a visit. Body: { member_id, visit_uuid, ts? }
 *
 * Idempotent on visit_uuid (client-generated): double-tap and offline-queue
 * replay share this one mechanism — same uuid posted N times = one row,
 * every response still reports the current count.
 *
 * `ts` (optional): client-side queue time, so a visit synced hours later
 * (offline café wifi) still counts for when it actually happened — cadence
 * math in Plan 4 depends on the real time, not the sync time. Clamped to
 * ±24h of server time as a sanity bound.
 */
export async function POST(request: NextRequest) {
  const session = verifyCounterToken(request.cookies.get(COUNTER_COOKIE)?.value)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body: { member_id?: string; visit_uuid?: string; ts?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.member_id || !body.visit_uuid) {
    return NextResponse.json({ error: 'member_id and visit_uuid required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // Member must belong to THIS venue (from the cookie) — never trust a
  // venue id in the body; member ids are guessable across venues otherwise.
  const { data: member, error: memberError } = await admin
    .from('members')
    .select('member_id')
    .eq('member_id', body.member_id)
    .eq('tenant_id', session.venueId)
    .maybeSingle()
  if (memberError || !member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  let ts = new Date().toISOString()
  if (body.ts) {
    const parsed = new Date(body.ts)
    const now = Date.now()
    if (!Number.isNaN(parsed.getTime()) && Math.abs(now - parsed.getTime()) <= 24 * 3600 * 1000) {
      ts = parsed.toISOString()
    }
  }

  const { error: insertError } = await admin.from('visits').insert({
    member_id: body.member_id,
    venue_id: session.venueId,
    client_uuid: body.visit_uuid,
    ts,
    source: 'manual',
    staff_membership_id: session.membershipId,
  })
  // ON CONFLICT (client_uuid) DO NOTHING is enforced by the unique index —
  // a duplicate insert errors with 23505, which we treat as success (the
  // whole point of idempotency: double-tap and offline replay are harmless).
  if (insertError && insertError.code !== '23505') {
    console.error('[counter/visit] insert failed:', insertError.message)
    return NextResponse.json({ error: 'Could not record visit' }, { status: 500 })
  }
  const wasNew = !insertError

  if (wasNew) {
    void emitEvent({
      type: 'visit.recorded',
      actor: `membership:${session.membershipId}`,
      venueId: session.venueId,
      payload: { member_id: body.member_id, visit_uuid: body.visit_uuid },
    })
  }

  const { count } = await admin
    .from('visits')
    .select('visit_id', { count: 'exact', head: true })
    .eq('member_id', body.member_id)

  return NextResponse.json({ ok: true, visit_count: count ?? 0 })
}
