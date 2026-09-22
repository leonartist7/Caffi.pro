import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { simulationEnabled } from '@/lib/delivery/provider'
import { guestDelivery } from '@/lib/delivery/projections'
import type { DeliveryJob } from '@/lib/delivery/contracts'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const trackingToken = new URL(request.url).searchParams.get('tracking')
  if (!trackingToken) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  const { data, error } = await getSupabaseAdmin()
    .from('orders')
    .select(
      'order_id, venue_id, status, order_type, guest_name, subtotal_cents, tip_cents, total_cents, placed_at'
    )
    .eq('order_id', params.id)
    .eq('guest_tracking_token', trackingToken)
    .maybeSingle()
  if (error || !data) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  const { data: payment } = await getSupabaseAdmin()
    .from('payments')
    .select('status')
    .eq('order_id', data.order_id)
    .eq('venue_id', data.venue_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  let delivery = null
  if (
    data.order_type === 'delivery' &&
    simulationEnabled(data.venue_id) &&
    Date.parse(data.placed_at) >= Date.now() - 7 * 86400_000
  ) {
    const { data: job } = await getSupabaseAdmin()
      .from('delivery_jobs')
      .select('*')
      .eq('order_id', data.order_id)
      .eq('venue_id', data.venue_id)
      .maybeSingle()
    if (job) {
      const { data: connection } = await getSupabaseAdmin()
        .from('delivery_connections')
        .select('provider')
        .eq('id', job.connection_id)
        .eq('venue_id', data.venue_id)
        .single()
      delivery = guestDelivery(job as DeliveryJob, connection?.provider ?? 'simulator')
    }
  }
  return NextResponse.json({
    delivery,
    order_id: data.order_id,
    status: data.status,
    order_type: data.order_type,
    first_name: data.guest_name?.trim().split(/\s+/)[0] || 'Guest',
    subtotal_cents: data.subtotal_cents,
    tip_cents: data.tip_cents,
    total_cents: data.total_cents,
    placed_at: data.placed_at,
    payment_state:
      payment?.status === 'reconciliation_required' ? 'reconciliation_required' : undefined,
  })
}
