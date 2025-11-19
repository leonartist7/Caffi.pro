'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Loader2,
  Package,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getUserOrders, type OrderWithRelations } from '@/lib/create-order'
import { getTenantBySlug } from '@/lib/get-tenant'

export default function OrdersPage() {
  const router = useRouter()
  const params = useParams()
  const { user, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState<OrderWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState('EUR')
  const tenantSlug = params.slug as string

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/shop/${tenantSlug}/login`)
    }
  }, [user, authLoading, tenantSlug, router])

  useEffect(() => {
    if (user) {
      fetchOrders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function fetchOrders() {
    try {
      setLoading(true)

      // Fetch tenant for currency
      const tenant = await getTenantBySlug(tenantSlug)
      if (tenant) {
        setCurrency(tenant.currency || 'EUR')
      }

      // Fetch user's orders
      const { orders: ordersData, error } = await getUserOrders(user!.id, tenant?.tenant_id || '')

      if (error) {
        console.error('Error fetching orders:', error)
      } else {
        setOrders(ordersData || [])
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    if (currency === 'EUR') return `€${price.toFixed(2)}`
    if (currency === 'USD') return `$${price.toFixed(2)}`
    return `${price.toFixed(2)} ${currency}`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />
      case 'confirmed':
        return <CheckCircle className="w-5 h-5 text-blue-500" />
      case 'preparing':
        return <Package className="w-5 h-5 text-purple-500" />
      case 'ready':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-coffee-600" />
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
      case 'confirmed':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
      case 'preparing':
        return 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
      case 'ready':
        return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
      case 'completed':
        return 'bg-coffee-50 dark:bg-coffee-900/20 text-coffee-700 dark:text-coffee-400 border-coffee-200 dark:border-coffee-800'
      case 'cancelled':
        return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
      default:
        return 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-800'
    }
  }

  const getOrderTypeLabel = (type: string) => {
    if (type === 'pickup') return 'Pickup'
    if (type === 'dine_in') return 'Dine In'
    if (type === 'delivery') return 'Delivery'
    return type
  }

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-coffee-600 animate-spin mb-4" />
        <p className="text-coffee-600 dark:text-coffee-300">Loading your orders...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-coffee-900 dark:text-white mb-2">My Orders</h1>
        <p className="text-coffee-600 dark:text-coffee-300">
          Track your order history and current orders
        </p>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg rounded-xl shadow-md border border-coffee-200/50 dark:border-dark-700 p-12 text-center">
          <ShoppingBag className="w-16 h-16 text-coffee-300 dark:text-dark-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-coffee-900 dark:text-white mb-2">No orders yet</h2>
          <p className="text-coffee-600 dark:text-coffee-300 mb-6">
            Start browsing our menu and place your first order!
          </p>
          <Link
            href={`/shop/${tenantSlug}/menu`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-coffee-700 hover:bg-coffee-800 text-white rounded-lg font-bold transition-colors"
          >
            Browse Menu
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <Link
              key={order.order_id}
              href={`/shop/${tenantSlug}/orders/${order.order_id}`}
              className="block bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg rounded-xl shadow-md border border-coffee-200/50 dark:border-dark-700 p-6 hover:shadow-lg hover:border-coffee-300 dark:hover:border-dark-600 transition-all group"
            >
              {/* Order Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl font-bold text-coffee-900 dark:text-white">
                      {order.order_number}
                    </span>
                    <ChevronRight className="w-5 h-5 text-coffee-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-sm text-coffee-600 dark:text-coffee-400">
                    {new Date(order.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${getStatusColor(order.status)}`}
                  >
                    {getStatusIcon(order.status)}
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                  <span className="text-sm text-coffee-500 dark:text-coffee-400">
                    {getOrderTypeLabel(order.order_type)}
                  </span>
                </div>
              </div>

              {/* Order Items Summary */}
              <div className="mb-4">
                <p className="text-coffee-700 dark:text-coffee-300">
                  {order.order_items.map((item, idx) => (
                    <span key={idx}>
                      {item.quantity}x {item.item_name}
                      {idx < order.order_items.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </p>
              </div>

              {/* Order Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-coffee-200/50 dark:border-dark-700">
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-coffee-900 dark:text-white">
                    {formatPrice(order.total)}
                  </span>
                  {order.points_earned > 0 && (
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                      +{order.points_earned} points
                    </span>
                  )}
                </div>
                <span className="text-coffee-600 dark:text-coffee-400 text-sm font-medium group-hover:text-coffee-700 dark:group-hover:text-coffee-300">
                  View Details →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Help Section */}
      {orders.length > 0 && (
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Need help with an order?
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Click on any order to view full details and track its status. Contact us if you have
                any questions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
