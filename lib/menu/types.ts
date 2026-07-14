export interface MenuCategory {
  category_id: string
  venue_id: string
  name: string
  display_order: number
  is_active: boolean
  available_from: string | null
  available_until: string | null
  created_at: string
  updated_at: string
}

export interface MenuModifier {
  modifier_id: string
  group_id: string
  venue_id: string
  name: string
  price_delta_cents: number
  is_active: boolean
  sort_order: number
}

export interface MenuModifierGroup {
  group_id: string
  venue_id: string
  item_id: string
  name: string
  min_select: number
  max_select: number
  created_at: string
  modifiers: MenuModifier[]
}

export interface MenuItem {
  item_id: string
  venue_id: string
  category_id: string | null
  name: string
  description: string | null
  price_cents: number
  image_url: string | null
  is_active: boolean
  sort_order: number
  dietary_tags: string[]
  created_at: string
  updated_at: string
  modifier_groups: MenuModifierGroup[]
}
