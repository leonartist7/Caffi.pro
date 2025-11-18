'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useTenant } from '@/contexts/TenantContext'

export default function DiagnosticPage() {
  const { selectedTenant } = useTenant()
  const [diagnostics, setDiagnostics] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    runDiagnostics()
  }, [selectedTenant])

  async function runDiagnostics() {
    setLoading(true)
    const results: any = {
      timestamp: new Date().toISOString(),
      selectedTenant: selectedTenant,
    }

    try {
      // Test 1: Check all tenants and their slugs
      const { data: allTenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('tenant_id, business_name, slug')
        .order('business_name')

      results.allTenants = {
        count: allTenants?.length || 0,
        data: allTenants,
        error: tenantsError?.message,
      }

      if (selectedTenant?.tenant_id) {
        // Test 2: Check categories for selected tenant
        const { data: categories, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .eq('tenant_id', selectedTenant.tenant_id)

        results.categories = {
          count: categories?.length || 0,
          data: categories,
          error: categoriesError?.message,
        }

        // Test 3: Check menu items for selected tenant
        const { data: menuItems, error: menuItemsError } = await supabase
          .from('menu_items')
          .select('*')
          .eq('tenant_id', selectedTenant.tenant_id)

        results.menuItems = {
          count: menuItems?.length || 0,
          data: menuItems,
          error: menuItemsError?.message,
        }

        // Test 4: Check if tenant has a valid slug
        const { data: tenantCheck, error: tenantError } = await supabase
          .from('tenants')
          .select('slug')
          .eq('tenant_id', selectedTenant.tenant_id)
          .single()

        results.slugCheck = {
          slug: tenantCheck?.slug,
          isValid: !!tenantCheck?.slug,
          error: tenantError?.message,
        }

        // Test 5: Try to fetch tenant by slug
        if (tenantCheck?.slug) {
          const { data: shopTenant, error: shopError } = await supabase
            .from('tenants')
            .select('*')
            .eq('slug', tenantCheck.slug)
            .single()

          results.shopLookup = {
            found: !!shopTenant,
            data: shopTenant,
            error: shopError?.message,
          }
        }
      }
    } catch (error: any) {
      results.criticalError = error.message
    }

    setDiagnostics(results)
    setLoading(false)
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-coffee-900 dark:text-cream-100 mb-2">
          🔍 Platform Diagnostics
        </h1>
        <p className="text-coffee-600 dark:text-cream-400">
          Real-time platform health check and debugging
        </p>
      </div>

      <button
        onClick={runDiagnostics}
        className="mb-6 px-4 py-2 bg-coffee-600 text-white rounded-lg hover:bg-coffee-700"
      >
        🔄 Re-run Diagnostics
      </button>

      {loading ? (
        <div className="bg-white dark:bg-dark-800 rounded-xl p-8 text-center">
          <div className="inline-block w-8 h-8 border-4 border-coffee-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-coffee-600 dark:text-cream-400">Running diagnostics...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Selected Tenant */}
          <DiagnosticCard
            title="Selected Tenant"
            status={selectedTenant ? 'success' : 'error'}
            data={diagnostics.selectedTenant}
          />

          {/* All Tenants */}
          <DiagnosticCard
            title={`All Tenants (${diagnostics.allTenants?.count || 0})`}
            status={diagnostics.allTenants?.error ? 'error' : 'success'}
            data={diagnostics.allTenants}
          />

          {/* Slug Check */}
          {selectedTenant && (
            <>
              <DiagnosticCard
                title="Slug Validation"
                status={diagnostics.slugCheck?.isValid ? 'success' : 'error'}
                data={diagnostics.slugCheck}
              />

              <DiagnosticCard
                title="Shop Lookup Test"
                status={diagnostics.shopLookup?.found ? 'success' : 'error'}
                data={diagnostics.shopLookup}
              />

              <DiagnosticCard
                title={`Categories (${diagnostics.categories?.count || 0})`}
                status={diagnostics.categories?.error ? 'error' : 'success'}
                data={diagnostics.categories}
              />

              <DiagnosticCard
                title={`Menu Items (${diagnostics.menuItems?.count || 0})`}
                status={diagnostics.menuItems?.error ? 'error' : 'success'}
                data={diagnostics.menuItems}
              />
            </>
          )}

          {/* Raw JSON */}
          <div className="bg-gray-900 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Raw Diagnostic Data</h3>
            <pre className="text-green-400 text-xs overflow-auto max-h-96">
              {JSON.stringify(diagnostics, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

function DiagnosticCard({
  title,
  status,
  data,
}: {
  title: string
  status: 'success' | 'error' | 'warning'
  data: any
}) {
  const statusColors = {
    success: 'border-green-500 bg-green-50 dark:bg-green-900/20',
    error: 'border-red-500 bg-red-50 dark:bg-red-900/20',
    warning: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
  }

  const statusIcons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
  }

  return (
    <div className={`rounded-xl border-2 p-6 ${statusColors[status]}`}>
      <h3 className="text-lg font-bold text-coffee-900 dark:text-cream-100 mb-4">
        {statusIcons[status]} {title}
      </h3>
      <pre className="text-sm text-coffee-700 dark:text-cream-300 overflow-auto bg-white/50 dark:bg-dark-900/50 p-4 rounded-lg">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}
