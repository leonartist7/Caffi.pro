export type CheckoutRecoveryInput = {
  orderStatus: string | null | undefined
  paymentStatus: string | null | undefined
  storedCheckoutUrl: string | null | undefined
  confirmationUrl: string
}

/** Returns a durable continuation before any new external checkout is created. */
export function recoverCheckout(input: CheckoutRecoveryInput): string | null {
  if (input.paymentStatus === 'succeeded') return input.confirmationUrl
  if (input.orderStatus !== 'pending' || input.paymentStatus !== 'pending') return null
  return input.storedCheckoutUrl || null
}
