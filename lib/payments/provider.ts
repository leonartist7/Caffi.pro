import 'server-only'

import { StripePaymentProvider } from '@/lib/payments/adapters/stripe'
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
}

export interface CreateCheckoutInput {
  venueId: string
  orderId: string
  amountCents: number
  currency: string
  description: string
  successUrl: string
  cancelUrl: string
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
  brand_kit?: Record<string, unknown> | null
}): PaymentProvider {
  return new StripePaymentProvider()
}
