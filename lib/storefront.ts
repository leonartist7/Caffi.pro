import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { MenuCategory, MenuItem } from '@/lib/menu/types'

export interface StorefrontData {
  venue: {
    venue_id: string
    business_name: string
    slug: string
    app_name: string | null
    currency: string
    tax_rate_bp: number
  }
  categories: MenuCategory[]
  items: MenuItem[]
}

export interface DeliveryZone {
  zone_id: string
  name: string
  fee_cents: number
  min_order_cents: number
  postal_prefixes: string[]
}

export async function getStorefront(slug: string): Promise<StorefrontData | null> {
  const admin = getSupabaseAdmin()
  const { data: venue } = await admin
    .from('venues')
    .select('venue_id, business_name, slug, app_name, currency, tax_rate_bp, kill_switch')
    .eq('slug', slug)
    .eq('kill_switch', false)
    .maybeSingle()
  if (!venue) return null

  const [{ data: categories }, { data: items }] = await Promise.all([
    admin
      .from('menu_categories')
      .select('*')
      .eq('venue_id', venue.venue_id)
      .eq('is_active', true)
      .order('display_order')
      .order('name'),
    admin
      .from('menu_items')
      .select('*')
      .eq('venue_id', venue.venue_id)
      .eq('is_active', true)
      .order('sort_order')
      .order('name'),
  ])
  const itemRows = (items ?? []) as MenuItem[]
  const itemIds = itemRows.map(item => item.item_id)
  const { data: groups } = itemIds.length
    ? await admin
        .from('modifier_groups')
        .select('*')
        .eq('venue_id', venue.venue_id)
        .in('item_id', itemIds)
        .order('created_at')
    : { data: [] }
  const groupRows = groups ?? []
  const groupIds = groupRows.map(group => group.group_id)
  const { data: modifiers } = groupIds.length
    ? await admin
        .from('modifiers')
        .select('*')
        .eq('venue_id', venue.venue_id)
        .eq('is_active', true)
        .in('group_id', groupIds)
        .order('sort_order')
        .order('name')
    : { data: [] }

  return {
    venue: {
      venue_id: venue.venue_id,
      business_name: venue.business_name,
      slug: venue.slug,
      app_name: venue.app_name,
      currency: venue.currency || 'CAD',
      tax_rate_bp: venue.tax_rate_bp || 0,
    },
    categories: (categories ?? []) as MenuCategory[],
    items: itemRows.map(item => ({
      ...item,
      modifier_groups: groupRows
        .filter(group => group.item_id === item.item_id)
        .map(group => ({
          ...group,
          modifiers: (modifiers ?? []).filter(modifier => modifier.group_id === group.group_id),
        })),
    })) as MenuItem[],
  }
}

export async function getDeliveryZones(slug: string): Promise<DeliveryZone[]> {
  const admin = getSupabaseAdmin()
  const { data: venue } = await admin
    .from('venues')
    .select('venue_id')
    .eq('slug', slug)
    .maybeSingle()
  if (!venue) return []
  const { data } = await admin
    .from('delivery_zones')
    .select('zone_id, name, fee_cents, min_order_cents, postal_prefixes')
    .eq('venue_id', venue.venue_id)
    .eq('is_active', true)
    .order('name')
  return (data ?? []) as DeliveryZone[]
}
