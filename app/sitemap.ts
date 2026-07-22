import type { MetadataRoute } from 'next'
import { listPublishedSites } from '@/lib/site-data'
import { sitePageUrl, type SitePage } from '@/lib/site-profile'

export const dynamic = 'force-dynamic'

const SITE_PAGES: Array<{ page: SitePage; priority: number }> = [
  { page: 'home', priority: 1 },
  { page: 'menu', priority: 0.9 },
  { page: 'hours', priority: 0.8 },
  { page: 'contact', priority: 0.7 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sites = await listPublishedSites()
  return sites.flatMap(site =>
    SITE_PAGES.map(({ page, priority }) => ({
      url: sitePageUrl(site, page),
      lastModified: new Date(site.updated_at),
      changeFrequency: 'weekly' as const,
      priority,
    }))
  )
}
