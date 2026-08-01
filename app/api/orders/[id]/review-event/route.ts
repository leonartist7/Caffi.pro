import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isSettledOrderStatus } from '@/lib/orders/review-config'

const EVENT_TYPES = {
  prompted: 'review.prompted',
  clicked: 'review.clicked',
} as const

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = (await request.json().catch(() => null)) as { type?: unknown } | null
  const type = body && (body.type === 'prompted' || body.type === 'clicked') ? body.type : null
  if (!type) {
    return NextResponse.json({ error: 'type must be "prompted" or "clicked"' }, { status: 400 })
  }

  // Same trust model as GET /api/orders/[id]/status: the order UUID itself
  // is the guest's capability token, no separate auth on this order-scoped
  // confirmation-page endpoint. Two guards keep that permissive model from
  // being abused: the order must actually be settled (a guest can't spam
  // this before paying), and the insert is deduplicated at the DB level
  // (idx_events_review_once) so retries/duplicate tabs can't inflate the
  // count past one row per order per event type.
  const admin = getSupabaseAdmin()
  const { data: order } = await admin
    .from('orders')
    .select('order_id, venue_id, status')
    .eq('order_id', params.id)
    .maybeSingle()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (!isSettledOrderStatus(order.status)) {
    return NextResponse.json({ error: 'Order is not settled' }, { status: 409 })
  }

  const { error } = await admin.from('events').insert({
    type: EVENT_TYPES[type],
    actor: 'guest',
    venue_id: order.venue_id,
    payload: { order_id: order.order_id },
  })
  // 23505 = unique_violation: already recorded once for this order — treat as success.
  if (error && error.code !== '23505') {
    console.error('[review-event] insert failed:', error.message)
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
