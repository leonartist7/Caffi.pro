import 'server-only'

import { StripePaymentProvider } from '@/lib/payments/adapters/stripe'
import { TestPaymentProvider } from '@/lib/payments/adapters/test'
export {
  PaymentProviderConfigurationError,
  PaymentProviderIgnoredEventError,
  PaymentProviderInvalidEventError,
} from '@/lib/payments/errors'

export type PaymentEventType = 'payment.succeeded' | 'payment.failed' | 'refund.succeeded'

export interface ProviderEvent {
  type: PaymentEventType
  providerRef: string
  orderId: string
  amountCents: number
  providerEventId: string
  /** Underlying charge intent, when the provider event is not the checkout session. */
  paymentIntentRef?: string
}

export interface CreateCheckoutInput {
  venueId: string
  orderId: string
  amountCents: number
  currency: string
  description: string
  successUrl: string
  cancelUrl: string
  /** Stable per-order external-effect key; reused for every retry. */
  idempotencyKey: string
  metadata: Record<string, string>
}

/**
 * Gateway boundary. Routes and UI only know this interface; SDK-specific code
 * stays inside `lib/payments/adapters/` so adding a Canadian gateway later does
 * not spread payment-provider conditionals through the application.
 */
export interface PaymentProvider {
  readonly key: string
  createCheckout(input: CreateCheckoutInput): Promise<{ redirectUrl: string; providerRef: string }>
  verifyWebhook(rawBody: string, signatureHeader: string): Promise<ProviderEvent>
  refund(providerRef: string, amountCents: number): Promise<{ providerRef: string }>
}

/**
 * Phase 1 always selects Stripe. Phase 6 will read a venue-level gateway
 * choice from a future configuration field; keep that decision here rather
 * than leaking Stripe imports into order routes or components.
 */
export function getProvider(_venue?: {
  venueId?: string
}): PaymentProvider {
  if (isSyntheticPaymentModeForVenue(_venue?.venueId)) return new TestPaymentProvider()
  return new StripePaymentProvider()
}

/** Explicit non-production fixture opt-in, bound to one synthetic venue. */
export function isSyntheticPaymentModeForVenue(venueId: string | undefined): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  let isLoopbackDatabase = false
  try {
    const host = supabaseUrl ? new URL(supabaseUrl).hostname : ''
    isLoopbackDatabase = host === 'localhost' || host === '127.0.0.1' || host === '::1'
  } catch {
    isLoopbackDatabase = false
  }
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.CAFFI_PAYMENT_MODE === 'test' &&
    process.env.CAFFI_SYNTHETIC_FIXTURES === '1' &&
    isLoopbackDatabase &&
    Boolean(venueId) &&
    venueId === process.env.CAFFI_SYNTHETIC_VENUE_ID
  )
}
