'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useTenant } from '@/contexts/TenantContext'
import { toast } from 'sonner'
import {
  MapPin,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Globe,
  Phone,
  Mail,
  Store,
  TrendingUp,
  Clock,
  X,
  Building2,
} from 'lucide-react'

interface Location {
  location_id: string
  tenant_id: string
  name: string
  slug: string
  address: string
  city: string
  postal_code: string
  phone: string
  email: string
  latitude: number | null
  longitude: number | null
  opens_at: string | null
  closes_at: string | null
  is_active: boolean
  accepts_orders: boolean
  created_at: string
}

export default function LocationsPage() {
  const { selectedTenant } = useTenant()
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterActive, setFilterActive] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const supabase = createClient()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    address: '',
    city: '',
    postal_code: '',
    phone: '',
    email: '',
    opens_at: '07:00',
    closes_at: '20:00',
    is_active: true,
    accepts_orders: true,
  })

  const fetchLocations = useCallback(async () => {
    if (!selectedTenant) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('tenant_id', selectedTenant.tenant_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLocations(data || [])
    } catch (error) {
      console.error('Error fetching locations:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedTenant, supabase])

  useEffect(() => {
    if (selectedTenant) {
      fetchLocations()
    }
  }, [selectedTenant, fetchLocations])

  const openAddModal = () => {
    setEditingLocation(null)
    setFormData({
      name: '',
      slug: '',
      address: '',
      city: '',
      postal_code: '',
      phone: '',
      email: '',
      opens_at: '07:00',
      closes_at: '20:00',
      is_active: true,
      accepts_orders: true,
    })
    setShowModal(true)
  }

  const openEditModal = (location: Location) => {
    setEditingLocation(location)
    setFormData({
      name: location.name,
      slug: location.slug,
      address: location.address,
      city: location.city,
      postal_code: location.postal_code,
      phone: location.phone || '',
      email: location.email || '',
      opens_at: location.opens_at || '07:00',
      closes_at: location.closes_at || '20:00',
      is_active: location.is_active,
      accepts_orders: location.accepts_orders,
    })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!selectedTenant) return

    try {
      if (!formData.name || !formData.slug || !formData.city) {
        toast.error('Please fill in all required fields (Name, Slug, City)')
        return
      }

      if (editingLocation) {
        // Update existing location
        const { error } = await supabase
          .from('locations')
          .update({
            name: formData.name,
            slug: formData.slug,
            address: formData.address,
            city: formData.city,
            postal_code: formData.postal_code,
            phone: formData.phone,
            email: formData.email,
            opens_at: formData.opens_at,
            closes_at: formData.closes_at,
            is_active: formData.is_active,
            accepts_orders: formData.accepts_orders,
          })
          .eq('location_id', editingLocation.location_id)
          .eq('tenant_id', selectedTenant.tenant_id)

        if (error) throw error
        toast.success('Location updated successfully!')
      } else {
        // Create new location
        const { error } = await supabase.from('locations').insert({
          tenant_id: selectedTenant.tenant_id,
          name: formData.name,
          slug: formData.slug,
          address: formData.address,
          city: formData.city,
          postal_code: formData.postal_code,
          phone: formData.phone,
          email: formData.email,
          opens_at: formData.opens_at,
          closes_at: formData.closes_at,
          is_active: formData.is_active,
          accepts_orders: formData.accepts_orders,
        })

        if (error) {
          if (error.code === '23505') {
            toast.error('A location with this slug already exists. Please use a different slug.')
            return
          }
          throw error
        }
        toast.success('Location created successfully!')
      }

      setShowModal(false)
      fetchLocations()
    } catch (error) {
      console.error('Error saving location:', error)
      toast.error('Failed to save location. Please try again.')
    }
  }

  const handleDelete = async (locationId: string) => {
    if (!selectedTenant) return

    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('location_id', locationId)
        .eq('tenant_id', selectedTenant.tenant_id)

      if (error) throw error

      toast.success('Location deleted successfully!')
      setDeleteConfirm(null)
      fetchLocations()
    } catch (error) {
      console.error('Error deleting location:', error)
      toast.error('Failed to delete location. Please try again.')
    }
  }

  const filteredLocations = locations.filter(location => {
    const matchesSearch =
      location.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.address?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter =
      filterActive === 'all' ||
      (filterActive === 'active' && location.is_active) ||
      (filterActive === 'inactive' && !location.is_active)

    return matchesSearch && matchesFilter
  })

  const stats = {
    total: locations.length,
    active: locations.filter(l => l.is_active).length,
    accepting: locations.filter(l => l.accepts_orders).length,
    cities: new Set(locations.map(l => l.city)).size,
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
            Please select a client from the dropdown above to manage their café locations.
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
            Locations Management
          </h1>
          <p className="text-coffee-600 dark:text-cream-400 mt-1 lg:mt-2 text-sm lg:text-lg">
            Manage {selectedTenant.business_name}'s café locations and operating hours
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="self-start lg:self-auto flex items-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 bg-gradient-coffee text-cream-100 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
        >
          <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
          <span className="text-sm lg:text-base">Add Location</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-8">
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                Total Locations
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mt-1">
                {stats.total}
              </p>
            </div>
            <Store className="w-6 h-6 lg:w-8 lg:h-8 text-coffee-600 dark:text-cream-300" />
          </div>
        </div>

        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                Active
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mt-1">
                {stats.active}
              </p>
            </div>
            <TrendingUp className="w-6 h-6 lg:w-8 lg:h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                Accepting Orders
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mt-1">
                {stats.accepting}
              </p>
            </div>
            <Globe className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                Cities
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mt-1">
                {stats.cities}
              </p>
            </div>
            <MapPin className="w-6 h-6 lg:w-8 lg:h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700 mb-6 lg:mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-coffee-400 dark:text-cream-500" />
            <input
              type="text"
              placeholder="Search by name, city, or address..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 placeholder:text-coffee-400 dark:placeholder:text-cream-500 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-coffee-600 dark:text-cream-300" />
            <select
              value={filterActive}
              onChange={e => setFilterActive(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600"
            >
              <option value="all">All Locations</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Locations Grid */}
      {loading ? (
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-12 shadow-lg border border-coffee-200/50 dark:border-dark-700 text-center">
          <div className="inline-block w-8 h-8 border-4 border-coffee-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-coffee-600 dark:text-cream-400 mt-4">Loading locations...</p>
        </div>
      ) : filteredLocations.length === 0 ? (
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-12 shadow-lg border border-coffee-200/50 dark:border-dark-700 text-center">
          <MapPin className="w-12 h-12 text-coffee-300 dark:text-dark-600 mx-auto mb-4" />
          <p className="text-coffee-600 dark:text-cream-400">No locations found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
          {filteredLocations.map(location => (
            <div
              key={location.location_id}
              className="group bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700 hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-coffee flex items-center justify-center shadow-md">
                    <Store className="w-5 h-5 lg:w-6 lg:h-6 text-cream-100" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base lg:text-lg text-coffee-900 dark:text-cream-100">
                      {location.name}
                    </h3>
                    <p className="text-xs text-coffee-500 dark:text-cream-500">{location.city}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(location)}
                    className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(location.location_id)}
                    className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2 mb-4">
                <div className="flex items-start gap-2 text-sm text-coffee-600 dark:text-cream-400">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    {location.address}
                    {location.postal_code && `, ${location.postal_code}`}
                  </span>
                </div>
                {location.phone && (
                  <div className="flex items-center gap-2 text-sm text-coffee-600 dark:text-cream-400">
                    <Phone className="w-4 h-4" />
                    {location.phone}
                  </div>
                )}
                {location.email && (
                  <div className="flex items-center gap-2 text-sm text-coffee-600 dark:text-cream-400">
                    <Mail className="w-4 h-4" />
                    {location.email}
                  </div>
                )}
              </div>

              {/* Hours */}
              {location.opens_at && location.closes_at && (
                <div className="flex items-center gap-2 text-sm text-coffee-600 dark:text-cream-400 mb-4">
                  <Clock className="w-4 h-4" />
                  <span>
                    {location.opens_at} - {location.closes_at}
                  </span>
                </div>
              )}

              {/* Status Badges */}
              <div className="flex gap-2 flex-wrap">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    location.is_active
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-700/30 text-gray-700 dark:text-gray-400'
                  }`}
                >
                  {location.is_active ? 'Active' : 'Inactive'}
                </span>
                {location.accepts_orders && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                    Accepting Orders
                  </span>
                )}
              </div>

              {/* Delete Confirmation */}
              {deleteConfirm === location.location_id && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-sm text-red-900 dark:text-red-300 font-semibold mb-2">
                    Delete this location?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(location.location_id)}
                      className="flex-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-all"
                    >
                      Yes, Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="flex-1 px-3 py-1.5 bg-gray-200 dark:bg-dark-700 text-coffee-900 dark:text-cream-100 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-dark-600 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto border border-coffee-200/50 dark:border-dark-700">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-dark-800 rounded-t-2xl p-6 border-b border-coffee-200/50 dark:border-dark-700 flex items-center justify-between z-10">
              <h2 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-coffee-700 to-mocha bg-clip-text text-transparent">
                {editingLocation ? 'Edit Location' : 'Add New Location'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-coffee-100 dark:hover:bg-dark-700 transition-all"
              >
                <X className="w-5 h-5 text-coffee-600 dark:text-cream-300" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                    Location Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Downtown Café"
                    className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                    Slug (URL) *
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                      })
                    }
                    placeholder="e.g., downtown-cafe"
                    className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g., 123 Main Street"
                  className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g., Paris"
                    className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={e => setFormData({ ...formData, postal_code: e.target.value })}
                    placeholder="e.g., 75001"
                    className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+33 1 23 45 67 89"
                    className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="location@cafe.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                    Opens At
                  </label>
                  <input
                    type="time"
                    value={formData.opens_at}
                    onChange={e => setFormData({ ...formData, opens_at: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                    Closes At
                  </label>
                  <input
                    type="time"
                    value={formData.closes_at}
                    onChange={e => setFormData({ ...formData, closes_at: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600"
                  />
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-coffee-300 text-coffee-600 focus:ring-coffee-500"
                  />
                  <span className="text-sm text-coffee-700 dark:text-cream-300">Active</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.accepts_orders}
                    onChange={e => setFormData({ ...formData, accepts_orders: e.target.checked })}
                    className="w-4 h-4 rounded border-coffee-300 text-coffee-600 focus:ring-coffee-500"
                  />
                  <span className="text-sm text-coffee-700 dark:text-cream-300">
                    Accepts Orders
                  </span>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-dark-800 rounded-b-2xl p-6 border-t border-coffee-200/50 dark:border-dark-700 flex justify-end gap-3 z-10">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 rounded-xl text-coffee-700 dark:text-cream-300 hover:bg-coffee-100 dark:hover:bg-dark-700 transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2.5 bg-gradient-coffee text-cream-100 rounded-xl font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all"
              >
                {editingLocation ? 'Update Location' : 'Create Location'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
