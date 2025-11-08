'use client'

import { useState, useEffect } from 'react'
import { supabaseAdmin } from '@/lib/supabase'

interface Campaign {
  campaign_id: string
  tenant_id: string
  title: string
  message: string
  audience_filter: any
  scheduled_at: string | null
  sent_at: string | null
  status: 'draft' | 'scheduled' | 'sent'
  created_at: string
  tenants?: {
    business_name: string
  }
}

export default function NotificationsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [cafes, setCafes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Form state
  const [selectedCafe, setSelectedCafe] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState('all')

  useEffect(() => {
    fetchCafes()
    fetchCampaigns()
  }, [])

  const fetchCafes = async () => {
    try {
      if (!supabaseAdmin) return

      const { data, error } = await supabaseAdmin
        .from('tenants')
        .select('tenant_id, business_name, slug')
        .order('business_name')

      if (error) throw error
      setCafes(data || [])
    } catch (error) {
      console.error('Error fetching cafes:', error)
    }
  }

  const fetchCampaigns = async () => {
    try {
      if (!supabaseAdmin) return

      const { data, error } = await supabaseAdmin
        .from('push_campaigns')
        .select(`
          *,
          tenants (business_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCampaigns(data || [])
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const createCampaign = async () => {
    try {
      if (!supabaseAdmin || !selectedCafe || !title || !message) {
        alert('Please fill in all fields')
        return
      }

      const { error } = await supabaseAdmin
        .from('push_campaigns')
        .insert({
          tenant_id: selectedCafe,
          title,
          message,
          audience_filter: { type: audience },
          status: 'draft',
        })

      if (error) throw error

      // Reset form
      setSelectedCafe('')
      setTitle('')
      setMessage('')
      setAudience('all')
      setShowCreateModal(false)

      // Refresh campaigns
      fetchCampaigns()
    } catch (error) {
      console.error('Error creating campaign:', error)
      alert('Failed to create campaign')
    }
  }

  const getStatusBadge = (status: Campaign['status']) => {
    const styles: Record<Campaign['status'], string> = {
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      sent: 'bg-green-100 text-green-800',
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status.toUpperCase()}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">📢</div>
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Push Notifications</h1>
          <p className="text-gray-600 mt-2">Send notifications to your café customers</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-accent hover:bg-accent/90 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all hover:shadow-xl"
        >
          + Create Campaign
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <p className="text-sm text-gray-600 mb-1">Total Campaigns</p>
          <p className="text-3xl font-bold text-gray-900">{campaigns.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <p className="text-sm text-gray-600 mb-1">Sent</p>
          <p className="text-3xl font-bold text-green-600">
            {campaigns.filter(c => c.status === 'sent').length}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <p className="text-sm text-gray-600 mb-1">Scheduled</p>
          <p className="text-3xl font-bold text-blue-600">
            {campaigns.filter(c => c.status === 'scheduled').length}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <p className="text-sm text-gray-600 mb-1">Drafts</p>
          <p className="text-3xl font-bold text-gray-600">
            {campaigns.filter(c => c.status === 'draft').length}
          </p>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Past Campaigns</h2>
        </div>
        <div className="p-6">
          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📢</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No campaigns yet</h3>
              <p className="text-gray-600">Create your first push notification campaign</p>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.campaign_id}
                  className="p-4 rounded-xl border border-gray-200 hover:border-primary hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{campaign.title}</h3>
                      <p className="text-sm font-serif italic text-gray-700 mt-1">
                        {campaign.tenants?.business_name}
                      </p>
                    </div>
                    {getStatusBadge(campaign.status)}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{campaign.message}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      Created: {new Date(campaign.created_at).toLocaleDateString()}
                    </span>
                    {campaign.sent_at && (
                      <span>
                        Sent: {new Date(campaign.sent_at).toLocaleDateString()}
                      </span>
                    )}
                    <span>Audience: {campaign.audience_filter?.type || 'all'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-8 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Create Push Campaign</h2>
            </div>

            <div className="p-6 space-y-4">
              {/* Café Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Café *
                </label>
                <select
                  value={selectedCafe}
                  onChange={(e) => setSelectedCafe(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="">Choose a café...</option>
                  {cafes.map((cafe) => (
                    <option key={cafe.tenant_id} value={cafe.tenant_id}>
                      {cafe.business_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Happy Hour Special!"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="e.g., Get 20% off all drinks from 4-6pm today!"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              {/* Audience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Audience
                </label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="all">All Users</option>
                  <option value="active">Active Users (last 30 days)</option>
                  <option value="inactive">Inactive Users</option>
                  <option value="vip">VIP/Loyalty Members</option>
                </select>
              </div>

              {/* Preview */}
              <div className="bg-surface-alt rounded-xl p-4">
                <p className="text-xs text-gray-600 mb-2">Preview:</p>
                <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
                  <p className="font-bold text-gray-900">{title || 'Notification Title'}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {message || 'Your notification message will appear here...'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-3 rounded-xl text-gray-700 hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={createCampaign}
                className="bg-accent hover:bg-accent/90 text-white font-semibold px-6 py-3 rounded-xl transition-all"
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
