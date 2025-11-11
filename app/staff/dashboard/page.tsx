'use client'

import { useEffect, useState, useCallback } from 'react'
import { useStaffAuth } from '@/contexts/StaffAuthContext'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { Clock, MapPin, User, ChevronRight, Bell } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Modifiers {
  size?: { name: string; price: number }
  addons?: Array<{ name: string; price: number }>
}

interface OrderFromDB {
  order_id: string
  order_number: string
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  order_type: string
  created_at: string
  preparation_started_at?: string
  estimated_ready_time?: string
  total: number
  user: Array<{
    full_name: string
    phone?: string
  }>
  location: Array<{
    name: string
  }>
  items: Array<{
    item_snapshot: {
      name: string
      quantity: number
      modifiers?: Modifiers
    }
  }>
  special_instructions?: string
  assigned_to_staff_id?: string
}

interface Order {
  order_id: string
  order_number: string
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  order_type: string
  created_at: string
  preparation_started_at?: string
  estimated_ready_time?: string
  total: number
  user: {
    full_name: string
    phone?: string
  } | null
  location: {
    name: string
  } | null
  items: Array<{
    item_snapshot: {
      name: string
      quantity: number
      modifiers?: Modifiers
    }
  }>
  special_instructions?: string
  assigned_to_staff_id?: string
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  preparing: 'bg-orange-100 text-orange-800 border-orange-300',
  ready: 'bg-green-100 text-green-800 border-green-300',
  completed: 'bg-gray-100 text-gray-800 border-gray-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
}

export default function KitchenDashboardPage() {
  const { staffUser } = useStaffAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<string>('active') // active, completed, all
  const [soundEnabled, setSoundEnabled] = useState(true)
  const supabase = createClient()

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    if (!staffUser) return

    try {
      let query = supabase
        .from('orders')
        .select(
          `
          order_id,
          order_number,
          status,
          order_type,
          created_at,
          preparation_started_at,
          estimated_ready_time,
          total,
          special_instructions,
          assigned_to_staff_id,
          user:user_id (
            full_name,
            phone
          ),
          location:location_id (
            name
          ),
          items:order_items (
            item_snapshot
          )
        `
        )
        .eq('tenant_id', staffUser.tenant_id)
        .order('created_at', { ascending: false })
        .limit(50)

      // Filter by location if staff is assigned to specific location
      if (staffUser.assigned_location_id) {
        query = query.eq('location_id', staffUser.assigned_location_id)
      }

      // Filter by status
      if (selectedStatus === 'active') {
        query = query.in('status', ['pending', 'confirmed', 'preparing', 'ready'])
      } else if (selectedStatus === 'completed') {
        query = query.in('status', ['completed', 'cancelled'])
      }

      const { data, error } = await query

      if (error) throw error

      // Transform the database response to match our Order interface
      const transformedOrders: Order[] = (data || []).map((order: OrderFromDB) => ({
        ...order,
        user: order.user?.[0] || null,
        location: order.location?.[0] || null,
      }))

      setOrders(transformedOrders)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffUser, selectedStatus])

  // Initial fetch
  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Real-time subscription to orders
  useEffect(() => {
    if (!staffUser) return

    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `tenant_id=eq.${staffUser.tenant_id}`,
        },
        payload => {
          // Play sound for new orders
          if (payload.eventType === 'INSERT' && soundEnabled) {
            playNotificationSound()
          }

          // Refresh orders
          fetchOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffUser, soundEnabled, fetchOrders])

  const playNotificationSound = () => {
    // Simple beep sound (you can replace with a better sound file)
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const audioContext = new AudioContextClass()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const updates: {
        status: string
        preparation_started_at?: string
        assigned_to_staff_id?: string
        ready_at?: string
      } = { status: newStatus }

      if (
        newStatus === 'preparing' &&
        !orders.find(o => o.order_id === orderId)?.preparation_started_at
      ) {
        updates.preparation_started_at = new Date().toISOString()
        updates.assigned_to_staff_id = staffUser?.staff_id
      }

      if (newStatus === 'ready') {
        updates.ready_at = new Date().toISOString()
      }

      const { error } = await supabase.from('orders').update(updates).eq('order_id', orderId)

      if (error) throw error

      await fetchOrders()
    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error('Failed to update order status')
    }
  }

  const getNextStatus = (currentStatus: string) => {
    const statusFlow = {
      pending: 'confirmed',
      confirmed: 'preparing',
      preparing: 'ready',
      ready: 'completed',
    }
    return statusFlow[currentStatus as keyof typeof statusFlow]
  }

  const getStatusButtonText = (currentStatus: string) => {
    const statusText = {
      pending: 'Accept Order',
      confirmed: 'Start Preparing',
      preparing: 'Mark Ready',
      ready: 'Complete',
    }
    return statusText[currentStatus as keyof typeof statusText] || 'Update'
  }

  // Group orders by status
  const activeOrders = orders.filter(o =>
    ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
  )
  const completedOrders = orders.filter(o => ['completed', 'cancelled'].includes(o.status))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coffee-700"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kitchen Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage incoming orders in real-time</p>
        </div>

        {/* Sound Toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
            soundEnabled
              ? 'bg-coffee-100 border-coffee-300 text-coffee-700'
              : 'bg-gray-100 border-gray-300 text-gray-700'
          }`}
        >
          <Bell className="w-5 h-5" />
          <span className="font-medium">{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
        </button>
      </div>

      {/* Status Filters */}
      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setSelectedStatus('active')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            selectedStatus === 'active'
              ? 'border-coffee-700 text-coffee-700'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Active Orders ({activeOrders.length})
        </button>
        <button
          onClick={() => setSelectedStatus('completed')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            selectedStatus === 'completed'
              ? 'border-coffee-700 text-coffee-700'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Completed ({completedOrders.length})
        </button>
        <button
          onClick={() => setSelectedStatus('all')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            selectedStatus === 'all'
              ? 'border-coffee-700 text-coffee-700'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          All Orders ({orders.length})
        </button>
      </div>

      {/* Orders Grid */}
      {orders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">No orders to display</p>
          <p className="text-gray-400 text-sm mt-2">New orders will appear here automatically</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map(order => (
            <div
              key={order.order_id}
              className={`bg-white rounded-lg shadow border-2 p-4 hover:shadow-lg transition-shadow ${
                STATUS_COLORS[order.status]
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg">{order.order_number}</h3>
                  <p className="text-xs text-gray-600 capitalize">{order.order_type}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                    STATUS_COLORS[order.status]
                  }`}
                >
                  {order.status}
                </span>
              </div>

              {/* Customer Info */}
              <div className="space-y-2 mb-3 text-sm">
                <div className="flex items-center text-gray-700">
                  <User className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{order.user?.full_name || 'Guest'}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{order.location?.name || 'Unknown'}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>
                    {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-xs font-semibold text-gray-600 mb-2">ITEMS:</p>
                <ul className="space-y-1 text-sm">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="flex justify-between">
                      <span>
                        {item.item_snapshot.quantity}x {item.item_snapshot.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Special Instructions */}
              {order.special_instructions && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3">
                  <p className="text-xs font-semibold text-yellow-800 mb-1">
                    Special Instructions:
                  </p>
                  <p className="text-sm text-yellow-700">{order.special_instructions}</p>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center mb-3 pt-3 border-t border-gray-200">
                <span className="font-semibold text-gray-700">Total:</span>
                <span className="text-lg font-bold text-coffee-700">€{order.total.toFixed(2)}</span>
              </div>

              {/* Action Button */}
              {['pending', 'confirmed', 'preparing', 'ready'].includes(order.status) && (
                <button
                  onClick={() => updateOrderStatus(order.order_id, getNextStatus(order.status))}
                  className="w-full bg-coffee-700 hover:bg-coffee-800 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <span>{getStatusButtonText(order.status)}</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
