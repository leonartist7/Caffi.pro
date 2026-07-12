import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Anonymous, sessionless client for PUBLIC venue lookups only (safe in
 * both server and client bundles — anon key + RLS). The service-role
 * client lives in `lib/supabase-admin.ts` and is server-only.
 */
let anonClient: SupabaseClient | null = null
function getAnonClient(): SupabaseClient {
  if (anonClient) return anonClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).'
    )
  }
  anonClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return anonClient
}

export interface Tenant {
  tenant_id: string
  business_name: string
  slug: string
  custom_domain?: string
  logo_url?: string
  primary_color?: string
  app_name?: string
  features_enabled?: {
    ordering?: boolean
    loyalty?: boolean
    delivery?: boolean
    pwa?: boolean
    coupons?: boolean
    rewards?: boolean
  }
  loyalty_config?: {
    points_per_euro?: number
    signup_bonus?: number
  }
  currency?: string
  timezone?: string
}

// Matches the exact column list anon is granted on `venues` (see
// supabase/migrations/20260707000002_aro_rls.sql, "public identity
// readable by anyone") — contact/billing columns are deliberately not
// selectable here.
const VENUE_PUBLIC_COLUMNS =
  'venue_id, business_name, slug, custom_domain, app_name, features_enabled, loyalty_config, currency, timezone, brand_kit'

interface VenueRow {
  venue_id: string
  business_name: string
  slug: string
  custom_domain: string | null
  app_name: string | null
  features_enabled: Tenant['features_enabled'] | null
  loyalty_config: Tenant['loyalty_config'] | null
  currency: string | null
  timezone: string | null
  brand_kit: Record<string, unknown> | null
}

function toTenant(v: VenueRow): Tenant {
  const kit = v.brand_kit ?? {}
  return {
    tenant_id: v.venue_id,
    business_name: v.business_name,
    slug: v.slug,
    custom_domain: v.custom_domain ?? undefined,
    app_name: v.app_name ?? undefined,
    features_enabled: v.features_enabled ?? undefined,
    loyalty_config: v.loyalty_config ?? undefined,
    currency: v.currency ?? undefined,
    timezone: v.timezone ?? undefined,
    logo_url: (kit.logo_url as string | undefined) ?? undefined,
    primary_color: (kit.primary as string | undefined) ?? '#6b3410',
  }
}

/**
 * Get tenant by slug (e.g., 'joesbeans')
 * Used for customer-facing shop routes
 */
export async function getTenantBySlug(slug: string | null): Promise<Tenant | null> {
  if (!slug) {
    return null
  }

  try {
    const supabase = getAnonClient()
    const { data, error } = await supabase
      .from('venues')
      .select(VENUE_PUBLIC_COLUMNS)
      .eq('slug', slug)
      .single()

    if (error || !data) {
      console.error('[getTenantBySlug] lookup failed:', { slug, error: error?.message })
      return null
    }

    return toTenant(data as unknown as VenueRow)
  } catch (err) {
    console.error('Failed to fetch tenant:', err)
    return null
  }
}

/**
 * Get tenant by custom domain (e.g., 'www.mycoffeeshop.com')
 * Used for custom domain routing in middleware
 */
export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  if (!domain) {
    return null
  }

  try {
    const supabase = getAnonClient()
    const { data, error } = await supabase
      .from('venues')
      .select(VENUE_PUBLIC_COLUMNS)
      .eq('custom_domain', domain)
      .single()

    if (error || !data) {
      console.error('Error fetching tenant by domain:', error?.message)
      return null
    }

    return toTenant(data as unknown as VenueRow)
  } catch (err) {
    console.error('Failed to fetch tenant by domain:', err)
    return null
  }
}

/**
 * Get tenant by ID
 * Used for admin operations
 */
export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  try {
    const supabase = getAnonClient()
    const { data, error } = await supabase
      .from('venues')
      .select(VENUE_PUBLIC_COLUMNS)
      .eq('venue_id', tenantId)
      .single()

    if (error || !data) {
      console.error('Error fetching tenant by ID:', error?.message)
      return null
    }

    return toTenant(data as unknown as VenueRow)
  } catch (err) {
    console.error('Failed to fetch tenant:', err)
    return null
  }
}

/**
 * Get all tenants
 * Used for admin tenant selector
 */
export async function getAllTenants(): Promise<Tenant[]> {
  try {
    const supabase = getAnonClient()
    const { data, error } = await supabase
      .from('venues')
      .select('venue_id, business_name, slug')
      .order('business_name')

    if (error) {
      console.error('Error fetching tenants:', error)
      return []
    }

    return (data ?? []).map(v => ({
      tenant_id: v.venue_id,
      business_name: v.business_name,
      slug: v.slug,
    }))
  } catch (err) {
    console.error('Failed to fetch tenants:', err)
    return []
  }
}
