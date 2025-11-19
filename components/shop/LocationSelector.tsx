'use client'

import { MapPin, Check } from 'lucide-react'

export interface Location {
  location_id: string
  tenant_id: string
  name: string
  address: string
  city: string
  postal_code: string
  phone: string | null
  is_active: boolean
}

interface LocationSelectorProps {
  locations: Location[]
  selectedLocation: string | null
  // eslint-disable-next-line no-unused-vars
  onSelectLocation: (locationId: string) => void
}

export default function LocationSelector({
  locations,
  selectedLocation,
  onSelectLocation,
}: LocationSelectorProps) {
  if (locations.length === 0) {
    return (
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <p className="text-amber-700 dark:text-amber-300 text-sm">
          No locations available for pickup. Please contact the shop.
        </p>
      </div>
    )
  }

  // If only one location, auto-select it
  if (locations.length === 1 && !selectedLocation) {
    onSelectLocation(locations[0].location_id)
  }

  return (
    <div className="space-y-3">
      {locations.map(location => (
        <button
          key={location.location_id}
          onClick={() => onSelectLocation(location.location_id)}
          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
            selectedLocation === location.location_id
              ? 'border-coffee-700 bg-coffee-50 dark:border-coffee-500 dark:bg-coffee-900/30'
              : 'border-coffee-200 dark:border-dark-700 hover:border-coffee-400 dark:hover:border-dark-600'
          }`}
        >
          <div className="flex items-start gap-3">
            {/* Map Pin Icon */}
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                selectedLocation === location.location_id
                  ? 'bg-coffee-700 text-white'
                  : 'bg-coffee-100 dark:bg-dark-700 text-coffee-700 dark:text-coffee-300'
              }`}
            >
              {selectedLocation === location.location_id ? (
                <Check size={20} />
              ) : (
                <MapPin size={20} />
              )}
            </div>

            {/* Location Info */}
            <div className="flex-1">
              <h3 className="font-bold text-coffee-900 dark:text-white mb-1">{location.name}</h3>
              <p className="text-sm text-coffee-600 dark:text-coffee-300">{location.address}</p>
              <p className="text-sm text-coffee-600 dark:text-coffee-300">
                {location.city}, {location.postal_code}
              </p>
              {location.phone && (
                <p className="text-sm text-coffee-500 dark:text-coffee-400 mt-1">
                  📞 {location.phone}
                </p>
              )}
            </div>

            {/* Selected Indicator */}
            {selectedLocation === location.location_id && (
              <div className="flex-shrink-0 w-6 h-6 bg-coffee-700 rounded-full flex items-center justify-center">
                <Check size={16} className="text-white" />
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
