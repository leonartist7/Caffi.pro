import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Plus, Edit, Trash2, Percent, DollarSign, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { CouponModal } from '@/components/coupons/CouponModal'

export function CouponManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<any>(null)
  const queryClient = useQueryClient()

  // Fetch coupons
  const { data: coupons, isLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (couponId: string) => {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('coupon_id', couponId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      toast.success('Coupon deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete coupon')
    },
  })

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ couponId, isActive }: { couponId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active: !isActive })
        .eq('coupon_id', couponId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      toast.success('Coupon status updated')
    },
    onError: () => {
      toast.error('Failed to update coupon')
    },
  })

  const handleEdit = (coupon: any) => {
    setEditingCoupon(coupon)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setEditingCoupon(null)
    setIsModalOpen(true)
  }

  const getDiscountDisplay = (coupon: any) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}% off`
    } else if (coupon.discount_type === 'fixed_amount') {
      return `€${coupon.discount_value} off`
    } else {
      return 'Free item'
    }
  }

  const isExpired = (coupon: any) => {
    if (!coupon.valid_until) return false
    return new Date(coupon.valid_until) < new Date()
  }

  const isMaxedOut = (coupon: any) => {
    if (!coupon.max_uses) return false
    return coupon.current_uses >= coupon.max_uses
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Coupon Management</h1>
          <p className="mt-2 text-gray-600">
            Create and manage discount coupons for your customers
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Coupon
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Total Coupons</div>
          <div className="text-2xl font-bold text-gray-900">
            {coupons?.length || 0}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Active</div>
          <div className="text-2xl font-bold text-green-600">
            {coupons?.filter(c => c.is_active && !isExpired(c) && !isMaxedOut(c)).length || 0}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Expired</div>
          <div className="text-2xl font-bold text-gray-400">
            {coupons?.filter(c => isExpired(c)).length || 0}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Total Uses</div>
          <div className="text-2xl font-bold text-primary-600">
            {coupons?.reduce((sum, c) => sum + (c.current_uses || 0), 0) || 0}
          </div>
        </div>
      </div>

      {/* Coupons List */}
      <div className="card">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading coupons...</p>
          </div>
        ) : coupons && coupons.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Code</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Discount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Min Order</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Usage</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Valid Until</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {coupons.map((coupon) => (
                  <tr key={coupon.coupon_id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {coupon.discount_type === 'percentage' ? (
                          <Percent className="w-4 h-4 text-primary-600" />
                        ) : (
                          <DollarSign className="w-4 h-4 text-green-600" />
                        )}
                        <span className="font-mono font-semibold text-gray-900">
                          {coupon.code}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {getDiscountDisplay(coupon)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {coupon.min_order_amount > 0 ? `€${coupon.min_order_amount}` : 'None'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">
                          {coupon.current_uses}
                        </span>
                        {coupon.max_uses && (
                          <span className="text-gray-600"> / {coupon.max_uses}</span>
                        )}
                        {!coupon.max_uses && (
                          <span className="text-gray-600"> / ∞</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {coupon.valid_until ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(coupon.valid_until), 'MMM dd, yyyy')}
                        </div>
                      ) : (
                        'No expiry'
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {isExpired(coupon) ? (
                        <span className="badge badge-danger">Expired</span>
                      ) : isMaxedOut(coupon) ? (
                        <span className="badge badge-warning">Maxed Out</span>
                      ) : coupon.is_active ? (
                        <span className="badge badge-success">Active</span>
                      ) : (
                        <span className="badge bg-gray-100 text-gray-800">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleActiveMutation.mutate({ 
                            couponId: coupon.coupon_id, 
                            isActive: coupon.is_active 
                          })}
                          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          {coupon.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleEdit(coupon)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this coupon?')) {
                              deleteMutation.mutate(coupon.coupon_id)
                            }
                          }}
                          className="p-2 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No coupons yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first coupon to offer discounts to customers
            </p>
            <button onClick={handleAdd} className="btn btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Create Coupon
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      <CouponModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingCoupon(null)
        }}
        coupon={editingCoupon}
      />
    </div>
  )
}

