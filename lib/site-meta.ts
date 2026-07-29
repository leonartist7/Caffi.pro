import type { Metadata } from 'next'
import type { SiteProfile } from '@/lib/site-profile'

/** Meta description length that stays fully visible in most search results. */
const META_DESCRIPTION_MAX = 160

/** Truncates `about` for a meta description without ever mid-word cutting. */
export function siteMetaDescription(about: string | null): string | undefined {
  if (!about) return undefined
  const flat = about.replace(/\s+/g, ' ').trim()
  if (flat.length <= META_DESCRIPTION_MAX) return flat
  const cut = flat.slice(0, META_DESCRIPTION_MAX)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : META_DESCRIPTION_MAX)}…`
}

/**
 * `gallery[0]` if the venue provided one; no fallback asset — this project
 * has no default OG image in `public/` today, and inventing a path that
 * 404s is worse than omitting the tag entirely (PLAN-05 Phase 2 step 6).
 */
export function siteOgImage(profile: SiteProfile): Metadata['openGraph'] | undefined {
  const image = profile.gallery[0]
  if (!image) return undefined
  return { images: [{ url: image }] }
}
