'use client'

import { useState, useEffect } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import { toast } from 'sonner'
import {
  Users,
  Activity,
  Gift,
  TrendingUp,
  Download,
  Calendar,
  Building2,
  Award,
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

interface AnalyticsResponse {
  totals: {
    totalMembers: number
    visitsInRange: number
    pointsIssued: number
    pointsRedeemed: number
  }
  memberGrowth: { name: string; newMembers: number }[]
  visitsByWeek: { name: string; visits: number }[]
  statusBreakdown: { status: string; count: number }[]
  topMembers: { memberId: string; fullName: string; visitCount: number }[]
  mostActiveDay: string | null
  regularsRate: number | null
}

const STATUS_COLORS: Record<string, string> = {
  new: '#8b5cf6',
  regular: '#22c55e',
  fading: '#f59e0b',
  lost: '#9ca3af',
}

const EMPTY: AnalyticsResponse = {
  totals: { totalMembers: 0, visitsInRange: 0, pointsIssued: 0, pointsRedeemed: 0 },
  memberGrowth: [],
  visitsByWeek: [],
  statusBreakdown: [],
  topMembers: [],
  mostActiveDay: null,
  regularsRate: null,
}

export default function AnalyticsPage() {
  const { selectedTenant } = useTenant()
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30')
  const [data, setData] = useState<AnalyticsResponse>(EMPTY)

  useEffect(() => {
    if (selectedTenant) {
      fetchAnalytics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, selectedTenant])

  async function fetchAnalytics() {
    if (!selectedTenant) return

    try {
      setLoading(true)
      const res = await fetch(
        `/api/analytics?venue_id=${selectedTenant.tenant_id}&days=${dateRange}`
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Failed to load analytics (${res.status})`)
      }
      setData(await res.json())
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    const csvContent = [
      ['Metric', 'Value'],
      ['Total Members', data.totals.totalMembers],
      [`Visits (last ${dateRange} days)`, data.totals.visitsInRange],
      [`Points Issued (last ${dateRange} days)`, data.totals.pointsIssued],
      [`Points Redeemed (last ${dateRange} days)`, data.totals.pointsRedeemed],
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

  const redemptionRate =
    data.totals.pointsIssued > 0
      ? Math.round((data.totals.pointsRedeemed / data.totals.pointsIssued) * 100)
      : null

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
            Loyalty performance for {selectedTenant.business_name}
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
                    Total Members
                  </p>
                  <p className="text-xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mt-1">
                    {data.totals.totalMembers}
                  </p>
                </div>
                <Users className="w-6 h-6 lg:w-8 lg:h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                    Visits ({dateRange}d)
                  </p>
                  <p className="text-xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mt-1">
                    {data.totals.visitsInRange}
                  </p>
                </div>
                <Activity className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                    Points Issued ({dateRange}d)
                  </p>
                  <p className="text-xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mt-1 font-mono">
                    {data.totals.pointsIssued}
                  </p>
                </div>
                <TrendingUp className="w-6 h-6 lg:w-8 lg:h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                    Points Redeemed ({dateRange}d)
                  </p>
                  <p className="text-xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mt-1 font-mono">
                    {data.totals.pointsRedeemed}
                  </p>
                </div>
                <Gift className="w-6 h-6 lg:w-8 lg:h-8 text-coffee-600 dark:text-cream-300" />
              </div>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
            {/* Member Growth */}
            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
              <h2 className="text-lg lg:text-xl font-bold text-coffee-900 dark:text-cream-100 mb-4 lg:mb-6">
                Member Growth (12 Weeks)
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.memberGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#8b7249" />
                  <YAxis stroke="#8b7249" allowDecimals={false} />
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
                    dataKey="newMembers"
                    name="New members"
                    stroke="#6b3410"
                    strokeWidth={3}
                    dot={{ fill: '#6b3410', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Visits */}
            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
              <h2 className="text-lg lg:text-xl font-bold text-coffee-900 dark:text-cream-100 mb-4 lg:mb-6">
                Visits (12 Weeks)
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.visitsByWeek}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#8b7249" />
                  <YAxis stroke="#8b7249" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.75rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="visits" fill="#c97d47" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
            {/* Member Status Breakdown */}
            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
              <h2 className="text-lg lg:text-xl font-bold text-coffee-900 dark:text-cream-100 mb-4 lg:mb-6">
                Member Status
              </h2>
              {data.statusBreakdown.every(s => s.count === 0) ? (
                <div className="text-center py-12 text-coffee-400 dark:text-cream-600">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No members yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.statusBreakdown.filter(s => s.count > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, count }) => `${status}: ${count}`}
                      outerRadius={100}
                      dataKey="count"
                      nameKey="status"
                    >
                      {data.statusBreakdown
                        .filter(s => s.count > 0)
                        .map(entry => (
                          <Cell
                            key={entry.status}
                            fill={STATUS_COLORS[entry.status] ?? '#9ca3af'}
                          />
                        ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top Members */}
            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
              <h2 className="text-lg lg:text-xl font-bold text-coffee-900 dark:text-cream-100 mb-4 lg:mb-6">
                Top Members by Visits
              </h2>
              {data.topMembers.length === 0 ? (
                <div className="text-center py-12 text-coffee-400 dark:text-cream-600">
                  <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No visit data yet</p>
                </div>
              ) : (
                <div className="space-y-3 lg:space-y-4">
                  {data.topMembers.map((member, index) => (
                    <div
                      key={member.memberId}
                      className="flex items-center justify-between p-3 lg:p-4 rounded-xl bg-coffee-50 dark:bg-dark-900 hover:bg-coffee-100 dark:hover:bg-dark-700 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-coffee text-cream-100 flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <p className="font-semibold text-coffee-900 dark:text-cream-100">
                          {member.fullName}
                        </p>
                      </div>
                      <p className="font-bold text-coffee-900 dark:text-cream-100">
                        {member.visitCount} visits
                      </p>
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
                  Most Active Day
                </p>
                <p className="text-base lg:text-lg font-bold text-coffee-900 dark:text-cream-100">
                  {data.mostActiveDay ?? 'Not enough data yet'}
                </p>
              </div>
              <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm rounded-xl p-4">
                <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 mb-1">
                  Regulars Rate
                </p>
                <p className="text-base lg:text-lg font-bold text-coffee-900 dark:text-cream-100">
                  {data.regularsRate !== null ? `${data.regularsRate}%` : 'Not enough data yet'}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">of members</p>
              </div>
              <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm rounded-xl p-4">
                <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 mb-1">
                  Redemption Rate
                </p>
                <p className="text-base lg:text-lg font-bold text-coffee-900 dark:text-cream-100">
                  {redemptionRate !== null ? `${redemptionRate}%` : 'Not enough data yet'}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  of points issued, redeemed
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
