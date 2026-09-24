import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isSettledOrderStatus } from '@/lib/orders/review-config'

const EVENT_TYPES = {
  prompted: 'review.prompted',
  clicked: 'review.clicked',
} as const

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = (await request.json().catch(() => null)) as { type?: unknown; tracking?: unknown } | null
  const type = body && (body.type === 'prompted' || body.type === 'clicked') ? body.type : null
  if (!type) {
    return NextResponse.json({ error: 'type must be "prompted" or "clicked"' }, { status: 400 })
  }

  // Match the order-status capability boundary: the tracking token, not the
  // public order ID alone, authorizes guest review analytics. DB uniqueness
  // still collapses duplicate tabs and retries to one event per type.
  const tracking = typeof body?.tracking === 'string' ? body.tracking : null
  if (!tracking) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  const admin = getSupabaseAdmin()
  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('order_id, venue_id, status')
    .eq('order_id', params.id)
    .eq('guest_tracking_token', tracking)
    .maybeSingle()
  if (orderError || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
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
