import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { X, Upload } from 'lucide-react'
import { toast } from 'sonner'

interface NotificationFormData {
  title: string
  message: string
  image_url: string
  deep_link: string
  audience: 'all' | 'tier_based' | 'location_based' | 'inactive_users' | 'custom'
  scheduled_for: string
}

interface PushCampaign extends NotificationFormData {
  campaign_id: string
}

interface NotificationModalProps {
  isOpen: boolean
  onClose: () => void
  campaign?: PushCampaign
}

export function NotificationModal({ isOpen, onClose, campaign }: NotificationModalProps) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NotificationFormData>({
    defaultValues: {
      title: '',
      message: '',
      image_url: '',
      deep_link: '',
      audience: 'all',
      scheduled_for: '',
    },
  })

  useEffect(() => {
    if (campaign) {
      reset({
        title: campaign.title,
        message: campaign.message,
        image_url: campaign.image_url || '',
        deep_link: campaign.deep_link || '',
        audience: campaign.audience,
        scheduled_for: campaign.scheduled_for
          ? new Date(campaign.scheduled_for).toISOString().slice(0, 16)
          : '',
      })
    } else {
      reset()
    }
  }, [campaign, reset])

  const mutation = useMutation({
    mutationFn: async (data: NotificationFormData) => {
      const payload = {
        title: data.title,
        message: data.message,
        image_url: data.image_url || null,
        deep_link: data.deep_link || null,
        audience: data.audience,
        audience_filter: {},
        scheduled_for: data.scheduled_for ? new Date(data.scheduled_for).toISOString() : null,
        status: 'draft' as const,
        tenant_id: 'YOUR_TENANT_ID', // This should come from auth context
        total_sent: 0,
        total_delivered: 0,
        total_opened: 0,
        total_clicked: 0,
        sent_at: null,
        created_by: null,
      }

      if (campaign) {
        const { error } = await supabase
          .from('push_campaigns')
          .update(payload)
          .eq('campaign_id', campaign.campaign_id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('push_campaigns').insert(payload)

        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-campaigns'] })
      toast.success(campaign ? 'Campaign updated successfully' : 'Campaign created successfully')
      onClose()
      reset()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save campaign')
    },
  })

  const onSubmit = (data: NotificationFormData) => {
    mutation.mutate(data)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
          onClick={onClose}
        />

        <div className="relative inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold text-gray-900">
              {campaign ? 'Edit Campaign' : 'Create Campaign'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Title *
              </label>
              <input
                {...register('title', {
                  required: 'Title is required',
                  maxLength: { value: 50, message: 'Title must be 50 characters or less' },
                })}
                className="input"
                placeholder="New menu items available!"
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
              <textarea
                {...register('message', {
                  required: 'Message is required',
                  maxLength: { value: 200, message: 'Message must be 200 characters or less' },
                })}
                rows={4}
                className="input"
                placeholder="Check out our delicious new seasonal drinks..."
              />
              {errors.message && (
                <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
              )}
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image URL (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  {...register('image_url')}
                  className="input flex-1"
                  placeholder="https://example.com/notification-image.jpg"
                />
                <button type="button" className="btn btn-secondary flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Rich notifications with images get 3x more engagement
              </p>
            </div>

            {/* Deep Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deep Link (Optional)
              </label>
              <input {...register('deep_link')} className="input" placeholder="/menu/seasonal" />
              <p className="mt-1 text-xs text-gray-500">
                Where users will be directed when they tap the notification
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Audience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Audience *
                </label>
                <select
                  {...register('audience', { required: 'Audience is required' })}
                  className="input"
                >
                  <option value="all">All Users</option>
                  <option value="tier_based">By Loyalty Tier</option>
                  <option value="location_based">By Location</option>
                  <option value="inactive_users">Inactive Users</option>
                  <option value="custom">Custom Segment</option>
                </select>
              </div>

              {/* Scheduled For */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule For (Optional)
                </label>
                <input type="datetime-local" {...register('scheduled_for')} className="input" />
                <p className="mt-1 text-xs text-gray-500">Leave empty to send immediately</p>
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-sm font-medium text-gray-700 mb-3">Preview</div>
              <div className="bg-white rounded-lg shadow-sm p-4 max-w-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                    C
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {register('title').name || 'Notification Title'}
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-2 mt-0.5">
                      {register('message').name || 'Notification message will appear here...'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Just now</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
                {mutation.isPending
                  ? 'Saving...'
                  : campaign
                    ? 'Update Campaign'
                    : 'Create Campaign'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
