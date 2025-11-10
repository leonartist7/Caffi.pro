'use client'

import { Plus, Minus, Trash2, Coffee } from 'lucide-react'
import type { CartItem } from '@/contexts/CartContext'

interface CartItemProps {
  item: CartItem
  onUpdateQuantity: (quantity: number) => void
  onRemove: () => void
  currency?: string
}

export default function CartItemComponent({
  item,
  onUpdateQuantity,
  onRemove,
  currency = 'EUR',
}: CartItemProps) {
  const formatPrice = (price: number) => {
    if (currency === 'EUR') return `€${price.toFixed(2)}`
    if (currency === 'USD') return `$${price.toFixed(2)}`
    return `${price.toFixed(2)} ${currency}`
  }

  return (
    <div className="flex gap-4 py-4 border-b border-coffee-200 dark:border-dark-700">
      {/* Image */}
      <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-coffee-100 to-cream-100 rounded-lg overflow-hidden">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Coffee className="w-8 h-8 text-coffee-400" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        {/* Name */}
        <h3 className="font-bold text-coffee-900 dark:text-white mb-1 truncate">{item.name}</h3>

        {/* Modifiers */}
        <div className="text-xs text-coffee-600 dark:text-coffee-300 space-y-0.5">
          {item.modifiers.size && <div>Size: {item.modifiers.size.name}</div>}
          {item.modifiers.addons.length > 0 && (
            <div>Add-ons: {item.modifiers.addons.map(a => a.name).join(', ')}</div>
          )}
          {item.special_instructions && (
            <div className="italic">Note: {item.special_instructions}</div>
          )}
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-2 bg-coffee-100 dark:bg-dark-800 rounded-full">
            <button
              onClick={() => onUpdateQuantity(item.quantity - 1)}
              disabled={item.quantity <= 1}
              className="p-1.5 rounded-full hover:bg-coffee-200 dark:hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus size={14} className="text-coffee-700 dark:text-coffee-200" />
            </button>
            <span className="w-6 text-center text-sm font-bold text-coffee-900 dark:text-white">
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQuantity(item.quantity + 1)}
              className="p-1.5 rounded-full hover:bg-coffee-200 dark:hover:bg-dark-700 transition-colors"
              aria-label="Increase quantity"
            >
              <Plus size={14} className="text-coffee-700 dark:text-coffee-200" />
            </button>
          </div>

          {/* Remove Button */}
          <button
            onClick={onRemove}
            className="p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors group"
            aria-label="Remove item"
          >
            <Trash2
              size={16}
              className="text-coffee-500 dark:text-coffee-400 group-hover:text-red-600 dark:group-hover:text-red-400"
            />
          </button>
        </div>
      </div>

      {/* Price */}
      <div className="flex-shrink-0 text-right">
        <div className="font-bold text-coffee-900 dark:text-white">
          {formatPrice(item.total_price)}
        </div>
        {item.quantity > 1 && (
          <div className="text-xs text-coffee-500 dark:text-coffee-400">
            {formatPrice(item.unit_price)} each
          </div>
        )}
      </div>
    </div>
  )
}
