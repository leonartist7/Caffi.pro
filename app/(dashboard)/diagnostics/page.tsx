'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getTenantBySlug } from '@/lib/get-tenant'

interface DiagnosticResult {
  test: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: any
}

export default function CoffeeShopBuilderPage() {
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [loading, setLoading] = useState(false)
  const [testSlug, setTestSlug] = useState('green-landscaping-services')
  const [newShopData, setNewShopData] = useState({
    business_name: 'Test Coffee Shop',
    slug: 'test-coffee-' + Date.now(),
    primary_color: '#6b3410',
    owner_email: '',
  })

  async function runDiagnostics() {
    setLoading(true)
    const diagnostics: DiagnosticResult[] = []

    // TEST 1: Check if tenant_manifests table exists and its schema
    try {
      const { data, error } = await supabase
        .from('tenant_manifests')
        .select('*')
        .limit(1)

      if (error) {
        diagnostics.push({
          test: 'tenant_manifests table exists',
          status: 'fail',
          message: error.message,
          details: error,
        })
      } else {
        diagnostics.push({
          test: 'tenant_manifests table exists',
          status: 'pass',
          message: 'Table accessible',
          details: data,
        })
      }
    } catch (err: any) {
      diagnostics.push({
        test: 'tenant_manifests table exists',
        status: 'fail',
        message: err.message,
      })
    }

    // TEST 2: Check tenant exists
    try {
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', testSlug)
        .single()

      if (error || !tenant) {
        diagnostics.push({
          test: \`Tenant '\${testSlug}' exists\`,
          status: 'fail',
          message: error?.message || 'Tenant not found',
        })
      } else {
        diagnostics.push({
          test: \`Tenant '\${testSlug}' exists\`,
          status: 'pass',
          message: \`Found: \${tenant.business_name}\`,
          details: tenant,
        })
      }
    } catch (err: any) {
      diagnostics.push({
        test: \`Tenant '\${testSlug}' exists\`,
        status: 'fail',
        message: err.message,
      })
    }

    // TEST 3: Check manifest exists for tenant
    try {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('tenant_id')
        .eq('slug', testSlug)
        .single()

      if (tenantData) {
        const { data: manifest, error } = await supabase
          .from('tenant_manifests')
          .select('*')
          .eq('tenant_id', tenantData.tenant_id)
          .single()

        if (error || !manifest) {
          diagnostics.push({
            test: 'Manifest exists for tenant',
            status: 'fail',
            message: error?.message || 'Manifest not found',
          })
        } else {
          diagnostics.push({
            test: 'Manifest exists for tenant',
            status: 'pass',
            message: \`Manifest found: \${manifest.name || 'unnamed'}\`,
            details: manifest,
          })
        }
      }
    } catch (err: any) {
      diagnostics.push({
        test: 'Manifest exists for tenant',
        status: 'fail',
        message: err.message,
      })
    }

    // TEST 4: Test getTenantBySlug function
    try {
      const tenant = await getTenantBySlug(testSlug)

      if (!tenant) {
        diagnostics.push({
          test: 'getTenantBySlug() function',
          status: 'fail',
          message: 'Function returned null',
        })
      } else {
        diagnostics.push({
          test: 'getTenantBySlug() function',
          status: 'pass',
          message: 'Successfully retrieved tenant',
          details: tenant,
        })
      }
    } catch (err: any) {
      diagnostics.push({
        test: 'getTenantBySlug() function',
        status: 'fail',
        message: err.message,
      })
    }

    // TEST 5: Detect tenant_manifests schema
    try {
      const { data } = await supabase
        .from('tenant_manifests')
        .select('*')
        .limit(1)
        .single()

      const columns = data ? Object.keys(data) : []
      diagnostics.push({
        test: 'Detect tenant_manifests schema',
        status: 'pass',
        message: \`Found \${columns.length} columns\`,
        details: { columns, has_logo_url: columns.includes('logo_url') },
      })
    } catch (err: any) {
      diagnostics.push({
        test: 'Detect tenant_manifests schema',
        status: 'warning',
        message: err.message,
      })
    }

    setResults(diagnostics)
    setLoading(false)
  }

  async function createTestShop() {
    setLoading(true)
    try {
      const cleanSlug = newShopData.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')

      // Step 1: Create tenant
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          business_name: newShopData.business_name,
          slug: cleanSlug,
          owner_email:
            newShopData.owner_email || \`owner@\${cleanSlug}.caffi.pro\`,
          app_name: newShopData.business_name,
          bundle_id: \`com.caffi.\${cleanSlug}\`,
        })
        .select()
        .single()

      if (tenantError) {
        alert(\`Failed to create tenant: \${tenantError.message}\`)
        setLoading(false)
        return
      }

      // Step 2: Create manifest
      const manifestPayload = {
        tenant_id: newTenant.tenant_id,
        name: \`\${newShopData.business_name} App\`,
        short_name: newShopData.business_name.substring(0, 30),
        design_tokens: {
          colors: {
            primary: newShopData.primary_color,
            secondary: '#F4A259',
            accent: '#E07A5F',
            background: '#FFFFFF',
            surface: '#F8F9FA',
            error: '#DC3545',
            success: '#28A745',
            text_primary: '#212529',
            text_secondary: '#6C757D',
          },
          typography: {
            font_family: 'Inter',
            heading_font: 'Poppins',
            font_size_base: 16,
            font_size_heading: 24,
            font_weight_regular: 400,
            font_weight_bold: 700,
          },
          spacing: {
            xs: 4,
            sm: 8,
            md: 16,
            lg: 24,
            xl: 32,
          },
          border_radius: {
            sm: 4,
            md: 8,
            lg: 16,
            full: 9999,
          },
          branding: {
            logo_url: null,
          },
        },
      }

      const { error: manifestError } = await supabase
        .from('tenant_manifests')
        .insert(manifestPayload)

      if (manifestError) {
        alert(\`Failed to create manifest: \${manifestError.message}\`)
        // Try to delete the tenant we just created
        await supabase.from('tenants').delete().eq('tenant_id', newTenant.tenant_id)
        setLoading(false)
        return
      }

      alert(\`✅ Success! Shop created at /shop/\${cleanSlug}\`)
      setTestSlug(cleanSlug)
      await runDiagnostics()
    } catch (err: any) {
      alert(\`Error: \${err.message}\`)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-coffee-50 to-cream-50 dark:from-dark-950 dark:to-dark-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-coffee-900 dark:text-cream-100 mb-2">
          ☕ Coffee Shop Builder & Diagnostics
        </h1>
        <p className="text-coffee-600 dark:text-cream-300 mb-8">
          Test tenant creation, manifest generation, and shop page loading
        </p>

        {/* Diagnostic Section */}
        <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-coffee-900 dark:text-cream-100 mb-4">
            🔍 Run Diagnostics
          </h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-coffee-700 dark:text-cream-200 mb-2">
              Test Slug
            </label>
            <input
              type="text"
              value={testSlug}
              onChange={e => setTestSlug(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900"
              placeholder="green-landscaping-services"
            />
          </div>

          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="px-6 py-3 bg-coffee-600 hover:bg-coffee-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Run Diagnostics'}
          </button>

          {results.length > 0 && (
            <div className="mt-6 space-y-2">
              {results.map((result, i) => (
                <div
                  key={i}
                  className={\`p-4 rounded-lg border-l-4 \${
                    result.status === 'pass'
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                      : result.status === 'fail'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                        : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                  }\`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-coffee-900 dark:text-cream-100">
                        {result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️'}{' '}
                        {result.test}
                      </span>
                      <p className="text-sm text-coffee-600 dark:text-cream-300 mt-1">
                        {result.message}
                      </p>
                    </div>
                  </div>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-coffee-500 dark:text-cream-400">
                        Show details
                      </summary>
                      <pre className="mt-2 p-2 bg-coffee-100 dark:bg-dark-900 rounded text-xs overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Test Shop Section */}
        <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-coffee-900 dark:text-cream-100 mb-4">
            🏗️ Create Test Coffee Shop
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-coffee-700 dark:text-cream-200 mb-2">
                Business Name
              </label>
              <input
                type="text"
                value={newShopData.business_name}
                onChange={e =>
                  setNewShopData({ ...newShopData, business_name: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-coffee-700 dark:text-cream-200 mb-2">
                Slug (URL Path)
              </label>
              <input
                type="text"
                value={newShopData.slug}
                onChange={e => setNewShopData({ ...newShopData, slug: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900"
              />
              <p className="text-xs text-coffee-500 dark:text-cream-400 mt-1">
                Shop will be available at: /shop/{newShopData.slug}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-coffee-700 dark:text-cream-200 mb-2">
                Primary Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={newShopData.primary_color}
                  onChange={e =>
                    setNewShopData({ ...newShopData, primary_color: e.target.value })
                  }
                  className="h-10 w-20 rounded border border-coffee-200 dark:border-dark-600"
                />
                <input
                  type="text"
                  value={newShopData.primary_color}
                  onChange={e =>
                    setNewShopData({ ...newShopData, primary_color: e.target.value })
                  }
                  className="flex-1 px-4 py-2 rounded-lg border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-coffee-700 dark:text-cream-200 mb-2">
                Owner Email (optional)
              </label>
              <input
                type="email"
                value={newShopData.owner_email}
                onChange={e =>
                  setNewShopData({ ...newShopData, owner_email: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900"
                placeholder="owner@example.com"
              />
            </div>

            <button
              onClick={createTestShop}
              disabled={loading}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? 'Creating...' : '🚀 Create Coffee Shop'}
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6 p-4 bg-coffee-100 dark:bg-dark-800 rounded-lg">
          <h3 className="font-medium text-coffee-900 dark:text-cream-100 mb-2">
            Quick Links:
          </h3>
          <ul className="space-y-1 text-sm">
            <li>
              <a
                href={\`/shop/\${testSlug}\`}
                target="_blank"
                className="text-coffee-600 dark:text-coffee-400 hover:underline"
              >
                → View Shop: /shop/{testSlug}
              </a>
            </li>
            <li>
              <a
                href="/clients"
                className="text-coffee-600 dark:text-coffee-400 hover:underline"
              >
                → Manage Clients
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
