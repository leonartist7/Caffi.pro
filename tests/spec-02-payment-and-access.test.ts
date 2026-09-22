import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  createCheckout: vi.fn(),
  verifyCounterToken: vi.fn(),
  getSupabaseAdmin: vi.fn(),
}))

vi.mock('stripe', () => ({
  default: class Stripe {
    checkout = { sessions: { create: mocks.createCheckout } }
  },
}))
vi.mock('@/lib/counter-session', () => ({
  COUNTER_COOKIE: 'aro_counter_session',
  verifyCounterToken: mocks.verifyCounterToken,
}))
vi.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: mocks.getSupabaseAdmin }))

import { requireActiveCounterSession } from '@/lib/counter-authorization'
import { isVenueOpenForOrdering, parseOrderingHours } from '@/lib/orders/opening-hours'
import { recoverCheckout } from '@/lib/orders/checkout-recovery'
import { StripePaymentProvider } from '@/lib/payments/adapters/stripe'
import { decidePaymentEvent } from '@/lib/payments/event-contract'
import { getProvider, isSyntheticPaymentModeForVenue } from '@/lib/payments/provider'

const checkoutInput = {
  venueId: 'venue-a',
  orderId: 'order-a',
  amountCents: 1299,
  currency: 'CAD',
  description: 'Synthetic order',
  successUrl: 'https://example.test/success',
  cancelUrl: 'https://example.test/cancel',
  idempotencyKey: 'order:order-a:checkout',
  metadata: { client_uuid: 'operation-a' },
}

describe('SPEC-02-AC-01 and AC-02 opening-hours contract', () => {
  it('treats absent legacy configuration as open and a configured closed day as closed', () => {
    const sunday = new Date('2026-09-20T12:00:00.000Z')
    expect(isVenueOpenForOrdering(null, 'UTC', sunday)).toBe(true)
    expect(isVenueOpenForOrdering({ sun: null }, 'UTC', sunday)).toBe(false)
  })

  it('honours venue-local opening ranges and rejects malformed ranges', () => {
    const hours = parseOrderingHours({ mon: ['09:00', '17:00'] })
    expect(isVenueOpenForOrdering(hours, 'UTC', new Date('2026-09-21T10:30:00.000Z'))).toBe(true)
    expect(isVenueOpenForOrdering(hours, 'UTC', new Date('2026-09-21T18:00:00.000Z'))).toBe(false)
    expect(parseOrderingHours({ mon: ['9:00', '17:00'] })).toBeNull()
  })
})

describe('SPEC-02-AC-03 checkout idempotency boundary', () => {
  const originalMode = process.env.CAFFI_PAYMENT_MODE
  const originalFixtures = process.env.CAFFI_SYNTHETIC_FIXTURES
  const originalVenue = process.env.CAFFI_SYNTHETIC_VENUE_ID

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_not_a_real_key'
  })

  afterEach(() => {
    process.env.CAFFI_PAYMENT_MODE = originalMode
    process.env.CAFFI_SYNTHETIC_FIXTURES = originalFixtures
    process.env.CAFFI_SYNTHETIC_VENUE_ID = originalVenue
  })

  it('passes the stable operation key to Stripe for every checkout retry', async () => {
    mocks.createCheckout.mockResolvedValue({ id: 'cs_once', url: 'https://checkout.example.test/cs_once' })
    const provider = new StripePaymentProvider()

    await provider.createCheckout(checkoutInput)
    await provider.createCheckout(checkoutInput)

    expect(mocks.createCheckout).toHaveBeenCalledTimes(2)
    expect(mocks.createCheckout).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ client_reference_id: 'order-a' }),
      { idempotencyKey: 'order:order-a:checkout' }
    )
    expect(mocks.createCheckout).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      { idempotencyKey: 'order:order-a:checkout' }
    )
  })

  it('selects the network-disabled provider only with both explicit fixture flags', async () => {
    process.env.CAFFI_PAYMENT_MODE = 'test'
    process.env.CAFFI_SYNTHETIC_FIXTURES = '1'
    process.env.CAFFI_SYNTHETIC_VENUE_ID = 'venue-a'
    expect(isSyntheticPaymentModeForVenue('venue-a')).toBe(true)
    expect(isSyntheticPaymentModeForVenue('venue-b')).toBe(false)

    const provider = getProvider({ venueId: 'venue-a' })
    expect(provider.key).toBe('test')
    await expect(provider.createCheckout(checkoutInput)).resolves.toEqual({
      providerRef: 'test_checkout_order:order-a:checkout',
      redirectUrl: 'test-payment://order-a',
    })

    process.env.CAFFI_SYNTHETIC_FIXTURES = '0'
    expect(isSyntheticPaymentModeForVenue('venue-a')).toBe(false)
    expect(getProvider({ venueId: 'venue-a' }).key).toBe('stripe')
  })

  it('resumes a persisted provider checkout after an interrupted browser navigation', () => {
    expect(
      recoverCheckout({
        paymentStatus: 'pending',
        storedCheckoutUrl: 'https://checkout.example.test/cs_once',
        confirmationUrl: '/shop/roastery/order-confirmation/order-a?tracking=token-a',
      })
    ).toBe('https://checkout.example.test/cs_once')
    expect(
      recoverCheckout({
        paymentStatus: 'succeeded',
        storedCheckoutUrl: 'https://checkout.example.test/cs_once',
        confirmationUrl: '/shop/roastery/order-confirmation/order-a?tracking=token-a',
      })
    ).toBe('/shop/roastery/order-confirmation/order-a?tracking=token-a')
  })
})

describe('SPEC-02-AC-05 revoked counter access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifyCounterToken.mockReturnValue({
      membershipId: 'staff-a',
      venueId: 'venue-a',
      device: 'counter',
      staffName: 'Ari',
      exp: Math.floor(Date.now() / 1000) + 300,
    })
  })

  function configureMembership(data: unknown, error: { message: string } | null = null) {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data, error })),
    }
    mocks.getSupabaseAdmin.mockReturnValue({ from: vi.fn(() => query) })
    return query
  }

  it('denies a counter cookie whose membership was revoked after login', async () => {
    const query = configureMembership(null)
    const result = await requireActiveCounterSession(new NextRequest('https://example.test/api/counter/orders'))

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected revoked staff to be denied')
    expect(result.response.status).toBe(403)
    expect(query.eq).toHaveBeenCalledWith('is_active', true)
    expect(query.eq).toHaveBeenCalledWith('venue_id', 'venue-a')
  })

  it('allows only the current membership bound to the cookie venue', async () => {
    configureMembership({ membership_id: 'staff-a' })
    const result = await requireActiveCounterSession(new NextRequest('https://example.test/api/counter/orders'))
    expect(result).toMatchObject({ ok: true, session: { venueId: 'venue-a', membershipId: 'staff-a' } })
  })
})

describe('SPEC-02-AC-04 payment event ordering contract', () => {
  const pending = { orderId: 'order-a', amountCents: 1299, status: 'pending' as const }

  it('applies the first success and makes its replay a no-op', () => {
    const event = { type: 'payment.succeeded' as const, orderId: 'order-a', amountCents: 1299 }
    expect(decidePaymentEvent(event, pending)).toEqual({ kind: 'apply' })
    expect(decidePaymentEvent(event, { ...pending, status: 'succeeded' })).toEqual({ kind: 'replay' })
  })

  it('rejects cross-order events and preserves signed amount mismatches for reconciliation', () => {
    expect(
      decidePaymentEvent({ type: 'payment.succeeded', orderId: 'order-b', amountCents: 1299 }, pending)
    ).toEqual({ kind: 'reject', reason: 'order_mismatch' })
    expect(
      decidePaymentEvent({ type: 'payment.succeeded', orderId: 'order-a', amountCents: 1200 }, pending)
    ).toEqual({ kind: 'reconciliation_required', reason: 'amount_mismatch' })
  })

  it('keeps out-of-order failure and refund events in reconciliation instead of regressing a success', () => {
    expect(
      decidePaymentEvent(
        { type: 'payment.failed', orderId: 'order-a', amountCents: 1299 },
        { ...pending, status: 'succeeded' }
      )
    ).toEqual({ kind: 'reconciliation_required', reason: 'failure_after_succeeded' })
    expect(
      decidePaymentEvent(
        { type: 'refund.succeeded', orderId: 'order-a', amountCents: 1299 },
        { ...pending, status: 'refunded' }
      )
    ).toEqual({ kind: 'replay' })
    expect(
      decidePaymentEvent(
        { type: 'refund.succeeded', orderId: 'order-a', amountCents: 500 },
        { ...pending, status: 'succeeded' }
      )
    ).toEqual({ kind: 'apply' })
  })
})
