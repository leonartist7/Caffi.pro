'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Tenant {
  tenant_id: string
  business_name: string
  slug: string
  logo_url?: string
  primary_color?: string
}

interface TenantContextType {
  selectedTenant: Tenant | null
  setSelectedTenant: (tenant: Tenant | null) => void
  isLoading: boolean
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function TenantProvider({ children }: { children: ReactNode }) {
  const [selectedTenant, setSelectedTenantState] = useState<Tenant | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load selected tenant from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('selectedTenant')
    if (stored) {
      try {
        setSelectedTenantState(JSON.parse(stored))
      } catch (error) {
        console.error('Failed to parse stored tenant:', error)
      }
    }
    setIsLoading(false)
  }, [])

  // Save to localStorage whenever tenant changes
  const setSelectedTenant = (tenant: Tenant | null) => {
    setSelectedTenantState(tenant)
    if (tenant) {
      localStorage.setItem('selectedTenant', JSON.stringify(tenant))
    } else {
      localStorage.removeItem('selectedTenant')
    }
  }

  return (
    <TenantContext.Provider value={{ selectedTenant, setSelectedTenant, isLoading }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}
