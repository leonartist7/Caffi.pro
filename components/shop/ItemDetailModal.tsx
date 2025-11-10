'use client'

import { X, Coffee, Plus, Minus, AlertTriangle, Tag, Flame } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { MenuItem } from './MenuItem'

interface ItemDetailModalProps {
  item: MenuItem | null
  isOpen: boolean
  onClose: () => void
  onAddToCart?: (item: MenuItem, options: ItemOptions) => void
  currency?: string
}

export interface ItemOptions {
  size?: { name: string; price_modifier: number }
  addons: Array<{ name: string; price: number }>
  quantity: number
  special_instructions?: string
}

export default function ItemDetailModal({
  item,
  isOpen,
  onClose,
  onAddToCart,
  currency = 'EUR',
}: ItemDetailModalProps) {
  const [selectedSize, setSelectedSize] = useState<{ name: string; price_modifier: number } | null>(
    null
  )
  const [selectedAddons, setSelectedAddons] = useState<Array<{ name: string; price: number }>>([])
  const [quantity, setQuantity] = useState(1)
  const [specialInstructions, setSpecialInstructions] = useState('')

  // Reset state when modal opens/closes or item changes
  useEffect(() => {
    if (isOpen && item) {
      // Set default size if available
      if (item.modifiers?.sizes && item.modifiers.sizes.length > 0) {
        setSelectedSize(item.modifiers.sizes[0])
      } else {
        setSelectedSize(null)
      }
      setSelectedAddons([])
      setQuantity(1)
      setSpecialInstructions('')
    }
  }, [isOpen, item])

  if (!isOpen || !item) return null

  const formatPrice = (price: number) => {
    if (currency === 'EUR') return `€${price.toFixed(2)}`
    if (currency === 'USD') return `$${price.toFixed(2)}`
    return `${price.toFixed(2)} ${currency}`
  }

  const calculateTotalPrice = () => {
    let total = item.price
    if (selectedSize) total += selectedSize.price_modifier
    selectedAddons.forEach(addon => (total += addon.price))
    return total * quantity
  }

  const handleToggleAddon = (addon: { name: string; price: number }) => {
    if (selectedAddons.find(a => a.name === addon.name)) {
      setSelectedAddons(selectedAddons.filter(a => a.name !== addon.name))
    } else {
      setSelectedAddons([...selectedAddons, addon])
    }
  }

  const handleAddToCart = () => {
    if (!onAddToCart) return

    const options: ItemOptions = {
      size: selectedSize || undefined,
      addons: selectedAddons,
      quantity,
      special_instructions: specialInstructions || undefined,
    }

    onAddToCart(item, options)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-dark-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/90 dark:bg-dark-800/90 rounded-full hover:bg-white dark:hover:bg-dark-700 transition-colors"
          aria-label="Close"
        >
          <X size={24} className="text-coffee-700 dark:text-coffee-200" />
        </button>

        {/* Image */}
        <div className="relative h-64 md:h-80 overflow-hidden bg-gradient-to-br from-coffee-100 to-cream-100 rounded-t-3xl">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Coffee className="w-24 h-24 text-coffee-400" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {item.is_featured && (
              <div className="bg-amber-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">
                ⭐ Featured
              </div>
            )}
            {!item.is_available && (
              <div className="bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">
                Unavailable
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            {item.categories?.name && (
              <div className="text-sm text-coffee-600 dark:text-coffee-300 font-medium mb-2">
                {item.categories.name}
              </div>
            )}
            <h2 className="text-3xl font-bold text-coffee-900 dark:text-white mb-2">{item.name}</h2>
            <div className="text-3xl font-bold text-coffee-700 dark:text-coffee-300">
              {formatPrice(item.price)}
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-coffee-600 dark:text-coffee-300">{item.description}</p>
          )}

          {/* Tags, Calories, Allergens */}
          <div className="flex flex-wrap gap-3">
            {item.calories && (
              <div className="flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-full text-sm">
                <Flame size={16} />
                {item.calories} cal
              </div>
            )}
            {item.tags?.map(tag => (
              <div
                key={tag}
                className="flex items-center gap-1 bg-coffee-100 dark:bg-dark-700 text-coffee-700 dark:text-coffee-200 px-3 py-1 rounded-full text-sm"
              >
                <Tag size={14} />
                {tag}
              </div>
            ))}
          </div>

          {/* Allergens Warning */}
          {item.allergens && item.allergens.length > 0 && (
            <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-3 rounded-lg">
              <AlertTriangle
                size={20}
                className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
              />
              <div>
                <div className="font-semibold text-amber-900 dark:text-amber-100 text-sm">
                  Allergen Information
                </div>
                <div className="text-amber-700 dark:text-amber-300 text-sm">
                  Contains: {item.allergens.join(', ')}
                </div>
              </div>
            </div>
          )}

          {/* Size Selection */}
          {item.modifiers?.sizes && item.modifiers.sizes.length > 0 && (
            <div>
              <h3 className="font-bold text-coffee-900 dark:text-white mb-3">Select Size</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {item.modifiers.sizes.map(size => (
                  <button
                    key={size.name}
                    onClick={() => setSelectedSize(size)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedSize?.name === size.name
                        ? 'border-coffee-700 bg-coffee-50 dark:border-coffee-500 dark:bg-coffee-900/30'
                        : 'border-coffee-200 dark:border-dark-700 hover:border-coffee-400 dark:hover:border-dark-600'
                    }`}
                  >
                    <div className="font-semibold text-coffee-900 dark:text-white">{size.name}</div>
                    {size.price_modifier !== 0 && (
                      <div className="text-sm text-coffee-600 dark:text-coffee-300">
                        {size.price_modifier > 0 ? '+' : ''}
                        {formatPrice(size.price_modifier)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Addons */}
          {item.modifiers?.addons && item.modifiers.addons.length > 0 && (
            <div>
              <h3 className="font-bold text-coffee-900 dark:text-white mb-3">Add-ons</h3>
              <div className="space-y-2">
                {item.modifiers.addons.map(addon => (
                  <button
                    key={addon.name}
                    onClick={() => handleToggleAddon(addon)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                      selectedAddons.find(a => a.name === addon.name)
                        ? 'border-coffee-700 bg-coffee-50 dark:border-coffee-500 dark:bg-coffee-900/30'
                        : 'border-coffee-200 dark:border-dark-700 hover:border-coffee-400 dark:hover:border-dark-600'
                    }`}
                  >
                    <span className="font-medium text-coffee-900 dark:text-white">
                      {addon.name}
                    </span>
                    <span className="text-coffee-700 dark:text-coffee-300">
                      +{formatPrice(addon.price)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Special Instructions */}
          {item.is_available && (
            <div>
              <h3 className="font-bold text-coffee-900 dark:text-white mb-3">
                Special Instructions (Optional)
              </h3>
              <textarea
                value={specialInstructions}
                onChange={e => setSpecialInstructions(e.target.value)}
                placeholder="e.g., Extra hot, no foam, etc."
                className="w-full p-3 border-2 border-coffee-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-coffee-900 dark:text-white placeholder-coffee-400 dark:placeholder-dark-500 focus:border-coffee-700 dark:focus:border-coffee-500 focus:outline-none"
                rows={3}
              />
            </div>
          )}

          {/* Quantity and Add to Cart */}
          {item.is_available && onAddToCart && (
            <div className="flex items-center gap-4 pt-4 border-t border-coffee-200 dark:border-dark-700">
              {/* Quantity Selector */}
              <div className="flex items-center gap-3 bg-coffee-100 dark:bg-dark-800 rounded-full p-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="p-2 rounded-full hover:bg-coffee-200 dark:hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus size={20} className="text-coffee-700 dark:text-coffee-200" />
                </button>
                <span className="w-8 text-center font-bold text-coffee-900 dark:text-white">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 rounded-full hover:bg-coffee-200 dark:hover:bg-dark-700 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus size={20} className="text-coffee-700 dark:text-coffee-200" />
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleAddToCart}
                className="flex-1 flex items-center justify-center gap-2 bg-coffee-700 hover:bg-coffee-800 text-white py-4 rounded-full font-bold text-lg transition-colors shadow-lg"
              >
                <Plus size={24} />
                Add {quantity > 1 ? `${quantity} ` : ''}to Cart •{' '}
                {formatPrice(calculateTotalPrice())}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
