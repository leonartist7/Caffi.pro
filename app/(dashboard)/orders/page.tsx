'use client'

import { useState, useEffect } from 'react'
import { supabaseAdmin } from '@/lib/supabase'

interface Order {
  order_id: string
  order_number: string
  tenant_id: string
  user_id: string
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  total_amount: number
  created_at: string
  tenants?: {
    business_name: string
    slug: string
  }
  users?: {
    full_name: string
    phone: string
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCafe, setSelectedCafe] = useState<string>('all')
  const [cafes, setCafes] = useState<any[]>([])

  useEffect(() => {
    fetchCafes()
    fetchOrders()
  }, [selectedCafe])

  const fetchCafes = async () => {
    try {
      if (!supabaseAdmin) return

      const { data, error } = await supabaseAdmin
        .from('tenants')
        .select('tenant_id, business_name, slug')
        .order('business_name')

      if (error) throw error
      setCafes(data || [])
    } catch (error) {
      console.error('Error fetching cafes:', error)
    }
  }

  const fetchOrders = async () => {
    try {
      if (!supabaseAdmin) return

      let query = supabaseAdmin
        .from('orders')
        .select(`
          *,
          tenants (business_name, slug),
          users (full_name, phone)
        `)
        .order('created_at', { ascending: false })

      if (selectedCafe !== 'all') {
        query = query.eq('tenant_id', selectedCafe)
      }

      const { data, error } = await query

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      if (!supabaseAdmin) return

      const { error } = await supabaseAdmin
        .from('orders')
        .update({ status: newStatus })
        .eq('order_id', orderId)

      if (error) throw error
      fetchOrders()
    } catch (error) {
      console.error('Error updating order status:', error)
    }
  }

  const getOrdersByStatus = (status: Order['status']) => {
    return orders.filter(order => order.status === status)
  }

  const getStatusColor = (status: Order['status']) => {
    const colors: Record<Order['status'], string> = {
      pending: 'border-yellow-500 bg-yellow-50',
      preparing: 'border-blue-500 bg-blue-50',
      ready: 'border-green-500 bg-green-50',
      completed: 'border-gray-500 bg-gray-50',
      cancelled: 'border-red-500 bg-red-50',
    }
    return colors[status] || 'border-gray-300 bg-white'
  }

  const OrderCard = ({ order }: { order: Order }) => (
    <div className={`p-4 rounded-xl border-l-4 bg-white shadow-sm mb-3 ${getStatusColor(order.status)}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-mono font-bold text-gray-900">{order.order_number}</p>
          <p className="text-sm font-serif italic text-gray-700">
            {order.tenants?.business_name || 'Unknown Café'}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono font-bold text-gray-900">€{order.total_amount.toFixed(2)}</p>
          <p className="text-xs text-gray-500">
            {new Date(order.created_at).toLocaleTimeString()}
          </p>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-sm text-gray-600">
          Customer: {order.users?.full_name || 'Guest'}
        </p>
        {order.users?.phone && (
          <p className="text-xs text-gray-500">{order.users.phone}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <select
          value={order.status}
          onChange={(e) => updateOrderStatus(order.order_id, e.target.value as Order['status'])}
          className="text-xs px-3 py-1 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
        >
          <option value="pending">Pending</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">📦</div>
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    )
  }

  const columns: Array<{ status: Order['status']; title: string; icon: string }> = [
    { status: 'pending', title: 'Pending', icon: '⏳' },
    { status: 'preparing', title: 'Preparing', icon: '👨‍🍳' },
    { status: 'ready', title: 'Ready', icon: '✅' },
    { status: 'completed', title: 'Completed', icon: '🎉' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600 mt-2">Manage orders across all cafés</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            Filter by Café:
          </label>
          <select
            value={selectedCafe}
            onChange={(e) => setSelectedCafe(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          >
            <option value="all">All Cafés</option>
            {cafes.map((cafe) => (
              <option key={cafe.tenant_id} value={cafe.tenant_id}>
                {cafe.business_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map((column) => {
          const columnOrders = getOrdersByStatus(column.status)
          return (
            <div key={column.status} className="bg-surface-alt rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <span>{column.icon}</span>
                  <span>{column.title}</span>
                </h3>
                <span className="bg-white px-3 py-1 rounded-full text-sm font-bold text-gray-700">
                  {columnOrders.length}
                </span>
              </div>

              <div className="space-y-3">
                {columnOrders.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No orders
                  </div>
                ) : (
                  columnOrders.map((order) => (
                    <OrderCard key={order.order_id} order={order} />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Stats Footer */}
      <div className="mt-8 bg-white rounded-2xl p-6 shadow-md border border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
          <div>
            <p className="text-3xl font-bold text-gray-900">{orders.length}</p>
            <p className="text-sm text-gray-600 mt-1">Total Orders</p>
          </div>
          {columns.map((column) => (
            <div key={column.status}>
              <p className="text-3xl font-bold text-gray-900">
                {getOrdersByStatus(column.status).length}
              </p>
              <p className="text-sm text-gray-600 mt-1">{column.title}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
