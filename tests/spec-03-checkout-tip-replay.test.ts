import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
  getTipConfig: vi.fn(),
  getProvider: vi.fn(),
}))
vi.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: mocks.getSupabaseAdmin }))
vi.mock('@/lib/storefront', () => ({ getTipConfig: mocks.getTipConfig }))
vi.mock('@/lib/authz', () => ({ requireVenueRole: vi.fn() }))
vi.mock('@/lib/payments/provider', () => ({
  getProvider: mocks.getProvider,
  PaymentProviderConfigurationError: class extends Error {},
}))
vi.mock('@/lib/delivery/provider', () => ({ simulationEnabled: () => true }))
vi.mock('@/lib/orders/opening-hours', () => ({
  parseOrderingHours: () => ({}),
  isVenueOpenForOrdering: () => true,
}))

import { POST } from '@/app/api/orders/route'

const orderId = '21000000-0000-4000-8000-000000000001'
const quoteId = '22000000-0000-4000-8000-000000000001'
const venueId = '13000000-0000-4000-8000-000000000001'
const checkout = {
  venue_slug: 'spec01-north-one',
  client_uuid: '23000000-0000-4000-8000-000000000001',
  order_type: 'delivery',
  delivery_quote_id: quoteId,
  zone_id: '1a000000-0000-4000-8000-000000000001',
  delivery_address: '1 Fixture Street',
  delivery_postal_code: 'TST 123',
  delivery_address_structured: {
    countryCode: 'CA',
    postalCode: 'TST 123',
    city: 'Fixture City',
    line1: '1 Fixture Street',
  },
  guest: { name: 'Synthetic Guest' },
  tip_cents: 100,
  items: [{ item_id: '16000000-0000-4000-8000-000000000002', quantity: 2, modifier_ids: [] }],
}
function request(body = checkout) {
  return new NextRequest('http://127.0.0.1:3000/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
function fixture() {
  let consumed = false
  const paidOrder = {
    order_id: orderId,
    venue_id: venueId,
    status: 'paid',
    tip_cents: 100,
    total_cents: 1200,
    currency: 'CAD',
    replayed: true,
  }
  const rpc = vi.fn(
    async (
      name: string,
      _input: Record<string, unknown>
    ): Promise<{ data: typeof paidOrder | string | null; error: { message: string } | null }> => {
      if (name === 'create_delivery_order_checked') return { data: paidOrder, error: null }
      if (name === 'get_storefront_order_tracking_token')
        return { data: 'synthetic-scoped-token', error: null }
      throw new Error(`Unexpected effect RPC: ${name}`)
    }
  )
  const quoteQuery = {
    select: vi.fn(() => quoteQuery),
    eq: vi.fn(() => quoteQuery),
    maybeSingle: vi.fn(async () => ({
      data: { consumed_order_id: consumed ? orderId : null },
      error: null,
    })),
  }
  const from = vi.fn((table: string) => {
    if (table === 'delivery_quotes') return quoteQuery
    const row =
      table === 'venues'
        ? { venue_id: venueId, kill_switch: false, timezone: 'UTC', reservation_config: {} }
        : table === 'payments'
          ? { status: 'succeeded', provider: 'test' }
          : undefined
    if (!row) throw new Error(`Unexpected table: ${table}`)
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data: row, error: null })),
    }
    return query
  })
  mocks.getSupabaseAdmin.mockReturnValue({ from, rpc })
  return {
    rpc,
    quoteQuery,
    consume: () => {
      consumed = true
    },
  }
}

describe('SPEC-03-AC-03 quoted checkout immutable tip replay (mocked route boundary)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTipConfig.mockResolvedValue({ delivery_enabled: true })
  })

  it('keeps the same submitted tip and fingerprint after the quote is consumed and current tip policy is disabled', async () => {
    const db = fixture()
    // First observation establishes the request fingerprint with tips enabled.
    // RPC/payment results are a settled fixture, not database execution evidence.
    expect((await POST(request())).status).toBe(200)
    const original = db.rpc.mock.calls.find(
      ([name]) => name === 'create_delivery_order_checked'
    )![1]
    expect(original.p_tip_cents).toBe(100)
    expect(mocks.getTipConfig).toHaveBeenCalledOnce()
    db.consume()
    mocks.getTipConfig.mockResolvedValue({ delivery_enabled: false })
    mocks.getTipConfig.mockClear()
    db.rpc.mockClear()

    const replay = await POST(request())
    expect(replay.status).toBe(200)
    await expect(replay.json()).resolves.toMatchObject({
      order: { order_id: orderId, tip_cents: 100, currency: 'CAD' },
      payment_mode: 'test',
    })
    expect(mocks.getTipConfig).not.toHaveBeenCalled()
    expect(db.quoteQuery.eq).toHaveBeenCalledWith('id', quoteId)
    expect(db.rpc).toHaveBeenCalledWith(
      'create_delivery_order_checked',
      expect.objectContaining({
        p_tip_cents: 100,
        p_request_fingerprint: original.p_request_fingerprint,
        p_quote_id: quoteId,
        p_client_uuid: checkout.client_uuid,
      })
    )
    expect(mocks.getProvider).not.toHaveBeenCalled()
    expect(db.rpc.mock.calls.map(([name]) => name)).toEqual([
      'create_delivery_order_checked',
      'get_storefront_order_tracking_token',
    ])
  })

  it.each(['tip', 'address'] as const)(
    'still fingerprints changed %s and propagates the checked RPC refusal on replay',
    async change => {
      const db = fixture()
      db.consume()
      mocks.getTipConfig.mockResolvedValue({ delivery_enabled: false })
      expect((await POST(request())).status).toBe(200)
      const original = db.rpc.mock.calls.find(
        ([name]) => name === 'create_delivery_order_checked'
      )![1]
      db.rpc.mockClear()
      db.rpc.mockImplementationOnce(async (name, input) => {
        expect(name).toBe('create_delivery_order_checked')
        expect(input.p_request_fingerprint).not.toBe(original.p_request_fingerprint)
        return { data: null, error: { message: 'CHECKOUT_CART_CHANGED' } }
      })
      const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
      try {
        const changed =
          change === 'tip'
            ? { ...checkout, tip_cents: 125 }
            : {
                ...checkout,
                delivery_address_structured: {
                  ...checkout.delivery_address_structured,
                  city: 'Different City',
                },
              }
        const response = await POST(request(changed))
        expect(response.status).toBe(400)
        await expect(response.json()).resolves.toMatchObject({ code: 'CHECKOUT_CART_CHANGED' })
        expect(db.rpc).toHaveBeenCalledOnce()
        expect(mocks.getProvider).not.toHaveBeenCalled()
        expect(mocks.getTipConfig).not.toHaveBeenCalled()
      } finally {
        errorLog.mockRestore()
      }
    }
  )

  it('refuses an unconsumed quoted checkout with a nonzero tip when current delivery tips are disabled', async () => {
    const db = fixture()
    mocks.getTipConfig.mockResolvedValue({ delivery_enabled: false })
    const response = await POST(request())
    expect(response.status).toBe(409)
    expect(db.rpc).not.toHaveBeenCalled()
    expect(mocks.getProvider).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      error: 'Delivery tips are not enabled. Review your checkout.',
    })
  })
})
