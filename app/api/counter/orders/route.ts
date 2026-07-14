import { NextRequest, NextResponse } from 'next/server'
import { verifyCounterToken, COUNTER_COOKIE } from '@/lib/counter-session'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const session = verifyCounterToken(request.cookies.get(COUNTER_COOKIE)?.value)
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const admin = getSupabaseAdmin()
  const { data: orders, error } = await admin
    .from('orders')
    .select('*')
    .eq('venue_id', session.venueId)
    .in('status', ['paid', 'accepted', 'preparing', 'ready', 'out_for_delivery'])
    .order('placed_at')
  if (error) return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 })
  const ids = (orders ?? []).map(order => order.order_id)
  const { data: items } = ids.length
    ? await admin.from('order_items').select('*').in('order_id', ids).order('order_item_id')
    : { data: [] }
  const itemIds = (items ?? []).map(item => item.order_item_id)
  const { data: modifiers } = itemIds.length
    ? await admin.from('order_item_modifiers').select('*').in('order_item_id', itemIds)
    : { data: [] }
  return NextResponse.json({
    orders: (orders ?? []).map(order => ({
      ...order,
      items: (items ?? [])
        .filter(item => item.order_id === order.order_id)
        .map(item => ({
          ...item,
          modifiers: (modifiers ?? []).filter(
            modifier => modifier.order_item_id === item.order_item_id
          ),
        })),
    })),
  })
}
