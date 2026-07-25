import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getVenueWeekStats, type VenueWeekStats } from '@/lib/owner-stats'
import { parseSiteProfile } from '@/lib/site-profile'

/**
 * Context gathering for generation (PLAN-07): fetch ONLY the real venue
 * rows a prompt is allowed to ground itself in. If a fact isn't returned
 * from here, the model must not state it — the prompt layer (lib/ai/prompts)
 * encodes that rule, this layer is what makes it satisfiable.
 */

export interface CaptionContext {
  businessName: string
  tagline: string | null
  about: string | null
}

export async function getCaptionContext(venueId: string): Promise<CaptionContext> {
  const admin = getSupabaseAdmin()
  const { data: venue } = await admin
    .from('venues')
    .select('business_name, brand_kit')
    .eq('venue_id', venueId)
    .single()
  const profile = parseSiteProfile(venue?.brand_kit)
  return {
    businessName: venue?.business_name ?? 'the café',
    tagline: profile.tagline,
    about: profile.about,
  }
}

export interface DigestContext {
  businessName: string
  stats: VenueWeekStats
}

export async function getDigestContext(venueId: string, timezone: string): Promise<DigestContext> {
  const admin = getSupabaseAdmin()
  const { data: venue } = await admin
    .from('venues')
    .select('business_name')
    .eq('venue_id', venueId)
    .single()
  const stats = await getVenueWeekStats(venueId, timezone)
  return { businessName: venue?.business_name ?? 'the café', stats }
}
