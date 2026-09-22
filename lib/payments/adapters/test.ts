import 'server-only'

import {
  type CreateCheckoutInput,
  type PaymentProvider,
  type ProviderEvent,
} from '@/lib/payments/provider'

/**
 * Network-disabled adapter for disposable fixtures. It never accepts cards,
 * contacts Stripe, or represents provider sandbox verification.
 */
export class TestPaymentProvider implements PaymentProvider {
  readonly key = 'test'

  async createCheckout(input: CreateCheckoutInput) {
    if (!input.idempotencyKey) throw new Error('A test checkout needs an idempotency key')
    return {
      providerRef: `test_checkout_${input.idempotencyKey}`,
      redirectUrl: `test-payment://${input.orderId}`,
    }
  }

  async verifyWebhook(_rawBody: string, _signatureHeader: string): Promise<ProviderEvent> {
    throw new Error('The test payment adapter has no public webhook endpoint')
  }

  async refund(providerRef: string, amountCents: number): Promise<{ providerRef: string }> {
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new Error('Refund amount must be a positive integer in cents')
    }
    return { providerRef: `test_refund_${providerRef}` }
  }
}
