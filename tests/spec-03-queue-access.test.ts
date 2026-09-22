import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), getUser: vi.fn() }))
vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({ from: mocks.from, rpc: mocks.rpc }),
}))
vi.mock('@/utils/supabase/server', () => ({
  createClient: () => ({ auth: { getUser: mocks.getUser } }),
}))
vi.mock('@/lib/delivery/provider', () => ({ simulationEnabled: () => true }))

import { GET } from '@/app/api/deliveries/route'

const venue = '13000000-0000-4000-8000-000000000001'
const user = '11000000-0000-4000-8000-000000000005'
const quarantined = {
  id: 'unmatched-event',
  connection_id: 'connection-a',
  external_ref: 'unattached-provider-reference',
  provider_event_id: 'provider-event-a',
  state: 'picked_up',
  received_at: '2026-09-22T10:00:00Z',
}
const destination = {
  line1: '1 Synthetic Street',
  city: 'Fixture City',
  postalCode: 'TST123',
  countryCode: 'CA',
}
const job = {
  id: 'assigned-job',
  order_id: 'order-a',
  venue_id: venue,
  state: 'assigned',
  version: 3,
  connection_id: 'connection-a',
  driver_user_id: user,
  approved_cost_minor: 500,
  currency: 'CAD',
  external_ref: 'provider-reference',
  exception: 'PRIVATE_OPERATIONAL_ERROR',
}

function queryFor(data: unknown, error: { message: string } | null = null) {
  const result = { data, error }
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    single: vi.fn(async () => result),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  }
  return query
}
function database(eventError: { message: string } | null = null) {
  const queries = {
    delivery_jobs: queryFor([job]),
    orders: queryFor([{ order_id: 'order-a', status: 'ready' }]),
    delivery_connections: queryFor([{ id: 'connection-a', provider: 'own_driver' }]),
    delivery_order_context: queryFor([
      { order_id: 'order-a', address: destination, current_quote_id: 'quote-a' },
    ]),
    delivery_quotes: queryFor([{ id: 'quote-a', provider_cost_minor: 500, currency: 'CAD' }]),
    delivery_driver_access: queryFor([{ user_id: user }]),
    memberships: queryFor([{ user_id: user, full_name: 'Fixture Driver', venue_id: venue }]),
    delivery_events: queryFor([quarantined], eventError),
    venues: queryFor({ org_id: 'org-a' }),
  }
  mocks.from.mockImplementation((table: keyof typeof queries) => {
    if (!queries[table]) throw new Error(`Unexpected table ${table}`)
    return queries[table]
  })
  return queries
}
const request = () => new Request(`http://127.0.0.1:3000/api/deliveries?venue_id=${venue}`)

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getUser.mockResolvedValue({ data: { user: { id: user } }, error: null })
  mocks.rpc.mockResolvedValue({ data: 'manager', error: null })
})

describe('SPEC-03-AC-07 quarantine queue role boundary (mocked database)', () => {
  it.each(['owner', 'manager'])(
    '%s receives only a bounded venue-scoped unprocessed-event summary',
    async role => {
      mocks.rpc.mockResolvedValue({ data: role, error: null })
      const queries = database()
      const response = await GET(request())
      expect(response.status).toBe(200)
      expect(response.headers.get('cache-control')).toBe('no-store')
      expect(mocks.rpc).toHaveBeenCalledWith('delivery_authorize', {
        p_venue_id: venue,
        p_user_id: user,
        p_manager: false,
      })
      expect(queries.delivery_events.select).toHaveBeenCalledWith(
        'id,connection_id,external_ref,provider_event_id,state,received_at'
      )
      expect(queries.delivery_events.eq).toHaveBeenCalledWith('venue_id', venue)
      expect(queries.delivery_events.is).toHaveBeenCalledWith('processed_at', null)
      expect(queries.delivery_events.order).toHaveBeenCalledWith('received_at', {
        ascending: false,
      })
      expect(queries.delivery_events.limit).toHaveBeenCalledWith(100)
      await expect(response.json()).resolves.toMatchObject({ quarantined_events: [quarantined] })
    }
  )

  it('assigned staff never queries quarantine events or receives manager operational fields', async () => {
    mocks.rpc.mockResolvedValue({ data: 'staff', error: null })
    const queries = database()
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect(queries.delivery_jobs.eq).toHaveBeenCalledWith('venue_id', venue)
    expect(queries.delivery_jobs.eq).toHaveBeenCalledWith('driver_user_id', user)
    const body = await response.json()
    expect(body).toEqual({
      jobs: [
        {
          id: job.id,
          state: job.state,
          version: job.version,
          provider: 'own_driver',
          driver_user_id: user,
          preparation_status: 'ready',
          destination,
        },
      ],
    })
    for (const field of ['quarantined_events', 'quarantine_events', 'drivers', 'orders'])
      expect(body).not.toHaveProperty(field)
    for (const table of [
      'delivery_events',
      'delivery_driver_access',
      'memberships',
      'delivery_quotes',
      'venues',
    ]) {
      expect(mocks.from).not.toHaveBeenCalledWith(table)
    }
    expect(JSON.stringify(body)).not.toContain(quarantined.external_ref)
    expect(JSON.stringify(body)).not.toContain(job.exception)
  })

  it('does not disguise a failed manager quarantine read as an empty or healthy queue', async () => {
    database({ message: 'synthetic database failure' })
    const response = await GET(request())
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: 'DELIVERY_QUEUE_UNAVAILABLE' })
  })

  it('does not query service-owned queue tables after venue authorization is denied', async () => {
    database()
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'FORBIDDEN' } })
    const response = await GET(request())
    expect(response.status).toBe(403)
    expect(mocks.from).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({ error: 'FORBIDDEN' })
  })
})
