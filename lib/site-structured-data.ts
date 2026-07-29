import type { Tenant } from '@/lib/get-tenant'

/**
 * LocalBusiness structured data for a venue's public site (PLAN-05 Phase 3).
 * Pure function, no Supabase import. Omits any field it has no real data
 * for rather than fabricating placeholders — a search engine reading a
 * fake `addressLocality` is worse than a shorter, honest object.
 */
export function buildLocalBusinessJsonLd(tenant: Tenant, siteUrl: string): Record<string, unknown> {
  const { site_profile } = tenant
  const sameAs = [site_profile.instagram_url, site_profile.facebook_url].filter(
    (url): url is string => Boolean(url)
  )

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CafeOrCoffeeShop',
    name: tenant.business_name,
    url: siteUrl,
  }

  if (site_profile.address) {
    jsonLd.address = { '@type': 'PostalAddress', streetAddress: site_profile.address }
  }
  if (site_profile.phone_display) {
    jsonLd.telephone = site_profile.phone_display
  }
  if (sameAs.length > 0) {
    jsonLd.sameAs = sameAs
  }

  return jsonLd
}

/** Base URL for canonical links / structured data, matching the app-wide convention. */
export function getSiteBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}
