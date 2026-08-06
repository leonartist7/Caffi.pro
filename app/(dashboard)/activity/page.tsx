'use client'

import { useState, useEffect } from 'react'
import {
  Activity,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Pause,
  Play,
  Send,
  FileText,
  Filter,
  BarChart3,
} from 'lucide-react'

interface ActivityLog {
  log_id: string
  tenant_id: string | null
  admin_email: string
  action: string
  resource_type: string
  resource_id: string | null
  description: string | null
  created_at: string
  tenants?: {
    business_name: string
  } | null
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCafe, setFilterCafe] = useState<string>('all')
  const [filterAction, setFilterAction] = useState<string>('all')
  const [cafes, setCafes] = useState<any[]>([])

  useEffect(() => {
    fetchCafes()
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- legacy effect; refit to TanStack Query in Phase 3
  }, [filterCafe, filterAction])

  const fetchCafes = async () => {
    try {
      const res = await fetch('/api/clients')
      if (!res.ok) throw new Error(`Failed to load clients (${res.status})`)
      const { clients } = await res.json()
      setCafes(clients || [])
    } catch (error) {
      console.error('Error fetching cafes:', error)
    }
  }

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (filterCafe !== 'all') params.set('venue_id', filterCafe)

      const res = await fetch(`/api/activity?${params}`)
      if (!res.ok) throw new Error(`Failed to load activity (${res.status})`)
      const { logs: data } = await res.json()
      // Action filtering stays client-side — the underlying events table
      // has no server-side action index, and a fetched page (<=100 rows)
      // is cheap to filter in the browser.
      setLogs(
        filterAction === 'all' ? data : data.filter((l: ActivityLog) => l.action === filterAction)
      )
    } catch (error) {
      console.error('Error fetching activity logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    const icons: Record<string, any> = {
      create: Plus,
      update: Edit,
      delete: Trash2,
      approve: CheckCircle,
      suspend: Pause,
      resume: Play,
      send: Send,
    }
    return icons[action] || FileText
  }

  const getActionColor = (action: string): string => {
    const colors: Record<string, string> = {
      create: 'bg-aro-sage/15 text-aro-sage',
      update: 'bg-aro-plum/15 text-aro-plum',
      delete: 'bg-aro-rose/15 text-aro-rose',
      approve: 'bg-aro-sage/15 text-aro-sage',
      suspend: 'bg-aro-saffron/15 text-aro-saffron',
      resume: 'bg-aro-plum/15 text-aro-plum',
      send: 'bg-aro-honey/15 text-aro-honey',
    }
    return colors[action] || 'bg-aro-sand text-aro-ink-soft'
  }

  const getActionBadgeColor = (action: string): string => {
    const colors: Record<string, string> = {
      create: 'bg-aro-sage text-aro-ink',
      update: 'bg-aro-plum text-white',
      delete: 'bg-aro-rose text-aro-ink',
      approve: 'bg-aro-sage text-aro-ink',
      suspend: 'bg-aro-saffron text-aro-ink',
      resume: 'bg-aro-plum text-white',
      send: 'bg-aro-honey text-aro-ink',
    }
    return colors[action] || 'bg-aro-sand text-aro-ink-soft'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-aro-terra border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-aro-muted">Loading activity log...</p>
        </div>
      </div>
    )
  }

  const actionTypes = [...new Set(logs.map(log => log.action))].filter(Boolean)

  return (
    <div>
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="font-display text-2xl lg:text-4xl font-bold text-aro-ink">Activity Log</h1>
        <p className="text-aro-muted mt-1 lg:mt-2 text-sm lg:text-lg">
          Track all admin actions across the platform
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-aro-hairline mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-aro-muted" />
          <h3 className="font-bold text-aro-ink">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-aro-ink-soft mb-2">
              Filter by Café
            </label>
            <select
              value={filterCafe}
              onChange={e => setFilterCafe(e.target.value)}
              className="w-full px-4 py-2.5 lg:py-3 rounded-xl border border-aro-hairline bg-white text-aro-ink focus:outline-none focus:ring-2 focus:ring-aro-terra transition-all text-sm lg:text-base"
            >
              <option value="all">All Cafés</option>
              {cafes.map(cafe => (
                <option key={cafe.tenant_id} value={cafe.tenant_id}>
                  {cafe.business_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-aro-ink-soft mb-2">
              Filter by Action
            </label>
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="w-full px-4 py-2.5 lg:py-3 rounded-xl border border-aro-hairline bg-white text-aro-ink focus:outline-none focus:ring-2 focus:ring-aro-terra transition-all text-sm lg:text-base"
            >
              <option value="all">All Actions</option>
              {actionTypes.map(action => (
                <option key={action} value={action}>
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-aro-hairline mb-6">
        <div className="p-4 lg:p-6 border-b border-aro-hairline">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 lg:w-6 lg:h-6 text-aro-muted" />
            <h2 className="text-lg lg:text-xl font-bold text-aro-ink">Recent Activity</h2>
          </div>
        </div>

        <div className="p-4 lg:p-6">
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-aro-clay mx-auto mb-4" />
              <h3 className="text-xl font-bold text-aro-ink mb-2">No activity yet</h3>
              <p className="text-aro-muted">
                {filterCafe !== 'all' || filterAction !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Admin actions will appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map(log => {
                const IconComponent = getActionIcon(log.action)
                return (
                  <div
                    key={log.log_id}
                    className="flex items-start gap-3 lg:gap-4 p-3 lg:p-4 rounded-xl bg-aro-sand/25 border border-aro-hairline hover:border-aro-clay hover:shadow-md transition-all"
                  >
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getActionColor(log.action)}`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-1 gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-aro-ink">
                            {log.description || `${log.action} ${log.resource_type}`}
                          </p>
                          <p className="text-xs text-aro-muted mt-1">
                            by {log.admin_email}
                            {log.tenants && (
                              <span className="font-serif italic ml-1">
                                • {log.tenants.business_name}
                              </span>
                            )}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getActionBadgeColor(log.action)}`}
                        >
                          {log.action.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 lg:gap-4 mt-2">
                        <span className="text-xs text-aro-muted">
                          {new Date(log.created_at).toLocaleDateString()} at{' '}
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                        {log.resource_type && (
                          <span className="text-xs text-aro-muted">
                            Resource: {log.resource_type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Stats Footer */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-aro-hairline">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-aro-muted" />
          <h3 className="font-bold text-aro-ink">Statistics</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="text-center p-4 rounded-xl bg-aro-sand/25 border border-aro-hairline">
            <p className="text-2xl lg:text-3xl font-bold text-aro-ink">{logs.length}</p>
            <p className="text-xs lg:text-sm text-aro-muted mt-1">Total Actions</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-aro-sage/15 border border-aro-sage/30">
            <p className="text-2xl lg:text-3xl font-bold text-aro-ink">
              {logs.filter(l => l.action === 'create').length}
            </p>
            <p className="text-xs lg:text-sm text-aro-ink mt-1">Created</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-aro-plum/15 border border-aro-plum/30">
            <p className="text-2xl lg:text-3xl font-bold text-aro-ink">
              {logs.filter(l => l.action === 'update').length}
            </p>
            <p className="text-xs lg:text-sm text-aro-ink mt-1">Updated</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-aro-rose/15 border border-aro-rose/30">
            <p className="text-2xl lg:text-3xl font-bold text-aro-ink">
              {logs.filter(l => l.action === 'delete').length}
            </p>
            <p className="text-xs lg:text-sm text-aro-ink mt-1">Deleted</p>
          </div>
        </div>
      </div>
    </div>
  )
}
