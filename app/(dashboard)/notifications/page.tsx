'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useTenant } from '@/contexts/TenantContext'
import { toast } from 'sonner'
import { Bell, Plus, Send, Calendar, Users, CheckCircle, Clock, X, Building2 } from 'lucide-react'

interface Campaign {
  campaign_id: string
  tenant_id: string
  title: string
  message: string
  audience_filter: {
    type?: string
    location_ids?: string[]
    user_segments?: string[]
    min_orders?: number
  }
  scheduled_at: string | null
  sent_at: string | null
  status: 'draft' | 'scheduled' | 'sent'
  created_at: string
}

export default function NotificationsPage() {
  const { selectedTenant } = useTenant()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const supabase = createClient()

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    audience: 'all',
  })

  useEffect(() => {
    if (selectedTenant) {
      fetchCampaigns()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant])

  async function fetchCampaigns() {
    if (!selectedTenant) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('push_campaigns')
        .select('*')
        .eq('tenant_id', selectedTenant.tenant_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCampaigns(data || [])
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedTenant) return

    try {
      if (!formData.title || !formData.message) {
        toast.error('Please fill in title and message')
        return
      }

      const { error } = await supabase.from('push_campaigns').insert({
        tenant_id: selectedTenant.tenant_id,
        title: formData.title,
        message: formData.message,
        audience_filter: { type: formData.audience },
        status: 'draft',
      })

      if (error) throw error

      setFormData({ title: '', message: '', audience: 'all' })
      setShowModal(false)
      fetchCampaigns()
      toast.success('Campaign created successfully!')
    } catch (error) {
      console.error('Error creating campaign:', error)
      toast.error('Failed to create campaign')
    }
  }

  const getStatusColor = (status: Campaign['status']) => {
    const colors = {
      draft: 'bg-gray-100 dark:bg-gray-700/30 text-gray-700 dark:text-gray-400',
      scheduled: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      sent: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    }
    return colors[status] || colors.draft
  }

  const stats = {
    total: campaigns.length,
    sent: campaigns.filter(c => c.status === 'sent').length,
    scheduled: campaigns.filter(c => c.status === 'scheduled').length,
    drafts: campaigns.filter(c => c.status === 'draft').length,
  }

  // No tenant selected state
  if (!selectedTenant) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-gradient-coffee flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Building2 className="w-10 h-10 lg:w-12 lg:h-12 text-cream-100" />
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mb-3">
            Select a Coffee Shop Client
          </h2>
          <p className="text-coffee-600 dark:text-cream-400 mb-6">
            Please select a client from the dropdown above to manage their push notifications.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 lg:mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-coffee-700 to-mocha bg-clip-text text-transparent">
            Push Notifications
          </h1>
          <p className="text-coffee-600 dark:text-cream-400 mt-1 lg:mt-2 text-sm lg:text-lg">
            Send targeted notifications to {selectedTenant.business_name}'s customers
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="self-start lg:self-auto flex items-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 bg-gradient-coffee text-cream-100 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
        >
          <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
          <span className="text-sm lg:text-base">Create Campaign</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-8">
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                Total
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mt-1">
                {stats.total}
              </p>
            </div>
            <Bell className="w-6 h-6 lg:w-8 lg:h-8 text-coffee-600 dark:text-cream-300" />
          </div>
        </div>

        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                Sent
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mt-1">
                {stats.sent}
              </p>
            </div>
            <CheckCircle className="w-6 h-6 lg:w-8 lg:h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                Scheduled
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mt-1">
                {stats.scheduled}
              </p>
            </div>
            <Calendar className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                Drafts
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mt-1">
                {stats.drafts}
              </p>
            </div>
            <Clock className="w-6 h-6 lg:w-8 lg:h-8 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Campaigns List */}
      {loading ? (
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-12 shadow-lg border border-coffee-200/50 dark:border-dark-700 text-center">
          <div className="inline-block w-8 h-8 border-4 border-coffee-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-coffee-600 dark:text-cream-400 mt-4">Loading campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-12 shadow-lg border border-coffee-200/50 dark:border-dark-700 text-center">
          <Bell className="w-12 h-12 text-coffee-300 dark:text-dark-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-coffee-900 dark:text-cream-100 mb-2">
            No campaigns yet
          </h3>
          <p className="text-coffee-600 dark:text-cream-400">
            Create your first push notification campaign
          </p>
        </div>
      ) : (
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-coffee-200/50 dark:border-dark-700 overflow-hidden">
          <div className="p-4 lg:p-6 border-b border-coffee-200/50 dark:border-dark-700">
            <h2 className="text-lg lg:text-xl font-bold text-coffee-900 dark:text-cream-100">
              Campaigns
            </h2>
          </div>
          <div className="p-4 lg:p-6 space-y-4">
            {campaigns.map(campaign => (
              <div
                key={campaign.campaign_id}
                className="p-4 lg:p-5 rounded-xl border border-coffee-200/50 dark:border-dark-700 bg-coffee-50/50 dark:bg-dark-900/50 hover:border-coffee-300 dark:hover:border-dark-600 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-base lg:text-lg text-coffee-900 dark:text-cream-100">
                        {campaign.title}
                      </h3>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(campaign.status)}`}
                      >
                        {campaign.status}
                      </span>
                    </div>
                    <p className="text-sm text-coffee-600 dark:text-cream-400">
                      {campaign.message}
                    </p>
                  </div>
                  <Send className="w-5 h-5 text-coffee-400 dark:text-cream-500 ml-3 flex-shrink-0" />
                </div>

                <div className="flex flex-wrap items-center gap-3 lg:gap-4 text-xs text-coffee-500 dark:text-cream-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Created: {new Date(campaign.created_at).toLocaleDateString()}</span>
                  </div>
                  {campaign.sent_at && (
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>Sent: {new Date(campaign.sent_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>Audience: {campaign.audience_filter?.type || 'all'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto border border-coffee-200/50 dark:border-dark-700">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-dark-800 rounded-t-2xl p-6 border-b border-coffee-200/50 dark:border-dark-700 flex items-center justify-between z-10">
              <h2 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-coffee-700 to-mocha bg-clip-text text-transparent">
                Create Push Campaign
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-coffee-100 dark:hover:bg-dark-700 transition-all"
              >
                <X className="w-5 h-5 text-coffee-600 dark:text-cream-300" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                  Notification Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Happy Hour Special!"
                  className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                  Message *
                </label>
                <textarea
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  placeholder="e.g., Get 20% off all drinks from 4-6pm today!"
                  className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                  Target Audience
                </label>
                <select
                  value={formData.audience}
                  onChange={e => setFormData({ ...formData, audience: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600"
                >
                  <option value="all">All Users</option>
                  <option value="active">Active Users (last 30 days)</option>
                  <option value="inactive">Inactive Users</option>
                  <option value="vip">VIP/Loyalty Members</option>
                </select>
              </div>

              {/* Preview */}
              <div className="bg-coffee-50 dark:bg-dark-900 rounded-xl p-4">
                <p className="text-xs text-coffee-600 dark:text-cream-400 mb-3 font-semibold">
                  Preview:
                </p>
                <div className="bg-white dark:bg-dark-800 rounded-lg p-4 shadow-md border border-coffee-200/50 dark:border-dark-700">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-coffee flex items-center justify-center flex-shrink-0">
                      <Bell className="w-4 h-4 text-cream-100" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-coffee-900 dark:text-cream-100">
                        {formData.title || 'Notification Title'}
                      </p>
                      <p className="text-sm text-coffee-600 dark:text-cream-400 mt-1">
                        {formData.message || 'Your notification message will appear here...'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-dark-800 rounded-b-2xl p-6 border-t border-coffee-200/50 dark:border-dark-700 flex justify-end gap-3 z-10">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 rounded-xl text-coffee-700 dark:text-cream-300 hover:bg-coffee-100 dark:hover:bg-dark-700 transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2.5 bg-gradient-coffee text-cream-100 rounded-xl font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all"
              >
                Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
