export type InventoryUnit = 'g' | 'kg' | 'ml' | 'l' | 'each'

export type MovementReason = 'receive' | 'count' | 'waste' | 'sale' | 'adjust'

export interface InventoryItem {
  item_id: string
  venue_id: string
  name: string
  unit: InventoryUnit
  cost_per_unit_cents: number | null
  par_level: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/** Row shape returned by the list API — item plus its derived on-hand. */
export interface InventoryItemWithStock extends InventoryItem {
  on_hand: number
  below_par: boolean
}

export interface InventoryMovement {
  movement_id: string
  venue_id: string
  item_id: string
  qty: number
  reason: MovementReason
  order_id: string | null
  note: string | null
  membership_id: string | null
  created_at: string
}

export const INVENTORY_UNITS: InventoryUnit[] = ['g', 'kg', 'ml', 'l', 'each']
