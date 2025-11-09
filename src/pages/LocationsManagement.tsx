import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Plus, Edit, Trash2, MapPin, Phone, Mail, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { LocationModal } from '@/components/locations/LocationModal'

export function LocationsManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<any>(null)
  const queryClient = useQueryClient()

  // Fetch locations
  const { data: locations, isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('display_order', { ascending: true })
      
      if (error) throw error
      return data
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (locationId: string) => {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('location_id', locationId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Location deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete location')
    },
  })

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ locationId, isActive }: { locationId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('locations')
        .update({ is_active: !isActive })
        .eq('location_id', locationId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Location status updated')
    },
  })

  const handleEdit = (location: any) => {
    setEditingLocation(location)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setEditingLocation(null)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Locations</h1>
          <p className="mt-2 text-gray-600">
            Manage your physical café locations
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Location
        </button>
      </div>

      {/* Locations Grid */}
      {isLoading ? (
        <div className="text-center py-12 card">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading locations...</p>
        </div>
      ) : locations && locations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((location) => (
            <div key={location.location_id} className="card hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {location.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span
                      className={`badge ${
                        location.is_active ? 'badge-success' : 'badge-danger'
                      }`}
                    >
                      {location.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(location)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this location?')) {
                        deleteMutation.mutate(location.location_id)
                      }
                    }}
                    className="p-2 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-3 mb-4">
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <div>{location.address}</div>
                    <div>
                      {location.city}
                      {location.postal_code && `, ${location.postal_code}`}
                    </div>
                    <div>{location.country}</div>
                  </div>
                </div>

                {location.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <a href={`tel:${location.phone}`} className="hover:text-primary-600">
                      {location.phone}
                    </a>
                  </div>
                )}

                {location.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <a href={`mailto:${location.email}`} className="hover:text-primary-600">
                      {location.email}
                    </a>
                  </div>
                )}
              </div>

              {/* Hours */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">Today's Hours</span>
                </div>
                <div className="text-sm text-gray-900">
                  {(() => {
                    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
                    const hours = location.hours?.[today]
                    return hours || 'Closed'
                  })()}
                </div>
              </div>

              {/* Features */}
              <div className="pt-4 border-t border-gray-200 mt-4">
                <div className="flex flex-wrap gap-2">
                  {location.accepts_mobile_orders && (
                    <span className="badge badge-info">📱 Mobile Orders</span>
                  )}
                  {location.accepts_dine_in_orders && (
                    <span className="badge badge-info">🍽️ Dine-In</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 mt-4 border-t border-gray-200">
                <button
                  onClick={() =>
                    toggleActiveMutation.mutate({
                      locationId: location.location_id,
                      isActive: location.is_active,
                    })
                  }
                  className="w-full btn btn-secondary text-sm"
                >
                  {location.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No locations yet
          </h3>
          <p className="text-gray-600 mb-6">
            Add your first café location to start accepting orders
          </p>
          <button onClick={handleAdd} className="btn btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Location
          </button>
        </div>
      )}

      {/* Modal */}
      <LocationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingLocation(null)
        }}
        location={editingLocation}
      />
    </div>
  )
}
