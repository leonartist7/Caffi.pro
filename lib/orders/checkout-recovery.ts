export type CheckoutRecoveryInput = {
  paymentStatus: string | null | undefined
  storedCheckoutUrl: string | null | undefined
  confirmationUrl: string
}

/** Returns a durable continuation before any new external checkout is created. */
export function recoverCheckout(input: CheckoutRecoveryInput): string | null {
  if (input.paymentStatus === 'succeeded') return input.confirmationUrl
  return input.storedCheckoutUrl || null
}
