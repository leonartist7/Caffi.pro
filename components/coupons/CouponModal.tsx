import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { X } from 'lucide-react'
import { toast } from 'sonner'

interface CouponFormData {
  code: string
  discount_type: 'percentage' | 'fixed_amount' | 'free_item'
  discount_value: number
  min_order_amount: number
  max_uses: number | null
  valid_from: string
  valid_until: string
  is_active: boolean
}

interface Coupon extends CouponFormData {
  coupon_id: string
  current_uses: number
}

interface CouponModalProps {
  isOpen: boolean
  onClose: () => void
  coupon?: Coupon
}

export function CouponModal({ isOpen, onClose, coupon }: CouponModalProps) {
  // Anon client + RLS: writes are authorized by the caller's session, never service role
  const supabase = createClient()
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CouponFormData>({
    defaultValues: {
      code: '',
      discount_type: 'percentage',
      discount_value: 0,
      min_order_amount: 0,
      max_uses: null,
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
      is_active: true,
    },
  })

  const discountType = watch('discount_type')

  useEffect(() => {
    if (coupon) {
      reset({
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        min_order_amount: coupon.min_order_amount,
        max_uses: coupon.max_uses,
        valid_from: coupon.valid_from
          ? new Date(coupon.valid_from).toISOString().split('T')[0]
          : '',
        valid_until: coupon.valid_until
          ? new Date(coupon.valid_until).toISOString().split('T')[0]
          : '',
        is_active: coupon.is_active,
      })
    } else {
      reset()
    }
  }, [coupon, reset])

  const mutation = useMutation({
    mutationFn: async (data: CouponFormData) => {
      const payload = {
        code: data.code.toUpperCase(),
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        min_order_amount: data.min_order_amount,
        max_uses: data.max_uses || null,
        valid_from: new Date(data.valid_from).toISOString(),
        valid_until: data.valid_until ? new Date(data.valid_until).toISOString() : null,
        is_active: data.is_active,
        tenant_id: 'YOUR_TENANT_ID', // This should come from auth context
        current_uses: coupon?.current_uses || 0,
      }

      if (coupon) {
        const { error } = await supabase
          .from('coupons')
          .update(payload)
          .eq('coupon_id', coupon.coupon_id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('coupons').insert(payload)

        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      toast.success(coupon ? 'Coupon updated successfully' : 'Coupon created successfully')
      onClose()
      reset()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save coupon')
    },
  })

  const onSubmit = (data: CouponFormData) => {
    mutation.mutate(data)
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    reset(formValues => ({ ...formValues, code }))
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
              {coupon ? 'Edit Coupon' : 'Create Coupon'}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Coupon Code */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coupon Code *
                </label>
                <div className="flex gap-2">
                  <input
                    {...register('code', {
                      required: 'Code is required',
                      pattern: {
                        value: /^[A-Z0-9]+$/,
                        message: 'Only uppercase letters and numbers allowed',
                      },
                    })}
                    className="input flex-1 font-mono"
                    placeholder="SUMMER2024"
                    style={{ textTransform: 'uppercase' }}
                  />
                  <button type="button" onClick={generateCode} className="btn btn-secondary">
                    Generate
                  </button>
                </div>
                {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>}
              </div>

              {/* Discount Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Type *
                </label>
                <select
                  {...register('discount_type', { required: 'Discount type is required' })}
                  className="input"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed_amount">Fixed Amount (€)</option>
                  <option value="free_item">Free Item</option>
                </select>
              </div>

              {/* Discount Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Value *
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('discount_value', {
                    required: 'Value is required',
                    min: { value: 0, message: 'Value must be positive' },
                  })}
                  className="input"
                  placeholder={discountType === 'percentage' ? '10' : '5.00'}
                />
                {errors.discount_value && (
                  <p className="mt-1 text-sm text-red-600">{errors.discount_value.message}</p>
                )}
              </div>

              {/* Minimum Order Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Order Amount (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('min_order_amount')}
                  className="input"
                  placeholder="0.00"
                />
              </div>

              {/* Max Uses */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Uses</label>
                <input
                  type="number"
                  {...register('max_uses')}
                  className="input"
                  placeholder="Leave empty for unlimited"
                />
              </div>

              {/* Valid From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valid From *</label>
                <input
                  type="date"
                  {...register('valid_from', { required: 'Start date is required' })}
                  className="input"
                />
                {errors.valid_from && (
                  <p className="mt-1 text-sm text-red-600">{errors.valid_from.message}</p>
                )}
              </div>

              {/* Valid Until */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valid Until</label>
                <input type="date" {...register('valid_until')} className="input" />
                <p className="mt-1 text-xs text-gray-500">Leave empty for no expiry</p>
              </div>

              {/* Is Active */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register('is_active')}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Active (available for use)
                  </span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
                {mutation.isPending ? 'Saving...' : coupon ? 'Update Coupon' : 'Create Coupon'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
