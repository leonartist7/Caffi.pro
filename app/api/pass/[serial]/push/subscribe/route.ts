import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { emitEvent } from '@/lib/events'
import { getVapidPublicKey } from '@/lib/push/provider'

/**
 * POST /api/pass/[serial]/push/subscribe — PUBLIC by bearer serial, same
 * trust model as the rest of `/pass/[serial]/**`. Body: the
 * `PushSubscriptionJSON` the browser's `pushManager.subscribe()` returns.
 *
 * Browser permission is not consent to marketing (v2 §N1's doctrine,
 * inherited here) — this route only ever fires from an explicit opt-in
 * tap on the pass, in the venue's own words (the client component's
 * copy), never from a bare permission grant. `endpoint` is `UNIQUE`
 * (PLAN-10) — re-subscribing the same browser upserts rather than
 * duplicating.
 */
export async function POST(request: NextRequest, { params }: { params: { serial: string } }) {
  if (!getVapidPublicKey()) {
    return NextResponse.json(
      { error: 'STUBBED — needs VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT' },
      { status: 503 }
    )
  }

  let body: {
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: 'endpoint and keys are required' }, { status: 400 })
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

  // Upsert on the UNIQUE endpoint: a re-subscribe (new keys, same device)
  // un-revokes and re-attaches to this member rather than erroring.
  const { error } = await admin.from('push_subscriptions').upsert(
    {
      venue_id: member.tenant_id,
      member_id: member.member_id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      user_agent: request.headers.get('user-agent') ?? null,
      revoked_at: null,
    },
    { onConflict: 'endpoint' }
  )

  if (error) {
    console.error('[pass/push/subscribe] upsert failed:', error.message)
    return NextResponse.json({ error: 'Could not save subscription' }, { status: 500 })
  }

  void emitEvent({
    type: 'push.subscribed',
    actor: `member:${member.member_id}`,
    venueId: member.tenant_id,
    payload: {},
  })

  return NextResponse.json({ ok: true })
}
