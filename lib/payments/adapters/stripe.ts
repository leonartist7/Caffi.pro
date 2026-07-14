import 'server-only'

import Stripe from 'stripe'
import {
  type CreateCheckoutInput,
  type PaymentProvider,
  type ProviderEvent,
} from '@/lib/payments/provider'
import {
  PaymentProviderConfigurationError,
  PaymentProviderIgnoredEventError,
  PaymentProviderInvalidEventError,
} from '@/lib/payments/errors'

function requiredEnv(name: 'STRIPE_SECRET_KEY' | 'STRIPE_WEBHOOK_SECRET'): string {
  const value = process.env[name]
  if (!value) {
    throw new PaymentProviderConfigurationError(`STUBBED — needs ${name}`)
  }
  return value
}

function stripeClient(): Stripe {
  return new Stripe(requiredEnv('STRIPE_SECRET_KEY'))
}

function metadataOrderId(metadata: Stripe.Metadata | null | undefined): string {
  const orderId = metadata?.order_id
  if (!orderId) {
    throw new PaymentProviderInvalidEventError('Signed Stripe event has no order_id metadata')
  }
  return orderId
}

/** Stripe Checkout adapter — the only place the Stripe SDK is imported. */
export class StripePaymentProvider implements PaymentProvider {
  readonly key = 'stripe'

  async createCheckout(input: CreateCheckoutInput) {
    if (!Number.isInteger(input.amountCents) || input.amountCents < 0) {
      throw new Error('Checkout amount must be a non-negative integer in cents')
    }

    const session = await stripeClient().checkout.sessions.create({
      mode: 'payment',
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.orderId,
      metadata: {
        ...input.metadata,
        order_id: input.orderId,
        venue_id: input.venueId,
      },
      payment_intent_data: {
        metadata: {
          ...input.metadata,
          order_id: input.orderId,
          venue_id: input.venueId,
        },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amountCents,
            product_data: { name: input.description },
          },
        },
      ],
    })

    if (!session.url) {
      throw new Error('Stripe did not return a Checkout redirect URL')
    }

    return { redirectUrl: session.url, providerRef: session.id }
  }

  async verifyWebhook(rawBody: string, signatureHeader: string): Promise<ProviderEvent> {
    const event = stripeClient().webhooks.constructEvent(
      rawBody,
      signatureHeader,
      requiredEnv('STRIPE_WEBHOOK_SECRET')
    )

    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.payment_status !== 'paid') {
        throw new PaymentProviderIgnoredEventError(
          `Stripe checkout session ${session.id} is not paid yet (${session.payment_status})`
        )
      }
      if (!session.id || session.amount_total === null) {
        throw new PaymentProviderInvalidEventError(
          'Signed Stripe checkout event is missing id or amount_total'
        )
      }
      return {
        type: 'payment.succeeded',
        providerRef: session.id,
        orderId: metadataOrderId(session.metadata),
        amountCents: session.amount_total,
        providerEventId: event.id,
      }
    }

    if (event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session
      if (!session.id || session.amount_total === null) {
        throw new PaymentProviderInvalidEventError(
          'Signed Stripe failure event is missing id or amount_total'
        )
      }
      return {
        type: 'payment.failed',
        providerRef: session.id,
        orderId: metadataOrderId(session.metadata),
        amountCents: session.amount_total,
        providerEventId: event.id,
      }
    }

    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge
      if (!charge.payment_intent || typeof charge.payment_intent !== 'string') {
        throw new PaymentProviderIgnoredEventError(
          `Stripe refund ${charge.id} has no PaymentIntent`
        )
      }
      const intent = await stripeClient().paymentIntents.retrieve(charge.payment_intent)
      return {
        type: 'refund.succeeded',
        providerRef: intent.id,
        orderId: metadataOrderId(intent.metadata),
        amountCents: charge.amount_refunded,
        providerEventId: event.id,
      }
    }

    throw new PaymentProviderIgnoredEventError(`Ignoring Stripe event ${event.type}`)
  }

  async refund(providerRef: string, amountCents: number): Promise<{ providerRef: string }> {
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new Error('Refund amount must be a positive integer in cents')
    }

    // Payments store the Checkout Session id so the webhook can reconcile it
    // without another lookup. Stripe refunds need the underlying PaymentIntent.
    const session = await stripeClient().checkout.sessions.retrieve(providerRef, {
      expand: ['payment_intent'],
    })
    const paymentIntent = session.payment_intent
    const paymentIntentId =
      typeof paymentIntent === 'string'
        ? paymentIntent
        : paymentIntent && 'id' in paymentIntent
          ? paymentIntent.id
          : null
    if (!paymentIntentId) {
      throw new Error(`Stripe Checkout Session ${providerRef} has no PaymentIntent to refund`)
    }

    const refund = await stripeClient().refunds.create({
      payment_intent: paymentIntentId,
      amount: amountCents,
    })
    return { providerRef: refund.id }
  }
}
