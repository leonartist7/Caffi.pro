import { createClient } from '@supabase/supabase-js'

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]
const missing = required.filter(name => !process.env[name])
if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`)

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const options = { auth: { persistSession: false, autoRefreshToken: false } }
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options)
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options)
const args = {
  p_venue_slug: 'verification-venue-does-not-exist',
  p_client_uuid: '00000000-0000-0000-0000-000000000001',
  p_order_type: 'pickup',
  p_items: [],
  p_guest: { name: 'Verification' },
  p_table_token: null,
  p_zone_id: null,
  p_delivery_address: null,
  p_delivery_postal_code: null,
  p_notes: null,
  p_member_pass_serial: null,
}

const anonResult = await anon.rpc('create_storefront_order', args)
if (!anonResult.error) throw new Error('Anonymous order RPC unexpectedly succeeded')
console.log('PASS anon order RPC denied')

const serviceResult = await service.rpc('create_storefront_order', args)
if (!serviceResult.error?.message.includes('VENUE_NOT_FOUND')) {
  throw new Error(
    `Service order RPC boundary missing: ${serviceResult.error?.message ?? 'no error'}`
  )
}
console.log('PASS service order RPC live')

const { data: venue, error: venueError } = await service
  .from('venues')
  .select('slug')
  .eq('venue_id', 'a0000000-0000-4000-3000-000000000001')
  .single()
if (venueError) throw venueError
const clientUuid = crypto.randomUUID()
let testOrderId = null
try {
  const { data: order, error: orderError } = await service.rpc('create_storefront_order', {
    ...args,
    p_venue_slug: venue.slug,
    p_client_uuid: clientUuid,
    p_items: [
      {
        item_id: 'c2000000-0000-4000-8000-000000000001',
        quantity: 1,
        modifier_ids: [
          'c4000000-0000-4000-8000-000000000001',
          'c4000000-0000-4000-8000-000000000003',
        ],
      },
    ],
  })
  if (orderError) throw orderError
  testOrderId = order.order_id
  if (order.total_cents !== 475) throw new Error(`Expected 475 cents, got ${order.total_cents}`)
  const { count: itemCount } = await service
    .from('order_items')
    .select('order_item_id', { count: 'exact', head: true })
    .eq('order_id', testOrderId)
  if (itemCount !== 1) throw new Error(`Expected one order item, got ${itemCount}`)
  await service.from('orders').update({ status: 'paid' }).eq('order_id', testOrderId)
  for (const status of ['accepted', 'preparing', 'ready', 'completed']) {
    const result = await service.rpc('transition_order_status', {
      p_order_id: testOrderId,
      p_venue_id: 'a0000000-0000-4000-3000-000000000001',
      p_new_status: status,
      p_actor: 'verification',
    })
    if (result.error) throw result.error
  }
  console.log('PASS atomic order pricing and legal transitions')
} finally {
  if (testOrderId) {
    await service.from('events').delete().contains('payload', { order_id: testOrderId })
    await service.from('orders').delete().eq('order_id', testOrderId)
  }
}
