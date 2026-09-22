import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'node:crypto'
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: () => mocks }))
import { getDeliveryProvider, simulationEnabled } from '@/lib/delivery/provider'
import { processDeliveryWork } from '@/lib/delivery/worker'
import { address, boundedBody } from '@/lib/delivery/validation'
import { guestDelivery, driverDelivery } from '@/lib/delivery/projections'
import type { DeliveryConnection, DeliveryWork } from '@/lib/delivery/contracts'

const venue = '13000000-0000-4000-8000-000000000001'
const connection: DeliveryConnection = {
  id: 'connection',
  venue_id: venue,
  provider: 'simulator',
  environment: 'simulation',
  enabled: true,
  capabilities: {},
}
const work: DeliveryWork = {
  outbox: { id: 'effect', action: 'create', effect_key: 'effect' },
  connection,
  context: {},
  lease_token: 'lease-a',
  job: {
    id: 'job',
    venue_id: venue,
    order_id: 'order',
    connection_id: 'connection',
    operation_key: 'operation',
    state: 'dispatch_pending',
    version: 0,
    external_ref: null,
    approved_cost_minor: 500,
    currency: 'CAD',
    driver_user_id: null,
    exception: null,
    safe_tracking: {},
    created_at: '2026-09-22T00:00:00Z',
  },
}

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('VERCEL', '')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321')
  vi.stubEnv('CAFFI_DELIVERY_MODE', 'simulation')
  vi.stubEnv('CAFFI_SYNTHETIC_FIXTURES', '1')
  vi.stubEnv('CAFFI_SYNTHETIC_VENUE_ID', venue)
  mocks.rpc.mockReset()
})

describe('SPEC-03-AC-02/06 simulator isolation', () => {
  it('requires every fixture guard and exact synthetic tenant', () => {
    expect(simulationEnabled(venue)).toBe(true)
    expect(simulationEnabled('other')).toBe(false)
    for (const [key, bad, good] of [
      ['VERCEL', '1', ''],
      ['NODE_ENV', 'production', 'test'],
      ['NEXT_PUBLIC_SUPABASE_URL', 'https://example.test', 'http://127.0.0.1:54321'],
      ['CAFFI_SYNTHETIC_FIXTURES', '0', '1'],
      ['CAFFI_DELIVERY_MODE', 'live', 'simulation'],
    ]) {
      vi.stubEnv(key, bad)
      expect(simulationEnabled(venue)).toBe(false)
      vi.stubEnv(key, good)
    }
  })
  it('refuses an external provider even if its connection says enabled', () => {
    expect(() =>
      getDeliveryProvider({ ...connection, provider: 'uber_direct', environment: 'sandbox' })
    ).toThrow('NOT_CONFIGURED')
  })
  it('never contacts a courier network and uses persisted operation identity', async () => {
    const network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected network'))
    mocks.rpc.mockResolvedValue({
      data: { kind: 'confirmed', external_ref: 'sim-1', state: 'booked' },
      error: null,
    })
    const provider = getDeliveryProvider(connection)
    await provider.create(work, 'operation')
    expect(mocks.rpc).toHaveBeenCalledWith(
      'delivery_simulator_effect',
      expect.objectContaining({ p_operation_key: 'operation', p_action: 'create' })
    )
    expect(network).not.toHaveBeenCalled()
  })
})

describe('SPEC-03-AC-03 bounded quote inputs', () => {
  it('rejects missing country/city and normalizes explicit address values', () => {
    expect(() => address({ line1: 'Street', postalCode: 'TST' })).toThrow('INVALID_ADDRESS')
    expect(
      address({ countryCode: 'ca', postalCode: 'tst 1a1', city: ' Fixture ', line1: ' 10 Test ' })
    ).toEqual({ countryCode: 'CA', postalCode: 'TST 1A1', city: 'Fixture', line1: '10 Test' })
  })
  it('bounds streamed bytes without trusting content length', async () => {
    const request = new Request('https://example.test', {
      method: 'POST',
      body: 'x'.repeat(33_000),
    })
    await expect(boundedBody(request)).rejects.toThrow('BODY_TOO_LARGE')
  })
})

describe('SPEC-03-AC-05 worker outcome safety', () => {
  it('persists unknown after an ambiguous effect error without a second create', async () => {
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === 'delivery_claim_work') return { data: [work] }
      if (name === 'delivery_simulator_effect') throw new Error('timeout after send')
      return { data: {} }
    })
    await processDeliveryWork()
    expect(mocks.rpc.mock.calls.filter(c => c[0] === 'delivery_simulator_effect')).toHaveLength(1)
    expect(mocks.rpc).toHaveBeenCalledWith('delivery_finish_work', {
      p_outbox_id: 'effect',
      p_lease_token: 'lease-a',
      p_result: { kind: 'unknown', code: 'PROVIDER_OUTCOME_UNKNOWN' },
    })
  })
  it('a recovered lease lookup never invokes create', async () => {
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === 'delivery_claim_work')
        return { data: [{ ...work, outbox: { ...work.outbox, action: 'lookup' } }] }
      return { data: { kind: 'confirmed', external_ref: 'sim-1', state: 'booked' } }
    })
    await processDeliveryWork()
    expect(mocks.rpc).toHaveBeenCalledWith(
      'delivery_simulator_effect',
      expect.objectContaining({ p_action: 'lookup' })
    )
    expect(mocks.rpc.mock.calls.some(c => c[1]?.p_action === 'create')).toBe(false)
  })
  it('surfaces failed durable completion instead of reporting success', async () => {
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === 'delivery_claim_work') return { data: [work] }
      if (name === 'delivery_finish_work') return { error: { message: 'db unavailable' } }
      return { data: { kind: 'unknown', code: 'TIMEOUT' } }
    })
    await expect(processDeliveryWork()).rejects.toThrow('WORKER_COMPLETION_UNAVAILABLE')
  })
})

describe('SPEC-03-AC-05 authenticated simulator event fixtures', () => {
  it('verifies original bytes before parsing and rejects mutation/forgery', async () => {
    const secret = 'fixture-only-signature-secret-0000000001'
    vi.stubEnv('CAFFI_DELIVERY_WEBHOOK_SECRET', secret)
    const raw = JSON.stringify({
      provider_event_id: 'event-1',
      external_ref: 'sim-1',
      state: 'assigned',
      occurred_at: '2026-09-22T00:00:00Z',
    })
    const signature = createHmac('sha256', secret).update(raw).digest('hex')
    const headers = new Headers({ 'x-simulator-signature': signature })
    const provider = getDeliveryProvider(connection)
    await expect(provider.authenticateAndNormalizeEvent(raw, headers)).resolves.toMatchObject({
      state: 'assigned',
    })
    await expect(provider.authenticateAndNormalizeEvent(raw + ' ', headers)).rejects.toThrow(
      'INVALID_SIGNATURE'
    )
    await expect(provider.authenticateAndNormalizeEvent(raw, new Headers())).rejects.toThrow(
      'INVALID_SIGNATURE'
    )
  })
})

describe('SPEC-03-AC-08/09 minimal tracking projections', () => {
  it('guest response excludes connection, job/order identifiers, costs, driver and PII', () => {
    const projection = guestDelivery(work.job, 'own_driver')
    expect(projection).toEqual({
      state: 'dispatch_pending',
      provider: 'own_driver',
      tracking_accuracy: 'milestones',
      updated_at: '2026-09-22T00:00:00Z',
      exception: false,
    })
    expect(projection).not.toHaveProperty('eta')
  })
  it('driver task excludes booking keys, internal exceptions and financials', () => {
    const projection = driverDelivery(work.job, 'ready', { line1: 'Synthetic street' })
    expect(projection).toHaveProperty('preparation_status', 'ready')
    expect(projection).not.toHaveProperty('operation_key')
    expect(projection).not.toHaveProperty('approved_cost_minor')
  })
})
