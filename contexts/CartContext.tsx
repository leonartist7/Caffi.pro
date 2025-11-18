'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface CartItemModifiers {
  size?: { name: string; price: number }
  addons: Array<{ name: string; price: number }>
}

export interface CartItem {
  item_id: string
  tenant_id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  quantity: number
  modifiers: CartItemModifiers
  special_instructions?: string
  // Calculated at time of adding to cart
  unit_price: number // base price + size modifier + addons
  total_price: number // unit_price * quantity
}

interface CartContextType {
  items: CartItem[]
  itemCount: number
  subtotal: number
  tax: number
  total: number
  isCartOpen: boolean
  currency: string
  taxRate: number
  formatPrice: (price: number) => string
  addItem: (
    item: {
      item_id: string
      tenant_id: string
      name: string
      description: string | null
      price: number
      image_url: string | null
    },
    modifiers: CartItemModifiers,
    quantity: number,
    special_instructions?: string
  ) => void
  removeItem: (itemId: string, modifiersHash: string) => void
  updateQuantity: (itemId: string, modifiersHash: string, quantity: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const STORAGE_KEY = 'caffi-cart'

interface CartProviderProps {
  children: ReactNode
  currency?: string
  taxRate?: number
}

export function CartProvider({ children, currency = 'EUR', taxRate = 0.1 }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setItems(parsed)
      } catch (error) {
        console.error('Failed to parse cart from localStorage:', error)
      }
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  // Calculate totals
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0)
  const tax = subtotal * taxRate
  const total = subtotal + tax

  // Format price based on currency
  const formatPrice = (price: number): string => {
    const formatted = price.toFixed(2)
    if (currency === 'EUR') return `€${formatted}`
    if (currency === 'USD') return `$${formatted}`
    if (currency === 'GBP') return `£${formatted}`
    return `${formatted} ${currency}`
  }

  // Generate a hash for item + modifiers to identify unique cart entries
  const getModifiersHash = (modifiers: CartItemModifiers, specialInstructions?: string): string => {
    return JSON.stringify({
      size: modifiers.size?.name || null,
      addons: modifiers.addons.map(a => a.name).sort(),
      instructions: specialInstructions || null,
    })
  }

  // Calculate unit price including modifiers
  const calculateUnitPrice = (basePrice: number, modifiers: CartItemModifiers): number => {
    let price = basePrice
    if (modifiers.size) {
      price += modifiers.size.price
    }
    modifiers.addons.forEach(addon => {
      price += addon.price
    })
    return price
  }

  const addItem = (
    item: {
      item_id: string
      tenant_id: string
      name: string
      description: string | null
      price: number
      image_url: string | null
    },
    modifiers: CartItemModifiers,
    quantity: number,
    special_instructions?: string
  ) => {
    const modifiersHash = getModifiersHash(modifiers, special_instructions)
    const unitPrice = calculateUnitPrice(item.price, modifiers)

    setItems(currentItems => {
      // Check if exact same item with same modifiers exists
      const existingIndex = currentItems.findIndex(
        cartItem =>
          cartItem.item_id === item.item_id &&
          getModifiersHash(cartItem.modifiers, cartItem.special_instructions) === modifiersHash
      )

      if (existingIndex >= 0) {
        // Update quantity of existing item
        const updated = [...currentItems]
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
          total_price: (updated[existingIndex].quantity + quantity) * unitPrice,
        }
        return updated
      } else {
        // Add new item
        const newCartItem: CartItem = {
          ...item,
          quantity,
          modifiers,
          special_instructions,
          unit_price: unitPrice,
          total_price: unitPrice * quantity,
        }
        return [...currentItems, newCartItem]
      }
    })

    // Auto-open cart when item is added
    setIsCartOpen(true)
  }

  const removeItem = (itemId: string, modifiersHash: string) => {
    setItems(currentItems =>
      currentItems.filter(
        item =>
          !(
            item.item_id === itemId &&
            getModifiersHash(item.modifiers, item.special_instructions) === modifiersHash
          )
      )
    )
  }

  const updateQuantity = (itemId: string, modifiersHash: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId, modifiersHash)
      return
    }

    setItems(currentItems =>
      currentItems.map(item => {
        if (
          item.item_id === itemId &&
          getModifiersHash(item.modifiers, item.special_instructions) === modifiersHash
        ) {
          return {
            ...item,
            quantity,
            total_price: item.unit_price * quantity,
          }
        }
        return item
      })
    )
  }

  const clearCart = () => {
    setItems([])
    setIsCartOpen(false)
  }

  const openCart = () => setIsCartOpen(true)
  const closeCart = () => setIsCartOpen(false)
  const toggleCart = () => setIsCartOpen(!isCartOpen)

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        tax,
        total,
        isCartOpen,
        currency,
        taxRate,
        formatPrice,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        openCart,
        closeCart,
        toggleCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
