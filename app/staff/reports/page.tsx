'use client'

import { useEffect, useState } from 'react'
import { useStaffAuth } from '@/contexts/StaffAuthContext'
import { createClient } from '@/utils/supabase/client'
import { TrendingUp, DollarSign, ShoppingBag, Clock, Calendar, Download } from 'lucide-react'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns'

interface Stats {
  total_orders: number
  completed_orders: number
  total_revenue: number
  avg_order_value: number
  orders_by_status: { [key: string]: number }
  top_items: { name: string; count: number }[]
  hourly_orders: { hour: number; count: number }[]
}

export default function StaffReportsPage() {
  const { staffUser } = useStaffAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today')
  const supabase = createClient()

  // Check permissions
  if (!staffUser?.can_view_reports) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to view reports.</p>
      </div>
    )
  }

  const getDateRangeBounds = () => {
    const now = new Date()
    switch (dateRange) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) }
      case 'week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) }
    }
  }

  const fetchStats = async () => {
    if (!staffUser) return

    try {
      setLoading(true)
      const { start, end } = getDateRangeBounds()

      // Fetch orders within date range
      let query = supabase
        .from('orders')
        .select(
          `
          *,
          items:order_items(item_snapshot)
        `
        )
        .eq('tenant_id', staffUser.tenant_id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())

      if (staffUser.assigned_location_id) {
        query = query.eq('location_id', staffUser.assigned_location_id)
      }

      const { data: orders, error } = await query

      if (error) throw error

      // Calculate stats
      const completedOrders = (orders || []).filter((o: any) => o.status === 'completed')
      const totalRevenue = completedOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0)

      // Orders by status
      const ordersByStatus: { [key: string]: number } = {}
      ;(orders || []).forEach((o: any) => {
        ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1
      })

      // Top items
      const itemCounts: { [key: string]: number } = {}
      completedOrders.forEach((order: any) => {
        ;(order.items || []).forEach((item: any) => {
          const name = item.item_snapshot?.name
          if (name) {
            itemCounts[name] = (itemCounts[name] || 0) + (item.item_snapshot?.quantity || 1)
          }
        })
      })

      const topItems = Object.entries(itemCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }))

      // Hourly orders
      const hourlyOrders: { [key: number]: number } = {}
      ;(orders || []).forEach((o: any) => {
        const hour = new Date(o.created_at).getHours()
        hourlyOrders[hour] = (hourlyOrders[hour] || 0) + 1
      })

      const hourlyOrdersArray = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: hourlyOrders[i] || 0,
      }))

      setStats({
        total_orders: orders?.length || 0,
        completed_orders: completedOrders.length,
        total_revenue: totalRevenue,
        avg_order_value: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0,
        orders_by_status: ordersByStatus,
        top_items: topItems,
        hourly_orders: hourlyOrdersArray,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [staffUser, dateRange])

  const exportReport = () => {
    if (!stats) return

    const { start, end } = getDateRangeBounds()
    const reportData = {
      report_date: new Date().toISOString(),
      date_range: `${format(start, 'yyyy-MM-dd')} to ${format(end, 'yyyy-MM-dd')}`,
      ...stats,
    }

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${dateRange}-${format(new Date(), 'yyyy-MM-dd')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

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
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">View performance metrics and insights</p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>

          <button
            onClick={exportReport}
            className="bg-coffee-700 hover:bg-coffee-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Download className="w-5 h-5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Orders</p>
            <ShoppingBag className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.total_orders || 0}</p>
          <p className="text-xs text-gray-500 mt-1">
            {stats?.completed_orders || 0} completed
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">€{(stats?.total_revenue || 0).toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">From completed orders</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Avg Order Value</p>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">€{(stats?.avg_order_value || 0).toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Per completed order</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Completion Rate</p>
            <Clock className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats && stats.total_orders > 0
              ? Math.round((stats.completed_orders / stats.total_orders) * 100)
              : 0}
            %
          </p>
          <p className="text-xs text-gray-500 mt-1">Orders successfully completed</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Orders by Status</h2>
          <div className="space-y-3">
            {Object.entries(stats?.orders_by_status || {}).map(([status, count]) => {
              const total = stats?.total_orders || 1
              const percentage = (count / total) * 100

              const statusColors: { [key: string]: string } = {
                pending: 'bg-yellow-500',
                confirmed: 'bg-blue-500',
                preparing: 'bg-orange-500',
                ready: 'bg-green-500',
                completed: 'bg-gray-500',
                cancelled: 'bg-red-500',
              }

              return (
                <div key={status}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700 capitalize">{status}</span>
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${statusColors[status] || 'bg-gray-400'}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top Items */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Top Selling Items</h2>
          <div className="space-y-3">
            {(stats?.top_items || []).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-coffee-100 text-coffee-700 flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-gray-700">{item.count} sold</span>
              </div>
            ))}

            {(stats?.top_items || []).length === 0 && (
              <p className="text-center text-gray-500 py-4">No items sold yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Hourly Distribution */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Orders by Hour</h2>
        <div className="flex items-end space-x-1 h-48">
          {(stats?.hourly_orders || []).map((data, index) => {
            const maxCount = Math.max(...(stats?.hourly_orders || []).map(h => h.count), 1)
            const height = (data.count / maxCount) * 100

            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="relative group flex-1 w-full flex items-end">
                  <div
                    className="w-full bg-coffee-500 rounded-t hover:bg-coffee-600 transition-colors"
                    style={{ height: `${height}%` }}
                  >
                    {data.count > 0 && (
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {data.count} orders
                      </div>
                    )}
                  </div>
                </div>
                {index % 2 === 0 && (
                  <p className="text-xs text-gray-500 mt-2">{data.hour}:00</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
