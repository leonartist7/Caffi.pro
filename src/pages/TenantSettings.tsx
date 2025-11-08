import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Save, Palette, Zap, Award, Globe, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'

interface TenantFormData {
  business_name: string
  app_name: string
  owner_email: string
  owner_phone: string
  timezone: string
  currency: string
  language: string
}

interface FeaturesFormData {
  ordering: boolean
  loyalty: boolean
  delivery: boolean
  pwa: boolean
  coupons: boolean
  rewards: boolean
}

interface LoyaltyFormData {
  points_per_euro: number
  signup_bonus: number
}

interface BrandingFormData {
  logo_url: string
  app_icon_url: string
  primary_color: string
  secondary_color: string
  accent_color: string
}

export function TenantSettings() {
  const [activeTab, setActiveTab] = useState<'general' | 'features' | 'loyalty' | 'branding'>('general')
  const queryClient = useQueryClient()

  // Fetch tenant data
  const { data: tenant } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: async () => {
      // In production, get the actual tenant_id from auth
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .limit(1)
        .single()
      
      if (error) throw error
      return data
    },
  })

  // Fetch manifest data
  const { data: manifest } = useQuery({
    queryKey: ['tenant-manifest'],
    queryFn: async () => {
      if (!tenant) return null
      
      const { data, error } = await supabase
        .from('tenant_manifests')
        .select('*')
        .eq('tenant_id', tenant.tenant_id)
        .limit(1)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: !!tenant,
  })

  const tabs = [
    { id: 'general', name: 'General', icon: Globe },
    { id: 'features', name: 'Features', icon: Zap },
    { id: 'loyalty', name: 'Loyalty', icon: Award },
    { id: 'branding', name: 'Branding', icon: Palette },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tenant Settings</h1>
        <p className="mt-2 text-gray-600">
          Configure your café app settings, features, and branding
        </p>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <tab.icon className="w-5 h-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'general' && <GeneralSettings tenant={tenant} />}
          {activeTab === 'features' && <FeaturesSettings tenant={tenant} />}
          {activeTab === 'loyalty' && <LoyaltySettings tenant={tenant} />}
          {activeTab === 'branding' && <BrandingSettings tenant={tenant} manifest={manifest} />}
        </div>
      </div>
    </div>
  )
}

function GeneralSettings({ tenant }: { tenant: any }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TenantFormData>()

  useState(() => {
    if (tenant) {
      reset({
        business_name: tenant.business_name,
        app_name: tenant.app_name,
        owner_email: tenant.owner_email,
        owner_phone: tenant.owner_phone || '',
        timezone: tenant.timezone,
        currency: tenant.currency,
        language: tenant.language,
      })
    }
  }, [tenant])

  const mutation = useMutation({
    mutationFn: async (data: TenantFormData) => {
      const { error } = await supabase
        .from('tenants')
        .update(data)
        .eq('tenant_id', tenant.tenant_id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] })
      toast.success('Settings updated successfully')
    },
    onError: () => {
      toast.error('Failed to update settings')
    },
  })

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Name *
          </label>
          <input
            {...register('business_name', { required: true })}
            className="input"
            placeholder="My Coffee Shop"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            App Name *
          </label>
          <input
            {...register('app_name', { required: true })}
            className="input"
            placeholder="Coffee App"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Owner Email *
          </label>
          <input
            type="email"
            {...register('owner_email', { required: true })}
            className="input"
            placeholder="owner@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Owner Phone
          </label>
          <input
            {...register('owner_phone')}
            className="input"
            placeholder="+33 1 23 45 67 89"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timezone
          </label>
          <select {...register('timezone')} className="input">
            <option value="Europe/Paris">Europe/Paris (CET)</option>
            <option value="Europe/London">Europe/London (GMT)</option>
            <option value="America/New_York">America/New_York (EST)</option>
            <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Currency
          </label>
          <select {...register('currency')} className="input">
            <option value="EUR">EUR (€)</option>
            <option value="USD">USD ($)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Language
          </label>
          <select {...register('language')} className="input">
            <option value="fr">French</option>
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="de">German</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t">
        <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
          <Save className="w-4 h-4 mr-2" />
          {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

function FeaturesSettings({ tenant }: { tenant: any }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset } = useForm<FeaturesFormData>()

  useState(() => {
    if (tenant?.features_enabled) {
      reset(tenant.features_enabled)
    }
  }, [tenant])

  const mutation = useMutation({
    mutationFn: async (data: FeaturesFormData) => {
      const { error } = await supabase
        .from('tenants')
        .update({ features_enabled: data })
        .eq('tenant_id', tenant.tenant_id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] })
      toast.success('Features updated successfully')
    },
  })

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
      <div className="space-y-4">
        <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-gray-900">Online Ordering</div>
              <div className="text-sm text-gray-600">Allow customers to place orders</div>
            </div>
          </div>
          <input type="checkbox" {...register('ordering')} className="w-5 h-5 text-primary-600 border-gray-300 rounded" />
        </label>

        <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">Loyalty Program</div>
              <div className="text-sm text-gray-600">Earn points and rewards</div>
            </div>
          </div>
          <input type="checkbox" {...register('loyalty')} className="w-5 h-5 text-primary-600 border-gray-300 rounded" />
        </label>

        <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-gray-900">Delivery</div>
              <div className="text-sm text-gray-600">Enable delivery orders</div>
            </div>
          </div>
          <input type="checkbox" {...register('delivery')} className="w-5 h-5 text-primary-600 border-gray-300 rounded" />
        </label>

        <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">Progressive Web App</div>
              <div className="text-sm text-gray-600">Web-based app access</div>
            </div>
          </div>
          <input type="checkbox" {...register('pwa')} className="w-5 h-5 text-primary-600 border-gray-300 rounded" />
        </label>

        <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-gray-900">Coupons</div>
              <div className="text-sm text-gray-600">Discount codes</div>
            </div>
          </div>
          <input type="checkbox" {...register('coupons')} className="w-5 h-5 text-primary-600 border-gray-300 rounded" />
        </label>

        <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-gray-900">Rewards Catalog</div>
              <div className="text-sm text-gray-600">Redeemable rewards</div>
            </div>
          </div>
          <input type="checkbox" {...register('rewards')} className="w-5 h-5 text-primary-600 border-gray-300 rounded" />
        </label>
      </div>

      <div className="flex justify-end pt-6 border-t">
        <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
          <Save className="w-4 h-4 mr-2" />
          {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

function LoyaltySettings({ tenant }: { tenant: any }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset } = useForm<LoyaltyFormData>()

  useState(() => {
    if (tenant?.loyalty_config) {
      reset({
        points_per_euro: tenant.loyalty_config.points_per_euro || 10,
        signup_bonus: tenant.loyalty_config.signup_bonus || 50,
      })
    }
  }, [tenant])

  const mutation = useMutation({
    mutationFn: async (data: LoyaltyFormData) => {
      const loyaltyConfig = {
        ...tenant.loyalty_config,
        points_per_euro: data.points_per_euro,
        signup_bonus: data.signup_bonus,
      }

      const { error } = await supabase
        .from('tenants')
        .update({ loyalty_config: loyaltyConfig })
        .eq('tenant_id', tenant.tenant_id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] })
      toast.success('Loyalty settings updated successfully')
    },
  })

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Points per Euro Spent
          </label>
          <input
            type="number"
            {...register('points_per_euro', { min: 1 })}
            className="input"
            placeholder="10"
          />
          <p className="mt-1 text-xs text-gray-500">
            How many loyalty points customers earn per €1 spent
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sign-up Bonus Points
          </label>
          <input
            type="number"
            {...register('signup_bonus', { min: 0 })}
            className="input"
            placeholder="50"
          />
          <p className="mt-1 text-xs text-gray-500">
            Welcome bonus for new customers
          </p>
        </div>
      </div>

      {/* Loyalty Tiers Preview */}
      <div className="pt-6 border-t">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Loyalty Tiers</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tenant?.loyalty_config?.tiers?.map((tier: any) => (
            <div key={tier.name} className="card bg-gradient-to-br from-primary-50 to-accent-50">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-600 uppercase mb-1">
                  {tier.name}
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-2">
                  {tier.discount}%
                </div>
                <div className="text-xs text-gray-600">
                  {tier.threshold > 0 ? `${tier.threshold}+ points` : 'Starting tier'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t">
        <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
          <Save className="w-4 h-4 mr-2" />
          {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

function BrandingSettings({ tenant, manifest }: { tenant: any; manifest: any }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, watch } = useForm<BrandingFormData>()

  const colors = watch()

  useState(() => {
    const designTokens = manifest?.design_tokens || {}
    reset({
      logo_url: manifest?.logo_url || '',
      app_icon_url: manifest?.app_icon_url || '',
      primary_color: designTokens.colors?.primary || '#2D5F5D',
      secondary_color: designTokens.colors?.secondary || '#F4A259',
      accent_color: designTokens.colors?.accent || '#E07A5F',
    })
  }, [manifest])

  const mutation = useMutation({
    mutationFn: async (data: BrandingFormData) => {
      const designTokens = {
        ...(manifest?.design_tokens || {}),
        colors: {
          ...(manifest?.design_tokens?.colors || {}),
          primary: data.primary_color,
          secondary: data.secondary_color,
          accent: data.accent_color,
        },
      }

      if (manifest) {
        const { error } = await supabase
          .from('tenant_manifests')
          .update({
            logo_url: data.logo_url,
            app_icon_url: data.app_icon_url,
            design_tokens: designTokens,
          })
          .eq('manifest_id', manifest.manifest_id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('tenant_manifests')
          .insert({
            tenant_id: tenant.tenant_id,
            logo_url: data.logo_url,
            app_icon_url: data.app_icon_url,
            design_tokens: designTokens,
            slot_mappings: {},
          })
        
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-manifest'] })
      toast.success('Branding updated successfully')
    },
  })

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
      {/* Logo & Icon */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logo URL
          </label>
          <div className="flex gap-2">
            <input {...register('logo_url')} className="input flex-1" placeholder="https://..." />
            <button type="button" className="btn btn-secondary">
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            App Icon URL
          </label>
          <div className="flex gap-2">
            <input {...register('app_icon_url')} className="input flex-1" placeholder="https://..." />
            <button type="button" className="btn btn-secondary">
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Colors */}
      <div className="pt-6 border-t">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Brand Colors</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                {...register('primary_color')}
                className="w-12 h-10 rounded border border-gray-300"
              />
              <input
                type="text"
                {...register('primary_color')}
                className="input flex-1"
                placeholder="#2D5F5D"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secondary Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                {...register('secondary_color')}
                className="w-12 h-10 rounded border border-gray-300"
              />
              <input
                type="text"
                {...register('secondary_color')}
                className="input flex-1"
                placeholder="#F4A259"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Accent Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                {...register('accent_color')}
                className="w-12 h-10 rounded border border-gray-300"
              />
              <input
                type="text"
                {...register('accent_color')}
                className="input flex-1"
                placeholder="#E07A5F"
              />
            </div>
          </div>
        </div>

        {/* Color Preview */}
        <div className="mt-6 p-6 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-gray-700 mb-4">Preview</div>
          <div className="flex gap-4">
            <div
              className="w-20 h-20 rounded-lg shadow-sm"
              style={{ backgroundColor: colors.primary_color }}
            />
            <div
              className="w-20 h-20 rounded-lg shadow-sm"
              style={{ backgroundColor: colors.secondary_color }}
            />
            <div
              className="w-20 h-20 rounded-lg shadow-sm"
              style={{ backgroundColor: colors.accent_color }}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t">
        <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
          <Save className="w-4 h-4 mr-2" />
          {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

