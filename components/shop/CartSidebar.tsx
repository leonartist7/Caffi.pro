'use client'

import { X, ShoppingBag, ArrowRight, Trash2 } from 'lucide-react'
import { useCart, type CartItem } from '@/contexts/CartContext'
import CartItemComponent from './CartItem'
import { useRouter } from 'next/navigation'

interface CartSidebarProps {
  tenantSlug: string
  currency?: string
}

export default function CartSidebar({ tenantSlug, currency = 'EUR' }: CartSidebarProps) {
  const {
    items,
    itemCount,
    subtotal,
    tax,
    total,
    isCartOpen,
    closeCart,
    clearCart,
    updateQuantity,
    removeItem,
  } = useCart()
  const router = useRouter()

  const formatPrice = (price: number) => {
    if (currency === 'EUR') return `€${price.toFixed(2)}`
    if (currency === 'USD') return `$${price.toFixed(2)}`
    return `${price.toFixed(2)} ${currency}`
  }

  const getModifiersHash = (item: CartItem): string => {
    return JSON.stringify({
      size: item.modifiers.size?.name || null,
      addons: item.modifiers.addons.map(a => a.name).sort(),
      instructions: item.special_instructions || null,
    })
  }

  const handleCheckout = () => {
    closeCart()
    router.push(`/shop/${tenantSlug}/checkout`)
  }

  return (
    <>
      {/* Backdrop */}
      {isCartOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={closeCart}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-dark-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isCartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-coffee-200 dark:border-dark-700">
            <div className="flex items-center gap-2">
              <ShoppingBag className="text-coffee-700 dark:text-coffee-300" size={24} />
              <h2 className="text-xl font-bold text-coffee-900 dark:text-white">
                Your Cart
                {itemCount > 0 && (
                  <span className="ml-2 text-sm font-normal text-coffee-600 dark:text-coffee-300">
                    ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                  </span>
                )}
              </h2>
            </div>
            <button
              onClick={closeCart}
              className="p-2 rounded-full hover:bg-coffee-100 dark:hover:bg-dark-800 transition-colors"
              aria-label="Close cart"
            >
              <X className="text-coffee-700 dark:text-coffee-300" size={24} />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingBag className="w-16 h-16 text-coffee-300 dark:text-dark-600 mb-4" />
                <h3 className="text-lg font-bold text-coffee-700 dark:text-coffee-200 mb-2">
                  Your cart is empty
                </h3>
                <p className="text-coffee-600 dark:text-coffee-300 mb-4">
                  Add some delicious items to get started!
                </p>
                <button
                  onClick={closeCart}
                  className="px-6 py-2 bg-coffee-700 text-white rounded-full hover:bg-coffee-800 transition-colors"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <div className="space-y-0">
                {items.map((item, index) => (
                  <CartItemComponent
                    key={`${item.item_id}-${index}`}
                    item={item}
                    onUpdateQuantity={quantity =>
                      updateQuantity(item.item_id, getModifiersHash(item), quantity)
                    }
                    onRemove={() => removeItem(item.item_id, getModifiersHash(item))}
                    currency={currency}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer (only show if cart has items) */}
          {items.length > 0 && (
            <div className="border-t border-coffee-200 dark:border-dark-700 p-4 space-y-4">
              {/* Clear Cart Button */}
              <button
                onClick={clearCart}
                className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
              >
                <Trash2 size={16} />
                Clear Cart
              </button>

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-coffee-700 dark:text-coffee-300">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-coffee-700 dark:text-coffee-300">
                  <span>Tax (10%)</span>
                  <span className="font-medium">{formatPrice(tax)}</span>
                </div>
                <div className="flex items-center justify-between text-lg font-bold text-coffee-900 dark:text-white pt-2 border-t border-coffee-200 dark:border-dark-700">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                className="w-full flex items-center justify-center gap-2 bg-coffee-700 hover:bg-coffee-800 text-white py-4 rounded-full font-bold text-lg transition-colors shadow-lg"
              >
                Proceed to Checkout
                <ArrowRight size={20} />
              </button>

              {/* Continue Shopping */}
              <button
                onClick={closeCart}
                className="w-full text-center text-coffee-600 dark:text-coffee-300 hover:text-coffee-800 dark:hover:text-coffee-100 transition-colors py-2"
              >
                Continue Shopping
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
