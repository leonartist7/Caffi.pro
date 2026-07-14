import { createClient } from '@supabase/supabase-js'

const SEED_VENUE_ID = 'a0000000-0000-4000-3000-000000000001'
const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]

const missing = REQUIRED_ENV.filter(name => !process.env[name])
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`)
  process.exit(2)
}

const options = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}
const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  options
)
const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  options
)

let failures = 0

function pass(name, detail) {
  console.log(`PASS ${name}: ${detail}`)
}

function fail(name, detail) {
  failures += 1
  console.error(`FAIL ${name}: ${detail}`)
}

async function check(name, run) {
  try {
    const detail = await run()
    pass(name, detail)
  } catch (error) {
    fail(name, error instanceof Error ? error.message : String(error))
  }
}

await check('anon venues public read', async () => {
  const { data, error } = await anon.from('venues').select('venue_id, business_name, slug').limit(5)
  if (error) throw new Error(error.message)
  if (!data || data.length < 1) throw new Error('expected at least one public venue')
  return `${data.length} public venue row(s)`
})

await check('anon members denied', async () => {
  const { error } = await anon.from('members').select('member_id').limit(1)
  if (!error) throw new Error('members query unexpectedly succeeded')
  return 'permission denied as required'
})

await check('service seed venue', async () => {
  const { data, error } = await service
    .from('venues')
    .select('venue_id, business_name')
    .eq('venue_id', SEED_VENUE_ID)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('seed venue not found')
  return data.business_name || data.venue_id
})

await check('service memberships count', async () => {
  const { count, error } = await service
    .from('memberships')
    .select('membership_id', { count: 'exact', head: true })
  if (error) throw new Error(error.message)
  if ((count ?? 0) < 3) throw new Error(`expected at least 3 memberships, found ${count ?? 0}`)
  return `${count} membership row(s)`
})

await check('venue_week_stats RPC', async () => {
  const { data, error } = await service.rpc('venue_week_stats', {
    p_venue_id: SEED_VENUE_ID,
    p_tz: 'America/Edmonton',
  })
  if (error) throw new Error(error.message)
  if (!Array.isArray(data) || data.length < 1) throw new Error('RPC returned no row')
  return 'returned one stats row'
})

await check('wrong counter PIN rejected', async () => {
  const { data, error } = await service.rpc('verify_counter_pin', {
    p_venue_id: SEED_VENUE_ID,
    p_pin: '0000',
  })
  if (error) throw new Error(error.message)
  if (!Array.isArray(data) || data.length !== 0) {
    throw new Error('wrong PIN unexpectedly matched a membership')
  }
  return 'no membership returned'
})

await check('anon ordering menu read', async () => {
  const { error } = await anon
    .from('menu_categories')
    .select('category_id, venue_id, name, is_active')
    .limit(1)
  if (error) throw new Error(error.message)
  return 'public menu columns readable'
})

await check('anon orders denied', async () => {
  const { error } = await anon.from('orders').select('order_id').limit(1)
  if (!error) throw new Error('orders query unexpectedly succeeded')
  return 'permission denied as required'
})

await check('anon payments denied', async () => {
  const { error } = await anon.from('payments').select('payment_id').limit(1)
  if (!error) throw new Error('payments query unexpectedly succeeded')
  return 'permission denied as required'
})

await check('service ordering tables', async () => {
  const { error: ordersError } = await service
    .from('orders')
    .select('order_id', { count: 'exact', head: true })
  if (ordersError) throw new Error(`orders: ${ordersError.message}`)

  const { error: paymentsError } = await service
    .from('payments')
    .select('payment_id', { count: 'exact', head: true })
  if (paymentsError) throw new Error(`payments: ${paymentsError.message}`)

  return 'orders and payments accessible server-side'
})

await check('venue tax configuration', async () => {
  const { data, error } = await service
    .from('venues')
    .select('tax_rate_bp')
    .eq('venue_id', SEED_VENUE_ID)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data || !Number.isInteger(data.tax_rate_bp)) {
    throw new Error('seed venue tax_rate_bp is missing or invalid')
  }
  return `${data.tax_rate_bp} basis points`
})

if (failures > 0) {
  console.error(`Live verification failed: ${failures} check(s) failed`)
  process.exit(1)
}

console.log('Live verification passed: all checks green')
