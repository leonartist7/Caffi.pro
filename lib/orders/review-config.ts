/**
 * Venue-level review-prompt destination, namespaced inside `venues.brand_kit`
 * (PLAN-21), mirroring `lib/orders/tip-config.ts`'s `brand_kit.tip_config`
 * pattern so no migration is needed for the URL itself.
 *
 * Pure functions, no Supabase import — safe to import from a client
 * component (the confirmation screen needs `looksLikeReviewHost` too, for
 * a settings-page preview).
 */

export interface ReviewConfig {
  /** The owner-pasted destination — null when nothing is configured yet. */
  url: string | null
}

export const DEFAULT_REVIEW_CONFIG: ReviewConfig = { url: null }

/** A small allowlist used only for a non-blocking "does this look right?" warning. */
const KNOWN_REVIEW_HOSTS = [
  'google.com',
  'g.page',
  'goo.gl',
  'yelp.com',
  'facebook.com',
  'tripadvisor.com',
  'tripadvisor.ca',
]

export function parseReviewConfig(brandKit: unknown): ReviewConfig {
  const kit = (brandKit && typeof brandKit === 'object' ? brandKit : {}) as Record<string, unknown>
  const raw = (
    kit.review_profile && typeof kit.review_profile === 'object' ? kit.review_profile : {}
  ) as Record<string, unknown>
  const url = typeof raw.url === 'string' && raw.url.trim() ? raw.url.trim() : null
  return { url }
}

export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

/** Non-blocking signal only — an unrecognized host is still a valid review link. */
export function looksLikeReviewHost(value: string): boolean {
  try {
    const host = new URL(value).hostname.replace(/^www\./, '')
    return KNOWN_REVIEW_HOSTS.some(known => host === known || host.endsWith(`.${known}`))
  } catch {
    return false
  }
}
