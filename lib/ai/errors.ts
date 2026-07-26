/**
 * Two error classes because the UI must tell these apart (PLAN-07 Phase 1):
 * a configuration fault is a deployment problem the owner can fix by adding
 * a key, and renders the STUBBED badge; a request fault is transient upstream
 * weather, and renders the calm retry state. Collapsing them into one would
 * make a missing API key look like a temporary outage forever.
 */
export class AiProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiProviderConfigurationError'
  }
}

/** Upstream refused, timed out, or returned something unusable. Retryable. */
export class AiProviderRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiProviderRequestError'
  }
}
