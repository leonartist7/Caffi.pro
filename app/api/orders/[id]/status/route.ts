import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const trackingToken = new URL(request.url).searchParams.get('tracking')
  if (!trackingToken) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  const { data, error } = await getSupabaseAdmin()
    .from('orders')
    .select(
      'order_id, status, order_type, guest_name, subtotal_cents, tip_cents, total_cents, placed_at'
    )
    .eq('order_id', params.id)
    .eq('guest_tracking_token', trackingToken)
    .maybeSingle()
  if (error || !data) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  return NextResponse.json({
    order_id: data.order_id,
    status: data.status,
    order_type: data.order_type,
    first_name: data.guest_name?.trim().split(/\s+/)[0] || 'Guest',
    subtotal_cents: data.subtotal_cents,
    tip_cents: data.tip_cents,
    total_cents: data.total_cents,
    placed_at: data.placed_at,
  })
}
