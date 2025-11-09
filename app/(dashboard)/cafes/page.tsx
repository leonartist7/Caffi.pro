'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import CafeCard from '@/components/CafeCard'

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
  const [showAddModal, setShowAddModal] = useState(false)

  // Form state for adding new café
  const [newCafeName, setNewCafeName] = useState('')
  const [newCafeSlug, setNewCafeSlug] = useState('')
  const [newCafeEmail, setNewCafeEmail] = useState('')
  const [newCafePhone, setNewCafePhone] = useState('')
  const [newCafeTier, setNewCafeTier] = useState('starter')

  useEffect(() => {
    fetchCafes()
  }, [])

  const fetchCafes = async () => {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
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

  const createCafe = async () => {
    try {
      // Trim all inputs
      const trimmedName = newCafeName.trim()
      const trimmedSlug = newCafeSlug.trim()
      const trimmedEmail = newCafeEmail.trim()

      // Validate required fields
      if (!trimmedName) {
        alert('Please enter a business name')
        return
      }
      if (!trimmedSlug) {
        alert('Please enter a slug (URL)')
        return
      }
      if (!trimmedEmail) {
        alert('Please enter an owner email')
        return
      }

      const supabase = createClient()

      const { error } = await supabase
        .from('tenants')
        .insert({
          business_name: trimmedName,
          slug: trimmedSlug,
          owner_email: trimmedEmail,
          owner_phone: newCafePhone.trim(),
          subscription_tier: newCafeTier,
          setup_status: 'pending',
        })

      if (error) {
        console.error('Database error:', error)
        if (error.code === '23505') {
          alert('A café with this slug already exists. Please use a different slug.')
        } else {
          throw error
        }
        return
      }

      // Reset form
      setNewCafeName('')
      setNewCafeSlug('')
      setNewCafeEmail('')
      setNewCafePhone('')
      setNewCafeTier('starter')
      setShowAddModal(false)

      // Refresh list
      fetchCafes()
      alert('Café created successfully!')
    } catch (error) {
      console.error('Error creating cafe:', error)
      alert('Failed to create café. Please try again.')
    }
  }

  const filteredCafes = cafes.filter(cafe => {
    const matchesSearch = cafe.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cafe.owner_email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || cafe.setup_status === statusFilter
    return matchesSearch && matchesStatus
  })

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
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all hover:shadow-xl"
        >
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
            <CafeCard
              key={cafe.tenant_id}
              slug={cafe.slug}
              businessName={cafe.business_name}
              ownerEmail={cafe.owner_email}
              ownerPhone={cafe.owner_phone}
              setupStatus={cafe.setup_status}
              subscriptionTier={cafe.subscription_tier}
              lastActivityAt={cafe.last_activity_at}
            />
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

      {/* Add Café Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-2xl font-bold text-gray-900">Add New Café</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={newCafeName}
                    onChange={(e) => setNewCafeName(e.target.value)}
                    placeholder="e.g., Blue Bottle Coffee"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slug (URL) *
                  </label>
                  <input
                    type="text"
                    value={newCafeSlug}
                    onChange={(e) => setNewCafeSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    placeholder="e.g., blue-bottle-coffee"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Owner Email *
                  </label>
                  <input
                    type="email"
                    value={newCafeEmail}
                    onChange={(e) => setNewCafeEmail(e.target.value)}
                    placeholder="owner@cafe.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={newCafePhone}
                    onChange={(e) => setNewCafePhone(e.target.value)}
                    placeholder="+33 1 23 45 67 89"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subscription Tier
                </label>
                <select
                  value={newCafeTier}
                  onChange={(e) => setNewCafeTier(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl z-10">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewCafeName('')
                  setNewCafeSlug('')
                  setNewCafeEmail('')
                  setNewCafePhone('')
                  setNewCafeTier('starter')
                }}
                className="px-6 py-3 rounded-xl text-gray-700 hover:bg-gray-100 transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={createCafe}
                className="bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-md hover:shadow-lg"
              >
                Create Café
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
