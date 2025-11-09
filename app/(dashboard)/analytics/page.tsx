'use client'

import { useState, useEffect } from 'react'
import StatCard from '@/components/StatCard'
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
  activeCafes: number
  revenueGrowth: number
  ordersGrowth: number
}

interface ChartData {
  name: string
  revenue: number
  orders: number
  users: number
}

interface TopCafe {
  name: string
  revenue: number
  orders: number
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30') // days
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalRevenue: 24580,
    totalOrders: 1247,
    totalUsers: 3456,
    activeCafes: 12,
    revenueGrowth: 12.5,
    ordersGrowth: 8.3,
  })

  // Mock chart data - in production, this would come from Supabase
  const revenueData: ChartData[] = [
    { name: 'Week 1', revenue: 4200, orders: 145, users: 890 },
    { name: 'Week 2', revenue: 5100, orders: 178, users: 920 },
    { name: 'Week 3', revenue: 6300, orders: 215, users: 1050 },
    { name: 'Week 4', revenue: 8980, orders: 309, users: 1596 },
  ]

  const categoryData = [
    { name: 'Coffee', value: 45, color: '#6F4E37' },
    { name: 'Pastries', value: 25, color: '#FF6B35' },
    { name: 'Sandwiches', value: 20, color: '#F7C59F' },
    { name: 'Beverages', value: 10, color: '#C8AD7F' },
  ]

  const topCafes: TopCafe[] = [
    { name: 'Blue Bottle Coffee Paris', revenue: 8450, orders: 342 },
    { name: 'Sunrise Coffee Lyon', revenue: 6230, orders: 287 },
    { name: 'Le Café Moderne', revenue: 4820, orders: 198 },
    { name: 'Espresso Bar Nice', revenue: 3890, orders: 156 },
    { name: 'Café Central', revenue: 1190, orders: 64 },
  ]

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
    try {
      // In production, fetch real data from Supabase
      // For now, using mock data
      setLoading(false)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    // Create CSV content
    const csvContent = [
      ['Metric', 'Value'],
      ['Total Revenue', `€${analytics.totalRevenue}`],
      ['Total Orders', analytics.totalOrders],
      ['Total Users', analytics.totalUsers],
      ['Active Cafés', analytics.activeCafes],
      ['Revenue Growth', `${analytics.revenueGrowth}%`],
      ['Orders Growth', `${analytics.ordersGrowth}%`],
    ]
      .map(row => row.join(','))
      .join('\n')

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Insights</h1>
          <p className="text-gray-600 mt-2">Track performance across all cafés</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <button
            onClick={handleExportCSV}
            className="bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-6 rounded-xl transition-all flex items-center gap-2"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Revenue"
          value={`€${analytics.totalRevenue.toLocaleString()}`}
          icon="💰"
          iconBgColor="bg-green-100"
          valueClassName="font-mono"
          trend={{ value: `+${analytics.revenueGrowth}%`, positive: true }}
        />

        <StatCard
          title="Total Orders"
          value={analytics.totalOrders.toLocaleString()}
          icon="📦"
          iconBgColor="bg-blue-100"
          trend={{ value: `+${analytics.ordersGrowth}%`, positive: true }}
        />

        <StatCard
          title="Total Users"
          value={analytics.totalUsers.toLocaleString()}
          icon="👥"
          iconBgColor="bg-purple-100"
          trend={{ value: '+15.2%', positive: true }}
        />

        <StatCard
          title="Active Cafés"
          value={analytics.activeCafes}
          icon="☕"
          iconBgColor="bg-primary/10"
          trend={{ value: '+2 this month', positive: true }}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.75rem',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#6F4E37"
                strokeWidth={3}
                dot={{ fill: '#6F4E37', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Orders & Users */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Orders & User Growth</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.75rem',
                }}
              />
              <Legend />
              <Bar dataKey="orders" fill="#FF6B35" radius={[8, 8, 0, 0]} />
              <Bar dataKey="users" fill="#6F4E37" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Category Distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Sales by Category</h2>
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

        {/* Top Performing Cafés */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Top Performing Cafés</h2>
          <div className="space-y-4">
            {topCafes.map((cafe, index) => (
              <div
                key={cafe.name}
                className="flex items-center justify-between p-4 rounded-xl bg-surface-alt hover:bg-gray-100 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 font-serif italic">
                      {cafe.name}
                    </p>
                    <p className="text-sm text-gray-600">{cafe.orders} orders</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 font-mono">
                    €{cafe.revenue.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-6 border border-primary/20">
        <h2 className="text-xl font-bold text-gray-900 mb-4">📈 Key Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">Best Performing Day</p>
            <p className="text-lg font-bold text-gray-900">Saturday</p>
            <p className="text-xs text-green-600">+23% vs average</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">Peak Hours</p>
            <p className="text-lg font-bold text-gray-900">8-10 AM</p>
            <p className="text-xs text-blue-600">Morning rush</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">Average Order Value</p>
            <p className="text-lg font-bold text-gray-900 font-mono">€19.70</p>
            <p className="text-xs text-green-600">+€2.40 vs last month</p>
          </div>
        </div>
      </div>
    </div>
  )
}
