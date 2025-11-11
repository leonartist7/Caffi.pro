import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { X, Upload } from 'lucide-react'
import { toast } from 'sonner'

interface RewardFormData {
  name: string
  description: string
  points_required: number
  image_url: string
  reward_type: 'coupon' | 'free_item' | 'discount'
  stock_limit: number | null
  stock_remaining: number | null
  is_active: boolean
}

interface Reward extends RewardFormData {
  reward_id: string
}

interface RewardModalProps {
  isOpen: boolean
  onClose: () => void
  reward?: Reward
}

export function RewardModal({ isOpen, onClose, reward }: RewardModalProps) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<RewardFormData>({
    defaultValues: {
      name: '',
      description: '',
      points_required: 100,
      image_url: '',
      reward_type: 'free_item',
      stock_limit: null,
      stock_remaining: null,
      is_active: true,
    },
  })

  const hasStockLimit = watch('stock_limit') !== null

  useEffect(() => {
    if (reward) {
      reset({
        name: reward.name,
        description: reward.description || '',
        points_required: reward.points_required,
        image_url: reward.image_url || '',
        reward_type: reward.reward_type,
        stock_limit: reward.stock_limit,
        stock_remaining: reward.stock_remaining,
        is_active: reward.is_active,
      })
    } else {
      reset()
    }
  }, [reward, reset])

  const mutation = useMutation({
    mutationFn: async (data: RewardFormData) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        points_required: data.points_required,
        image_url: data.image_url || null,
        reward_type: data.reward_type,
        reward_value: {},
        stock_limit: data.stock_limit,
        stock_remaining: data.stock_remaining,
        is_active: data.is_active,
        tenant_id: 'YOUR_TENANT_ID',
      }

      if (reward) {
        const { error } = await supabase
          .from('rewards_catalog')
          .update(payload)
          .eq('reward_id', reward.reward_id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('rewards_catalog').insert(payload)

        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] })
      toast.success(reward ? 'Reward updated successfully' : 'Reward created successfully')
      onClose()
      reset()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save reward')
    },
  })

  const onSubmit = (data: RewardFormData) => {
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
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold text-gray-900">
              {reward ? 'Edit Reward' : 'Add Reward'}
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reward Name *
                </label>
                <input
                  {...register('name', { required: 'Name is required' })}
                  className="input"
                  placeholder="Free Coffee"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="input"
                  placeholder="Redeem for any regular coffee drink"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Points Required *
                </label>
                <input
                  type="number"
                  {...register('points_required', {
                    required: 'Points required',
                    min: { value: 1, message: 'Must be at least 1' },
                  })}
                  className="input"
                  placeholder="100"
                />
                {errors.points_required && (
                  <p className="mt-1 text-sm text-red-600">{errors.points_required.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reward Type *
                </label>
                <select
                  {...register('reward_type', { required: 'Type is required' })}
                  className="input"
                >
                  <option value="free_item">Free Item</option>
                  <option value="discount">Discount</option>
                  <option value="coupon">Coupon</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                <div className="flex gap-2">
                  <input
                    {...register('image_url')}
                    className="input flex-1"
                    placeholder="https://example.com/reward-image.jpg"
                  />
                  <button type="button" className="btn btn-secondary flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stock Limit</label>
                <input
                  type="number"
                  {...register('stock_limit')}
                  className="input"
                  placeholder="Leave empty for unlimited"
                />
              </div>

              {hasStockLimit && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Remaining
                  </label>
                  <input
                    type="number"
                    {...register('stock_remaining')}
                    className="input"
                    placeholder="100"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register('is_active')}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Active (available for redemption)
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
                {mutation.isPending ? 'Saving...' : reward ? 'Update Reward' : 'Add Reward'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
