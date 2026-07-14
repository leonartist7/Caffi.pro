'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export interface OrderingCartModifier {
  modifier_id: string
  name: string
  price_delta_cents: number
}

export interface OrderingCartItem {
  line_id: string
  item_id: string
  name: string
  image_url: string | null
  base_price_cents: number
  quantity: number
  modifiers: OrderingCartModifier[]
  notes: string
}

interface AddCartItem {
  item_id: string
  name: string
  image_url: string | null
  base_price_cents: number
  quantity: number
  modifiers: OrderingCartModifier[]
  notes?: string
}

interface OrderingCartValue {
  items: OrderingCartItem[]
  itemCount: number
  subtotalCents: number
  currency: string
  isOpen: boolean
  addItem: (item: AddCartItem) => void
  updateQuantity: (lineId: string, quantity: number) => void
  removeItem: (lineId: string) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
}

const OrderingCartContext = createContext<OrderingCartValue | null>(null)

function lineIdentity(item: AddCartItem): string {
  return JSON.stringify({
    item_id: item.item_id,
    modifier_ids: item.modifiers.map(modifier => modifier.modifier_id).sort(),
    notes: item.notes?.trim() ?? '',
  })
}

export function cartLineUnitCents(item: OrderingCartItem): number {
  return (
    item.base_price_cents +
    item.modifiers.reduce((sum, modifier) => sum + modifier.price_delta_cents, 0)
  )
}

export function OrderingCartProvider({
  venueId,
  currency,
  children,
}: {
  venueId: string
  currency: string
  children: ReactNode
}) {
  const storageKey = `aro-cart:${venueId}`
  const [items, setItems] = useState<OrderingCartItem[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      setItems(stored ? (JSON.parse(stored) as OrderingCartItem[]) : [])
    } catch {
      setItems([])
    } finally {
      setHydrated(true)
    }
  }, [storageKey])

  useEffect(() => {
    if (hydrated) localStorage.setItem(storageKey, JSON.stringify(items))
  }, [hydrated, items, storageKey])

  const value = useMemo<OrderingCartValue>(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
    const subtotalCents = items.reduce(
      (sum, item) => sum + cartLineUnitCents(item) * item.quantity,
      0
    )
    return {
      items,
      itemCount,
      subtotalCents,
      currency,
      isOpen,
      addItem: item => {
        const identity = lineIdentity(item)
        setItems(current => {
          const existing = current.find(row => row.line_id === identity)
          if (existing) {
            return current.map(row =>
              row.line_id === identity ? { ...row, quantity: row.quantity + item.quantity } : row
            )
          }
          return [
            ...current,
            {
              ...item,
              line_id: identity,
              notes: item.notes?.trim() ?? '',
            },
          ]
        })
        setIsOpen(true)
      },
      updateQuantity: (lineId, quantity) =>
        setItems(current =>
          quantity < 1
            ? current.filter(item => item.line_id !== lineId)
            : current.map(item => (item.line_id === lineId ? { ...item, quantity } : item))
        ),
      removeItem: lineId => setItems(current => current.filter(item => item.line_id !== lineId)),
      clearCart: () => {
        setItems([])
        setIsOpen(false)
      },
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
    }
  }, [currency, isOpen, items])

  return <OrderingCartContext.Provider value={value}>{children}</OrderingCartContext.Provider>
}

export function useOrderingCart(): OrderingCartValue {
  const value = useContext(OrderingCartContext)
  if (!value) throw new Error('useOrderingCart must be used within OrderingCartProvider')
  return value
}
