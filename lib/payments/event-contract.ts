import type { PaymentEventType, ProviderEvent } from '@/lib/payments/provider'

export type StoredPayment = {
  orderId: string
  amountCents: number
  status: 'pending' | 'succeeded' | 'failed' | 'refunded'
}

export type PaymentEventDecision =
  | { kind: 'apply' }
  | { kind: 'replay' }
  | { kind: 'reconciliation_required'; reason: string }
  | { kind: 'reject'; reason: string }

/**
 * Provider webhooks are allowed to arrive repeatedly and out of order. This
 * pure boundary prevents a late event from changing terminal truth while the
 * database RPC supplies the final transactional idempotency guard.
 */
export function decidePaymentEvent(
  event: Pick<ProviderEvent, 'type' | 'orderId' | 'amountCents'>,
  payment: StoredPayment
): PaymentEventDecision {
  if (event.orderId !== payment.orderId) return { kind: 'reject', reason: 'order_mismatch' }
  if (event.type === 'refund.succeeded') {
    if (event.amountCents <= 0 || event.amountCents > payment.amountCents) {
      return { kind: 'reject', reason: 'invalid_refund_amount' }
    }
  } else if (event.amountCents !== payment.amountCents) {
    // Do not discard a signed but inconsistent provider event. The database
    // transaction records this safely as reconciliation-required.
    return { kind: 'reconciliation_required', reason: 'amount_mismatch' }
  }

  if (event.type === 'payment.succeeded') {
    if (payment.status === 'pending') return { kind: 'apply' }
    if (payment.status === 'succeeded') return { kind: 'replay' }
    return { kind: 'reconciliation_required', reason: `success_after_${payment.status}` }
  }
  if (event.type === 'payment.failed') {
    if (payment.status === 'pending') return { kind: 'apply' }
    if (payment.status === 'failed') return { kind: 'replay' }
    return { kind: 'reconciliation_required', reason: `failure_after_${payment.status}` }
  }
  if (event.type === 'refund.succeeded') {
    if (payment.status === 'succeeded') return { kind: 'apply' }
    if (payment.status === 'refunded') return { kind: 'replay' }
    return { kind: 'reconciliation_required', reason: `refund_after_${payment.status}` }
  }
  return { kind: 'reject', reason: 'unsupported_event' }
}

export function isPaymentEventType(value: string): value is PaymentEventType {
  return value === 'payment.succeeded' || value === 'payment.failed' || value === 'refund.succeeded'
}
