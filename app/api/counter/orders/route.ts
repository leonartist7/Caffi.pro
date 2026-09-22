import { NextRequest, NextResponse } from 'next/server'
import { requireActiveCounterSession } from '@/lib/counter-authorization'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { parseKitchenConfig } from '@/lib/orders/kitchen-config'

export async function GET(request: NextRequest) {
  const gate = await requireActiveCounterSession(request)
  if (!gate.ok) return gate.response
  const { session } = gate
  const admin = getSupabaseAdmin()
  const { data: venue } = await admin
    .from('venues')
    .select('brand_kit, currency')
    .eq('venue_id', session.venueId)
    .maybeSingle()
  const kitchenConfig = parseKitchenConfig(venue?.brand_kit ?? null)
  const { data: orders, error } = await admin
    .from('orders')
    .select('order_id, status, order_type, guest_name, placed_at, tip_cents, total_cents')
    .eq('venue_id', session.venueId)
    .in('status', ['paid', 'accepted', 'preparing', 'ready', 'out_for_delivery'])
    .order('placed_at')
  if (error) return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 })
  const ids = (orders ?? []).map(order => order.order_id)
  const { data: items } = ids.length
    ? await admin
        .from('order_items')
        .select('order_item_id, order_id, name_snapshot, quantity, notes')
        .in('order_id', ids)
        .order('order_item_id')
    : { data: [] }
  const itemIds = (items ?? []).map(item => item.order_item_id)
  const { data: modifiers } = itemIds.length
    ? await admin
        .from('order_item_modifiers')
        .select('id, order_item_id, name_snapshot')
        .in('order_item_id', itemIds)
    : { data: [] }
  const { data: eightySixed } = await admin
    .from('menu_items')
    .select('item_id, name, auto_86ed')
    .eq('venue_id', session.venueId)
    .eq('is_86ed', true)
    .order('name')
  return NextResponse.json({
    currency: venue?.currency || 'CAD',
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
    eighty_sixed: eightySixed ?? [],
    kitchen_config: kitchenConfig,
  })
}
