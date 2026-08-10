import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { emitEvent } from '@/lib/events'

/**
 * POST /api/pass/[serial]/push/unsubscribe — PUBLIC by bearer serial.
 * Body: `{ endpoint }`. Sets `revoked_at` immediately — the next send's
 * eligibility query (`lib/push/eligibility.ts`) excludes this row on its
 * very next read, no propagation delay, because revocation and
 * eligibility share the exact same column.
 */
export async function POST(request: NextRequest, { params }: { params: { serial: string } }) {
  let body: { endpoint?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.endpoint) {
    return NextResponse.json({ error: 'endpoint is required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: member } = await admin
    .from('members')
    .select('member_id, tenant_id')
    .eq('pass_serial', params.serial)
    .maybeSingle()
  if (!member) {
    return NextResponse.json({ error: 'Pass not found' }, { status: 404 })
  }

  const { error } = await admin
    .from('push_subscriptions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('endpoint', body.endpoint)
    .eq('member_id', member.member_id)
    .is('revoked_at', null)

  if (error) {
    console.error('[pass/push/unsubscribe] update failed:', error.message)
    return NextResponse.json({ error: 'Could not unsubscribe' }, { status: 500 })
  }

  void emitEvent({
    type: 'push.unsubscribed',
    actor: `member:${member.member_id}`,
    venueId: member.tenant_id,
    payload: {},
  })

  return NextResponse.json({ ok: true })
}
