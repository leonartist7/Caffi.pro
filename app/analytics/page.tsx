'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns'

type DateRange = '7d' | '30d' | '90d' | 'all'

interface SummaryData {
  totalRevenue: number
  totalOrders: number
  totalUsers: number
  revenueGrowth: number
  ordersGrowth: number
  usersGrowth: number
}

interface RevenueData {
  date: string
  revenue: number
}

interface OrdersData {
  date: string
  pending: number
  confirmed: number
  preparing: number
  ready: number
  completed: number
  cancelled: number
}

interface UserGrowthData {
  date: string
  users: number
}

interface TopTenant {
  tenant_id: string
  business_name: string
  revenue: number
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [loading, setLoading] = useState(true)
  
  // Data states
  const [summary, setSummary] = useState<SummaryData>({
    totalRevenue: 0,
    totalOrders: 0,
    totalUsers: 0,
    revenueGrowth: 0,
    ordersGrowth: 0,
    usersGrowth: 0,
  })
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [ordersData, setOrdersData] = useState<OrdersData[]>([])
  const [userGrowthData, setUserGrowthData] = useState<UserGrowthData[]>([])
  const [topTenants, setTopTenants] = useState<TopTenant[]>([])

  useEffect(() => {
    fetchAnalyticsData()
  }, [dateRange])

  const getDateRangeFilter = () => {
    const now = new Date()
    let startDate: Date

    switch (dateRange) {
      case '7d':
        startDate = subDays(now, 7)
        break
      case '30d':
        startDate = subDays(now, 30)
        break
      case '90d':
        startDate = subDays(now, 90)
        break
      case 'all':
        startDate = new Date('2020-01-01')
        break
      default:
        startDate = subDays(now, 30)
    }

    return { startDate, endDate: now }
  }

  const fetchAnalyticsData = async () => {
    setLoading(true)
    try {
      const { startDate, endDate } = getDateRangeFilter()
      
      // Fetch summary data
      await fetchSummaryData(startDate, endDate)
      
      // Fetch revenue data
      await fetchRevenueData(startDate, endDate)
      
      // Fetch orders data
      await fetchOrdersData(startDate, endDate)
      
      // Fetch user growth data
      await fetchUserGrowthData(startDate, endDate)
      
      // Fetch top tenants
      await fetchTopTenants(startDate, endDate)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSummaryData = async (startDate: Date, endDate: Date) => {
    // Current period totals
    const { data: currentOrders } = await supabase
      .from('orders')
      .select('total, status')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const { data: currentUsers } = await supabase
      .from('users')
      .select('user_id')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Calculate current period
    const completedOrders = currentOrders?.filter(o => o.status === 'completed') || []
    const totalRevenue = completedOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
    const totalOrders = currentOrders?.length || 0
    const totalUsers = currentUsers?.length || 0

    // Previous period for growth calculation
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const prevStartDate = subDays(startDate, periodDays)
    
    const { data: prevOrders } = await supabase
      .from('orders')
      .select('total, status')
      .gte('created_at', prevStartDate.toISOString())
      .lt('created_at', startDate.toISOString())

    const { data: prevUsers } = await supabase
      .from('users')
      .select('user_id')
      .gte('created_at', prevStartDate.toISOString())
      .lt('created_at', startDate.toISOString())

    const prevCompletedOrders = prevOrders?.filter(o => o.status === 'completed') || []
    const prevRevenue = prevCompletedOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
    const prevOrderCount = prevOrders?.length || 0
    const prevUserCount = prevUsers?.length || 0

    // Calculate growth percentages
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0
    const ordersGrowth = prevOrderCount > 0 ? ((totalOrders - prevOrderCount) / prevOrderCount) * 100 : 0
    const usersGrowth = prevUserCount > 0 ? ((totalUsers - prevUserCount) / prevUserCount) * 100 : 0

    setSummary({
      totalRevenue,
      totalOrders,
      totalUsers,
      revenueGrowth,
      ordersGrowth,
      usersGrowth,
    })
  }

  const fetchRevenueData = async (startDate: Date, endDate: Date) => {
    const { data } = await supabase
      .from('orders')
      .select('created_at, total')
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at')

    if (!data) {
      setRevenueData([])
      return
    }

    // Group by date
    const revenueByDate = data.reduce((acc, order) => {
      const date = format(parseISO(order.created_at), 'yyyy-MM-dd')
      if (!acc[date]) {
        acc[date] = 0
      }
      acc[date] += Number(order.total) || 0
      return acc
    }, {} as Record<string, number>)

    // Convert to array
    const chartData = Object.entries(revenueByDate).map(([date, revenue]) => ({
      date: format(parseISO(date), 'MMM dd'),
      revenue: Math.round(revenue * 100) / 100,
    }))

    setRevenueData(chartData)
  }

  const fetchOrdersData = async (startDate: Date, endDate: Date) => {
    const { data } = await supabase
      .from('orders')
      .select('created_at, status')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at')

    if (!data) {
      setOrdersData([])
      return
    }

    // Group by date and status
    const ordersByDateStatus = data.reduce((acc, order) => {
      const date = format(parseISO(order.created_at), 'yyyy-MM-dd')
      if (!acc[date]) {
        acc[date] = {
          pending: 0,
          confirmed: 0,
          preparing: 0,
          ready: 0,
          completed: 0,
          cancelled: 0,
        }
      }
      acc[date][order.status as keyof typeof acc[typeof date]]++
      return acc
    }, {} as Record<string, OrdersData>)

    // Convert to array
    const chartData = Object.entries(ordersByDateStatus).map(([date, statuses]) => ({
      date: format(parseISO(date), 'MMM dd'),
      ...statuses,
    }))

    setOrdersData(chartData)
  }

  const fetchUserGrowthData = async (startDate: Date, endDate: Date) => {
    const { data } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at')

    if (!data) {
      setUserGrowthData([])
      return
    }

    // Get total users before start date for cumulative count
    const { count: initialUserCount } = await supabase
      .from('users')
      .select('user_id', { count: 'exact', head: true })
      .lt('created_at', startDate.toISOString())

    // Group by date and make cumulative
    const usersByDate = data.reduce((acc, user) => {
      const date = format(parseISO(user.created_at), 'yyyy-MM-dd')
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Convert to cumulative array
    let cumulativeUsers = initialUserCount || 0
    const chartData = Object.entries(usersByDate).map(([date, count]) => {
      cumulativeUsers += count
      return {
        date: format(parseISO(date), 'MMM dd'),
        users: cumulativeUsers,
      }
    })

    setUserGrowthData(chartData)
  }

  const fetchTopTenants = async (startDate: Date, endDate: Date) => {
    const { data } = await supabase
      .from('orders')
      .select('tenant_id, total, status, tenants(business_name)')
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (!data) {
      setTopTenants([])
      return
    }

    // Group by tenant and sum revenue
    const revenueByTenant = data.reduce((acc, order) => {
      if (!order.tenant_id) return acc
      
      if (!acc[order.tenant_id]) {
        acc[order.tenant_id] = {
          tenant_id: order.tenant_id,
          business_name: (order.tenants as any)?.business_name || 'Unknown',
          revenue: 0,
        }
      }
      acc[order.tenant_id].revenue += Number(order.total) || 0
      return acc
    }, {} as Record<string, TopTenant>)

    // Convert to array and sort by revenue
    const topTenantsData = Object.values(revenueByTenant)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    setTopTenants(topTenantsData)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Track your coffee shop performance and insights</p>
        </div>

        {/* Date Range Filter */}
        <div className="mb-8 flex gap-2">
          {(['7d', '30d', '90d', 'all'] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                dateRange === range
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {range === 'all' ? 'All Time' : range.toUpperCase()}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-900">{formatCurrency(summary.totalRevenue)}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-semibold ${
                    summary.revenueGrowth >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {formatPercentage(summary.revenueGrowth)}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">vs previous period</p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Total Orders</p>
                    <p className="text-3xl font-bold text-gray-900">{summary.totalOrders.toLocaleString()}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-semibold ${
                    summary.ordersGrowth >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {formatPercentage(summary.ordersGrowth)}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">vs previous period</p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">New Users</p>
                    <p className="text-3xl font-bold text-gray-900">{summary.totalUsers.toLocaleString()}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-semibold ${
                    summary.usersGrowth >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {formatPercentage(summary.usersGrowth)}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">vs previous period</p>
              </div>
            </div>

            {/* Revenue Line Chart */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue Over Time</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2D5F5D"
                    strokeWidth={2}
                    dot={{ fill: '#2D5F5D', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Revenue (EUR)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Orders Bar Chart */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Orders by Status</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ordersData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" />
                  <Bar dataKey="preparing" stackId="a" fill="#f59e0b" name="Preparing" />
                  <Bar dataKey="confirmed" stackId="a" fill="#3b82f6" name="Confirmed" />
                  <Bar dataKey="pending" stackId="a" fill="#6b7280" name="Pending" />
                  <Bar dataKey="cancelled" stackId="a" fill="#ef4444" name="Cancelled" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* User Growth Area Chart */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">User Growth</h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={userGrowthData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                    name="Total Users"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Top 5 Tenants Table */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Top 5 Tenants by Revenue</h2>
              {topTenants.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Rank</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Business Name</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topTenants.map((tenant, index) => (
                        <tr
                          key={tenant.tenant_id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                              index === 0 ? 'bg-yellow-500' :
                              index === 1 ? 'bg-gray-400' :
                              index === 2 ? 'bg-amber-600' :
                              'bg-gray-300'
                            }`}>
                              {index + 1}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-900">{tenant.business_name}</td>
                          <td className="py-3 px-4 text-right font-semibold text-gray-900">
                            {formatCurrency(tenant.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No tenant data available for this period</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

