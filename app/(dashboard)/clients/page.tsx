'use client'

import { useEffect, useState } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import {
  Building2,
  Search,
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
  Globe,
  TrendingUp,
  Users,
  ShoppingBag,
  X,
  Eye,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useConfirm } from '@/hooks/useConfirm'

interface Tenant {
  tenant_id: string
  business_name: string
  slug: string
  owner_email: string
  owner_phone?: string
  app_name: string
  bundle_id: string
  subscription_status: 'trial' | 'active' | 'cancelled' | 'suspended'
  created_at: string
  // From tenant_manifests
  logo_url?: string
  primary_color?: string
}

export default function ClientsPage() {
  const { setSelectedTenant } = useTenant()
  const { confirm, confirmState, closeConfirm } = useConfirm()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const supabase = createClient()

  // Form state
  const [formData, setFormData] = useState({
    business_name: '',
    slug: '',
    logo_url: '',
    primary_color: '#6b3410',
    contact_email: '',
    contact_phone: '',
  })

  useEffect(() => {
    fetchTenants()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- legacy effect; refit to TanStack Query in Phase 3
  }, [])

  async function fetchTenants() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTenants(data || [])
    } catch (error) {
      console.error('Error fetching tenants:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveTenant(e: React.FormEvent) {
    e.preventDefault()

    try {
      const cleanSlug = formData.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')

      if (editingTenant) {
        // For updates, only update fields that exist in tenants table
        const tenantPayload = {
          business_name: formData.business_name,
          slug: cleanSlug,
          owner_phone: formData.contact_phone || null,
          // Note: We're not updating owner_email, app_name, bundle_id on edit as they're usually immutable
        }

        const { error: tenantError } = await supabase
          .from('tenants')
          .update(tenantPayload)
          .eq('tenant_id', editingTenant.tenant_id)

        if (tenantError) throw tenantError

        // Update tenant_manifests if logo or color changed
        // First, get the current manifest to preserve existing design_tokens
        const { data: currentManifest } = await supabase
          .from('tenant_manifests')
          .select('design_tokens')
          .eq('tenant_id', editingTenant.tenant_id)
          .single()

        if (currentManifest) {
          const updatedDesignTokens = {
            ...currentManifest.design_tokens,
            colors: {
              ...(currentManifest.design_tokens?.colors || {}),
              primary: formData.primary_color,
            },
            branding: {
              ...(currentManifest.design_tokens?.branding || {}),
              logo_url: formData.logo_url || null,
            },
          }

          const { error: manifestError } = await supabase
            .from('tenant_manifests')
            .update({
              design_tokens: updatedDesignTokens,
            })
            .eq('tenant_id', editingTenant.tenant_id)

          if (manifestError) {
            console.error('Error updating manifest:', manifestError)
          }
        }
      } else {
        // Check if slug already exists
        const { data: existingTenant } = await supabase
          .from('tenants')
          .select('slug')
          .eq('slug', cleanSlug)
          .single()

        if (existingTenant) {
          toast.error(`Slug "${cleanSlug}" is already taken. Please choose a different slug.`)
          return
        }

        // For new tenants, insert into tenants table with required fields
        const tenantPayload = {
          business_name: formData.business_name,
          slug: cleanSlug,
          owner_email: formData.contact_email || `owner@${cleanSlug}.caffi.pro`,
          owner_phone: formData.contact_phone || null,
          app_name: formData.business_name,
          bundle_id: `com.caffi.${cleanSlug}`,
        }

        const { data: newTenant, error: tenantError } = await supabase
          .from('tenants')
          .insert(tenantPayload)
          .select()
          .single()

        if (tenantError) {
          console.error('Tenant creation error:', tenantError)
          throw new Error(
            `Failed to create tenant: ${tenantError.message || JSON.stringify(tenantError)}`
          )
        }

        // Create tenant_manifests entry with logo and primary color
        if (newTenant) {
          const manifestPayload = {
            tenant_id: newTenant.tenant_id,
            name: `${formData.business_name} App`,
            short_name: formData.business_name.substring(0, 30),
            design_tokens: {
              colors: {
                primary: formData.primary_color,
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
                logo_url: formData.logo_url || null,
              },
            },
          }

          const { error: manifestError } = await supabase
            .from('tenant_manifests')
            .insert(manifestPayload)

          if (manifestError) {
            console.error('Error creating manifest:', manifestError)
            throw new Error(
              `Failed to create manifest: ${manifestError.message || JSON.stringify(manifestError)}`
            )
          }
        }
      }

      await fetchTenants()

      // Auto-select newly created tenant
      if (!editingTenant && formData.business_name) {
        const { data: freshTenant } = await supabase
          .from('tenants')
          .select('tenant_id, business_name, slug')
          .eq('slug', formData.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
          .single()

        if (freshTenant) {
          setSelectedTenant(freshTenant)
        }
      }

      closeModal()
      toast.success('Client created successfully!')
    } catch (error) {
      console.error('Error saving tenant:', error)
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
      toast.error(`Failed to save client: ${errorMessage}`)
    }
  }

  async function handleDeleteTenant(tenantId: string) {
    const confirmed = await confirm({
      title: 'Delete Client',
      message: 'Are you sure you want to delete this client? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
    })

    if (!confirmed) return

    try {
      const { error } = await supabase.from('tenants').delete().eq('tenant_id', tenantId)

      if (error) throw error
      fetchTenants()
      toast.success('Client deleted successfully!')
    } catch (error) {
      console.error('Error deleting tenant:', error)
      toast.error('Failed to delete client. Please try again.')
    }
  }

  function openCreateModal() {
    setEditingTenant(null)
    setFormData({
      business_name: '',
      slug: '',
      logo_url: '',
      primary_color: '#6b3410',
      contact_email: '',
      contact_phone: '',
    })
    setShowModal(true)
  }

  function openEditModal(tenant: Tenant) {
    setEditingTenant(tenant)
    setFormData({
      business_name: tenant.business_name,
      slug: tenant.slug,
      logo_url: tenant.logo_url || '',
      primary_color: tenant.primary_color || '#6b3410',
      contact_email: tenant.owner_email || '',
      contact_phone: tenant.owner_phone || '',
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingTenant(null)
  }

  function handleSelectTenant(tenant: Tenant) {
    setSelectedTenant(tenant)
    // Optionally redirect to dashboard or show success message
  }

  const filteredTenants = tenants.filter(
    tenant =>
      tenant.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.subscription_status === 'active').length,
    trial: tenants.filter(t => t.subscription_status === 'trial').length,
    suspended: tenants.filter(t => t.subscription_status === 'suspended').length,
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      case 'trial':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
      case 'cancelled':
        return 'bg-gray-100 dark:bg-gray-700/30 text-gray-700 dark:text-gray-400'
      case 'suspended':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      default:
        return 'bg-gray-100 dark:bg-gray-700/30 text-gray-700 dark:text-gray-400'
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-coffee-700 to-mocha bg-clip-text text-transparent">
          My Coffee Shop Clients
        </h1>
        <p className="text-coffee-600 dark:text-cream-400 mt-1 lg:mt-2 text-sm lg:text-lg">
          Manage all your coffee shop businesses from one control center
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-5 h-5 lg:w-6 lg:h-6 text-coffee-600 dark:text-cream-400" />
            <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400">Total Clients</p>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100">
            {stats.total}
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-green-600 dark:text-green-400" />
            <p className="text-xs lg:text-sm text-green-600 dark:text-green-400">Active</p>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-green-700 dark:text-green-400">
            {stats.active}
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
            <p className="text-xs lg:text-sm text-blue-600 dark:text-blue-400">Trial</p>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-blue-700 dark:text-blue-400">
            {stats.trial}
          </p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBag className="w-5 h-5 lg:w-6 lg:h-6 text-red-600 dark:text-red-400" />
            <p className="text-xs lg:text-sm text-red-600 dark:text-red-400">Suspended</p>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-red-700 dark:text-red-400">
            {stats.suspended}
          </p>
        </div>
      </div>

      {/* Search & Add */}
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-coffee-400 dark:text-cream-600" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 lg:py-3 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all text-sm lg:text-base"
            />
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 bg-gradient-coffee text-cream-100 font-semibold py-2.5 lg:py-3 px-4 lg:px-6 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all text-sm lg:text-base"
          >
            <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
            Add New Client
          </button>
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-12 text-center">
            <div className="inline-block w-12 h-12 border-4 border-coffee-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-coffee-600 dark:text-cream-400">Loading clients...</p>
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="col-span-full p-12 text-center">
            <Building2 className="w-16 h-16 text-coffee-300 dark:text-dark-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-coffee-900 dark:text-cream-100 mb-2">
              No clients yet
            </h3>
            <p className="text-coffee-600 dark:text-cream-400 mb-4">
              {searchQuery
                ? 'Try a different search'
                : 'Add your first coffee shop client to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 bg-gradient-coffee text-cream-100 font-semibold py-2.5 px-6 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all"
              >
                <Plus className="w-5 h-5" />
                Add First Client
              </button>
            )}
          </div>
        ) : (
          filteredTenants.map(tenant => (
            <div
              key={tenant.tenant_id}
              className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700 hover:border-coffee-300 dark:hover:border-dark-600 hover:shadow-xl transition-all group"
            >
              {/* Logo & Status */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {tenant.logo_url ? (
                    <img
                      src={tenant.logo_url}
                      alt={tenant.business_name}
                      className="w-14 h-14 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gradient-coffee flex items-center justify-center">
                      <Building2 className="w-7 h-7 text-cream-100" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-lg text-coffee-900 dark:text-cream-100">
                      {tenant.business_name}
                    </h3>
                    <p className="text-sm text-coffee-500 dark:text-cream-500">{tenant.slug}</p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(tenant.subscription_status)}`}
                >
                  {tenant.subscription_status}
                </span>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4 text-sm">
                {tenant.owner_email && (
                  <div className="flex items-center gap-2 text-coffee-600 dark:text-cream-400">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{tenant.owner_email}</span>
                  </div>
                )}
                {tenant.owner_phone && (
                  <div className="flex items-center gap-2 text-coffee-600 dark:text-cream-400">
                    <Phone className="w-4 h-4" />
                    {tenant.owner_phone}
                  </div>
                )}
                <div className="flex items-center gap-2 text-coffee-600 dark:text-cream-400">
                  <Globe className="w-4 h-4" />
                  <span className="text-xs font-mono">{tenant.bundle_id}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-coffee-200/50 dark:border-dark-700">
                <button
                  onClick={() => handleSelectTenant(tenant)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-coffee text-cream-100 hover:shadow-lg transition-all text-sm font-medium"
                >
                  <Eye className="w-4 h-4" />
                  Manage
                </button>
                <button
                  onClick={() => openEditModal(tenant)}
                  className="px-3 py-2 rounded-lg bg-coffee-100 dark:bg-dark-700 text-coffee-700 dark:text-cream-300 hover:bg-coffee-200 dark:hover:bg-dark-600 transition-all"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteTenant(tenant.tenant_id)}
                  className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
            <div
              className="fixed inset-0 transition-opacity bg-gray-900/75 backdrop-blur-sm"
              onClick={closeModal}
            />

            <div className="relative bg-white dark:bg-dark-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl lg:text-2xl font-bold text-coffee-900 dark:text-cream-100">
                  {editingTenant ? 'Edit Client' : 'Add New Client'}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-coffee-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTenant} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Business Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      value={formData.business_name}
                      onChange={e => {
                        const businessName = e.target.value
                        const autoSlug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                        setFormData({
                          ...formData,
                          business_name: businessName,
                          slug: autoSlug,
                        })
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all"
                      placeholder="Joe's Coffee Shop"
                      required
                    />
                  </div>

                  {/* Slug - Auto-generated, Read-only */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                      App Slug (auto-generated from business name)
                    </label>
                    <input
                      type="text"
                      value={formData.slug}
                      readOnly
                      className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-coffee-50 dark:bg-dark-700 text-coffee-600 dark:text-cream-400 font-mono cursor-not-allowed"
                      placeholder="will-auto-generate"
                    />
                    <p className="mt-1 text-xs text-coffee-500 dark:text-cream-500">
                      URL: /shop/{formData.slug || 'your-slug'}
                    </p>
                  </div>

                  {/* Logo URL */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                      Logo URL
                    </label>
                    <input
                      type="url"
                      value={formData.logo_url}
                      onChange={e => setFormData({ ...formData, logo_url: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>

                  {/* Contact Email */}
                  <div>
                    <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all"
                      placeholder="owner@joescoffee.com"
                    />
                  </div>

                  {/* Contact Phone */}
                  <div>
                    <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.contact_phone}
                      onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all"
                      placeholder="+1 234 567 8900"
                    />
                  </div>

                  {/* Primary Color */}
                  <div>
                    <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                      Primary Color
                    </label>
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={e => setFormData({ ...formData, primary_color: e.target.value })}
                      className="w-full h-12 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-coffee-200/50 dark:border-dark-700">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-coffee-50 dark:bg-dark-700 text-coffee-700 dark:text-cream-300 hover:bg-coffee-100 dark:hover:bg-dark-600 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-coffee text-cream-100 font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all"
                  >
                    {editingTenant ? 'Update Client' : 'Add Client'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        variant={confirmState.variant}
      />
    </div>
  )
}
