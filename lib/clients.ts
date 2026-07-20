import 'server-only'

import { parseSiteProfile } from '@/lib/site-profile'

/**
 * Shared by /api/clients and /api/clients/[id] — Next.js route files can
 * only export HTTP method handlers (GET/POST/...), so this couldn't live
 * in route.ts itself despite being used by both.
 */

export interface ClientRow {
  venue_id: string
  business_name: string
  slug: string
  owner_email: string
  owner_phone: string | null
  app_name: string
  bundle_id: string
  subscription_status: string
  created_at: string
  timezone: string
  custom_domain: string | null
  brand_kit: Record<string, unknown> | null
  reservation_config?: Record<string, unknown> | null
}

export const CLIENT_COLUMNS =
  'venue_id, business_name, slug, owner_email, owner_phone, app_name, bundle_id, subscription_status, created_at, timezone, custom_domain, brand_kit, reservation_config'

export function toTenantShape(v: ClientRow) {
  const kit = v.brand_kit ?? {}
  return {
    tenant_id: v.venue_id,
    business_name: v.business_name,
    slug: v.slug,
    owner_email: v.owner_email,
    owner_phone: v.owner_phone,
    app_name: v.app_name,
    bundle_id: v.bundle_id,
    subscription_status: v.subscription_status ?? 'trial',
    created_at: v.created_at,
    timezone: v.timezone,
    custom_domain: v.custom_domain,
    logo_url: (kit.logo_url as string | undefined) ?? null,
    primary_color: (kit.primary as string | undefined) ?? null,
    site_profile: parseSiteProfile(kit),
    reservation_config: v.reservation_config ?? null,
  }
}
