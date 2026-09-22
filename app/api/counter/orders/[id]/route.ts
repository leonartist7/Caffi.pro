import { NextRequest, NextResponse } from 'next/server'
import { requireActiveCounterSession } from '@/lib/counter-authorization'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireActiveCounterSession(request)
  if (!gate.ok) return gate.response
  const { session } = gate
  const body = (await request.json().catch(() => ({}))) as { status?: string }
  if (!body.status) return NextResponse.json({ error: 'status is required' }, { status: 400 })
  const admin = getSupabaseAdmin()
  const { data: order } = await admin
    .from('orders')
    .select('status, total_cents')
    .eq('order_id', params.id)
    .eq('venue_id', session.venueId)
    .maybeSingle()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (body.status === 'refunded') {
    return NextResponse.json(
      { error: 'Refunds require a dedicated payment reconciliation workflow.' },
      { status: 409 }
    )
  }
  if (body.status === 'canceled' && order.status !== 'pending') {
      const { data: payment } = await admin
      .from('payments')
      .select('payment_id')
      .eq('order_id', params.id)
      .eq('status', 'succeeded')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (payment) {
      // Phase 2 records signed refund events for reconciliation but never
      // invokes a live gateway from a kitchen status action. A dedicated,
      // idempotent operator refund workflow is required before this can move.
      return NextResponse.json(
        { error: 'A paid order requires payment reconciliation before cancellation.' },
        { status: 409 }
      )
    }
  }
  const { data, error } = await admin.rpc('transition_order_status', {
    p_order_id: params.id,
    p_venue_id: session.venueId,
    p_new_status: body.status,
    p_actor: `membership:${session.membershipId}`,
  })
  if (error)
    return NextResponse.json(
      {
        error: error.message.includes('PAYMENT_RECONCILIATION_REQUIRED')
          ? 'A paid order requires payment reconciliation before cancellation.'
          : error.message.includes('DELIVERY_DISPATCH_REQUIRED')
            ? 'Delivery dispatch is not available yet.'
            : error.message.includes('ILLEGAL_ORDER_TRANSITION')
              ? 'Illegal status transition'
              : 'Status update failed',
      },
      { status: 409 }
    )
  return NextResponse.json(data)
}
