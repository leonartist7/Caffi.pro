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

// Recharts renders raw SVG and takes color props directly (fill/stroke/
// contentStyle) rather than className — these are the aro palette's own
// hex values (tailwind.config.ts), just passed as chart-library props
// instead of Tailwind classes, same as every other style-only swap in this
// refit.
const STATUS_COLORS: Record<string, string> = {
  new: '#8D6B8D', // aro.plum
  regular: '#9DAA7E', // aro.sage
  fading: '#E5B14A', // aro.saffron
  lost: '#DECBA6', // aro.clay
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
          <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-aro-terra flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Building2 className="w-10 h-10 lg:w-12 lg:h-12 text-white" />
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-aro-ink mb-3">
            Select a Coffee Shop Client
          </h2>
          <p className="text-aro-muted mb-6">
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
          <h1 className="font-display text-2xl lg:text-4xl font-bold text-aro-ink">
            Analytics & Insights
          </h1>
          <p className="text-aro-muted mt-1 lg:mt-2 text-sm lg:text-lg">
            Loyalty performance for {selectedTenant.business_name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-xl rounded-xl border border-aro-hairline">
            <Calendar className="w-5 h-5 text-aro-ink-soft" />
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              className="bg-transparent text-aro-ink focus:outline-none font-medium"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 bg-aro-terra text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            <Download className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="text-sm lg:text-base">Export</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 shadow-lg border border-aro-hairline text-center mb-8">
          <div className="inline-block w-8 h-8 border-4 border-aro-terra border-t-transparent rounded-full animate-spin"></div>
          <p className="text-aro-muted mt-4">Loading analytics...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-8">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-aro-hairline">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs lg:text-sm text-aro-muted uppercase tracking-wide">
                    Total Members
                  </p>
                  <p className="text-xl lg:text-3xl font-bold text-aro-ink mt-1">
                    {data.totals.totalMembers}
                  </p>
                </div>
                <Users className="w-6 h-6 lg:w-8 lg:h-8 text-aro-plum" />
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-aro-hairline">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs lg:text-sm text-aro-muted uppercase tracking-wide">
                    Visits ({dateRange}d)
                  </p>
                  <p className="text-xl lg:text-3xl font-bold text-aro-ink mt-1">
                    {data.totals.visitsInRange}
                  </p>
                </div>
                <Activity className="w-6 h-6 lg:w-8 lg:h-8 text-aro-terra" />
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-aro-hairline">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs lg:text-sm text-aro-muted uppercase tracking-wide">
                    Points Issued ({dateRange}d)
                  </p>
                  <p className="text-xl lg:text-3xl font-bold text-aro-ink mt-1 font-mono">
                    {data.totals.pointsIssued}
                  </p>
                </div>
                <TrendingUp className="w-6 h-6 lg:w-8 lg:h-8 text-aro-sage" />
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-aro-hairline">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs lg:text-sm text-aro-muted uppercase tracking-wide">
                    Points Redeemed ({dateRange}d)
                  </p>
                  <p className="text-xl lg:text-3xl font-bold text-aro-ink mt-1 font-mono">
                    {data.totals.pointsRedeemed}
                  </p>
                </div>
                <Gift className="w-6 h-6 lg:w-8 lg:h-8 text-aro-honey" />
              </div>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
            {/* Member Growth */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-aro-hairline">
              <h2 className="text-lg lg:text-xl font-bold text-aro-ink mb-4 lg:mb-6">
                Member Growth (12 Weeks)
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.memberGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,31,24,0.1)" />
                  <XAxis dataKey="name" stroke="rgba(42,31,24,0.64)" />
                  <YAxis stroke="rgba(42,31,24,0.64)" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid rgba(42,31,24,0.1)',
                      borderRadius: '0.75rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="newMembers"
                    name="New members"
                    stroke="#D67A45"
                    strokeWidth={3}
                    dot={{ fill: '#D67A45', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Visits */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-aro-hairline">
              <h2 className="text-lg lg:text-xl font-bold text-aro-ink mb-4 lg:mb-6">
                Visits (12 Weeks)
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.visitsByWeek}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,31,24,0.1)" />
                  <XAxis dataKey="name" stroke="rgba(42,31,24,0.64)" />
                  <YAxis stroke="rgba(42,31,24,0.64)" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid rgba(42,31,24,0.1)',
                      borderRadius: '0.75rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="visits" fill="#C9986C" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
            {/* Member Status Breakdown */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-aro-hairline">
              <h2 className="text-lg lg:text-xl font-bold text-aro-ink mb-4 lg:mb-6">
                Member Status
              </h2>
              {data.statusBreakdown.every(s => s.count === 0) ? (
                <div className="text-center py-12 text-aro-clay">
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
                            fill={STATUS_COLORS[entry.status] ?? '#DECBA6'}
                          />
                        ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top Members */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-aro-hairline">
              <h2 className="text-lg lg:text-xl font-bold text-aro-ink mb-4 lg:mb-6">
                Top Members by Visits
              </h2>
              {data.topMembers.length === 0 ? (
                <div className="text-center py-12 text-aro-clay">
                  <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No visit data yet</p>
                </div>
              ) : (
                <div className="space-y-3 lg:space-y-4">
                  {data.topMembers.map((member, index) => (
                    <div
                      key={member.memberId}
                      className="flex items-center justify-between p-3 lg:p-4 rounded-xl bg-aro-sand/25 hover:bg-aro-sand/50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-aro-terra text-white flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <p className="font-semibold text-aro-ink">{member.fullName}</p>
                      </div>
                      <p className="font-bold text-aro-ink">{member.visitCount} visits</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Key Insights */}
          <div className="bg-aro-sand/30 rounded-2xl p-4 lg:p-6 border border-aro-hairline">
            <h2 className="text-lg lg:text-xl font-bold text-aro-ink mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6" />
              Key Insights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4">
                <p className="text-xs lg:text-sm text-aro-muted mb-1">Most Active Day</p>
                <p className="text-base lg:text-lg font-bold text-aro-ink">
                  {data.mostActiveDay ?? 'Not enough data yet'}
                </p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4">
                <p className="text-xs lg:text-sm text-aro-muted mb-1">Regulars Rate</p>
                <p className="text-base lg:text-lg font-bold text-aro-ink">
                  {data.regularsRate !== null ? `${data.regularsRate}%` : 'Not enough data yet'}
                </p>
                <p className="text-xs text-aro-sage">of members</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4">
                <p className="text-xs lg:text-sm text-aro-muted mb-1">Redemption Rate</p>
                <p className="text-base lg:text-lg font-bold text-aro-ink">
                  {redemptionRate !== null ? `${redemptionRate}%` : 'Not enough data yet'}
                </p>
                <p className="text-xs text-aro-plum">of points issued, redeemed</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
