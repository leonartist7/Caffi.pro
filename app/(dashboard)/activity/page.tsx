'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Badge, { BadgeVariant } from '@/components/Badge'


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
  }, [filterCafe, filterAction])

  const fetchCafes = async () => {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('tenants')
        .select('tenant_id, business_name, slug')
        .order('business_name')

      if (error) throw error
      setCafes(data || [])
    } catch (error) {
      console.error('Error fetching cafes:', error)
    }
  }

  const fetchLogs = async () => {
    try {
      const supabase = createClient()

      let query = supabase
        .from('admin_activity_log')
        .select(`
          *,
          tenants (business_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (filterCafe !== 'all') {
        query = query.eq('tenant_id', filterCafe)
      }

      if (filterAction !== 'all') {
        query = query.eq('action', filterAction)
      }

      const { data, error } = await query

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error('Error fetching activity logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    const icons: Record<string, string> = {
      create: '➕',
      update: '✏️',
      delete: '🗑️',
      approve: '✅',
      suspend: '⏸️',
      resume: '▶️',
      send: '📤',
    }
    return icons[action] || '📝'
  }

  const getActionColor = (action: string): string => {
    const colors: Record<string, string> = {
      create: 'bg-green-100 text-green-800',
      update: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800',
      approve: 'bg-green-100 text-green-800',
      suspend: 'bg-yellow-100 text-yellow-800',
      resume: 'bg-blue-100 text-blue-800',
      send: 'bg-purple-100 text-purple-800',
    }
    return colors[action] || 'bg-gray-100 text-gray-800'
  }

  const getActionBadgeVariant = (action: string): BadgeVariant => {
    const variants: Record<string, BadgeVariant> = {
      create: 'success',
      update: 'info',
      delete: 'error',
      approve: 'success',
      suspend: 'warning',
      resume: 'info',
      send: 'primary',
    }
    return variants[action] || 'default'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-gray-600">Loading activity log...</p>
        </div>
      </div>
    )
  }

  const actionTypes = [...new Set(logs.map(log => log.action))].filter(Boolean)

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Activity Log</h1>
        <p className="text-gray-600 mt-2">Track all admin actions across the platform</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Café
            </label>
            <select
              value={filterCafe}
              onChange={(e) => setFilterCafe(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              <option value="all">All Cafés</option>
              {cafes.map((cafe) => (
                <option key={cafe.tenant_id} value={cafe.tenant_id}>
                  {cafe.business_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Action
            </label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              <option value="all">All Actions</option>
              {actionTypes.map((action) => (
                <option key={action} value={action}>
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
        </div>

        <div className="p-6">
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No activity yet</h3>
              <p className="text-gray-600">
                {filterCafe !== 'all' || filterAction !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Admin actions will appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.log_id}
                  className="flex items-start gap-4 p-4 rounded-xl bg-surface-alt hover:bg-gray-100 transition-all"
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getActionColor(log.action)}`}>
                    <span className="text-lg">{getActionIcon(log.action)}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {log.description || `${log.action} ${log.resource_type}`}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          by {log.admin_email}
                          {log.tenants && (
                            <span className="font-serif italic ml-1">
                              • {log.tenants.business_name}
                            </span>
                          )}
                        </p>
                      </div>
                      <Badge variant={getActionBadgeVariant(log.action)} className="ml-2 flex-shrink-0">
                        {log.action.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleDateString()} at {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                      {log.resource_type && (
                        <span className="text-xs text-gray-500">
                          Resource: {log.resource_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Footer */}
      <div className="mt-8 bg-white rounded-2xl p-6 shadow-md border border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-3xl font-bold text-gray-900">{logs.length}</p>
            <p className="text-sm text-gray-600 mt-1">Total Actions</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-green-600">
              {logs.filter(l => l.action === 'create').length}
            </p>
            <p className="text-sm text-gray-600 mt-1">Created</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-blue-600">
              {logs.filter(l => l.action === 'update').length}
            </p>
            <p className="text-sm text-gray-600 mt-1">Updated</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-red-600">
              {logs.filter(l => l.action === 'delete').length}
            </p>
            <p className="text-sm text-gray-600 mt-1">Deleted</p>
          </div>
        </div>
      </div>
    </div>
  )
}
