'use client'

import { Coffee, Plus } from 'lucide-react'

export interface MenuItem {
  item_id: string
  tenant_id: string
  category_id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_active: boolean
  tags: string[]
  modifiers: {
    sizes?: Array<{ name: string; price: number }>
    addons?: Array<{ name: string; price: number }>
  }
  categories?: {
    name: string
  }
}

interface MenuItemCardProps {
  item: MenuItem
  // eslint-disable-next-line no-unused-vars
  onViewDetails: (item: MenuItem) => void
  // eslint-disable-next-line no-unused-vars
  onAddToCart?: (item: MenuItem) => void
  currency?: string
}

export default function MenuItemCard({
  item,
  onViewDetails,
  onAddToCart,
  currency = 'EUR',
}: MenuItemCardProps) {
  const formatPrice = (price: number) => {
    if (currency === 'EUR') return `€${price.toFixed(2)}`
    if (currency === 'USD') return `$${price.toFixed(2)}`
    return `${price.toFixed(2)} ${currency}`
  }

  return (
    <div
      className={`group relative bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-coffee-200/50 dark:border-dark-700 ${
        !item.is_active ? 'opacity-60' : 'hover:scale-105'
      }`}
    >
      {/* Unavailable Overlay */}
      {!item.is_active && (
        <div className="absolute top-3 right-3 z-10 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
          Unavailable
        </div>
      )}

      {/* Image */}
      <div
        className="relative h-48 overflow-hidden bg-gradient-to-br from-coffee-100 to-cream-100 cursor-pointer"
        onClick={() => onViewDetails(item)}
      >
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Coffee className="w-16 h-16 text-coffee-400" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category Badge */}
        {item.categories?.name && (
          <div className="text-xs text-coffee-600 dark:text-coffee-300 font-medium mb-2">
            {item.categories.name}
          </div>
        )}

        {/* Name */}
        <h3
          className="text-lg font-bold text-coffee-900 dark:text-white mb-2 cursor-pointer hover:text-coffee-700 dark:hover:text-coffee-200"
          onClick={() => onViewDetails(item)}
        >
          {item.name}
        </h3>

        {/* Description */}
        {item.description && (
          <p className="text-sm text-coffee-600 dark:text-coffee-300 mb-3 line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="text-xs bg-coffee-100 dark:bg-dark-700 text-coffee-700 dark:text-coffee-200 px-2 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Price and Add to Cart */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-2xl font-bold text-coffee-700 dark:text-coffee-300">
            {formatPrice(item.price)}
          </div>
          {item.is_active && onAddToCart && (
            <button
              onClick={e => {
                e.stopPropagation()
                onAddToCart(item)
              }}
              className="bg-coffee-700 hover:bg-coffee-800 text-white p-3 rounded-full transition-colors shadow-lg hover:shadow-xl group-hover:scale-110 transition-transform"
              aria-label="Add to cart"
            >
              <Plus size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
