'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import Badge, { type BadgeVariant } from '@/components/Badge'

import { PhoneIcon, EnvelopeIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface Cafe {
  tenant_id: string
  slug: string
  business_name: string
  owner_email: string
  owner_phone: string
  subscription_tier: string
  setup_status: string
  internal_notes: string
  onboarding_checklist: {
    menu_setup?: boolean
    location_setup?: boolean
    payment_setup?: boolean
    staff_setup?: boolean
    [key: string]: boolean | undefined
  }
  last_activity_at: string
  created_at: string
  app_name: string
  bundle_id: string
}

export default function CafeDetailPage() {
  const params = useParams()
  const slug = params?.slug as string
  const [cafe, setCafe] = useState<Cafe | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [notes, setNotes] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)

  useEffect(() => {
    if (slug) {
      fetchCafe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- legacy effect; refit to TanStack Query in Phase 3
  }, [slug])

  const fetchCafe = async () => {
    try {
      const supabase = createClient()

      const { data, error } = await supabase.from('tenants').select('*').eq('slug', slug).single()

      if (error) throw error
      setCafe(data)
      setNotes(data.internal_notes || '')
    } catch (error) {
      console.error('Error fetching cafe:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveNotes = async () => {
    if (!cafe) return

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('tenants')
        .update({ internal_notes: notes })
        .eq('tenant_id', cafe.tenant_id)

      if (error) throw error
      setEditingNotes(false)
      fetchCafe()
    } catch (error) {
      console.error('Error saving notes:', error)
    }
  }

  const toggleChecklistItem = async (key: string) => {
    if (!cafe) return

    const newChecklist = {
      ...cafe.onboarding_checklist,
      [key]: !cafe.onboarding_checklist[key],
    }

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('tenants')
        .update({ onboarding_checklist: newChecklist })
        .eq('tenant_id', cafe.tenant_id)

      if (error) throw error
      fetchCafe()
    } catch (error) {
      console.error('Error updating checklist:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">☕</div>
          <p className="text-gray-600">Loading café details...</p>
        </div>
      </div>
    )
  }

  if (!cafe) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Café not found</h2>
        <p className="text-gray-600 mb-6">The café you&apos;re looking for doesn&apos;t exist.</p>
        <Link
          href="/cafes"
          className="inline-block bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-xl"
        >
          Back to Cafés
        </Link>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'orders', name: 'Orders', icon: '📦' },
    { id: 'customers', name: 'Customers', icon: '👥' },
    { id: 'analytics', name: 'Analytics', icon: '📈' },
    { id: 'settings', name: 'Settings', icon: '⚙️' },
  ]

  const getStatusBadge = (status: string): { variant: BadgeVariant; label: string } => {
    const statusMap: Record<string, { variant: BadgeVariant; label: string }> = {
      pending: { variant: 'warning', label: 'Pending' },
      in_progress: { variant: 'info', label: 'In Progress' },
      launched: { variant: 'success', label: 'Launched' },
      paused: { variant: 'default', label: 'Paused' },
    }
    return statusMap[status] || { variant: 'default', label: status?.replace('_', ' ') || 'N/A' }
  }

  const getTierBadge = (tier: string): { variant: BadgeVariant; label: string } => {
    const tierMap: Record<string, { variant: BadgeVariant; label: string }> = {
      free: { variant: 'default', label: 'FREE' },
      starter: { variant: 'info', label: 'STARTER' },
      pro: { variant: 'primary', label: 'PRO' },
      enterprise: { variant: 'accent', label: 'ENTERPRISE' },
    }
    return tierMap[tier] || { variant: 'default', label: tier?.toUpperCase() || 'N/A' }
  }

  const checklistItems = [
    { key: 'branding_uploaded', label: 'Branding uploaded (logo, colors)' },
    { key: 'locations_added', label: 'Locations added' },
    { key: 'menu_configured', label: 'Menu configured' },
    { key: 'payment_connected', label: 'Payment connected' },
    { key: 'test_order_completed', label: 'Test order completed' },
    { key: 'app_published', label: 'App published to stores' },
  ]

  const completedCount = checklistItems.filter(item => cafe.onboarding_checklist?.[item.key]).length
  const progressPercentage = (completedCount / checklistItems.length) * 100

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/cafes"
          className="inline-flex items-center text-gray-600 hover:text-primary mb-4"
        >
          ← Back to Cafés
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-start gap-6">
            {/* Logo */}
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center ring-4 ring-primary/20 flex-shrink-0">
              <span className="text-4xl">☕</span>
            </div>

            {/* Info */}
            <div>
              <h1 className="text-4xl font-serif italic text-gray-900 mb-2">
                {cafe.business_name}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-2">
                  <EnvelopeIcon className="w-4 h-4" />
                  {cafe.owner_email}
                </div>
                {cafe.owner_phone && (
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="w-4 h-4" />
                    {cafe.owner_phone}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusBadge(cafe.setup_status).variant} size="md">
                  {getStatusBadge(cafe.setup_status).label}
                </Badge>
                <Badge variant={getTierBadge(cafe.subscription_tier).variant} size="md">
                  {getTierBadge(cafe.subscription_tier).label}
                </Badge>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3">
            <Link
              href={`/menu/${cafe.slug}`}
              className="bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-4 rounded-xl transition-all"
            >
              Manage Menu
            </Link>
            <button className="bg-accent hover:bg-accent/90 text-white font-semibold py-2 px-4 rounded-xl transition-all">
              Send Notification
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <p className="text-sm text-gray-600 mb-1">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900">--</p>
          <p className="text-xs text-gray-500 mt-2">All time</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <p className="text-sm text-gray-600 mb-1">Revenue</p>
          <p className="text-3xl font-bold text-gray-900 font-mono">--</p>
          <p className="text-xs text-gray-500 mt-2">All time</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <p className="text-sm text-gray-600 mb-1">Active Users</p>
          <p className="text-3xl font-bold text-gray-900">--</p>
          <p className="text-xs text-gray-500 mt-2">Last 30 days</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <p className="text-sm text-gray-600 mb-1">Last Activity</p>
          <p className="text-lg font-bold text-gray-900">
            {cafe.last_activity_at ? new Date(cafe.last_activity_at).toLocaleDateString() : 'Never'}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {cafe.last_activity_at
              ? new Date(cafe.last_activity_at).toLocaleTimeString()
              : 'No activity yet'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 mb-8">
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-4 border-b-2 transition-all
                  ${
                    activeTab === tab.id
                      ? 'border-primary text-primary font-semibold'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Onboarding Checklist */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Onboarding Progress ({completedCount}/{checklistItems.length})
                </h3>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-primary h-3 transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {Math.round(progressPercentage)}% complete
                  </p>
                </div>

                {/* Checklist Items */}
                <div className="space-y-3">
                  {checklistItems.map(item => {
                    const isChecked = cafe.onboarding_checklist?.[item.key]
                    return (
                      <button
                        key={item.key}
                        onClick={() => toggleChecklistItem(item.key)}
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-surface-alt hover:bg-gray-100 transition-all text-left"
                      >
                        {isChecked ? (
                          <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" />
                        )}
                        <span
                          className={`${isChecked ? 'text-gray-900 font-medium' : 'text-gray-600'}`}
                        >
                          {item.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Internal Notes</h3>
                  {!editingNotes ? (
                    <button
                      onClick={() => setEditingNotes(true)}
                      className="text-primary hover:text-primary-dark font-medium text-sm"
                    >
                      Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={saveNotes}
                        className="bg-primary hover:bg-primary-dark text-white font-medium text-sm py-1 px-3 rounded-lg"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingNotes(false)
                          setNotes(cafe.internal_notes || '')
                        }}
                        className="text-gray-600 hover:text-gray-900 font-medium text-sm py-1 px-3"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                {editingNotes ? (
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="Add private notes about this café client..."
                  />
                ) : (
                  <div className="p-4 rounded-xl bg-surface-alt text-gray-700 whitespace-pre-wrap">
                    {notes || 'No notes yet. Click Edit to add notes.'}
                  </div>
                )}
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-surface-alt">
                    <p className="text-sm text-gray-600">No recent activity</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Order History</h3>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📦</div>
                <p className="text-gray-600">No orders yet</p>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Customers</h3>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👥</div>
                <p className="text-gray-600">No customers yet</p>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Analytics</h3>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📈</div>
                <p className="text-gray-600">Analytics coming soon</p>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Café Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={cafe.business_name}
                      disabled
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
                    <input
                      type="text"
                      value={cafe.slug}
                      disabled
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">App Name</label>
                    <input
                      type="text"
                      value={cafe.app_name}
                      disabled
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bundle ID
                    </label>
                    <input
                      type="text"
                      value={cafe.bundle_id}
                      disabled
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-600"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <button className="text-red-600 hover:text-red-700 font-medium">Pause Café</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
