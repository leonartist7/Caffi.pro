import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { parseReservationConfig, type ReservationHours } from '@/lib/reservations'
import { parseSiteProfile } from '@/lib/site-profile'

export interface PublishedSite {
  slug: string
  custom_domain: string | null
  updated_at: string
}

/** Server-only access to the public-safe weekly opening window. */
export async function getSiteHoursBySlug(slug: string): Promise<ReservationHours> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('venues')
    .select('reservation_config')
    .eq('slug', slug)
    .eq('kill_switch', false)
    .maybeSingle()

  if (error) {
    console.error('[site-data] hours lookup failed:', { slug, error: error.message })
    return null
  }
  return parseReservationConfig(data?.reservation_config).hours
}

/** Service-role list used only by the native sitemap generator. */
export async function listPublishedSites(): Promise<PublishedSite[]> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('venues')
    .select('slug, custom_domain, brand_kit, updated_at')
    .eq('kill_switch', false)
    .order('slug')

  if (error) {
    console.error('[site-data] published-site list failed:', error.message)
    return []
  }

  return (data ?? [])
    .filter(row => parseSiteProfile(row.brand_kit).site_enabled)
    .map(row => ({
      slug: row.slug,
      custom_domain: row.custom_domain,
      updated_at: row.updated_at,
    }))
}

export function hasConfiguredHours(hours: ReservationHours): boolean {
  return !!hours && Object.values(hours).some(window => Array.isArray(window))
}
