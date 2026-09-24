import { NextRequest, NextResponse } from 'next/server'
import {
  getProvider,
  PaymentProviderConfigurationError,
  PaymentProviderIgnoredEventError,
  PaymentProviderInvalidEventError,
} from '@/lib/payments/provider'
import type { ProviderEvent } from '@/lib/payments/provider'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { issueBounceBackOffersForOrder } from '@/lib/loyalty/bounce-back-issue'
import { decidePaymentEvent, type StoredPayment } from '@/lib/payments/event-contract'

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
  let event: ProviderEvent
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
    payment_intent_ref: event.paymentIntentRef ?? null,
  }

  let paymentQuery = admin
    .from('payments')
    .select('order_id, venue_id, amount_cents, status')
    .eq('provider', 'stripe')
  paymentQuery =
    event.type === 'refund.succeeded'
      ? paymentQuery
          .eq('order_id', event.orderId)
          .eq('raw->>payment_intent_ref', event.paymentIntentRef ?? '__missing_payment_intent__')
          .eq('status', 'succeeded')
      : paymentQuery.eq('provider_ref', event.providerRef)
  const { data: payment, error: paymentLookupError } = await paymentQuery.maybeSingle()
  if (paymentLookupError || !payment) {
    if (event.type === 'refund.succeeded') {
      const { data: refundOrder } = await admin
        .from('orders')
        .select('order_id, venue_id')
        .eq('order_id', event.orderId)
        .maybeSingle()
      if (refundOrder) {
        const { error: deferredRefundError } = await admin.from('payment_provider_events').insert({
          provider: 'stripe',
          provider_event_id: event.providerEventId,
          order_id: refundOrder.order_id,
          venue_id: refundOrder.venue_id,
          provider_ref: event.providerRef,
          event_type: event.type,
          amount_cents: event.amountCents,
          outcome: 'reconciliation_required',
          detail: { ...raw, reason: 'refund_without_matching_settled_payment' },
          processed_at: new Date().toISOString(),
        })
        if (deferredRefundError && deferredRefundError.code !== '23505') {
          console.error('[stripe-webhook] deferred refund ledger insert failed:', deferredRefundError.message)
          return NextResponse.json({ error: 'Payment reconciliation failed' }, { status: 500 })
        }
        return NextResponse.json({ received: true, reconciliation_required: true }, { status: 202 })
      }
    }
    console.error('[stripe-webhook] no stored payment for verified provider reference')
    return NextResponse.json({ error: 'Invalid payment event' }, { status: 400 })
  }

  // A provider event ID is the durable idempotency boundary. It is written
  // before state changes so a retry can never create a second refund record or
  // double-apply a late payment transition.
  const { data: insertedLedger, error: ledgerInsertError } = await admin
    .from('payment_provider_events')
    .insert({
      provider: 'stripe',
      provider_event_id: event.providerEventId,
      order_id: payment.order_id,
      venue_id: payment.venue_id,
      provider_ref: event.providerRef,
      event_type: event.type,
      amount_cents: event.amountCents,
      detail: raw,
    })
    .select('outcome')
    .maybeSingle()
  if (ledgerInsertError && ledgerInsertError.code !== '23505') {
    console.error('[stripe-webhook] event ledger insert failed:', ledgerInsertError.message)
    return NextResponse.json({ error: 'Payment reconciliation failed' }, { status: 500 })
  }
  if (ledgerInsertError?.code === '23505') {
    const { data: priorLedger, error: priorLedgerError } = await admin
      .from('payment_provider_events')
      .select('outcome')
      .eq('provider', 'stripe')
      .eq('provider_event_id', event.providerEventId)
      .maybeSingle()
    if (priorLedgerError || !priorLedger) {
      console.error('[stripe-webhook] event ledger replay lookup failed:', priorLedgerError?.message)
      return NextResponse.json({ error: 'Payment reconciliation failed' }, { status: 500 })
    }
    if (priorLedger.outcome !== 'received') {
      return NextResponse.json({ received: true, replayed: true, outcome: priorLedger.outcome })
    }
  } else if (!insertedLedger) {
    return NextResponse.json({ error: 'Payment reconciliation failed' }, { status: 500 })
  }

  async function settleLedger(outcome: string, detail: Record<string, unknown> = {}) {
    const { data, error } = await admin
      .from('payment_provider_events')
      .update({ outcome, detail: { ...raw, ...detail }, processed_at: new Date().toISOString() })
      .eq('provider', 'stripe')
      .eq('provider_event_id', event.providerEventId)
      .eq('outcome', 'received')
      .select('outcome')
      .maybeSingle()
    if (error) {
      console.error('[stripe-webhook] event ledger update failed:', error.message)
      return null
    }
    if (data?.outcome) return data.outcome
    const { data: settled, error: settledError } = await admin
      .from('payment_provider_events')
      .select('outcome')
      .eq('provider', 'stripe')
      .eq('provider_event_id', event.providerEventId)
      .maybeSingle()
    if (settledError || !settled) {
      console.error('[stripe-webhook] settled ledger lookup failed:', settledError?.message)
      return null
    }
    return settled.outcome as string
  }

  const decision = decidePaymentEvent(event, {
    orderId: payment.order_id,
    amountCents: payment.amount_cents,
    status: payment.status,
  } as StoredPayment)
  if (decision.kind === 'reject') {
    console.error('[stripe-webhook] verified event does not match stored payment:', decision.reason)
    if (!(await settleLedger('rejected', { reason: decision.reason }))) {
      return NextResponse.json({ error: 'Payment reconciliation failed' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Invalid payment event' }, { status: 400 })
  }
  if (decision.kind === 'replay') {
    if (!(await settleLedger('replayed'))) {
      return NextResponse.json({ error: 'Payment reconciliation failed' }, { status: 500 })
    }
    return NextResponse.json({ received: true, replayed: true })
  }
  if (decision.kind === 'reconciliation_required') {
    // A signed success mismatch or success-after-failure quarantines the
    // payment itself before acknowledgement, so checkout reservation cannot
    // create another payable attempt while an operator investigates.
    if (event.type === 'payment.succeeded') {
      const { error: quarantineError } = await admin.rpc('quarantine_order_payment_attempts', {
        p_order_id: payment.order_id,
        p_venue_id: payment.venue_id,
        p_raw: raw,
      })
      if (quarantineError) {
        console.error('[stripe-webhook] payment quarantine failed:', quarantineError.message)
        return NextResponse.json({ error: 'Payment reconciliation failed' }, { status: 500 })
      }
    }
    if (!(await settleLedger('reconciliation_required', { reason: decision.reason }))) {
      return NextResponse.json({ error: 'Payment reconciliation failed' }, { status: 500 })
    }
    return NextResponse.json({ received: true, reconciliation_required: true }, { status: 202 })
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
      reconciliation_required: boolean
    }
    if (result.reconciliation_required) {
      console.error('[stripe-webhook] AMOUNT MISMATCH', {
        providerRef: event.providerRef,
        orderId: result.order_id,
      })
      // Retrying a permanent mismatch cannot repair it. Keep the failed row
      // for an operator to investigate rather than returning a retrying 5xx.
      const reason = result.amount_mismatch ? 'amount_mismatch' : 'terminal_payment_or_order_state'
      if (!(await settleLedger('reconciliation_required', { reason }))) {
        return NextResponse.json({ error: 'Payment reconciliation failed' }, { status: 500 })
      }
      return NextResponse.json({ received: true, reconciliation_required: true }, { status: 202 })
    }

    // The paid transition created durable follow-up work in the same DB
    // transaction. A replay can finish it after a process interruption;
    // per-program period keys prevent duplicate offers.
    const followup = await admin.from('growth_offer_outbox')
      .select('order_id,done,lease_token')
      .eq('venue_id', result.venue_id).eq('order_id', result.order_id)
      .maybeSingle()
    if (followup.error) {
      return NextResponse.json({ error: 'Paid offer recovery unavailable' }, { status: 500 })
    }
    if (followup.data && !followup.data.done && !followup.data.lease_token) {
      try {
        await issueBounceBackOffersForOrder(admin, result.venue_id, result.order_id)
        const completed = await admin.from('growth_offer_outbox')
          .update({ done: true, safe_error: null })
          .eq('venue_id', result.venue_id).eq('order_id', result.order_id)
          .is('lease_token', null)
        if (completed.error) throw new Error('OFFER_OUTBOX_FINISH_FAILED')
      } catch (err) {
        console.error('[stripe-webhook] bounce-back issuance failed:', err)
      }
    }

    if (!(await settleLedger(result.applied ? 'applied' : 'replayed'))) {
      return NextResponse.json({ error: 'Payment reconciliation failed' }, { status: 500 })
    }
    return NextResponse.json({ received: true, applied: result.applied })
  }

  if (event.type === 'payment.failed') {
    const { data: updatedPayment, error } = await admin
      .from('payments')
      .update({ status: 'failed', raw })
      .eq('provider', 'stripe')
      .eq('provider_ref', event.providerRef)
      .eq('order_id', payment.order_id)
      .eq('status', 'pending')
      .select('payment_id')
      .maybeSingle()
    if (error) {
      console.error('[stripe-webhook] payment failure update failed:', error.message)
      return NextResponse.json({ error: 'Payment reconciliation failed' }, { status: 500 })
    }
    if (!(await settleLedger(updatedPayment ? 'applied' : 'reconciliation_required', updatedPayment ? {} : { reason: 'failure_raced_terminal_state' }))) {
      return NextResponse.json({ error: 'Payment reconciliation failed' }, { status: 500 })
    }
    return NextResponse.json({ received: true, applied: Boolean(updatedPayment) })
  }

  // Refund application remains a separate operator reconciliation concern.
  // The verified event is recorded as pending rather than reported as a
  // completed refund, and cannot change restaurant preparation state.
  if (!(await settleLedger('refund_reconciliation_pending'))) {
    return NextResponse.json({ error: 'Payment reconciliation failed' }, { status: 500 })
  }
  return NextResponse.json({ received: true, refund_reconciliation: 'pending' }, { status: 202 })
}
