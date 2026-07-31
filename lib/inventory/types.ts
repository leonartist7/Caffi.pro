export type InventoryUnit = 'g' | 'kg' | 'ml' | 'l' | 'each'

/**
 * 'sale' and 'sale_reversal' are machine-written only (PLAN-24's perpetual
 * depletion) — never reachable through the manual movements API, which
 * whitelists only 'receive' | 'waste' | 'adjust' | 'count'.
 */
export type MovementReason = 'receive' | 'count' | 'waste' | 'sale' | 'adjust' | 'sale_reversal'

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

/** A recipe link: how much of an inventory item one unit of a menu item uses. */
export interface MenuItemIngredient {
  id: string
  venue_id: string
  item_id: string
  inventory_item_id: string
  qty_per_unit: number
  /** Joined convenience fields — present on list responses only. */
  inventory_item_name?: string
  inventory_item_unit?: InventoryUnit
}

export const INVENTORY_UNITS: InventoryUnit[] = ['g', 'kg', 'ml', 'l', 'each']
