import type { Metadata } from 'next'
import type { Tenant } from '@/lib/get-tenant'
import { sitePageUrl, type SitePage } from '@/lib/site-profile'

const PAGE_TITLES: Record<SitePage, (businessName: string, tagline: string | null) => string> = {
  home: (businessName, tagline) => `${businessName} — ${tagline ?? 'Menu, hours & location'}`,
  menu: businessName => `Menu — ${businessName}`,
  hours: businessName => `Hours & location — ${businessName}`,
  contact: businessName => `Contact — ${businessName}`,
}

function descriptionFor(tenant: Tenant): string {
  const about = tenant.site_profile.about?.replace(/\s+/g, ' ').trim()
  if (about) return about.length > 160 ? `${about.slice(0, 157).trimEnd()}…` : about
  return `Menu, opening hours, location and contact details for ${tenant.business_name}.`
}

export function buildSiteMetadata(tenant: Tenant, page: SitePage): Metadata {
  const title = PAGE_TITLES[page](tenant.business_name, tenant.site_profile.tagline)
  const description = descriptionFor(tenant)
  const canonical = sitePageUrl(tenant, page)
  const image = tenant.site_profile.gallery[0]

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title,
      description,
      url: canonical,
      siteName: tenant.business_name,
      ...(image ? { images: [{ url: image, alt: tenant.business_name }] } : {}),
    },
  }
}
