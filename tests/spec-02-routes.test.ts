import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
  requireActiveCounterSession: vi.fn(),
}))

vi.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: mocks.getSupabaseAdmin }))
vi.mock('@/lib/counter-authorization', () => ({
  requireActiveCounterSession: mocks.requireActiveCounterSession,
}))

import { GET as getGuestStatus } from '@/app/api/orders/[id]/status/route'
import { PATCH as patchCounterOrder } from '@/app/api/counter/orders/[id]/route'

describe('SPEC-02-AC-06 scoped guest order status', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not query or expose an order when the tracking credential is absent', async () => {
    const response = await getGuestStatus(new Request('https://example.test/api/orders/order-a/status'), {
      params: { id: 'order-a' },
    })
    expect(response.status).toBe(404)
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled()
  })

  it('binds status lookup to both the order and its scoped tracking credential', async () => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({
        data: {
          order_id: 'order-a',
          status: 'paid',
          order_type: 'pickup',
          guest_name: 'Ari Guest',
          subtotal_cents: 1000,
          tip_cents: 0,
          total_cents: 1000,
          placed_at: '2026-09-21T00:00:00.000Z',
        },
        error: null,
      })),
    }
    mocks.getSupabaseAdmin.mockReturnValue({ from: vi.fn(() => query) })

    const response = await getGuestStatus(
      new Request('https://example.test/api/orders/order-a/status?tracking=token-a'),
      { params: { id: 'order-a' } }
    )

    expect(response.status).toBe(200)
    expect(query.eq).toHaveBeenCalledWith('order_id', 'order-a')
    expect(query.eq).toHaveBeenCalledWith('guest_tracking_token', 'token-a')
    await expect(response.json()).resolves.toMatchObject({ first_name: 'Ari', order_id: 'order-a' })
  })
})

describe('SPEC-02-AC-05 counter tenant boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireActiveCounterSession.mockResolvedValue({
      ok: true,
      session: { membershipId: 'staff-a', venueId: 'venue-a', device: 'counter', staffName: 'Ari', exp: 1 },
    })
  })

  it('returns no data when a valid staff session guesses another venue order ID', async () => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    }
    mocks.getSupabaseAdmin.mockReturnValue({ from: vi.fn(() => query) })

    const request = new NextRequest('https://example.test/api/counter/orders/order-from-venue-b', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'accepted' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const response = await patchCounterOrder(request, { params: { id: 'order-from-venue-b' } })

    expect(response.status).toBe(404)
    expect(query.eq).toHaveBeenCalledWith('order_id', 'order-from-venue-b')
    expect(query.eq).toHaveBeenCalledWith('venue_id', 'venue-a')
  })

  it('keeps paid-order cancellation in reconciliation and does not trigger a gateway refund', async () => {
    const orderQuery = {
      select: vi.fn(() => orderQuery),
      eq: vi.fn(() => orderQuery),
      maybeSingle: vi.fn(async () => ({ data: { status: 'paid', total_cents: 1200 }, error: null })),
    }
    const paymentQuery = {
      select: vi.fn(() => paymentQuery),
      eq: vi.fn(() => paymentQuery),
      order: vi.fn(() => paymentQuery),
      limit: vi.fn(() => paymentQuery),
      maybeSingle: vi.fn(async () => ({ data: { payment_id: 'payment-a' }, error: null })),
    }
    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn((table: string) => (table === 'orders' ? orderQuery : paymentQuery)),
    })

    const response = await patchCounterOrder(
      new NextRequest('https://example.test/api/counter/orders/order-a', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'canceled' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      { params: { id: 'order-a' } }
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining('reconciliation') })
  })
})
