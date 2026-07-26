/**
 * The public-site marketing profile, namespaced inside `venues.brand_kit`
 * (PLAN-05 Phase 1). Pure functions, no Supabase import — mirrors
 * `lib/reservations.ts`'s `parseReservationConfig` pattern so this file is
 * testable without a database and safe to import from a client component.
 *
 * Lives under `brand_kit.site_profile` rather than flattened onto brand_kit's
 * top level so it can never collide with the existing `logo_url`/`primary`
 * fields already read by lib/get-tenant.ts and lib/clients.ts.
 */

export interface SiteProfile {
  tagline: string | null
  about: string | null
  address: string | null
  phone_display: string | null
  instagram_url: string | null
  facebook_url: string | null
  gallery: string[]
  /**
   * Off by default. A venue's site only goes live once the owner has
   * actually filled in a profile and turned it on — never an empty
   * template masquerading as a real site (master plan §3 rule 5).
   */
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

/** Max gallery entries accepted; length is validated, content/URLs are not. */
export const SITE_GALLERY_MAX = 6

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function parseSiteProfile(brandKit: unknown): SiteProfile {
  const kit = (brandKit && typeof brandKit === 'object' ? brandKit : {}) as Record<string, unknown>
  const raw = (
    kit.site_profile && typeof kit.site_profile === 'object' ? kit.site_profile : {}
  ) as Record<string, unknown>

  const gallery = Array.isArray(raw.gallery)
    ? raw.gallery
        .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
        .slice(0, SITE_GALLERY_MAX)
    : []

  return {
    tagline: str(raw.tagline),
    about: str(raw.about),
    address: str(raw.address),
    phone_display: str(raw.phone_display),
    instagram_url: str(raw.instagram_url),
    facebook_url: str(raw.facebook_url),
    gallery,
    site_enabled: raw.site_enabled === true,
  }
}
