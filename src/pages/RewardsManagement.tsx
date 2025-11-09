import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Plus, Edit, Trash2, Gift, Star } from 'lucide-react'
import { toast } from 'sonner'
import { RewardModal } from '@/components/rewards/RewardModal'

export function RewardsManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingReward, setEditingReward] = useState<any>(null)
  const queryClient = useQueryClient()

  // Fetch rewards
  const { data: rewards, isLoading } = useQuery({
    queryKey: ['rewards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rewards_catalog')
        .select('*')
        .order('points_required', { ascending: true })
      
      if (error) throw error
      return data
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      const { error } = await supabase
        .from('rewards_catalog')
        .delete()
        .eq('reward_id', rewardId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] })
      toast.success('Reward deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete reward')
    },
  })

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ rewardId, isActive }: { rewardId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('rewards_catalog')
        .update({ is_active: !isActive })
        .eq('reward_id', rewardId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] })
      toast.success('Reward status updated')
    },
  })

  const handleEdit = (reward: any) => {
    setEditingReward(reward)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setEditingReward(null)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rewards Catalog</h1>
          <p className="mt-2 text-gray-600">
            Manage loyalty rewards that customers can redeem with points
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Reward
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Total Rewards</div>
          <div className="text-2xl font-bold text-gray-900">
            {rewards?.length || 0}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Active Rewards</div>
          <div className="text-2xl font-bold text-green-600">
            {rewards?.filter(r => r.is_active).length || 0}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Limited Stock</div>
          <div className="text-2xl font-bold text-orange-600">
            {rewards?.filter(r => r.stock_limit && r.stock_remaining).length || 0}
          </div>
        </div>
      </div>

      {/* Rewards Grid */}
      {isLoading ? (
        <div className="card text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading rewards...</p>
        </div>
      ) : rewards && rewards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map((reward) => (
            <div key={reward.reward_id} className="card hover:shadow-md transition-shadow">
              {/* Image */}
              <div className="mb-4">
                {reward.image_url ? (
                  <img
                    src={reward.image_url}
                    alt={reward.name}
                    className="w-full h-48 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-full h-48 rounded-lg bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center">
                    <Gift className="w-16 h-16 text-white" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {reward.name}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {reward.description || 'No description'}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => handleEdit(reward)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this reward?')) {
                        deleteMutation.mutate(reward.reward_id)
                      }
                    }}
                    className="p-2 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              {/* Points Required */}
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <span className="text-lg font-bold text-primary-700">
                  {reward.points_required} points
                </span>
              </div>

              {/* Type & Stock */}
              <div className="flex items-center gap-2 mb-4">
                <span className="badge badge-info capitalize">
                  {reward.reward_type.replace('_', ' ')}
                </span>
                {reward.stock_limit ? (
                  <span className={`badge ${
                    reward.stock_remaining === 0 
                      ? 'badge-danger' 
                      : reward.stock_remaining && reward.stock_remaining < 10
                      ? 'badge-warning'
                      : 'badge-success'
                  }`}>
                    {reward.stock_remaining} / {reward.stock_limit} left
                  </span>
                ) : (
                  <span className="badge bg-gray-100 text-gray-800">
                    Unlimited
                  </span>
                )}
              </div>

              {/* Status */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() =>
                    toggleActiveMutation.mutate({
                      rewardId: reward.reward_id,
                      isActive: reward.is_active,
                    })
                  }
                  className={`w-full btn btn-sm ${
                    reward.is_active ? 'btn-secondary' : 'btn-primary'
                  }`}
                >
                  {reward.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No rewards yet
          </h3>
          <p className="text-gray-600 mb-6">
            Create your first loyalty reward to encourage customer engagement
          </p>
          <button onClick={handleAdd} className="btn btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Reward
          </button>
        </div>
      )}

      {/* Modal */}
      <RewardModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingReward(null)
        }}
        reward={editingReward}
      />
    </div>
  )
}
