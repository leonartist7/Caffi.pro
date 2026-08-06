'use client'

import { useState, useEffect } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import { toast } from 'sonner'
import {
  Gift,
  Plus,
  Edit,
  Trash2,
  Star,
  Award,
  Package,
  Search,
  X,
  Image as ImageIcon,
  Building2,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useConfirm } from '@/hooks/useConfirm'

interface Reward {
  reward_id: string
  tenant_id: string
  name: string
  description: string | null
  points_required: number
  image_url: string | null
  reward_type: 'coupon' | 'free_item' | 'discount'
  reward_value: {
    item_id?: string
    discount_percentage?: number
    discount_amount?: number
  }
  stock_limit: number | null
  stock_remaining: number | null
  is_active: boolean
  created_at: string
}

export default function RewardsPage() {
  const { selectedTenant } = useTenant()
  const { confirm, confirmState, closeConfirm } = useConfirm()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingReward, setEditingReward] = useState<Reward | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    points_required: 100,
    image_url: '',
    reward_type: 'free_item' as 'coupon' | 'free_item' | 'discount',
    stock_limit: null as number | null,
    stock_remaining: null as number | null,
    is_active: true,
  })

  useEffect(() => {
    if (selectedTenant) {
      fetchRewards()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- legacy effect; refit to TanStack Query in Phase 3
  }, [selectedTenant])

  async function fetchRewards() {
    if (!selectedTenant) return

    try {
      setLoading(true)
      const res = await fetch(`/api/rewards?venue_id=${selectedTenant.tenant_id}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Failed to load rewards (${res.status})`)
      }
      const { rewards: data } = await res.json()
      setRewards(data || [])
    } catch (error) {
      console.error('Error fetching rewards:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load rewards')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveReward(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTenant) return

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        points_required: formData.points_required,
        image_url: formData.image_url || null,
        reward_type: formData.reward_type,
        stock_limit: formData.stock_limit,
        stock_remaining: formData.stock_remaining,
        is_active: formData.is_active,
      }

      const res = editingReward
        ? await fetch(`/api/rewards/${editingReward.reward_id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/rewards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, venue_id: selectedTenant.tenant_id }),
          })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Request failed (${res.status})`)
      }

      await fetchRewards()
      closeModal()
      toast.success(editingReward ? 'Reward updated!' : 'Reward created!')
    } catch (error) {
      console.error('Error saving reward:', error)
      toast.error(
        `Failed to save reward: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async function handleDeleteReward(rewardId: string) {
    const confirmed = await confirm({
      title: 'Delete Reward',
      message: 'Are you sure you want to delete this reward? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
    })

    if (!confirmed) return

    try {
      const res = await fetch(`/api/rewards/${rewardId}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Request failed (${res.status})`)
      }
      await fetchRewards()
      toast.success('Reward deleted.')
    } catch (error) {
      console.error('Error deleting reward:', error)
      toast.error(
        `Failed to delete reward: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  function openCreateModal() {
    setEditingReward(null)
    setFormData({
      name: '',
      description: '',
      points_required: 100,
      image_url: '',
      reward_type: 'free_item',
      stock_limit: null,
      stock_remaining: null,
      is_active: true,
    })
    setShowModal(true)
  }

  function openEditModal(reward: Reward) {
    setEditingReward(reward)
    setFormData({
      name: reward.name,
      description: reward.description || '',
      points_required: reward.points_required,
      image_url: reward.image_url || '',
      reward_type: reward.reward_type,
      stock_limit: reward.stock_limit,
      stock_remaining: reward.stock_remaining,
      is_active: reward.is_active,
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingReward(null)
  }

  const filteredRewards = rewards.filter(reward =>
    reward.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    total: rewards.length,
    active: rewards.filter(r => r.is_active).length,
    totalPoints: rewards.reduce((sum, r) => sum + r.points_required, 0),
    outOfStock: rewards.filter(
      r => r.stock_limit !== null && r.stock_remaining !== null && r.stock_remaining <= 0
    ).length,
  }

  const getRewardTypeColor = (type: string) => {
    const colors = {
      coupon: 'bg-aro-plum text-white',
      free_item: 'bg-aro-honey text-aro-ink',
      discount: 'bg-aro-sage text-aro-ink',
    }
    return colors[type as keyof typeof colors] || colors.free_item
  }

  const getRewardTypeLabel = (type: string) => {
    const labels = {
      coupon: 'Coupon',
      free_item: 'Free Item',
      discount: 'Discount',
    }
    return labels[type as keyof typeof labels] || type
  }

  // No tenant selected state
  if (!selectedTenant) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-aro-terra flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Building2 className="w-10 h-10 lg:w-12 lg:h-12 text-white" />
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-aro-ink mb-3">
            Select a Coffee Shop Client
          </h2>
          <p className="text-aro-muted mb-6">
            Please select a client from the dropdown above to manage their loyalty rewards.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-aro-terra border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-aro-muted">Loading rewards...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="font-display text-2xl lg:text-4xl font-bold text-aro-ink">
          Rewards Catalog
        </h1>
        <p className="text-aro-muted mt-1 lg:mt-2 text-sm lg:text-lg">
          Manage loyalty rewards for {selectedTenant.business_name}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-aro-hairline">
          <div className="flex items-center gap-3 mb-2">
            <Gift className="w-5 h-5 lg:w-6 lg:h-6 text-aro-muted" />
            <p className="text-xs lg:text-sm text-aro-muted">Total Rewards</p>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-aro-ink">{stats.total}</p>
        </div>

        <div className="bg-aro-sage/15 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-aro-sage/30">
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-5 h-5 lg:w-6 lg:h-6 text-aro-sage" />
            <p className="text-xs lg:text-sm text-aro-ink">Active</p>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-aro-ink">{stats.active}</p>
        </div>

        <div className="bg-aro-plum/10 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-aro-plum/30">
          <div className="flex items-center gap-3 mb-2">
            <Star className="w-5 h-5 lg:w-6 lg:h-6 text-aro-plum" />
            <p className="text-xs lg:text-sm text-aro-ink">Avg. Points</p>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-aro-ink">
            {stats.total > 0 ? Math.round(stats.totalPoints / stats.total) : 0}
          </p>
        </div>

        <div className="bg-aro-rose/15 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-aro-rose/30">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-5 h-5 lg:w-6 lg:h-6 text-aro-rose" />
            <p className="text-xs lg:text-sm text-aro-ink">Out of Stock</p>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-aro-ink">{stats.outOfStock}</p>
        </div>
      </div>

      {/* Search & Actions */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-aro-hairline mb-6">
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-aro-muted" />
            <input
              type="text"
              placeholder="Search rewards..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 lg:py-3 rounded-xl border border-aro-hairline bg-white text-aro-ink focus:outline-none focus:ring-2 focus:ring-aro-terra transition-all text-sm lg:text-base"
            />
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 bg-aro-terra text-white font-semibold py-2.5 lg:py-3 px-4 lg:px-6 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all text-sm lg:text-base"
          >
            <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
            Add Reward
          </button>
        </div>
      </div>

      {/* Rewards Grid */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-aro-hairline">
        <div className="p-4 lg:p-6 border-b border-aro-hairline">
          <h2 className="text-lg lg:text-xl font-bold text-aro-ink">All Rewards</h2>
        </div>

        <div className="p-4 lg:p-6">
          {filteredRewards.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="w-16 h-16 text-aro-clay mx-auto mb-4" />
              <h3 className="text-xl font-bold text-aro-ink mb-2">No rewards found</h3>
              <p className="text-aro-muted mb-4">
                {searchQuery ? 'Try a different search' : 'Create your first reward to get started'}
              </p>
              {!searchQuery && (
                <button
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-2 bg-aro-terra text-white font-semibold py-2.5 px-6 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Add Reward
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRewards.map(reward => {
                const isOutOfStock =
                  reward.stock_limit !== null &&
                  reward.stock_remaining !== null &&
                  reward.stock_remaining <= 0

                return (
                  <div
                    key={reward.reward_id}
                    className={`rounded-2xl border overflow-hidden transition-all ${
                      reward.is_active && !isOutOfStock
                        ? 'bg-aro-sand/25 border-aro-hairline hover:border-aro-clay hover:shadow-lg'
                        : 'bg-aro-sand/40 border-aro-hairline opacity-60'
                    }`}
                  >
                    {/* Image */}
                    <div className="h-48 bg-aro-sand flex items-center justify-center relative">
                      {reward.image_url ? (
                        <img
                          src={reward.image_url}
                          alt={reward.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-16 h-16 text-aro-clay" />
                      )}
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-aro-ink/50 flex items-center justify-center">
                          <span className="px-4 py-2 bg-aro-rose text-aro-ink font-bold rounded-lg">
                            OUT OF STOCK
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-aro-ink mb-1">{reward.name}</h3>
                          {reward.description && (
                            <p className="text-sm text-aro-muted mb-2">{reward.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-aro-terra text-white">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="font-bold text-sm">{reward.points_required}</span>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getRewardTypeColor(reward.reward_type)}`}
                        >
                          {getRewardTypeLabel(reward.reward_type)}
                        </span>
                      </div>

                      {reward.stock_limit !== null && (
                        <div className="mb-3 text-sm text-aro-muted">
                          <div className="flex items-center justify-between mb-1">
                            <span>Stock:</span>
                            <span className="font-medium">
                              {reward.stock_remaining} / {reward.stock_limit}
                            </span>
                          </div>
                          <div className="w-full bg-aro-sand rounded-full h-2">
                            <div
                              className="bg-aro-terra h-2 rounded-full transition-all"
                              style={{
                                width: `${reward.stock_limit > 0 ? ((reward.stock_remaining || 0) / reward.stock_limit) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-3 border-t border-aro-hairline">
                        <button
                          onClick={() => openEditModal(reward)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-aro-sand text-aro-ink-soft hover:bg-aro-clay/50 transition-all"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteReward(reward.reward_id)}
                          className="px-4 py-2 rounded-lg bg-aro-rose/15 text-aro-rose hover:bg-aro-rose/25 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
            <div
              className="fixed inset-0 transition-opacity bg-aro-ink/60 backdrop-blur-sm"
              onClick={closeModal}
            />

            <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl lg:text-2xl font-bold text-aro-ink">
                  {editingReward ? 'Edit Reward' : 'Add Reward'}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-aro-sand/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveReward} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-aro-ink-soft mb-2">
                      Reward Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-aro-hairline bg-white text-aro-ink focus:outline-none focus:ring-2 focus:ring-aro-terra transition-all"
                      placeholder="Free Coffee"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-aro-ink-soft mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-xl border border-aro-hairline bg-white text-aro-ink focus:outline-none focus:ring-2 focus:ring-aro-terra transition-all"
                      placeholder="Redeem for any regular coffee drink"
                    />
                  </div>

                  {/* Points Required */}
                  <div>
                    <label className="block text-sm font-medium text-aro-ink-soft mb-2">
                      Points Required *
                    </label>
                    <input
                      type="number"
                      value={formData.points_required}
                      onChange={e =>
                        setFormData({ ...formData, points_required: parseInt(e.target.value) })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-aro-hairline bg-white text-aro-ink focus:outline-none focus:ring-2 focus:ring-aro-terra transition-all"
                      min="1"
                      required
                    />
                  </div>

                  {/* Reward Type */}
                  <div>
                    <label className="block text-sm font-medium text-aro-ink-soft mb-2">
                      Reward Type *
                    </label>
                    <select
                      value={formData.reward_type}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          reward_type: e.target.value as typeof formData.reward_type,
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-aro-hairline bg-white text-aro-ink focus:outline-none focus:ring-2 focus:ring-aro-terra transition-all"
                    >
                      <option value="free_item">Free Item</option>
                      <option value="discount">Discount</option>
                      <option value="coupon">Coupon</option>
                    </select>
                  </div>

                  {/* Image URL */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-aro-ink-soft mb-2">
                      Image URL
                    </label>
                    <input
                      type="url"
                      value={formData.image_url}
                      onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-aro-hairline bg-white text-aro-ink focus:outline-none focus:ring-2 focus:ring-aro-terra transition-all"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  {/* Stock Limit */}
                  <div>
                    <label className="block text-sm font-medium text-aro-ink-soft mb-2">
                      Stock Limit
                    </label>
                    <input
                      type="number"
                      value={formData.stock_limit || ''}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          stock_limit: e.target.value ? parseInt(e.target.value) : null,
                          stock_remaining:
                            e.target.value && !editingReward
                              ? parseInt(e.target.value)
                              : formData.stock_remaining,
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-aro-hairline bg-white text-aro-ink focus:outline-none focus:ring-2 focus:ring-aro-terra transition-all"
                      placeholder="Unlimited"
                    />
                  </div>

                  {/* Stock Remaining */}
                  {formData.stock_limit !== null && (
                    <div>
                      <label className="block text-sm font-medium text-aro-ink-soft mb-2">
                        Stock Remaining
                      </label>
                      <input
                        type="number"
                        value={formData.stock_remaining || ''}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            stock_remaining: e.target.value ? parseInt(e.target.value) : null,
                          })
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-aro-hairline bg-white text-aro-ink focus:outline-none focus:ring-2 focus:ring-aro-terra transition-all"
                      />
                    </div>
                  )}

                  {/* Is Active */}
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-5 h-5 rounded border-aro-clay text-aro-terra focus:ring-aro-terra"
                      />
                      <span className="text-sm font-medium text-aro-ink-soft">
                        Active (available for redemption)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-aro-hairline">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-2.5 rounded-xl border border-aro-hairline bg-aro-sand/40 text-aro-ink-soft hover:bg-aro-sand/70 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-aro-terra text-white font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all"
                  >
                    {editingReward ? 'Update Reward' : 'Add Reward'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        variant={confirmState.variant}
      />
    </div>
  )
}
