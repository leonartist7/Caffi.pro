'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTenant } from '@/contexts/TenantContext'
import { createClient } from '@/utils/supabase/client'
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
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    fetchTenants()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const { data, error } = await supabase
        .from('tenants')
        .select('tenant_id, business_name, slug')
        .order('business_name')

      if (error) throw error

      // Fetch logo URLs from tenant_manifests
      const tenantsWithLogos = await Promise.all(
        (data || []).map(async tenant => {
          const { data: manifest } = await supabase
            .from('tenant_manifests')
            .select('logo_url')
            .eq('tenant_id', tenant.tenant_id)
            .single()

          return {
            ...tenant,
            logo_url: manifest?.logo_url || null,
          }
        })
      )

      setTenants(tenantsWithLogos)

      // Update selected tenant with fresh data if it exists
      if (selectedTenant) {
        const freshTenant = tenantsWithLogos.find(t => t.tenant_id === selectedTenant.tenant_id)
        if (freshTenant) {
          console.log('Updating selected tenant with fresh data:', freshTenant)
          setSelectedTenant(freshTenant)
        }
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
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-coffee-100 dark:bg-dark-800 animate-pulse">
        <Building2 className="w-5 h-5 text-coffee-400 dark:text-cream-600" />
        <span className="text-sm text-coffee-600 dark:text-cream-400">Loading...</span>
      </div>
    )
  }

  return (
    <>
      {/* Selector Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border border-coffee-200/50 dark:border-dark-700 hover:border-coffee-300 dark:hover:border-dark-600 transition-all shadow-sm hover:shadow-md"
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
              <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-lg bg-gradient-coffee flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-cream-100" />
              </div>
            )}
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-xs text-coffee-500 dark:text-cream-500">Managing</span>
              <span className="text-sm font-semibold text-coffee-900 dark:text-cream-100">
                {selectedTenant.business_name}
              </span>
            </div>
            <span className="sm:hidden text-sm font-semibold text-coffee-900 dark:text-cream-100">
              {selectedTenant.business_name.length > 15
                ? selectedTenant.business_name.substring(0, 15) + '...'
                : selectedTenant.business_name}
            </span>
          </>
        ) : (
          <>
            <Building2 className="w-5 h-5 lg:w-6 lg:h-6 text-coffee-600 dark:text-cream-400" />
            <span className="text-sm lg:text-base font-medium text-coffee-700 dark:text-cream-300">
              Select Client
            </span>
          </>
        )}
        <ChevronDown
          className={`w-4 h-4 lg:w-5 lg:h-5 text-coffee-600 dark:text-cream-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu - Rendered via Portal */}
      {mounted &&
        isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed w-72 lg:w-80 bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-coffee-200/50 dark:border-dark-700 backdrop-blur-xl z-[99999] max-h-96 overflow-hidden flex flex-col"
            style={{
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`,
            }}
          >
            {/* Header */}
            <div className="p-4 border-b border-coffee-200/50 dark:border-dark-700">
              <p className="text-sm font-semibold text-coffee-900 dark:text-cream-100 mb-1">
                Your Coffee Shop Clients
              </p>
              <p className="text-xs text-coffee-600 dark:text-cream-400">
                {tenants.length} active {tenants.length === 1 ? 'client' : 'clients'}
              </p>
            </div>

            {/* Tenants List */}
            <div className="overflow-y-auto max-h-80 p-2">
              {tenants.length === 0 ? (
                <div className="p-8 text-center">
                  <Building2 className="w-12 h-12 text-coffee-300 dark:text-dark-600 mx-auto mb-3" />
                  <p className="text-sm text-coffee-600 dark:text-cream-400 mb-3">No clients yet</p>
                  <Link
                    href="/clients"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-coffee text-cream-100 text-sm font-medium hover:shadow-lg transition-all"
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
                        ? 'bg-gradient-coffee text-cream-100'
                        : 'hover:bg-coffee-50 dark:hover:bg-dark-700 text-coffee-900 dark:text-cream-100'
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
                            : 'bg-coffee-100 dark:bg-dark-900'
                        }`}
                      >
                        <Building2
                          className={`w-5 h-5 ${
                            selectedTenant?.tenant_id === tenant.tenant_id
                              ? 'text-cream-100'
                              : 'text-coffee-600 dark:text-cream-400'
                          }`}
                        />
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <p
                        className={`text-sm font-semibold ${
                          selectedTenant?.tenant_id === tenant.tenant_id
                            ? 'text-cream-100'
                            : 'text-coffee-900 dark:text-cream-100'
                        }`}
                      >
                        {tenant.business_name}
                      </p>
                      <p
                        className={`text-xs ${
                          selectedTenant?.tenant_id === tenant.tenant_id
                            ? 'text-cream-200'
                            : 'text-coffee-500 dark:text-cream-500'
                        }`}
                      >
                        {tenant.slug}
                      </p>
                    </div>
                    {selectedTenant?.tenant_id === tenant.tenant_id && (
                      <Check className="w-5 h-5 text-cream-100 flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            {tenants.length > 0 && (
              <div className="p-3 border-t border-coffee-200/50 dark:border-dark-700">
                <Link
                  href="/clients"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-coffee-100 dark:bg-dark-700 text-coffee-700 dark:text-cream-300 hover:bg-coffee-200 dark:hover:bg-dark-600 transition-all text-sm font-medium"
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
