import { NextRequest, NextResponse } from 'next/server'
import { emitEvent } from '@/lib/events'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const EVENT_TYPES = {
  prompted: 'review.prompted',
  clicked: 'review.clicked',
} as const

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = (await request.json().catch(() => ({}))) as { type?: keyof typeof EVENT_TYPES }
  const eventType = body.type ? EVENT_TYPES[body.type] : undefined
  if (!eventType) {
    return NextResponse.json({ error: 'type must be "prompted" or "clicked"' }, { status: 400 })
  }

  // Same trust model as GET /api/orders/[id]/status: the order UUID itself
  // is the guest's capability token, no separate auth on this order-scoped
  // confirmation-page endpoint.
  const { data: order } = await getSupabaseAdmin()
    .from('orders')
    .select('order_id, venue_id')
    .eq('order_id', params.id)
    .maybeSingle()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  await emitEvent({
    type: eventType,
    actor: 'guest',
    venueId: order.venue_id,
    payload: { order_id: order.order_id },
  })
  return NextResponse.json({ ok: true })
}
