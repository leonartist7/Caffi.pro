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
  Globe,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react'
import { ComingSoon } from '@/components/ComingSoon'
import { SITE_GALLERY_MAX, type SiteProfile } from '@/lib/site-profile'

interface VenueDetail {
  tenant_id: string
  business_name: string
  slug: string
  logo_url: string | null
  primary_color: string | null
  timezone: string
  site_profile: SiteProfile
}

export default function SettingsPage() {
  const { selectedTenant } = useTenant()
  const [activeTab, setActiveTab] = useState('general')
  const [venue, setVenue] = useState<VenueDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({ business_name: '', logo_url: '', primary_color: '' })
  const [websiteForm, setWebsiteForm] = useState<SiteProfile>({
    tagline: null,
    about: null,
    address: null,
    phone_display: null,
    instagram_url: null,
    facebook_url: null,
    gallery: [],
    site_enabled: false,
  })
  const [savingWebsite, setSavingWebsite] = useState(false)

  const tabs = [
    { id: 'general', name: 'General', icon: SettingsIcon },
    { id: 'website', name: 'Website', icon: Globe },
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
        setWebsiteForm(client.site_profile)
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

  const handleSaveWebsite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTenant) return

    setSavingWebsite(true)
    try {
      const res = await fetch(`/api/clients/${selectedTenant.tenant_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_profile: websiteForm }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Request failed (${res.status})`)
      }
      toast.success('Website settings saved.')
    } catch (error) {
      console.error('Error saving website settings:', error)
      toast.error(
        `Failed to save website settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      setSavingWebsite(false)
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

        {activeTab === 'website' && (
          <>
            {!selectedTenant ? (
              <div className="text-center py-12">
                <Globe className="w-16 h-16 text-coffee-300 dark:text-dark-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-coffee-900 dark:text-cream-100 mb-2">
                  Select a client
                </h3>
                <p className="text-coffee-600 dark:text-cream-400">
                  Choose a client from the dropdown above to manage their public site.
                </p>
              </div>
            ) : loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-coffee-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <form onSubmit={handleSaveWebsite} className="space-y-6">
                <div>
                  <h2 className="text-lg lg:text-xl font-bold text-coffee-900 dark:text-cream-100 mb-2">
                    Public website
                  </h2>
                  <p className="text-sm lg:text-base text-coffee-600 dark:text-cream-400 mb-6">
                    Home, menu, hours and contact — a real public site generated from this profile.
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-coffee-200 dark:border-dark-600 bg-coffee-50 dark:bg-dark-900 px-4 py-3.5">
                  <div>
                    <p className="font-medium text-coffee-900 dark:text-cream-100">
                      {websiteForm.site_enabled ? 'Site is live' : 'Site is off'}
                    </p>
                    <p className="text-xs text-coffee-500 dark:text-cream-500">
                      {websiteForm.site_enabled
                        ? `Live at ${typeof window !== 'undefined' ? window.location.origin : ''}/site/${venue?.slug ?? selectedTenant.slug}`
                        : 'Turning this on publishes the site at the URL below.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWebsiteForm(f => ({ ...f, site_enabled: !f.site_enabled }))}
                    role="switch"
                    aria-checked={websiteForm.site_enabled}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                      websiteForm.site_enabled ? 'bg-coffee-600' : 'bg-coffee-200 dark:bg-dark-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        websiteForm.site_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                      Tagline
                    </label>
                    <input
                      type="text"
                      value={websiteForm.tagline ?? ''}
                      onChange={e =>
                        setWebsiteForm(f => ({ ...f, tagline: e.target.value || null }))
                      }
                      placeholder="Third-wave coffee, no pretense."
                      className="w-full px-4 py-2.5 lg:py-3 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all text-sm lg:text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                      About
                    </label>
                    <textarea
                      value={websiteForm.about ?? ''}
                      onChange={e => setWebsiteForm(f => ({ ...f, about: e.target.value || null }))}
                      rows={4}
                      placeholder="1–3 short paragraphs about the café."
                      className="w-full px-4 py-2.5 lg:py-3 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all text-sm lg:text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      value={websiteForm.address ?? ''}
                      onChange={e =>
                        setWebsiteForm(f => ({ ...f, address: e.target.value || null }))
                      }
                      className="w-full px-4 py-2.5 lg:py-3 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all text-sm lg:text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={websiteForm.phone_display ?? ''}
                      onChange={e =>
                        setWebsiteForm(f => ({ ...f, phone_display: e.target.value || null }))
                      }
                      className="w-full px-4 py-2.5 lg:py-3 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all text-sm lg:text-base"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                        Instagram URL
                      </label>
                      <input
                        type="url"
                        value={websiteForm.instagram_url ?? ''}
                        onChange={e =>
                          setWebsiteForm(f => ({ ...f, instagram_url: e.target.value || null }))
                        }
                        placeholder="https://instagram.com/..."
                        className="w-full px-4 py-2.5 lg:py-3 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all text-sm lg:text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                        Facebook URL
                      </label>
                      <input
                        type="url"
                        value={websiteForm.facebook_url ?? ''}
                        onChange={e =>
                          setWebsiteForm(f => ({ ...f, facebook_url: e.target.value || null }))
                        }
                        placeholder="https://facebook.com/..."
                        className="w-full px-4 py-2.5 lg:py-3 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all text-sm lg:text-base"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300">
                        Gallery images
                      </label>
                      <span className="text-xs text-coffee-500 dark:text-cream-500">
                        {websiteForm.gallery.length}/{SITE_GALLERY_MAX}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {websiteForm.gallery.map((url, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            type="url"
                            value={url}
                            onChange={e =>
                              setWebsiteForm(f => ({
                                ...f,
                                gallery: f.gallery.map((g, gi) => (gi === i ? e.target.value : g)),
                              }))
                            }
                            placeholder="https://example.com/photo.jpg"
                            className="flex-1 px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all text-sm"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setWebsiteForm(f => ({
                                ...f,
                                gallery: f.gallery.filter((_, gi) => gi !== i),
                              }))
                            }
                            aria-label="Remove image"
                            className="shrink-0 rounded-xl border border-coffee-200 dark:border-dark-600 px-3 text-coffee-500 hover:bg-coffee-50 dark:hover:bg-dark-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {websiteForm.gallery.length < SITE_GALLERY_MAX && (
                        <button
                          type="button"
                          onClick={() =>
                            setWebsiteForm(f => ({ ...f, gallery: [...f.gallery, ''] }))
                          }
                          className="flex items-center gap-1.5 text-sm font-medium text-coffee-600 dark:text-cream-400 hover:text-coffee-800"
                        >
                          <Plus className="h-4 w-4" /> Add image URL
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={savingWebsite}
                    className="flex items-center gap-2 bg-gradient-coffee text-cream-100 font-semibold py-2.5 lg:py-3 px-4 lg:px-6 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all text-sm lg:text-base disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 lg:w-5 lg:h-5" />
                    {savingWebsite ? 'Saving…' : 'Save Changes'}
                  </button>
                  {websiteForm.site_enabled ? (
                    <a
                      href={`/site/${venue?.slug ?? selectedTenant.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-sm font-semibold text-coffee-600 dark:text-cream-400 hover:text-coffee-800"
                    >
                      Preview site <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="flex items-center gap-1.5 text-sm text-coffee-400 dark:text-cream-600 cursor-not-allowed">
                      Preview site <ExternalLink className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
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
