import { NextRequest, NextResponse } from 'next/server'
import {
  getProvider,
  PaymentProviderConfigurationError,
  PaymentProviderIgnoredEventError,
  PaymentProviderInvalidEventError,
} from '@/lib/payments/provider'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

/**
 * Stripe is the source of truth for payment completion. The raw request body
 * is verified before any JSON parsing; client input never reaches this route.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 })
  }

  const rawBody = await request.text()
  let event
  try {
    event = await getProvider().verifyWebhook(rawBody, signature)
  } catch (error) {
    if (error instanceof PaymentProviderConfigurationError) {
      console.error('[stripe-webhook] provider configuration missing')
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    if (error instanceof PaymentProviderIgnoredEventError) {
      return NextResponse.json({ received: true, ignored: true })
    }
    if (error instanceof PaymentProviderInvalidEventError) {
      console.error('[stripe-webhook] signed event cannot be linked safely:', error.message)
      return NextResponse.json({ error: 'Invalid payment event' }, { status: 400 })
    }
    console.error('[stripe-webhook] signature verification failed')
    return NextResponse.json({ error: 'Invalid Stripe signature' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const raw = {
    provider_event_id: event.providerEventId,
    provider_event_type: event.type,
    provider_ref: event.providerRef,
    amount_cents: event.amountCents,
  }

  if (event.type === 'payment.succeeded') {
    const { data, error } = await admin.rpc('record_order_payment_success', {
      p_provider: 'stripe',
      p_provider_ref: event.providerRef,
      p_amount_cents: event.amountCents,
      p_raw: raw,
    })
    if (error || !Array.isArray(data) || data.length !== 1) {
      console.error('[stripe-webhook] payment success transaction failed:', error?.message)
      return NextResponse.json({ error: 'Payment reconciliation failed' }, { status: 500 })
    }

    const result = data[0] as {
      order_id: string
      venue_id: string
      applied: boolean
      amount_mismatch: boolean
    }
    if (result.amount_mismatch) {
      console.error('[stripe-webhook] AMOUNT MISMATCH', {
        providerRef: event.providerRef,
        orderId: result.order_id,
      })
      // Retrying a permanent mismatch cannot repair it. Keep the failed row
      // for an operator to investigate rather than returning a retrying 5xx.
      return NextResponse.json({ received: true, mismatch: true })
    }

    return NextResponse.json({ received: true, applied: result.applied })
  }

  if (event.type === 'payment.failed') {
    const { error } = await admin
      .from('payments')
      .update({ status: 'failed', raw })
      .eq('provider', 'stripe')
      .eq('provider_ref', event.providerRef)
      .eq('status', 'pending')
    if (error) {
      console.error('[stripe-webhook] payment failure update failed:', error.message)
      return NextResponse.json({ error: 'Payment reconciliation failed' }, { status: 500 })
    }
    return NextResponse.json({ received: true })
  }

  // Refund handling becomes an append-only negative payment row in Phase 5.
  // A verified refund event is acknowledged now, never treated as a success
  // payment or used to mutate a money amount.
  return NextResponse.json({ received: true, deferred: 'refund reconciliation' })
}
