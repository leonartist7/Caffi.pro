import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react'
import { toast } from 'sonner'

interface LocationFormData {
  name: string
  address: string
  city: string
  state: string
  postal_code: string
  country: string
  phone: string
  email: string
  latitude: number | null
  longitude: number | null
  estimated_prep_time: number
  accepts_mobile_orders: boolean
  accepts_dine_in_orders: boolean
  is_active: boolean
}

interface LocationModalProps {
  isOpen: boolean
  onClose: () => void
  location?: any
}

export function LocationModal({ isOpen, onClose, location }: LocationModalProps) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<LocationFormData>({
    defaultValues: {
      name: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'France',
      phone: '',
      email: '',
      latitude: null,
      longitude: null,
      estimated_prep_time: 15,
      accepts_mobile_orders: true,
      accepts_dine_in_orders: true,
      is_active: true,
    },
  })

  useEffect(() => {
    if (location) {
      reset({
        name: location.name,
        address: location.address,
        city: location.city,
        state: location.state || '',
        postal_code: location.postal_code || '',
        country: location.country,
        phone: location.phone || '',
        email: location.email || '',
        latitude: location.latitude,
        longitude: location.longitude,
        estimated_prep_time: location.estimated_prep_time,
        accepts_mobile_orders: location.accepts_mobile_orders,
        accepts_dine_in_orders: location.accepts_dine_in_orders,
        is_active: location.is_active,
      })
    } else {
      reset()
    }
  }, [location, reset])

  const mutation = useMutation({
    mutationFn: async (data: LocationFormData) => {
      const payload = {
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state || null,
        postal_code: data.postal_code || null,
        country: data.country,
        phone: data.phone || null,
        email: data.email || null,
        latitude: data.latitude,
        longitude: data.longitude,
        estimated_prep_time: data.estimated_prep_time,
        accepts_mobile_orders: data.accepts_mobile_orders,
        accepts_dine_in_orders: data.accepts_dine_in_orders,
        is_active: data.is_active,
        tenant_id: 'YOUR_TENANT_ID',
        display_order: 0,
        hours: {
          monday: '07:00-19:00',
          tuesday: '07:00-19:00',
          wednesday: '07:00-19:00',
          thursday: '07:00-19:00',
          friday: '07:00-19:00',
          saturday: '08:00-20:00',
          sunday: '08:00-18:00',
        },
        special_hours: [],
      }

      if (location) {
        const { error } = await supabase
          .from('locations')
          .update(payload)
          .eq('location_id', location.location_id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('locations')
          .insert(payload)
        
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success(location ? 'Location updated successfully' : 'Location created successfully')
      onClose()
      reset()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save location')
    },
  })

  const onSubmit = (data: LocationFormData) => {
    mutation.mutate(data)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={onClose} />

        <div className="relative inline-block w-full max-w-3xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold text-gray-900">
              {location ? 'Edit Location' : 'Add Location'}
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location Name *
                </label>
                <input
                  {...register('name', { required: 'Name is required' })}
                  className="input"
                  placeholder="Downtown Café"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address *
                </label>
                <input
                  {...register('address', { required: 'Address is required' })}
                  className="input"
                  placeholder="123 Main Street"
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  {...register('city', { required: 'City is required' })}
                  className="input"
                  placeholder="Paris"
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State/Region
                </label>
                <input
                  {...register('state')}
                  className="input"
                  placeholder="Île-de-France"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postal Code
                </label>
                <input
                  {...register('postal_code')}
                  className="input"
                  placeholder="75001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country *
                </label>
                <input
                  {...register('country', { required: 'Country is required' })}
                  className="input"
                  placeholder="France"
                />
                {errors.country && (
                  <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  {...register('phone')}
                  className="input"
                  placeholder="+33 1 23 45 67 89"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  {...register('email')}
                  className="input"
                  placeholder="downtown@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  {...register('latitude')}
                  className="input"
                  placeholder="48.8566"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  {...register('longitude')}
                  className="input"
                  placeholder="2.3522"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Prep Time (minutes)
                </label>
                <input
                  type="number"
                  {...register('estimated_prep_time')}
                  className="input"
                  placeholder="15"
                />
              </div>

              <div className="md:col-span-2 space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register('accepts_mobile_orders')}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Accept mobile orders
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register('accepts_dine_in_orders')}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Accept dine-in orders
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register('is_active')}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Active (visible to customers)
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
                {mutation.isPending ? 'Saving...' : location ? 'Update Location' : 'Add Location'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
