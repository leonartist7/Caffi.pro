import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'
import { getEligiblePushSubscriptions } from '@/lib/push/eligibility'
import { sendPushNotification, isPushConfigured } from '@/lib/push/provider'

/**
 * POST /api/loyalty/push-send — owner-only broadcast. Two-phase, the same
 * fat-finger guard PLAN-13's appreciation batch already established:
 * `confirm: false`/omitted is a dry run returning the exact eligible
 * count and sending nothing; anything above 50 recipients is refused
 * unless `confirm: true` — enforced by the route itself, not just the UI.
 *
 * `getEligiblePushSubscriptions` (the compliance boundary) is the ONLY
 * source of recipients — this route never re-derives or narrows that
 * list itself.
 */
const CONFIRMATION_THRESHOLD = 50

export async function POST(request: NextRequest) {
  let body: { venue_id?: string; title?: string; message?: string; confirm?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const authz = await requireVenueRole(body.venue_id, ['owner'])
  if (!authz.ok) return authz.response

  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: 'STUBBED — needs VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT' },
      { status: 503 }
    )
  }

  const title = body.title?.trim()
  const message = body.message?.trim()
  if (!title || !message) {
    return NextResponse.json({ error: 'title and message are required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  let recipients
  try {
    recipients = await getEligiblePushSubscriptions(admin, authz.ctx.venueId)
  } catch (err) {
    console.error('[push-send] eligibility query failed:', err)
    return NextResponse.json({ error: 'Failed to compute the recipient list' }, { status: 500 })
  }

  const requiresConfirmation = recipients.length > CONFIRMATION_THRESHOLD
  // confirm:false (or omitted) is always a dry run, at any count — the
  // 50-recipient threshold only decides whether the CLIENT forces a
  // typed-count confirmation before it ever sends confirm:true; the
  // server's own gate is simpler and doesn't need to duplicate that UX
  // rule to be safe.
  if (!body.confirm) {
    return NextResponse.json({
      preview: true,
      recipientCount: recipients.length,
      requiresConfirmation,
    })
  }

  let sentCount = 0
  let failedCount = 0
  let revokedCount = 0

  for (const recipient of recipients) {
    // isPushConfigured() above already guarantees the VAPID env vars are
    // set for this whole request, so sendPushNotification's own
    // configuration check can't fire mid-loop — no try/catch needed here.
    const result = await sendPushNotification(
      { endpoint: recipient.endpoint, p256dh: recipient.p256dh, auth: recipient.auth },
      { title, body: message }
    )

    if (result.ok) {
      sentCount++
      await admin.from('messages').insert({
        member_id: recipient.memberId,
        venue_id: authz.ctx.venueId,
        channel: 'push',
        body: message,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
    } else if (result.revoked) {
      revokedCount++
      await admin
        .from('push_subscriptions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('subscription_id', recipient.subscriptionId)
      void emitEvent({
        type: 'push.revoked',
        actor: 'system:push_send',
        venueId: authz.ctx.venueId,
        payload: { subscription_id: recipient.subscriptionId, reason: 'endpoint_gone' },
      })
      await admin.from('messages').insert({
        member_id: recipient.memberId,
        venue_id: authz.ctx.venueId,
        channel: 'push',
        body: message,
        status: 'failed',
      })
    } else {
      failedCount++
      console.error('[push-send] send failed:', result.message)
      await admin.from('messages').insert({
        member_id: recipient.memberId,
        venue_id: authz.ctx.venueId,
        channel: 'push',
        body: message,
        status: 'failed',
      })
    }
  }

  void emitEvent({
    type: 'push.sent',
    actor: `user:${authz.ctx.user.id}`,
    venueId: authz.ctx.venueId,
    payload: { sent_count: sentCount, failed_count: failedCount, revoked_count: revokedCount },
  })

  return NextResponse.json({
    preview: false,
    recipientCount: recipients.length,
    sentCount,
    failedCount,
    revokedCount,
  })
}
