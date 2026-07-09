/**
 * Feature flags (Phase 2.3). Server-side env reads; import from server
 * components / route handlers. For client components, pass the value down
 * as a prop from a server parent.
 */

/** Demo venue data may be reset nightly; UI may show a demo ribbon. */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true'
}

/**
 * Legacy shop/ordering PWA (/shop/[slug]/*) is PARKED until the ordering
 * phase (Blueprint calls direct ordering a phase-2 promise, not MVP).
 * Default: false.
 */
export function isOrderingEnabled(): boolean {
  return process.env.ORDERING_ENABLED === 'true'
}
