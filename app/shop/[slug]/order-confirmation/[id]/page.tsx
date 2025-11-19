'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle,
  Coffee,
  MapPin,
  Clock,
  Gift,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShoppingBag,
} from 'lucide-react'
import { getOrder, type OrderWithRelations } from '@/lib/create-order'
import { getTenantBySlug } from '@/lib/get-tenant'
import { useAuth } from '@/contexts/AuthContext'

interface Location {
  location_id: string
  name: string
  address: string
  city: string
  state: string
  zip_code: string
}

export default function OrderConfirmationPage({
  params,
}: {
  params: { slug: string; id: string }
}) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [order, setOrder] = useState<OrderWithRelations | null>(null)
  const [location, setLocation] = useState<Location | null>(null)
  const [currency, setCurrency] = useState('EUR')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/shop/${params.slug}/login`)
    }
  }, [user, authLoading, params.slug, router])

  useEffect(() => {
    if (user) {
      fetchOrderDetails()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, params.id])

  async function fetchOrderDetails() {
    try {
      setLoading(true)

      // Fetch tenant info for currency
      const tenant = await getTenantBySlug(params.slug)
      if (tenant) {
        setCurrency(tenant.currency || 'EUR')
      }

      // Fetch order
      const { order: orderData, error: orderError } = await getOrder(params.id)

      if (orderError || !orderData) {
        setError(orderError?.message || 'Order not found')
        setLoading(false)
        return
      }

      // Verify order belongs to current user
      if (orderData.user_id !== user?.id) {
        setError('You do not have permission to view this order')
        setLoading(false)
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
      setError('Failed to load order details')
    } finally {
      setLoading(false)
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

  const getStatusColor = (status: string) => {
    if (status === 'pending')
      return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
    if (status === 'confirmed')
      return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
    if (status === 'preparing')
      return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
    if (status === 'ready')
      return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
    if (status === 'completed')
      return 'text-coffee-600 dark:text-coffee-400 bg-coffee-50 dark:bg-coffee-900/20'
    if (status === 'cancelled') return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
    return 'text-coffee-600 dark:text-coffee-400 bg-coffee-50 dark:bg-coffee-900/20'
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
            href={`/shop/${params.slug}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-coffee-700 hover:bg-coffee-800 text-white rounded-lg font-bold transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto pb-8">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full mb-4 animate-bounce">
          <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-coffee-900 dark:text-white mb-2">
          Order Confirmed!
        </h1>
        <p className="text-lg text-coffee-600 dark:text-coffee-300">
          Thank you for your order. We'll have it ready for you soon!
        </p>
      </div>

      {/* Order Number & Status */}
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg rounded-xl shadow-md border border-coffee-200/50 dark:border-dark-700 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm text-coffee-600 dark:text-coffee-400 mb-1">Order Number</p>
            <p className="text-2xl font-bold text-coffee-900 dark:text-white">
              {order.order_number}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-4 py-2 rounded-full font-semibold text-sm ${getStatusColor(order.status)}`}
            >
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Points Earned */}
      {order.points_earned > 0 && (
        <div className="bg-gradient-to-r from-coffee-700 to-coffee-800 rounded-xl shadow-md p-6 mb-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <Gift className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm opacity-90">You earned</p>
              <p className="text-2xl font-bold">{order.points_earned} points</p>
              <p className="text-sm opacity-75">Keep ordering to unlock rewards!</p>
            </div>
          </div>
        </div>
      )}

      {/* Order Details */}
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg rounded-xl shadow-md border border-coffee-200/50 dark:border-dark-700 p-6 mb-6">
        <h2 className="text-xl font-bold text-coffee-900 dark:text-white mb-4">Order Details</h2>

        <div className="space-y-4">
          {/* Order Type */}
          <div className="flex items-start gap-3">
            <Coffee className="w-5 h-5 text-coffee-600 dark:text-coffee-400 mt-0.5" />
            <div>
              <p className="text-sm text-coffee-600 dark:text-coffee-400">Order Type</p>
              <p className="font-medium text-coffee-900 dark:text-white">
                {getOrderTypeLabel(order.order_type)}
              </p>
            </div>
          </div>

          {/* Location */}
          {location && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-coffee-600 dark:text-coffee-400 mt-0.5" />
              <div>
                <p className="text-sm text-coffee-600 dark:text-coffee-400">Location</p>
                <p className="font-medium text-coffee-900 dark:text-white">{location.name}</p>
                <p className="text-sm text-coffee-600 dark:text-coffee-300">
                  {location.address}, {location.city}, {location.state} {location.zip_code}
                </p>
              </div>
            </div>
          )}

          {/* Order Time */}
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-coffee-600 dark:text-coffee-400 mt-0.5" />
            <div>
              <p className="text-sm text-coffee-600 dark:text-coffee-400">Order Time</p>
              <p className="font-medium text-coffee-900 dark:text-white">
                {new Date(order.created_at).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </div>
          </div>

          {/* Special Instructions */}
          {order.special_instructions && (
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-coffee-600 dark:text-coffee-400 mt-0.5" />
              <div>
                <p className="text-sm text-coffee-600 dark:text-coffee-400">Special Instructions</p>
                <p className="font-medium text-coffee-900 dark:text-white">
                  {order.special_instructions}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg rounded-xl shadow-md border border-coffee-200/50 dark:border-dark-700 p-6 mb-6">
        <h2 className="text-xl font-bold text-coffee-900 dark:text-white mb-4">Your Items</h2>
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

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href={`/shop/${params.slug}/orders`}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-coffee-700 hover:bg-coffee-800 text-white rounded-lg font-bold text-lg transition-colors shadow-lg"
        >
          <ShoppingBag size={20} />
          View My Orders
        </Link>
        <Link
          href={`/shop/${params.slug}`}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-white dark:bg-dark-800 border-2 border-coffee-700 dark:border-coffee-600 text-coffee-700 dark:text-coffee-300 rounded-lg font-bold text-lg hover:bg-coffee-50 dark:hover:bg-dark-700 transition-colors"
        >
          Return to Home
          <ArrowRight size={20} />
        </Link>
      </div>
    </div>
  )
}
