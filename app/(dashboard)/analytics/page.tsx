'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useTenant } from '@/contexts/TenantContext'
import {
  DollarSign,
  ShoppingCart,
  Users,
  Store,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  BarChart3,
  Building2,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface AnalyticsData {
  totalRevenue: number
  totalOrders: number
  totalUsers: number
  activeLocations: number
  avgOrderValue: number
  topCategory: string
}

export default function AnalyticsPage() {
  const { selectedTenant } = useTenant()
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30')
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalRevenue: 0,
    totalOrders: 0,
    totalUsers: 0,
    activeLocations: 0,
    avgOrderValue: 0,
    topCategory: '',
  })
  const [chartData, setChartData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [topLocations, setTopLocations] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    if (selectedTenant) {
      fetchAnalytics()
    }
  }, [dateRange, selectedTenant])

  async function fetchAnalytics() {
    if (!selectedTenant) return

    try {
      setLoading(true)

      // Fetch orders
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', selectedTenant.tenant_id)
        .gte(
          'created_at',
          new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString()
        )

      // Fetch users (customers of this tenant)
      const { data: users } = await supabase
        .from('users')
        .select('user_id')
        .eq('tenant_id', selectedTenant.tenant_id)

      // Fetch locations
      const { data: locations } = await supabase
        .from('locations')
        .select('*')
        .eq('tenant_id', selectedTenant.tenant_id)
        .eq('is_active', true)

      // Calculate analytics
      const totalRevenue = orders?.reduce((acc, o) => acc + (o.total_amount || 0), 0) || 0
      const totalOrders = orders?.length || 0
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

      setAnalytics({
        totalRevenue,
        totalOrders,
        totalUsers: users?.length || 0,
        activeLocations: locations?.length || 0,
        avgOrderValue,
        topCategory: 'Coffee',
      })

      // Generate chart data (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        return date.toISOString().split('T')[0]
      })

      const dailyData = last7Days.map(date => {
        const dayOrders = orders?.filter(o => o.created_at?.startsWith(date)) || []
        return {
          name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          revenue: dayOrders.reduce((acc, o) => acc + (o.total_amount || 0), 0),
          orders: dayOrders.length,
        }
      })

      setChartData(dailyData)

      // Mock category data (would come from order_items in production)
      setCategoryData([
        { name: 'Coffee', value: 45, color: '#6b3410' },
        { name: 'Pastries', value: 25, color: '#c97d47' },
        { name: 'Sandwiches', value: 20, color: '#d69f70' },
        { name: 'Beverages', value: 10, color: '#e3bf9b' },
      ])

      // Calculate top locations
      const locationRevenue =
        locations?.map(loc => {
          const locOrders = orders?.filter(o => o.location_id === loc.location_id) || []
          return {
            name: loc.name,
            revenue: locOrders.reduce((acc, o) => acc + (o.total_amount || 0), 0),
            orders: locOrders.length,
          }
        }) || []

      setTopLocations(locationRevenue.sort((a, b) => b.revenue - a.revenue).slice(0, 5))
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    const csvContent = [
      ['Metric', 'Value'],
      ['Total Revenue', `€${analytics.totalRevenue.toFixed(2)}`],
      ['Total Orders', analytics.totalOrders],
      ['Total Users', analytics.totalUsers],
      ['Active Locations', analytics.activeLocations],
      ['Avg Order Value', `€${analytics.avgOrderValue.toFixed(2)}`],
    ]
      .map(row => row.join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // No tenant selected state
  if (!selectedTenant) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-gradient-coffee flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Building2 className="w-10 h-10 lg:w-12 lg:h-12 text-cream-100" />
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mb-3">
            Select a Coffee Shop Client
          </h2>
          <p className="text-coffee-600 dark:text-cream-400 mb-6">
            Please select a client from the dropdown above to view their analytics and insights.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 lg:mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-coffee-700 to-mocha bg-clip-text text-transparent">
            Analytics & Insights
          </h1>
          <p className="text-coffee-600 dark:text-cream-400 mt-1 lg:mt-2 text-sm lg:text-lg">
            Track performance and trends for {selectedTenant.business_name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-xl border border-coffee-200/50 dark:border-dark-700">
            <Calendar className="w-5 h-5 text-coffee-600 dark:text-cream-300" />
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              className="bg-transparent text-coffee-900 dark:text-cream-100 focus:outline-none font-medium"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 bg-gradient-coffee text-cream-100 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            <Download className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="text-sm lg:text-base">Export</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-12 shadow-lg border border-coffee-200/50 dark:border-dark-700 text-center mb-8">
          <div className="inline-block w-8 h-8 border-4 border-coffee-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-coffee-600 dark:text-cream-400 mt-4">Loading analytics...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-8">
            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                    Total Revenue
                  </p>
                  <p className="text-xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mt-1 font-mono">
                    €{analytics.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-6 h-6 lg:w-8 lg:h-8 text-green-600" />
              </div>
              <div className="flex items-center gap-1 text-xs lg:text-sm text-green-600 dark:text-green-400">
                <TrendingUp className="w-4 h-4" />
                <span className="font-semibold">+12.5%</span>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                    Total Orders
                  </p>
                  <p className="text-xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mt-1">
                    {analytics.totalOrders}
                  </p>
                </div>
                <ShoppingCart className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600" />
              </div>
              <div className="flex items-center gap-1 text-xs lg:text-sm text-green-600 dark:text-green-400">
                <TrendingUp className="w-4 h-4" />
                <span className="font-semibold">+8.3%</span>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                    Total Users
                  </p>
                  <p className="text-xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mt-1">
                    {analytics.totalUsers}
                  </p>
                </div>
                <Users className="w-6 h-6 lg:w-8 lg:h-8 text-purple-600" />
              </div>
              <div className="flex items-center gap-1 text-xs lg:text-sm text-green-600 dark:text-green-400">
                <TrendingUp className="w-4 h-4" />
                <span className="font-semibold">+15.2%</span>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                    Avg Order Value
                  </p>
                  <p className="text-xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mt-1 font-mono">
                    €{analytics.avgOrderValue.toFixed(2)}
                  </p>
                </div>
                <BarChart3 className="w-6 h-6 lg:w-8 lg:h-8 text-coffee-600 dark:text-cream-300" />
              </div>
              <div className="flex items-center gap-1 text-xs lg:text-sm text-green-600 dark:text-green-400">
                <TrendingUp className="w-4 h-4" />
                <span className="font-semibold">+€2.40</span>
              </div>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
            {/* Revenue Trend */}
            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
              <h2 className="text-lg lg:text-xl font-bold text-coffee-900 dark:text-cream-100 mb-4 lg:mb-6">
                Revenue Trend (7 Days)
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#8b7249" />
                  <YAxis stroke="#8b7249" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.75rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6b3410"
                    strokeWidth={3}
                    dot={{ fill: '#6b3410', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Orders */}
            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
              <h2 className="text-lg lg:text-xl font-bold text-coffee-900 dark:text-cream-100 mb-4 lg:mb-6">
                Orders (7 Days)
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#8b7249" />
                  <YAxis stroke="#8b7249" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.75rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="orders" fill="#c97d47" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
            {/* Category Distribution */}
            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
              <h2 className="text-lg lg:text-xl font-bold text-coffee-900 dark:text-cream-100 mb-4 lg:mb-6">
                Sales by Category
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Top Performing Locations */}
            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
              <h2 className="text-lg lg:text-xl font-bold text-coffee-900 dark:text-cream-100 mb-4 lg:mb-6">
                Top Performing Locations
              </h2>
              {topLocations.length === 0 ? (
                <div className="text-center py-12 text-coffee-400 dark:text-cream-600">
                  <Store className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No location data available</p>
                </div>
              ) : (
                <div className="space-y-3 lg:space-y-4">
                  {topLocations.map((location, index) => (
                    <div
                      key={location.name}
                      className="flex items-center justify-between p-3 lg:p-4 rounded-xl bg-coffee-50 dark:bg-dark-900 hover:bg-coffee-100 dark:hover:bg-dark-700 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-coffee text-cream-100 flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-coffee-900 dark:text-cream-100">
                            {location.name}
                          </p>
                          <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400">
                            {location.orders} orders
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-coffee-900 dark:text-cream-100 font-mono">
                          €{location.revenue.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Key Insights */}
          <div className="bg-gradient-to-r from-coffee-500/10 to-mocha/10 dark:from-coffee-700/20 dark:to-mocha/20 rounded-2xl p-4 lg:p-6 border border-coffee-200/50 dark:border-dark-700">
            <h2 className="text-lg lg:text-xl font-bold text-coffee-900 dark:text-cream-100 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6" />
              Key Insights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
              <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm rounded-xl p-4">
                <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 mb-1">
                  Best Performing Day
                </p>
                <p className="text-base lg:text-lg font-bold text-coffee-900 dark:text-cream-100">
                  Saturday
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">+23% vs average</p>
              </div>
              <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm rounded-xl p-4">
                <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 mb-1">
                  Peak Hours
                </p>
                <p className="text-base lg:text-lg font-bold text-coffee-900 dark:text-cream-100">
                  8-10 AM
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Morning rush</p>
              </div>
              <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm rounded-xl p-4">
                <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 mb-1">
                  Top Category
                </p>
                <p className="text-base lg:text-lg font-bold text-coffee-900 dark:text-cream-100">
                  {analytics.topCategory}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400">45% of sales</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
