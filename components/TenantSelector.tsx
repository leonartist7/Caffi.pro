'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTenant } from '@/contexts/TenantContext'
import { Building2, ChevronDown, Check } from 'lucide-react'
import Link from 'next/link'

interface Tenant {
  tenant_id: string
  business_name: string
  slug: string
  logo_url?: string
}

export default function TenantSelector() {
  const { selectedTenant, setSelectedTenant } = useTenant()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    fetchTenants()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- legacy effect; refit to TanStack Query in Phase 3
  }, [])

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  async function fetchTenants() {
    try {
      const res = await fetch('/api/clients')
      if (!res.ok) throw new Error(`Failed to load clients (${res.status})`)
      const { clients } = await res.json()
      const rows: Tenant[] = clients || []
      setTenants(rows)

      // Re-sync the stored selection against the live list: refresh it if
      // still valid, clear it if the client was deleted (never silently
      // fall back to picking a different one).
      if (selectedTenant) {
        const freshTenant = rows.find(t => t.tenant_id === selectedTenant.tenant_id)
        setSelectedTenant(freshTenant ?? null)
      }
    } catch (error) {
      console.error('Error fetching tenants:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleSelectTenant(tenant: Tenant) {
    setSelectedTenant(tenant)
    setIsOpen(false)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-aro-sand/60 animate-pulse">
        <Building2 className="w-5 h-5 text-aro-muted" />
        <span className="text-sm text-aro-muted">Loading...</span>
      </div>
    )
  }

  return (
    <>
      {/* Selector Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl bg-white/80 backdrop-blur-xl border border-aro-hairline hover:border-aro-clay transition-all shadow-sm hover:shadow-md"
      >
        {selectedTenant ? (
          <>
            {selectedTenant.logo_url ? (
              <img
                src={selectedTenant.logo_url}
                alt={selectedTenant.business_name}
                className="w-6 h-6 lg:w-7 lg:h-7 rounded-lg object-cover"
              />
            ) : (
              <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-lg bg-aro-terra flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white" />
              </div>
            )}
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-xs text-aro-muted">Managing</span>
              <span className="text-sm font-semibold text-aro-ink">
                {selectedTenant.business_name}
              </span>
            </div>
            <span className="sm:hidden text-sm font-semibold text-aro-ink">
              {selectedTenant.business_name.length > 15
                ? selectedTenant.business_name.substring(0, 15) + '...'
                : selectedTenant.business_name}
            </span>
          </>
        ) : (
          <>
            <Building2 className="w-5 h-5 lg:w-6 lg:h-6 text-aro-ink-soft" />
            <span className="text-sm lg:text-base font-medium text-aro-ink-soft">
              Select Client
            </span>
          </>
        )}
        <ChevronDown
          className={`w-4 h-4 lg:w-5 lg:h-5 text-aro-ink-soft transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu - Rendered via Portal */}
      {mounted &&
        isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed w-72 lg:w-80 bg-white rounded-2xl shadow-2xl border border-aro-hairline backdrop-blur-xl z-[99999] max-h-96 overflow-hidden flex flex-col"
            style={{
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`,
            }}
          >
            {/* Header */}
            <div className="p-4 border-b border-aro-hairline">
              <p className="text-sm font-semibold text-aro-ink mb-1">Your Coffee Shop Clients</p>
              <p className="text-xs text-aro-muted">
                {tenants.length} active {tenants.length === 1 ? 'client' : 'clients'}
              </p>
            </div>

            {/* Tenants List */}
            <div className="overflow-y-auto max-h-80 p-2">
              {tenants.length === 0 ? (
                <div className="p-8 text-center">
                  <Building2 className="w-12 h-12 text-aro-clay mx-auto mb-3" />
                  <p className="text-sm text-aro-muted mb-3">No clients yet</p>
                  <Link
                    href="/clients"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-aro-terra text-white text-sm font-medium hover:shadow-lg transition-all"
                  >
                    Add Your First Client
                  </Link>
                </div>
              ) : (
                tenants.map(tenant => (
                  <button
                    key={tenant.tenant_id}
                    onClick={() => handleSelectTenant(tenant)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      selectedTenant?.tenant_id === tenant.tenant_id
                        ? 'bg-aro-terra text-white'
                        : 'hover:bg-aro-sand/40 text-aro-ink'
                    }`}
                  >
                    {tenant.logo_url ? (
                      <img
                        src={tenant.logo_url}
                        alt={tenant.business_name}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          selectedTenant?.tenant_id === tenant.tenant_id
                            ? 'bg-white/20'
                            : 'bg-aro-sand'
                        }`}
                      >
                        <Building2
                          className={`w-5 h-5 ${
                            selectedTenant?.tenant_id === tenant.tenant_id
                              ? 'text-white'
                              : 'text-aro-ink-soft'
                          }`}
                        />
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <p
                        className={`text-sm font-semibold ${
                          selectedTenant?.tenant_id === tenant.tenant_id
                            ? 'text-white'
                            : 'text-aro-ink'
                        }`}
                      >
                        {tenant.business_name}
                      </p>
                      <p
                        className={`text-xs ${
                          selectedTenant?.tenant_id === tenant.tenant_id
                            ? 'text-white/80'
                            : 'text-aro-muted'
                        }`}
                      >
                        {tenant.slug}
                      </p>
                    </div>
                    {selectedTenant?.tenant_id === tenant.tenant_id && (
                      <Check className="w-5 h-5 text-white flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            {tenants.length > 0 && (
              <div className="p-3 border-t border-aro-hairline">
                <Link
                  href="/clients"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-aro-sand text-aro-ink-soft hover:bg-aro-clay/50 transition-all text-sm font-medium"
                >
                  <Building2 className="w-4 h-4" />
                  Manage All Clients
                </Link>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  )
}
