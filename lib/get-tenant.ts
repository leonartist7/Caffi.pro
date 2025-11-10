import { supabase } from '@/lib/supabase'

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

/**
 * Get tenant by slug (e.g., 'joesbeans')
 * Used for customer-facing shop routes
 */
export async function getTenantBySlug(slug: string | null): Promise<Tenant | null> {
  if (!slug) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('tenants')
      .select(
        'tenant_id, business_name, slug, custom_domain, app_name, features_enabled, loyalty_config, currency, timezone'
      )
      .eq('slug', slug)
      .single()

    if (error) {
      console.error('Error fetching tenant by slug:', error)
      return null
    }

    // Also get the manifest for design tokens (logo, colors, etc.)
    const { data: manifest } = await supabase
      .from('tenant_manifests')
      .select('design_tokens')
      .eq('tenant_id', data.tenant_id)
      .single()

    return {
      ...data,
      logo_url: manifest?.design_tokens?.branding?.logo_url,
      primary_color: manifest?.design_tokens?.colors?.primary || '#6b3410',
    }
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
    const { data, error } = await supabase
      .from('tenants')
      .select(
        'tenant_id, business_name, slug, custom_domain, app_name, features_enabled, loyalty_config, currency, timezone'
      )
      .eq('custom_domain', domain)
      .single()

    if (error) {
      console.error('Error fetching tenant by domain:', error)
      return null
    }

    // Also get the manifest for design tokens
    const { data: manifest } = await supabase
      .from('tenant_manifests')
      .select('design_tokens')
      .eq('tenant_id', data.tenant_id)
      .single()

    return {
      ...data,
      logo_url: manifest?.design_tokens?.branding?.logo_url,
      primary_color: manifest?.design_tokens?.colors?.primary || '#6b3410',
    }
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
    const { data, error } = await supabase
      .from('tenants')
      .select(
        'tenant_id, business_name, slug, custom_domain, app_name, features_enabled, loyalty_config, currency, timezone'
      )
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      console.error('Error fetching tenant by ID:', error)
      return null
    }

    // Also get the manifest for design tokens
    const { data: manifest } = await supabase
      .from('tenant_manifests')
      .select('design_tokens')
      .eq('tenant_id', data.tenant_id)
      .single()

    return {
      ...data,
      logo_url: manifest?.design_tokens?.branding?.logo_url,
      primary_color: manifest?.design_tokens?.colors?.primary || '#6b3410',
    }
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
    const { data, error } = await supabase
      .from('tenants')
      .select('tenant_id, business_name, slug')
      .order('business_name')

    if (error) {
      console.error('Error fetching tenants:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Failed to fetch tenants:', err)
    return []
  }
}
