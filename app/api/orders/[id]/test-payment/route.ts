import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isSyntheticPaymentModeForVenue } from '@/lib/payments/provider'

/**
 * Local-fixture payment completion. Deliberately unavailable unless both
 * synthetic environment flags are set; it is not a Stripe sandbox endpoint.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const trackingToken = request.headers.get('x-order-tracking-token')
  if (!trackingToken) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const admin = getSupabaseAdmin()
  const { data: order } = await admin
    .from('orders')
    .select('order_id, venue_id, total_cents')
    .eq('order_id', params.id)
    .eq('guest_tracking_token', trackingToken)
    .maybeSingle()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (!isSyntheticPaymentModeForVenue(order.venue_id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: payment, error: paymentError } = await admin
    .from('payments')
    .select('provider_ref, amount_cents')
    .eq('order_id', order.order_id)
    .eq('venue_id', order.venue_id)
    .eq('provider', 'test')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (paymentError || !payment) {
    const { data: completedPayment } = await admin
      .from('payments')
      .select('payment_id')
      .eq('order_id', order.order_id)
      .eq('venue_id', order.venue_id)
      .eq('provider', 'test')
      .eq('status', 'succeeded')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (completedPayment) return NextResponse.json({ received: true, applied: false, replayed: true })
    return NextResponse.json({ error: 'Test payment is not ready to complete' }, { status: 409 })
  }

  const { data, error } = await admin.rpc('record_order_payment_success', {
    p_provider: 'test',
    p_provider_ref: payment.provider_ref,
    p_amount_cents: payment.amount_cents,
    p_raw: { provider_event_id: `test_payment_${order.order_id}`, provider_event_type: 'test.payment.succeeded' },
  })
  if (error || !Array.isArray(data) || data.length !== 1) {
    console.error('[test-payment] reconciliation failed:', error?.message)
    return NextResponse.json({ error: 'Test payment could not be recorded' }, { status: 500 })
  }
  return NextResponse.json({ received: true, applied: data[0].applied === true })
}
