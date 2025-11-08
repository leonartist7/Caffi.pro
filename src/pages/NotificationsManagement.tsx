import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Plus, Send, Edit, Trash2, Users, Eye, MousePointer, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { NotificationModal } from '@/components/notifications/NotificationModal'

export function NotificationsManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<any>(null)
  const queryClient = useQueryClient()

  // Fetch campaigns
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['push-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('push_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from('push_campaigns')
        .delete()
        .eq('campaign_id', campaignId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-campaigns'] })
      toast.success('Campaign deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete campaign')
    },
  })

  // Send campaign mutation
  const sendMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      // In a real implementation, this would trigger the push notification service
      const { error } = await supabase
        .from('push_campaigns')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString(),
          total_sent: 100 // Mock value
        })
        .eq('campaign_id', campaignId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-campaigns'] })
      toast.success('Campaign sent successfully!')
    },
    onError: () => {
      toast.error('Failed to send campaign')
    },
  })

  const handleEdit = (campaign: any) => {
    setEditingCampaign(campaign)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setEditingCampaign(null)
    setIsModalOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'badge-success'
      case 'sending':
        return 'badge-info'
      case 'scheduled':
        return 'badge-warning'
      case 'cancelled':
        return 'badge-danger'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getAudienceLabel = (audience: string) => {
    switch (audience) {
      case 'all':
        return 'All Users'
      case 'tier_based':
        return 'By Tier'
      case 'location_based':
        return 'By Location'
      case 'inactive_users':
        return 'Inactive Users'
      case 'custom':
        return 'Custom'
      default:
        return audience
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Push Notifications</h1>
          <p className="mt-2 text-gray-600">
            Create and manage push notification campaigns
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Campaign
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Total Sent</div>
            <Send className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {campaigns?.reduce((sum, c) => sum + (c.total_sent || 0), 0) || 0}
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Delivered</div>
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {campaigns?.reduce((sum, c) => sum + (c.total_delivered || 0), 0) || 0}
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Opened</div>
            <Eye className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {campaigns?.reduce((sum, c) => sum + (c.total_opened || 0), 0) || 0}
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Clicked</div>
            <MousePointer className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {campaigns?.reduce((sum, c) => sum + (c.total_clicked || 0), 0) || 0}
          </div>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="card text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading campaigns...</p>
          </div>
        ) : campaigns && campaigns.length > 0 ? (
          campaigns.map((campaign) => (
            <div key={campaign.campaign_id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                {/* Image */}
                <div className="flex-shrink-0">
                  {campaign.image_url ? (
                    <img
                      src={campaign.image_url}
                      alt={campaign.title}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center">
                      <Send className="w-8 h-8 text-white" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {campaign.title}
                        </h3>
                        <span className={`badge ${getStatusColor(campaign.status)}`}>
                          {campaign.status}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2 line-clamp-2">
                        {campaign.message}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {getAudienceLabel(campaign.audience)}
                        </div>
                        {campaign.scheduled_for && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {format(new Date(campaign.scheduled_for), 'MMM dd, yyyy HH:mm')}
                          </div>
                        )}
                        {campaign.sent_at && (
                          <div className="flex items-center gap-1">
                            <Send className="w-4 h-4" />
                            Sent {format(new Date(campaign.sent_at), 'MMM dd, yyyy')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {campaign.status === 'draft' && (
                        <button
                          onClick={() => {
                            if (confirm('Send this campaign now?')) {
                              sendMutation.mutate(campaign.campaign_id)
                            }
                          }}
                          className="btn btn-primary btn-sm"
                          disabled={sendMutation.isPending}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Send Now
                        </button>
                      )}
                      {campaign.status !== 'sent' && (
                        <button
                          onClick={() => handleEdit(campaign)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this campaign?')) {
                            deleteMutation.mutate(campaign.campaign_id)
                          }
                        }}
                        className="p-2 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  {campaign.status === 'sent' && campaign.total_sent > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Sent</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {campaign.total_sent}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Delivered</div>
                          <div className="text-lg font-semibold text-green-600">
                            {campaign.total_delivered}
                            <span className="text-xs text-gray-600 ml-1">
                              ({((campaign.total_delivered / campaign.total_sent) * 100).toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Opened</div>
                          <div className="text-lg font-semibold text-purple-600">
                            {campaign.total_opened}
                            <span className="text-xs text-gray-600 ml-1">
                              ({((campaign.total_opened / campaign.total_sent) * 100).toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Clicked</div>
                          <div className="text-lg font-semibold text-orange-600">
                            {campaign.total_clicked}
                            <span className="text-xs text-gray-600 ml-1">
                              ({((campaign.total_clicked / campaign.total_sent) * 100).toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <Send className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No campaigns yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first push notification campaign to engage with customers
            </p>
            <button onClick={handleAdd} className="btn btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      <NotificationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingCampaign(null)
        }}
        campaign={editingCampaign}
      />
    </div>
  )
}

