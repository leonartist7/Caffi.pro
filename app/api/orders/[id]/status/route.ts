import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { data, error } = await getSupabaseAdmin()
    .from('orders')
    .select('order_id, status, order_type, guest_name, total_cents, placed_at')
    .eq('order_id', params.id)
    .maybeSingle()
  if (error || !data) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  return NextResponse.json({
    order_id: data.order_id,
    status: data.status,
    order_type: data.order_type,
    first_name: data.guest_name?.trim().split(/\s+/)[0] || 'Guest',
    total_cents: data.total_cents,
    placed_at: data.placed_at,
  })
}
