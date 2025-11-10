'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  ShoppingCart,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  Users,
  TrendingUp,
  Package,
} from 'lucide-react'

interface Order {
  order_id: string
  order_number: string
  tenant_id: string
  location_id: string
  user_id: string
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  order_type: string
  payment_status: string
  subtotal: number
  tax_amount: number
  total_amount: number
  notes: string | null
  created_at: string
  users?: {
    full_name: string
    phone: string
    email: string
  }
  locations?: {
    name: string
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select(
          `
          *,
          users (full_name, phone, email),
          locations (name)
        `
        )
        .order('created_at', { ascending: false })

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
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('order_id', orderId)

      if (error) throw error
      fetchOrders()
    } catch (error) {
      console.error('Error updating order status:', error)
      alert('Failed to update order status')
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.users?.phone?.includes(searchQuery)

    const matchesStatus = filterStatus === 'all' || order.status === filterStatus

    const matchesType = filterType === 'all' || order.order_type === filterType

    return matchesSearch && matchesStatus && matchesType
  })

  const getOrdersByStatus = (status: Order['status']) => {
    return filteredOrders.filter(order => order.status === status)
  }

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    active: orders.filter(o => ['confirmed', 'preparing', 'ready'].includes(o.status)).length,
    completed: orders.filter(o => o.status === 'completed').length,
    revenue: orders
      .filter(o => o.status === 'completed')
      .reduce((acc, o) => acc + o.total_amount, 0)
      .toFixed(2),
  }

  const getStatusColor = (status: Order['status']) => {
    const colors = {
      pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
      confirmed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      preparing: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
      ready: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      completed: 'bg-gray-100 dark:bg-gray-700/30 text-gray-700 dark:text-gray-400',
      cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    }
    return colors[status] || colors.pending
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const statusColumns: Array<{
    status: Order['status']
    title: string
    icon: React.ReactNode
  }> = [
    { status: 'pending', title: 'Pending', icon: <Clock className="w-5 h-5" /> },
    { status: 'confirmed', title: 'Confirmed', icon: <CheckCircle2 className="w-5 h-5" /> },
    { status: 'preparing', title: 'Preparing', icon: <Package className="w-5 h-5" /> },
    { status: 'ready', title: 'Ready', icon: <ShoppingCart className="w-5 h-5" /> },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-coffee-700 to-mocha bg-clip-text text-transparent">
          Orders Management
        </h1>
        <p className="text-coffee-600 dark:text-cream-400 mt-1 lg:mt-2 text-sm lg:text-lg">
          Track and manage all orders in real-time
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4 mb-6 lg:mb-8">
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-5 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                Total
              </p>
              <p className="text-xl lg:text-2xl font-bold text-coffee-900 dark:text-cream-100 mt-1">
                {stats.total}
              </p>
            </div>
            <ShoppingCart className="w-6 h-6 lg:w-7 lg:h-7 text-coffee-600 dark:text-cream-300" />
          </div>
        </div>

        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-5 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                Pending
              </p>
              <p className="text-xl lg:text-2xl font-bold text-coffee-900 dark:text-cream-100 mt-1">
                {stats.pending}
              </p>
            </div>
            <Clock className="w-6 h-6 lg:w-7 lg:h-7 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-5 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                Active
              </p>
              <p className="text-xl lg:text-2xl font-bold text-coffee-900 dark:text-cream-100 mt-1">
                {stats.active}
              </p>
            </div>
            <Package className="w-6 h-6 lg:w-7 lg:h-7 text-blue-600" />
          </div>
        </div>

        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-5 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                Completed
              </p>
              <p className="text-xl lg:text-2xl font-bold text-coffee-900 dark:text-cream-100 mt-1">
                {stats.completed}
              </p>
            </div>
            <CheckCircle2 className="w-6 h-6 lg:w-7 lg:h-7 text-green-600" />
          </div>
        </div>

        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-5 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                Revenue
              </p>
              <p className="text-xl lg:text-2xl font-bold text-coffee-900 dark:text-cream-100 mt-1">
                €{stats.revenue}
              </p>
            </div>
            <DollarSign className="w-6 h-6 lg:w-7 lg:h-7 text-green-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700 mb-6 lg:mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-coffee-400 dark:text-cream-500" />
            <input
              type="text"
              placeholder="Search by order number, customer name, or phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 placeholder:text-coffee-400 dark:placeholder:text-cream-500 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-coffee-600 dark:text-cream-300" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600"
          >
            <option value="all">All Types</option>
            <option value="dine_in">Dine In</option>
            <option value="takeaway">Takeaway</option>
            <option value="delivery">Delivery</option>
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-12 shadow-lg border border-coffee-200/50 dark:border-dark-700 text-center">
          <div className="inline-block w-8 h-8 border-4 border-coffee-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-coffee-600 dark:text-cream-400 mt-4">Loading orders...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {statusColumns.map(column => {
            const columnOrders = getOrdersByStatus(column.status)
            return (
              <div key={column.status}>
                {/* Column Header */}
                <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-t-2xl p-4 border border-coffee-200/50 dark:border-dark-700 border-b-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-coffee-600 dark:text-cream-300">{column.icon}</div>
                      <h3 className="font-bold text-coffee-900 dark:text-cream-100">
                        {column.title}
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-coffee-100 dark:bg-dark-700 text-coffee-700 dark:text-cream-300">
                      {columnOrders.length}
                    </span>
                  </div>
                </div>

                {/* Column Content */}
                <div className="bg-coffee-50/50 dark:bg-dark-900/50 rounded-b-2xl border border-coffee-200/50 dark:border-dark-700 border-t-0 p-3 min-h-[400px] max-h-[600px] overflow-y-auto space-y-3">
                  {columnOrders.length === 0 ? (
                    <div className="text-center py-12 text-coffee-400 dark:text-cream-600 text-sm">
                      No {column.title.toLowerCase()} orders
                    </div>
                  ) : (
                    columnOrders.map(order => (
                      <div
                        key={order.order_id}
                        className="bg-white dark:bg-dark-800 rounded-xl p-4 shadow-md border border-coffee-200/50 dark:border-dark-700 hover:shadow-lg transition-all"
                      >
                        {/* Order Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-bold text-coffee-900 dark:text-cream-100">
                              #{order.order_number}
                            </p>
                            <p className="text-xs text-coffee-500 dark:text-cream-500 mt-0.5">
                              {formatDate(order.created_at)}
                            </p>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}
                          >
                            {order.status}
                          </span>
                        </div>

                        {/* Customer Info */}
                        <div className="space-y-1 mb-3 text-sm">
                          <div className="flex items-center gap-2 text-coffee-700 dark:text-cream-300">
                            <Users className="w-4 h-4" />
                            <span className="font-medium">{order.users?.full_name || 'Guest'}</span>
                          </div>
                          {order.users?.phone && (
                            <p className="text-xs text-coffee-600 dark:text-cream-400 ml-6">
                              {order.users.phone}
                            </p>
                          )}
                          {order.locations?.name && (
                            <p className="text-xs text-coffee-600 dark:text-cream-400 ml-6">
                              {order.locations.name}
                            </p>
                          )}
                        </div>

                        {/* Order Total */}
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-coffee-100 dark:border-dark-700">
                          <span className="text-sm text-coffee-600 dark:text-cream-400">Total</span>
                          <span className="text-lg font-bold text-coffee-900 dark:text-cream-100 font-mono">
                            €{order.total_amount.toFixed(2)}
                          </span>
                        </div>

                        {/* Status Actions */}
                        <div className="grid grid-cols-2 gap-2">
                          {order.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateOrderStatus(order.order_id, 'confirmed')}
                                className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-semibold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => updateOrderStatus(order.order_id, 'cancelled')}
                                className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-xs font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {order.status === 'confirmed' && (
                            <button
                              onClick={() => updateOrderStatus(order.order_id, 'preparing')}
                              className="col-span-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg text-xs font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-all"
                            >
                              Start Preparing
                            </button>
                          )}
                          {order.status === 'preparing' && (
                            <button
                              onClick={() => updateOrderStatus(order.order_id, 'ready')}
                              className="col-span-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-semibold hover:bg-green-200 dark:hover:bg-green-900/50 transition-all"
                            >
                              Mark as Ready
                            </button>
                          )}
                          {order.status === 'ready' && (
                            <button
                              onClick={() => updateOrderStatus(order.order_id, 'completed')}
                              className="col-span-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700/30 text-gray-700 dark:text-gray-400 rounded-lg text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-all"
                            >
                              Complete Order
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Completed/Cancelled Orders Section */}
      {(filteredOrders.filter(o => o.status === 'completed').length > 0 ||
        filteredOrders.filter(o => o.status === 'cancelled').length > 0) && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Completed Orders */}
          {filteredOrders.filter(o => o.status === 'completed').length > 0 && (
            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
              <h3 className="font-bold text-lg text-coffee-900 dark:text-cream-100 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Recently Completed ({filteredOrders.filter(o => o.status === 'completed').length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredOrders
                  .filter(o => o.status === 'completed')
                  .slice(0, 10)
                  .map(order => (
                    <div
                      key={order.order_id}
                      className="flex items-center justify-between p-3 rounded-lg bg-coffee-50 dark:bg-dark-900"
                    >
                      <div>
                        <p className="font-semibold text-sm text-coffee-900 dark:text-cream-100">
                          #{order.order_number}
                        </p>
                        <p className="text-xs text-coffee-600 dark:text-cream-400">
                          {order.users?.full_name || 'Guest'} • {formatDate(order.created_at)}
                        </p>
                      </div>
                      <span className="font-bold text-coffee-900 dark:text-cream-100 font-mono">
                        €{order.total_amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Cancelled Orders */}
          {filteredOrders.filter(o => o.status === 'cancelled').length > 0 && (
            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
              <h3 className="font-bold text-lg text-coffee-900 dark:text-cream-100 mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Cancelled Orders ({filteredOrders.filter(o => o.status === 'cancelled').length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredOrders
                  .filter(o => o.status === 'cancelled')
                  .slice(0, 10)
                  .map(order => (
                    <div
                      key={order.order_id}
                      className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20"
                    >
                      <div>
                        <p className="font-semibold text-sm text-coffee-900 dark:text-cream-100">
                          #{order.order_number}
                        </p>
                        <p className="text-xs text-coffee-600 dark:text-cream-400">
                          {order.users?.full_name || 'Guest'} • {formatDate(order.created_at)}
                        </p>
                      </div>
                      <span className="font-bold text-red-600 dark:text-red-400 font-mono">
                        €{order.total_amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
