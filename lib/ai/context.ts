import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Gathers the real venue rows every generation is grounded in (strategic doc
 * §3.4 rule 1). Server-only, same discipline as lib/owner-stats.ts — a client
 * component must never be able to assemble prompt context itself.
 *
 * Whatever this returns is also what gets stored verbatim into
 * `ai_drafts.prompt_ctx`, so that a draft which reads oddly weeks later can be
 * explained without having logged the raw request/response separately.
 */
export interface VenueAiContext {
  venueId: string
  businessName: string
  timezone: string
  tagline: string | null
}

/** Fallback matches lib/owner-stats.ts's callers — the seed venue's zone. */
const DEFAULT_TIMEZONE = 'America/Edmonton'

export async function getVenueAiContext(venueId: string): Promise<VenueAiContext | null> {
  const admin = getSupabaseAdmin()
  const { data: venue, error } = await admin
    .from('venues')
    .select('venue_id, business_name, timezone, brand_kit')
    .eq('venue_id', venueId)
    .maybeSingle()

  if (error || !venue) return null

  return {
    venueId: venue.venue_id,
    businessName: venue.business_name ?? 'this café',
    timezone: venue.timezone ?? DEFAULT_TIMEZONE,
    tagline: readTagline(venue.brand_kit),
  }
}

/**
 * `brand_kit` is free-form JSONB today; PLAN-05 is what will give it a real
 * `site_profile.tagline`. Read defensively so this keeps working both before
 * and after that lands, and never let a non-string sneak into a prompt.
 */
function readTagline(brandKit: unknown): string | null {
  if (!brandKit || typeof brandKit !== 'object') return null
  const kit = brandKit as Record<string, unknown>

  const direct = kit.tagline
  if (typeof direct === 'string' && direct.trim()) return direct.trim()

  const profile = kit.site_profile
  if (profile && typeof profile === 'object') {
    const nested = (profile as Record<string, unknown>).tagline
    if (typeof nested === 'string' && nested.trim()) return nested.trim()
  }

  return null
}
