import type { MetadataRoute } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { parseSiteProfile } from '@/lib/site-profile'
import { getSiteBaseUrl } from '@/lib/site-structured-data'

const SITE_PAGES = ['', '/menu', '/hours', '/contact']

// Reflects live site_enabled state — every other Supabase-backed route in
// this app is dynamic for the same reason; a build-time-frozen sitemap
// would never pick up a venue turning their site on or off.
export const dynamic = 'force-dynamic'

/**
 * Native App Router sitemap (PLAN-05 Phase 3) — one small file, not a new
 * API route or per-venue page, since this is the one piece of this phase
 * that genuinely needs a full venue list rather than a single-venue read.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = getSupabaseAdmin()
  const { data: venues } = await admin.from('venues').select('slug, brand_kit')
  const baseUrl = getSiteBaseUrl()

  const enabledSlugs = (venues ?? [])
    .filter(v => parseSiteProfile(v.brand_kit).site_enabled)
    .map(v => v.slug as string)

  return enabledSlugs.flatMap(slug =>
    SITE_PAGES.map(page => ({ url: `${baseUrl}/site/${slug}${page}` }))
  )
}
