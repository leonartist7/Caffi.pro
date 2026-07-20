export interface SiteProfile {
  tagline: string | null
  about: string | null
  address: string | null
  phone_display: string | null
  instagram_url: string | null
  facebook_url: string | null
  gallery: string[]
  site_enabled: boolean
}

export const DEFAULT_SITE_PROFILE: SiteProfile = {
  tagline: null,
  about: null,
  address: null,
  phone_display: null,
  instagram_url: null,
  facebook_url: null,
  gallery: [],
  site_enabled: false,
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/**
 * Parse the namespaced marketing profile from a venue's full brand_kit.
 * Unknown and malformed values fall back safely; gallery URLs are owner-
 * supplied strings and are capped at six without content validation.
 */
export function parseSiteProfile(brandKit: unknown): SiteProfile {
  const kit = asObject(brandKit)
  const profile = asObject(kit.site_profile)
  const gallery = Array.isArray(profile.gallery)
    ? profile.gallery.filter((value): value is string => typeof value === 'string').slice(0, 6)
    : []

  return {
    tagline: nullableString(profile.tagline),
    about: nullableString(profile.about),
    address: nullableString(profile.address),
    phone_display: nullableString(profile.phone_display),
    instagram_url: nullableString(profile.instagram_url),
    facebook_url: nullableString(profile.facebook_url),
    gallery,
    site_enabled: profile.site_enabled === true,
  }
}

export interface SiteIdentity {
  slug: string
  custom_domain?: string | null
}

export type SitePage = 'home' | 'menu' | 'hours' | 'contact'

export function siteBaseUrl(
  venue: SiteIdentity,
  appOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
): string {
  const customDomain = venue.custom_domain?.trim()
  if (customDomain) {
    return `https://${customDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`
  }
  return `${appOrigin.replace(/\/+$/, '')}/site/${venue.slug}`
}

export function sitePageUrl(venue: SiteIdentity, page: SitePage, appOrigin?: string): string {
  const base = siteBaseUrl(venue, appOrigin)
  return page === 'home' ? base : `${base}/${page}`
}
