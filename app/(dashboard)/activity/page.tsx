'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
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
        .select(
          `
          *,
          tenants (business_name)
        `
        )
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
      create: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      update: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      delete: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
      approve: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      suspend: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
      resume: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      send: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    }
    return colors[action] || 'bg-gray-100 dark:bg-gray-700/30 text-gray-700 dark:text-gray-400'
  }

  const getActionBadgeColor = (action: string): string => {
    const colors: Record<string, string> = {
      create: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      update: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      delete: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
      approve: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      suspend: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
      resume: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      send: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    }
    return colors[action] || 'bg-gray-100 dark:bg-gray-700/30 text-gray-700 dark:text-gray-400'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-coffee-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-coffee-600 dark:text-cream-400">Loading activity log...</p>
        </div>
      </div>
    )
  }

  const actionTypes = [...new Set(logs.map(log => log.action))].filter(Boolean)

  return (
    <div>
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-coffee-700 to-mocha bg-clip-text text-transparent">
          Activity Log
        </h1>
        <p className="text-coffee-600 dark:text-cream-400 mt-1 lg:mt-2 text-sm lg:text-lg">
          Track all admin actions across the platform
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-coffee-600 dark:text-cream-400" />
          <h3 className="font-bold text-coffee-900 dark:text-cream-100">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
              Filter by Café
            </label>
            <select
              value={filterCafe}
              onChange={e => setFilterCafe(e.target.value)}
              className="w-full px-4 py-2.5 lg:py-3 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all text-sm lg:text-base"
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
            <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
              Filter by Action
            </label>
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="w-full px-4 py-2.5 lg:py-3 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all text-sm lg:text-base"
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
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-coffee-200/50 dark:border-dark-700 mb-6">
        <div className="p-4 lg:p-6 border-b border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 lg:w-6 lg:h-6 text-coffee-600 dark:text-cream-400" />
            <h2 className="text-lg lg:text-xl font-bold text-coffee-900 dark:text-cream-100">
              Recent Activity
            </h2>
          </div>
        </div>

        <div className="p-4 lg:p-6">
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-coffee-300 dark:text-dark-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-coffee-900 dark:text-cream-100 mb-2">
                No activity yet
              </h3>
              <p className="text-coffee-600 dark:text-cream-400">
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
                    className="flex items-start gap-3 lg:gap-4 p-3 lg:p-4 rounded-xl bg-coffee-50/50 dark:bg-dark-900/50 border border-coffee-200/50 dark:border-dark-700 hover:border-coffee-300 dark:hover:border-dark-600 hover:shadow-md transition-all"
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
                          <p className="text-sm font-medium text-coffee-900 dark:text-cream-100">
                            {log.description || `${log.action} ${log.resource_type}`}
                          </p>
                          <p className="text-xs text-coffee-600 dark:text-cream-400 mt-1">
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
                        <span className="text-xs text-coffee-500 dark:text-cream-500">
                          {new Date(log.created_at).toLocaleDateString()} at{' '}
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                        {log.resource_type && (
                          <span className="text-xs text-coffee-500 dark:text-cream-500">
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
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-coffee-600 dark:text-cream-400" />
          <h3 className="font-bold text-coffee-900 dark:text-cream-100">Statistics</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="text-center p-4 rounded-xl bg-coffee-50/50 dark:bg-dark-900/50 border border-coffee-200/50 dark:border-dark-700">
            <p className="text-2xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100">
              {logs.length}
            </p>
            <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 mt-1">
              Total Actions
            </p>
          </div>
          <div className="text-center p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <p className="text-2xl lg:text-3xl font-bold text-green-700 dark:text-green-400">
              {logs.filter(l => l.action === 'create').length}
            </p>
            <p className="text-xs lg:text-sm text-green-600 dark:text-green-400 mt-1">Created</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-2xl lg:text-3xl font-bold text-blue-700 dark:text-blue-400">
              {logs.filter(l => l.action === 'update').length}
            </p>
            <p className="text-xs lg:text-sm text-blue-600 dark:text-blue-400 mt-1">Updated</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-2xl lg:text-3xl font-bold text-red-700 dark:text-red-400">
              {logs.filter(l => l.action === 'delete').length}
            </p>
            <p className="text-xs lg:text-sm text-red-600 dark:text-red-400 mt-1">Deleted</p>
          </div>
        </div>
      </div>
    </div>
  )
}
