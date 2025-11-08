'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'

interface Cafe {
  tenant_id: string
  slug: string
  business_name: string
  owner_email: string
  owner_phone: string
  subscription_tier: string
  setup_status: string
  last_activity_at: string
  created_at: string
}

export default function CafesListPage() {
  const [cafes, setCafes] = useState<Cafe[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchCafes()
  }, [])

  const fetchCafes = async () => {
    try {
      if (!supabaseAdmin) {
        console.error('Supabase admin client not initialized')
        return
      }

      const { data, error } = await supabaseAdmin
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCafes(data || [])
    } catch (error) {
      console.error('Error fetching cafes:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCafes = cafes.filter(cafe => {
    const matchesSearch = cafe.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cafe.owner_email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || cafe.setup_status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      launched: 'bg-green-100 text-green-800',
      paused: 'bg-gray-100 text-gray-800',
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status?.replace('_', ' ') || 'N/A'}
      </span>
    )
  }

  const getTierBadge = (tier: string) => {
    const styles: Record<string, string> = {
      starter: 'bg-gray-100 text-gray-800',
      pro: 'bg-primary/10 text-primary',
      enterprise: 'bg-accent/10 text-accent',
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[tier] || 'bg-gray-100 text-gray-800'}`}>
        {tier?.toUpperCase() || 'N/A'}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">☕</div>
          <p className="text-gray-600">Loading cafés...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cafés</h1>
          <p className="text-gray-600 mt-2">Manage all your café clients</p>
        </div>
        <button className="bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all hover:shadow-xl">
          + Add New Café
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="launched">Launched</option>
              <option value="paused">Paused</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cafes Grid */}
      {filteredCafes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-md border border-gray-100 text-center">
          <div className="text-6xl mb-4">☕</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No cafés found</h3>
          <p className="text-gray-600">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by adding your first café'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCafes.map((cafe) => (
            <Link
              key={cafe.tenant_id}
              href={`/cafes/${cafe.slug}`}
              className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
            >
              {/* Logo placeholder */}
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 ring-4 ring-primary/20">
                <span className="text-3xl">☕</span>
              </div>

              {/* Cafe Name */}
              <h3 className="text-xl font-serif italic text-gray-900 mb-2">
                {cafe.business_name}
              </h3>

              {/* Contact */}
              <p className="text-sm text-gray-600 mb-1">{cafe.owner_email}</p>
              {cafe.owner_phone && (
                <p className="text-sm text-gray-600 mb-4">{cafe.owner_phone}</p>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-surface-alt rounded-xl">
                <div>
                  <p className="text-xs text-gray-600">Orders</p>
                  <p className="text-lg font-bold text-gray-900">--</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Revenue</p>
                  <p className="text-lg font-bold text-gray-900 font-mono">--</p>
                </div>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(cafe.setup_status)}
                {getTierBadge(cafe.subscription_tier)}
              </div>

              {/* Last Activity */}
              {cafe.last_activity_at && (
                <p className="text-xs text-gray-500 mt-4">
                  Last active: {new Date(cafe.last_activity_at).toLocaleDateString()}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Stats Footer */}
      <div className="mt-8 bg-white rounded-2xl p-6 shadow-md border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-3xl font-bold text-gray-900">{cafes.length}</p>
            <p className="text-sm text-gray-600 mt-1">Total Cafés</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-green-600">
              {cafes.filter(c => c.setup_status === 'launched').length}
            </p>
            <p className="text-sm text-gray-600 mt-1">Launched</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-blue-600">
              {cafes.filter(c => c.setup_status === 'in_progress').length}
            </p>
            <p className="text-sm text-gray-600 mt-1">In Progress</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-yellow-600">
              {cafes.filter(c => c.setup_status === 'pending').length}
            </p>
            <p className="text-sm text-gray-600 mt-1">Pending</p>
          </div>
        </div>
      </div>
    </div>
  )
}
