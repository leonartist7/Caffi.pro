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
  throw new Error(`Service order RPC boundary missing: ${serviceResult.error?.message ?? 'no error'}`)
}
console.log('PASS service order RPC live')
