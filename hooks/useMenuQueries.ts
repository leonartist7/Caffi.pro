import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

export interface Category {
  category_id: string
  tenant_id: string
  name: string
  description: string | null
  image_url: string | null
  icon_name: string | null
  display_order: number
  is_active: boolean
  created_at?: string
}

export interface MenuItem {
  item_id: string
  tenant_id: string
  category_id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_active: boolean
  display_order?: number
  modifiers: {
    sizes?: Array<{ name: string; price: number }>
    addons?: Array<{ name: string; price: number }>
  }
  tags: string[]
  created_at?: string
  categories?: {
    name: string
  }
}

/**
 * Fetch categories for a tenant with React Query caching
 * @param tenantId - The tenant ID to fetch categories for
 * @param options - Additional query options
 */
export function useCategories(
  tenantId: string | null | undefined,
  options?: {
    activeOnly?: boolean
    enabled?: boolean
  }
) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['categories', tenantId, options?.activeOnly],
    queryFn: async () => {
      if (!tenantId) return []

      let query = supabase
        .from('categories')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('display_order')

      if (options?.activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) throw error
      return (data || []) as Category[]
    },
    enabled: !!tenantId && options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes - categories don't change often
  })
}

/**
 * Fetch menu items for a tenant with React Query caching
 * @param tenantId - The tenant ID to fetch menu items for
 * @param options - Additional query options
 */
export function useMenuItems(
  tenantId: string | null | undefined,
  options?: {
    activeOnly?: boolean
    withCategories?: boolean
    enabled?: boolean
  }
) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['menuItems', tenantId, options?.activeOnly, options?.withCategories],
    queryFn: async () => {
      if (!tenantId) return []

      const selectFields = options?.withCategories
        ? `
          *,
          categories!inner(name)
        `
        : '*'

      let query = supabase
        .from('menu_items')
        .select(selectFields)
        .eq('tenant_id', tenantId)
        .order('display_order')

      if (options?.activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) throw error
      return (data || []) as unknown as MenuItem[]
    },
    enabled: !!tenantId && options?.enabled !== false,
    staleTime: 3 * 60 * 1000, // 3 minutes - menu items may change more frequently
  })
}

/**
 * Fetch both categories and menu items together
 * Useful when you need both datasets at once
 */
export function useMenu(
  tenantId: string | null | undefined,
  options?: {
    activeOnly?: boolean
    enabled?: boolean
  }
) {
  const categories = useCategories(tenantId, {
    activeOnly: options?.activeOnly,
    enabled: options?.enabled,
  })

  const menuItems = useMenuItems(tenantId, {
    activeOnly: options?.activeOnly,
    withCategories: true,
    enabled: options?.enabled,
  })

  return {
    categories,
    menuItems,
    isLoading: categories.isLoading || menuItems.isLoading,
    isError: categories.isError || menuItems.isError,
    error: categories.error || menuItems.error,
  }
}
