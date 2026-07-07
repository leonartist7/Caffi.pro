'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  Package,
  Coffee,
  MapPin,
  Gift,
  Loader2,
  AlertCircle,
  XCircle,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getOrder, type OrderWithRelations } from '@/lib/create-order'
import { getTenantBySlug } from '@/lib/get-tenant'

interface Location {
  location_id: string
  name: string
  address: string
  city: string
  state: string
  zip_code: string
  phone: string
}

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'preparing', label: 'Preparing', icon: Coffee },
  { key: 'ready', label: 'Ready', icon: Package },
  { key: 'completed', label: 'Completed', icon: CheckCircle },
]

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user, loading: authLoading } = useAuth()
  const [order, setOrder] = useState<OrderWithRelations | null>(null)
  const [location, setLocation] = useState<Location | null>(null)
  const [currency, setCurrency] = useState('EUR')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [, setAutoRefresh] = useState(true)

  const tenantSlug = params.slug as string
  const orderId = params.orderId as string

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/shop/${tenantSlug}/login`)
    }
  }, [user, authLoading, tenantSlug, router])

  useEffect(() => {
    if (user) {
      fetchOrderDetails()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- legacy effect; refit to TanStack Query in Phase 3
  }, [user, orderId])

  // Real-time subscription for order updates
  useEffect(() => {
    if (!order || !user) return

    // Stop if order is already completed/cancelled
    if (order.status === 'completed' || order.status === 'cancelled') {
      setAutoRefresh(false)
      return
    }

    let channel: ReturnType<
      ReturnType<typeof import('@/utils/supabase/client').createClient>['channel']
    > | null = null

    async function setupRealtime() {
      const { createClient } = await import('@/utils/supabase/client')
      const supabase = createClient()

      // Subscribe to changes on this specific order
      channel = supabase
        .channel(`order-${orderId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `order_id=eq.${orderId}`,
          },
          payload => {
            // Update order with new data
            setOrder(prev => {
              if (!prev) return null
              return {
                ...prev,
                status: payload.new.status,
                updated_at: payload.new.updated_at,
              } as OrderWithRelations
            })

            // Stop auto-refresh if order is completed/cancelled
            if (payload.new.status === 'completed' || payload.new.status === 'cancelled') {
              setAutoRefresh(false)
            }
          }
        )
        .subscribe()
    }

    setupRealtime()

    return () => {
      if (channel) {
        import('@/utils/supabase/client').then(({ createClient }) => {
          const supabase = createClient()
          supabase.removeChannel(channel!)
        })
      }
    }
  }, [order, orderId, user])

  async function fetchOrderDetails(silent = false) {
    try {
      if (!silent) setLoading(true)

      // Fetch tenant for currency
      const tenant = await getTenantBySlug(tenantSlug)
      if (tenant) {
        setCurrency(tenant.currency || 'EUR')
      }

      // Fetch order
      const { order: orderData, error: orderError } = await getOrder(orderId)

      if (orderError || !orderData) {
        setError(orderError?.message || 'Order not found')
        if (!silent) setLoading(false)
        return
      }

      // Verify order belongs to current user
      if (orderData.user_id !== user?.id) {
        setError('You do not have permission to view this order')
        if (!silent) setLoading(false)
        return
      }

      setOrder(orderData)

      // Fetch location details
      const { createClient } = await import('@/utils/supabase/client')
      const supabase = createClient()
      const { data: locationData } = await supabase
        .from('locations')
        .select('*')
        .eq('location_id', orderData.location_id)
        .single()

      if (locationData) {
        setLocation(locationData)
      }
    } catch (err) {
      console.error('Error fetching order:', err)
      if (!silent) setError('Failed to load order details')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    if (currency === 'EUR') return `€${price.toFixed(2)}`
    if (currency === 'USD') return `$${price.toFixed(2)}`
    return `${price.toFixed(2)} ${currency}`
  }

  const getOrderTypeLabel = (type: string) => {
    if (type === 'pickup') return 'Pickup'
    if (type === 'dine_in') return 'Dine In'
    if (type === 'delivery') return 'Delivery'
    return type
  }

  const getStatusIndex = (status: string) => {
    return STATUS_STEPS.findIndex(step => step.key === status)
  }

  const isStatusActive = (stepKey: string) => {
    if (!order) return false
    if (order.status === 'cancelled') return false
    const currentIndex = getStatusIndex(order.status)
    const stepIndex = getStatusIndex(stepKey)
    return stepIndex <= currentIndex
  }

  const isStatusCurrent = (stepKey: string) => {
    return order?.status === stepKey
  }

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-coffee-600 animate-spin mb-4" />
        <p className="text-coffee-600 dark:text-coffee-300">Loading order details...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg rounded-xl shadow-md border border-coffee-200/50 dark:border-dark-700 p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-600 dark:text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-coffee-900 dark:text-white mb-2">
            {error || 'Order Not Found'}
          </h1>
          <p className="text-coffee-600 dark:text-coffee-300 mb-6">
            We couldn't find the order you're looking for.
          </p>
          <Link
            href={`/shop/${tenantSlug}/orders`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-coffee-700 hover:bg-coffee-800 text-white rounded-lg font-bold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-8">
      {/* Back Button */}
      <Link
        href={`/shop/${tenantSlug}/orders`}
        className="inline-flex items-center gap-2 text-coffee-600 dark:text-coffee-400 hover:text-coffee-700 dark:hover:text-coffee-300 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </Link>

      {/* Order Header */}
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg rounded-xl shadow-md border border-coffee-200/50 dark:border-dark-700 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-coffee-900 dark:text-white mb-2">
              {order.order_number}
            </h1>
            <p className="text-coffee-600 dark:text-coffee-400">
              Placed on{' '}
              {new Date(order.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-coffee-600 dark:text-coffee-400 mb-1">Order Type</p>
            <p className="text-lg font-semibold text-coffee-900 dark:text-white">
              {getOrderTypeLabel(order.order_type)}
            </p>
          </div>
        </div>

        {/* Status Timeline */}
        {order.status !== 'cancelled' ? (
          <div className="relative">
            <div className="flex justify-between items-center">
              {STATUS_STEPS.map((step, index) => {
                const Icon = step.icon
                const isActive = isStatusActive(step.key)
                const isCurrent = isStatusCurrent(step.key)

                return (
                  <div key={step.key} className="flex-1 relative">
                    {/* Connector Line */}
                    {index < STATUS_STEPS.length - 1 && (
                      <div
                        className={`absolute top-6 left-1/2 right-0 h-0.5 -translate-y-1/2 ${
                          isActive
                            ? 'bg-coffee-600 dark:bg-coffee-400'
                            : 'bg-coffee-200 dark:bg-dark-600'
                        }`}
                        style={{ width: 'calc(100% - 3rem)', marginLeft: '1.5rem' }}
                      />
                    )}

                    {/* Status Icon */}
                    <div className="flex flex-col items-center relative z-10">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                          isCurrent
                            ? 'bg-coffee-700 text-white scale-110 shadow-lg'
                            : isActive
                              ? 'bg-coffee-600 text-white'
                              : 'bg-coffee-100 dark:bg-dark-700 text-coffee-400 dark:text-dark-500'
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <p
                        className={`text-xs md:text-sm font-medium text-center ${
                          isActive
                            ? 'text-coffee-900 dark:text-white'
                            : 'text-coffee-500 dark:text-coffee-500'
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            <p className="text-lg font-semibold text-red-900 dark:text-red-100">Order Cancelled</p>
          </div>
        )}
      </div>

      {/* Location Info */}
      {location && (
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg rounded-xl shadow-md border border-coffee-200/50 dark:border-dark-700 p-6 mb-6">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-coffee-600 dark:text-coffee-400 mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-coffee-900 dark:text-white mb-1">
                {location.name}
              </h2>
              <p className="text-sm text-coffee-600 dark:text-coffee-300">
                {location.address}
                <br />
                {location.city}, {location.state} {location.zip_code}
              </p>
              {location.phone && (
                <p className="text-sm text-coffee-600 dark:text-coffee-300 mt-1">
                  {location.phone}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Special Instructions */}
      {order.special_instructions && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 mb-6 border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
            Special Instructions:
          </p>
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {order.special_instructions}
          </p>
        </div>
      )}

      {/* Order Items */}
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg rounded-xl shadow-md border border-coffee-200/50 dark:border-dark-700 p-6 mb-6">
        <h2 className="text-xl font-bold text-coffee-900 dark:text-white mb-4">Order Items</h2>
        <div className="space-y-4">
          {order.order_items.map(item => (
            <div key={item.order_item_id} className="flex justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-coffee-900 dark:text-white">
                    {item.quantity}x
                  </span>
                  <span className="font-medium text-coffee-900 dark:text-white">
                    {item.item_name}
                  </span>
                </div>
                {(item.modifiers?.size || (item.modifiers?.addons?.length ?? 0) > 0) && (
                  <div className="text-sm text-coffee-600 dark:text-coffee-400 mt-1">
                    {item.modifiers?.size && <span>{item.modifiers.size.name}</span>}
                    {(item.modifiers?.addons?.length ?? 0) > 0 && (
                      <span>
                        {item.modifiers?.size && ' • '}
                        Add: {item.modifiers?.addons?.map(a => a.name).join(', ')}
                      </span>
                    )}
                  </div>
                )}
                {item.special_instructions && (
                  <div className="text-xs text-coffee-500 dark:text-coffee-400 italic mt-1">
                    Note: {item.special_instructions}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="font-medium text-coffee-900 dark:text-white">
                  {formatPrice(item.total_price)}
                </div>
                <div className="text-sm text-coffee-600 dark:text-coffee-400">
                  {formatPrice(item.unit_price)} each
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Price Breakdown */}
        <div className="border-t border-coffee-200 dark:border-dark-700 mt-6 pt-4 space-y-2">
          <div className="flex justify-between text-coffee-700 dark:text-coffee-300">
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-coffee-700 dark:text-coffee-300">
            <span>Tax</span>
            <span>{formatPrice(order.tax)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>Discount {order.coupon_code_used && `(${order.coupon_code_used})`}</span>
              <span>-{formatPrice(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold text-coffee-900 dark:text-white pt-2 border-t border-coffee-200 dark:border-dark-700">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Points Earned */}
      {order.points_earned > 0 && (
        <div className="bg-gradient-to-r from-coffee-700 to-coffee-800 rounded-xl shadow-md p-6 text-white">
          <div className="flex items-center gap-3">
            <Gift className="w-8 h-8 flex-shrink-0" />
            <div>
              <p className="text-sm opacity-90">Points Earned</p>
              <p className="text-2xl font-bold">{order.points_earned} points</p>
              <p className="text-sm opacity-75">Keep ordering to unlock rewards!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
