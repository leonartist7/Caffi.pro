import { NextRequest, NextResponse } from 'next/server'
import { verifyCounterToken, COUNTER_COOKIE } from '@/lib/counter-session'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getProvider } from '@/lib/payments/provider'
import { emitEvent } from '@/lib/events'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = verifyCounterToken(request.cookies.get(COUNTER_COOKIE)?.value)
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
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
  let target = body.status
  if (body.status === 'canceled' && order.status !== 'pending') {
    const { data: payment } = await admin
      .from('payments')
      .select('*')
      .eq('order_id', params.id)
      .eq('status', 'succeeded')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (payment?.provider_ref) {
      const refund = await getProvider().refund(payment.provider_ref, payment.amount_cents)
      const { error: refundError } = await admin.from('payments').insert({
        venue_id: session.venueId,
        order_id: params.id,
        provider: payment.provider,
        provider_ref: refund.providerRef,
        amount_cents: -payment.amount_cents,
        currency: payment.currency,
        status: 'refunded',
        idempotency_key: crypto.randomUUID(),
        raw: { source_payment_id: payment.payment_id },
      })
      if (refundError) return NextResponse.json({ error: 'Refund record failed' }, { status: 500 })
      target = 'refunded'
      await emitEvent({
        type: 'order.refunded',
        actor: `membership:${session.membershipId}`,
        venueId: session.venueId,
        payload: { order_id: params.id, amount_cents: payment.amount_cents },
      })
    }
  }
  const { data, error } = await admin.rpc('transition_order_status', {
    p_order_id: params.id,
    p_venue_id: session.venueId,
    p_new_status: target,
    p_actor: `membership:${session.membershipId}`,
  })
  if (error)
    return NextResponse.json(
      {
        error: error.message.includes('ILLEGAL_ORDER_TRANSITION')
          ? 'Illegal status transition'
          : 'Status update failed',
      },
      { status: 409 }
    )
  return NextResponse.json(data)
}
