'use client'

import { useState, useEffect } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import { toast } from 'sonner'
import {
  Settings as SettingsIcon,
  Bell,
  Key,
  Mail,
  Shield,
  Server,
  Save,
  Building2,
} from 'lucide-react'
import { ComingSoon } from '@/components/ComingSoon'

interface VenueDetail {
  tenant_id: string
  business_name: string
  logo_url: string | null
  primary_color: string | null
  timezone: string
}

export default function SettingsPage() {
  const { selectedTenant } = useTenant()
  const [activeTab, setActiveTab] = useState('general')
  const [venue, setVenue] = useState<VenueDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({ business_name: '', logo_url: '', primary_color: '' })

  const tabs = [
    { id: 'general', name: 'General', icon: SettingsIcon },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'api', name: 'API Keys', icon: Key },
    { id: 'email', name: 'Email Templates', icon: Mail },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'system', name: 'System Info', icon: Server },
  ]

  useEffect(() => {
    if (!selectedTenant) {
      setVenue(null)
      setLoading(false)
      return
    }
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/clients/${selectedTenant.tenant_id}`)
        if (!res.ok) throw new Error(`Failed to load client details (${res.status})`)
        const { client } = await res.json()
        setVenue(client)
        setFormData({
          business_name: client.business_name,
          logo_url: client.logo_url || '',
          primary_color: client.primary_color || '#6b3410',
        })
      } catch (error) {
        console.error('Error loading venue settings:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedTenant])

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTenant) return

    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${selectedTenant.tenant_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Request failed (${res.status})`)
      }
      toast.success('Settings saved.')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error(
        `Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-coffee-700 to-mocha bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-coffee-600 dark:text-cream-400 mt-1 lg:mt-2 text-sm lg:text-lg">
          Manage platform configuration and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-coffee-200/50 dark:border-dark-700 mb-6">
        <div className="flex overflow-x-auto border-b border-coffee-200/50 dark:border-dark-700 scrollbar-hide">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 lg:px-6 py-3 lg:py-4 font-medium transition-all whitespace-nowrap text-sm lg:text-base ${
                  activeTab === tab.id
                    ? 'text-coffee-700 dark:text-cream-200 border-b-2 border-coffee-600 dark:border-coffee-500'
                    : 'text-coffee-600 dark:text-cream-400 hover:text-coffee-900 dark:hover:text-cream-100'
                }`}
              >
                <Icon className="w-4 h-4 lg:w-5 lg:h-5" />
                {tab.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
        {/* General Settings — the selected client's venue profile */}
        {activeTab === 'general' && (
          <>
            {!selectedTenant ? (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 text-coffee-300 dark:text-dark-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-coffee-900 dark:text-cream-100 mb-2">
                  Select a client
                </h3>
                <p className="text-coffee-600 dark:text-cream-400">
                  Choose a client from the dropdown above to manage their settings.
                </p>
              </div>
            ) : loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-coffee-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <form onSubmit={handleSaveGeneral} className="space-y-6">
                <div>
                  <h2 className="text-lg lg:text-xl font-bold text-coffee-900 dark:text-cream-100 mb-2">
                    {venue?.business_name ?? selectedTenant.business_name}
                  </h2>
                  <p className="text-sm lg:text-base text-coffee-600 dark:text-cream-400 mb-6">
                    Brand profile for this client
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={formData.business_name}
                      onChange={e => setFormData({ ...formData, business_name: e.target.value })}
                      className="w-full px-4 py-2.5 lg:py-3 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all text-sm lg:text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                      Logo URL
                    </label>
                    <input
                      type="url"
                      value={formData.logo_url}
                      onChange={e => setFormData({ ...formData, logo_url: e.target.value })}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-4 py-2.5 lg:py-3 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all text-sm lg:text-base"
                    />
                  </div>

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

                  <div>
                    <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                      Timezone
                    </label>
                    <input
                      type="text"
                      value={venue?.timezone ?? ''}
                      readOnly
                      className="w-full px-4 py-2.5 lg:py-3 rounded-xl border border-coffee-200 dark:border-dark-600 bg-coffee-50 dark:bg-dark-700 text-coffee-600 dark:text-cream-400 cursor-not-allowed text-sm lg:text-base"
                    />
                    <p className="mt-1 text-xs text-coffee-500 dark:text-cream-500">
                      Set at client creation — used for weekly stats boundaries.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-gradient-coffee text-cream-100 font-semibold py-2.5 lg:py-3 px-4 lg:px-6 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all text-sm lg:text-base disabled:opacity-50"
                >
                  <Save className="w-4 h-4 lg:w-5 lg:h-5" />
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </form>
            )}
          </>
        )}

        {activeTab === 'notifications' && (
          <ComingSoon
            title="Notification Preferences"
            description="Email, push and SMS notification controls arrive with the messaging module."
          />
        )}

        {activeTab === 'api' && (
          <ComingSoon
            title="API Keys & Credentials"
            description="Per-client API key management is planned for a future integrations module."
          />
        )}

        {activeTab === 'email' && (
          <ComingSoon
            title="Email Templates"
            description="Customizable transactional email templates arrive with the messaging module."
          />
        )}

        {activeTab === 'security' && (
          <ComingSoon
            title="Security Settings"
            description="Two-factor auth and session controls are planned for a future security module."
          />
        )}

        {activeTab === 'system' && (
          <ComingSoon
            title="System Information"
            description="Live platform health and uptime metrics arrive with the observability module."
          />
        )}
      </div>
    </div>
  )
}
