'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useTenant } from '@/contexts/TenantContext'
import { toast } from 'sonner'
import {
  Ticket,
  Plus,
  Edit,
  Trash2,
  Copy,
  Calendar,
  TrendingUp,
  Sparkles,
  Search,
  X,
  Building2,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useConfirm } from '@/hooks/useConfirm'

interface Coupon {
  coupon_id: string
  tenant_id: string
  code: string
  discount_type: 'percentage' | 'fixed_amount' | 'free_item'
  discount_value: number
  min_order_amount: number
  max_uses: number | null
  current_uses: number
  valid_from: string
  valid_until: string | null
  is_active: boolean
  created_at: string
}

export default function CouponsPage() {
  const { selectedTenant } = useTenant()
  const { confirm, confirmState, closeConfirm } = useConfirm()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_amount' | 'free_item',
    discount_value: 10,
    min_order_amount: 0,
    max_uses: null as number | null,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    is_active: true,
  })

  useEffect(() => {
    if (selectedTenant) {
      fetchCoupons()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- legacy effect; refit to TanStack Query in Phase 3
  }, [selectedTenant])

  async function fetchCoupons() {
    if (!selectedTenant) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('tenant_id', selectedTenant.tenant_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCoupons(data || [])
    } catch (error) {
      console.error('Error fetching coupons:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveCoupon(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTenant) return

    try {
      const payload = {
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        min_order_amount: formData.min_order_amount,
        max_uses: formData.max_uses,
        valid_from: new Date(formData.valid_from).toISOString(),
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
        is_active: formData.is_active,
        current_uses: editingCoupon?.current_uses || 0,
      }

      if (editingCoupon) {
        const { error } = await supabase
          .from('coupons')
          .update(payload)
          .eq('coupon_id', editingCoupon.coupon_id)
          .eq('tenant_id', selectedTenant.tenant_id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('coupons').insert({
          ...payload,
          tenant_id: selectedTenant.tenant_id,
        })

        if (error) throw error
      }

      fetchCoupons()
      closeModal()
    } catch (error) {
      console.error('Error saving coupon:', error)
    }
  }

  async function handleDeleteCoupon(couponId: string) {
    const confirmed = await confirm({
      title: 'Delete Coupon',
      message: 'Are you sure you want to delete this coupon? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
    })

    if (!confirmed) return
    if (!selectedTenant) return

    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('coupon_id', couponId)
        .eq('tenant_id', selectedTenant.tenant_id)

      if (error) throw error
      fetchCoupons()
      toast.success('Coupon deleted successfully!')
    } catch (error) {
      console.error('Error deleting coupon:', error)
      toast.error('Failed to delete coupon')
    }
  }

  function openCreateModal() {
    setEditingCoupon(null)
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: 10,
      min_order_amount: 0,
      max_uses: null,
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
      is_active: true,
    })
    setShowModal(true)
  }

  function openEditModal(coupon: Coupon) {
    setEditingCoupon(coupon)
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount,
      max_uses: coupon.max_uses,
      valid_from: new Date(coupon.valid_from).toISOString().split('T')[0],
      valid_until: coupon.valid_until
        ? new Date(coupon.valid_until).toISOString().split('T')[0]
        : '',
      is_active: coupon.is_active,
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingCoupon(null)
  }

  function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData({ ...formData, code })
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
  }

  const filteredCoupons = coupons.filter(coupon =>
    coupon.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    total: coupons.length,
    active: coupons.filter(c => c.is_active).length,
    totalUses: coupons.reduce((sum, c) => sum + c.current_uses, 0),
    expired: coupons.filter(c => c.valid_until && new Date(c.valid_until) < new Date()).length,
  }

  const getDiscountDisplay = (coupon: Coupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}% OFF`
    } else if (coupon.discount_type === 'fixed_amount') {
      return `€${coupon.discount_value} OFF`
    } else {
      return 'FREE ITEM'
    }
  }

  const isExpired = (coupon: Coupon) => {
    return coupon.valid_until && new Date(coupon.valid_until) < new Date()
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
            Please select a client from the dropdown above to manage their coupons.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-coffee-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-coffee-600 dark:text-cream-400">Loading coupons...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-coffee-700 to-mocha bg-clip-text text-transparent">
          Coupon Management
        </h1>
        <p className="text-coffee-600 dark:text-cream-400 mt-1 lg:mt-2 text-sm lg:text-lg">
          Create and manage discount coupons for {selectedTenant.business_name}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center gap-3 mb-2">
            <Ticket className="w-5 h-5 lg:w-6 lg:h-6 text-coffee-600 dark:text-cream-400" />
            <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400">Total Coupons</p>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100">
            {stats.total}
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-5 h-5 lg:w-6 lg:h-6 text-green-600 dark:text-green-400" />
            <p className="text-xs lg:text-sm text-green-600 dark:text-green-400">Active</p>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-green-700 dark:text-green-400">
            {stats.active}
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
            <p className="text-xs lg:text-sm text-blue-600 dark:text-blue-400">Total Uses</p>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-blue-700 dark:text-blue-400">
            {stats.totalUses}
          </p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 lg:w-6 lg:h-6 text-red-600 dark:text-red-400" />
            <p className="text-xs lg:text-sm text-red-600 dark:text-red-400">Expired</p>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-red-700 dark:text-red-400">
            {stats.expired}
          </p>
        </div>
      </div>

      {/* Search & Actions */}
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-coffee-400 dark:text-cream-600" />
            <input
              type="text"
              placeholder="Search coupons..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 lg:py-3 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all text-sm lg:text-base"
            />
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 bg-gradient-coffee text-cream-100 font-semibold py-2.5 lg:py-3 px-4 lg:px-6 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all text-sm lg:text-base"
          >
            <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
            Create Coupon
          </button>
        </div>
      </div>

      {/* Coupons List */}
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-coffee-200/50 dark:border-dark-700">
        <div className="p-4 lg:p-6 border-b border-coffee-200/50 dark:border-dark-700">
          <h2 className="text-lg lg:text-xl font-bold text-coffee-900 dark:text-cream-100">
            All Coupons
          </h2>
        </div>

        <div className="p-4 lg:p-6">
          {filteredCoupons.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="w-16 h-16 text-coffee-300 dark:text-dark-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-coffee-900 dark:text-cream-100 mb-2">
                No coupons found
              </h3>
              <p className="text-coffee-600 dark:text-cream-400 mb-4">
                {searchQuery ? 'Try a different search' : 'Create your first coupon to get started'}
              </p>
              {!searchQuery && (
                <button
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-2 bg-gradient-coffee text-cream-100 font-semibold py-2.5 px-6 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Create Coupon
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredCoupons.map(coupon => (
                <div
                  key={coupon.coupon_id}
                  className={`p-4 rounded-xl border transition-all ${
                    isExpired(coupon)
                      ? 'bg-gray-50 dark:bg-gray-900/20 border-gray-300 dark:border-gray-700 opacity-60'
                      : coupon.is_active
                        ? 'bg-coffee-50/50 dark:bg-dark-900/50 border-coffee-200 dark:border-dark-700 hover:border-coffee-300 dark:hover:border-dark-600 hover:shadow-md'
                        : 'bg-gray-50 dark:bg-gray-900/20 border-gray-300 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-lg font-bold font-mono text-coffee-900 dark:text-cream-100">
                          {coupon.code}
                        </code>
                        <button
                          onClick={() => copyCode(coupon.code)}
                          className="p-1 hover:bg-coffee-100 dark:hover:bg-dark-800 rounded transition-colors"
                          title="Copy code"
                        >
                          <Copy className="w-4 h-4 text-coffee-600 dark:text-cream-400" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-coffee text-cream-100">
                          {getDiscountDisplay(coupon)}
                        </span>
                        {coupon.is_active && !isExpired(coupon) ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                            Active
                          </span>
                        ) : isExpired(coupon) ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                            Expired
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700/30 text-gray-700 dark:text-gray-400">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(coupon)}
                        className="p-2 hover:bg-coffee-100 dark:hover:bg-dark-800 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4 text-coffee-600 dark:text-cream-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteCoupon(coupon.coupon_id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-coffee-600 dark:text-cream-400">
                    {coupon.min_order_amount > 0 && (
                      <p>Minimum order: €{coupon.min_order_amount.toFixed(2)}</p>
                    )}
                    <p>
                      Uses: {coupon.current_uses}
                      {coupon.max_uses ? ` / ${coupon.max_uses}` : ' (unlimited)'}
                    </p>
                    <p>
                      Valid: {new Date(coupon.valid_from).toLocaleDateString()}
                      {coupon.valid_until
                        ? ` - ${new Date(coupon.valid_until).toLocaleDateString()}`
                        : ' (no expiry)'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
            <div
              className="fixed inset-0 transition-opacity bg-gray-900/75 backdrop-blur-sm"
              onClick={closeModal}
            />

            <div className="relative bg-white dark:bg-dark-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl lg:text-2xl font-bold text-coffee-900 dark:text-cream-100">
                  {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-coffee-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCoupon} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Coupon Code */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                      Coupon Code *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.code}
                        onChange={e =>
                          setFormData({ ...formData, code: e.target.value.toUpperCase() })
                        }
                        className="flex-1 px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 font-mono focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all"
                        placeholder="SUMMER2024"
                        required
                      />
                      <button
                        type="button"
                        onClick={generateCode}
                        className="px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-coffee-50 dark:bg-dark-700 text-coffee-700 dark:text-cream-300 hover:bg-coffee-100 dark:hover:bg-dark-600 transition-all"
                      >
                        Generate
                      </button>
                    </div>
                  </div>

                  {/* Discount Type */}
                  <div>
                    <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                      Discount Type *
                    </label>
                    <select
                      value={formData.discount_type}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          discount_type: e.target.value as typeof formData.discount_type,
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed_amount">Fixed Amount (€)</option>
                      <option value="free_item">Free Item</option>
                    </select>
                  </div>

                  {/* Discount Value */}
                  <div>
                    <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                      Discount Value *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.discount_value}
                      onChange={e =>
                        setFormData({ ...formData, discount_value: parseFloat(e.target.value) })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all"
                      required
                    />
                  </div>

                  {/* Min Order Amount */}
                  <div>
                    <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                      Minimum Order (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.min_order_amount}
                      onChange={e =>
                        setFormData({ ...formData, min_order_amount: parseFloat(e.target.value) })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all"
                    />
                  </div>

                  {/* Max Uses */}
                  <div>
                    <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                      Max Uses
                    </label>
                    <input
                      type="number"
                      value={formData.max_uses || ''}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          max_uses: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all"
                      placeholder="Unlimited"
                    />
                  </div>

                  {/* Valid From */}
                  <div>
                    <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                      Valid From *
                    </label>
                    <input
                      type="date"
                      value={formData.valid_from}
                      onChange={e => setFormData({ ...formData, valid_from: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all"
                      required
                    />
                  </div>

                  {/* Valid Until */}
                  <div>
                    <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                      Valid Until
                    </label>
                    <input
                      type="date"
                      value={formData.valid_until}
                      onChange={e => setFormData({ ...formData, valid_until: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all"
                    />
                  </div>

                  {/* Is Active */}
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-5 h-5 rounded border-coffee-300 dark:border-dark-600 text-coffee-600 focus:ring-coffee-500"
                      />
                      <span className="text-sm font-medium text-coffee-700 dark:text-cream-300">
                        Active (available for use)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-coffee-200/50 dark:border-dark-700">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-coffee-50 dark:bg-dark-700 text-coffee-700 dark:text-cream-300 hover:bg-coffee-100 dark:hover:bg-dark-600 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-coffee text-cream-100 font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all"
                  >
                    {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
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
