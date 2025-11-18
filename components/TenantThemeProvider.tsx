'use client'

import { useEffect, ReactNode } from 'react'

interface DesignTokens {
  colors?: {
    primary?: string
    secondary?: string
    accent?: string
  }
  branding?: {
    logo_url?: string
    app_name?: string
  }
}

interface TenantThemeProviderProps {
  children: ReactNode
  designTokens?: DesignTokens
  tenantSlug?: string
}

/**
 * TenantThemeProvider - Dynamically applies tenant-specific design tokens
 *
 * This component:
 * 1. Reads design_tokens from tenant_manifests table
 * 2. Applies custom CSS variables to the DOM
 * 3. Enables each tenant to have their own brand colors
 *
 * Usage:
 * <TenantThemeProvider designTokens={tenant.manifest.design_tokens}>
 *   <App />
 * </TenantThemeProvider>
 */
export default function TenantThemeProvider({
  children,
  designTokens,
  tenantSlug,
}: TenantThemeProviderProps) {
  useEffect(() => {
    if (!designTokens?.colors) return

    const root = document.documentElement

    // Apply custom colors as CSS variables
    if (designTokens.colors.primary) {
      root.style.setProperty('--tenant-primary', designTokens.colors.primary)
    }

    if (designTokens.colors.secondary) {
      root.style.setProperty('--tenant-secondary', designTokens.colors.secondary)
    }

    if (designTokens.colors.accent) {
      root.style.setProperty('--tenant-accent', designTokens.colors.accent)
    }

    // Add tenant slug as data attribute for potential CSS targeting
    if (tenantSlug) {
      root.setAttribute('data-tenant', tenantSlug)
    }

    console.log(`🎨 Applied custom theme for tenant: ${tenantSlug}`, {
      primary: designTokens.colors.primary,
      secondary: designTokens.colors.secondary,
      accent: designTokens.colors.accent,
    })

    // Cleanup on unmount
    return () => {
      root.style.removeProperty('--tenant-primary')
      root.style.removeProperty('--tenant-secondary')
      root.style.removeProperty('--tenant-accent')
      root.removeAttribute('data-tenant')
    }
  }, [designTokens, tenantSlug])

  return <>{children}</>
}
