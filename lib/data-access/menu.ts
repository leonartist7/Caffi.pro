/**
 * Data Access Layer: Menu
 *
 * All database operations for categories and menu items.
 */

import { execute, executeOne, transaction } from '../db/turso'

export interface Category {
  id: string
  tenant_id: string
  name: string
  description?: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MenuItem {
  id: string
  tenant_id: string
  category_id: string
  name: string
  description?: string
  price: number
  image_url?: string
  is_available: boolean
  display_order: number
  prep_time_minutes?: number
  calories?: number
  created_at: string
  updated_at: string
}

export interface Modifier {
  id: string
  tenant_id: string
  name: string
  price_adjustment: number
  created_at: string
  updated_at: string
}

// ==================== Categories ====================

/**
 * Get all categories for a tenant
 */
export async function getCategoriesByTenant(tenantId: string): Promise<Category[]> {
  return execute<Category>(
    `SELECT * FROM categories
     WHERE tenant_id = ?
     ORDER BY display_order ASC, name ASC`,
    [tenantId]
  )
}

/**
 * Get category by ID
 */
export async function getCategoryById(id: string): Promise<Category | null> {
  return executeOne<Category>('SELECT * FROM categories WHERE id = ?', [id])
}

/**
 * Create a category
 */
export async function createCategory(input: {
  tenant_id: string
  name: string
  description?: string
  display_order?: number
}): Promise<Category> {
  const id = generateId()

  await execute(
    `INSERT INTO categories (id, tenant_id, name, description, display_order)
     VALUES (?, ?, ?, ?, ?)`,
    [id, input.tenant_id, input.name, input.description || null, input.display_order || 0]
  )

  const category = await getCategoryById(id)
  if (!category) throw new Error('Failed to create category')

  return category
}

/**
 * Update a category
 */
export async function updateCategory(
  id: string,
  input: Partial<Omit<Category, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>
): Promise<Category> {
  const updates: string[] = []
  const params: any[] = []

  if (input.name !== undefined) {
    updates.push('name = ?')
    params.push(input.name)
  }
  if (input.description !== undefined) {
    updates.push('description = ?')
    params.push(input.description)
  }
  if (input.display_order !== undefined) {
    updates.push('display_order = ?')
    params.push(input.display_order)
  }
  if (input.is_active !== undefined) {
    updates.push('is_active = ?')
    params.push(input.is_active ? 1 : 0)
  }

  if (updates.length === 0) {
    throw new Error('No fields to update')
  }

  updates.push('updated_at = datetime("now")')
  params.push(id)

  await execute(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, params)

  const category = await getCategoryById(id)
  if (!category) throw new Error('Category not found')

  return category
}

/**
 * Delete a category
 */
export async function deleteCategory(id: string): Promise<void> {
  await execute('DELETE FROM categories WHERE id = ?', [id])
}

// ==================== Menu Items ====================

/**
 * Get all menu items for a tenant
 */
export async function getMenuItemsByTenant(
  tenantId: string,
  filters?: { categoryId?: string; isAvailable?: boolean }
): Promise<MenuItem[]> {
  let query = 'SELECT * FROM menu_items WHERE tenant_id = ?'
  const params: any[] = [tenantId]

  if (filters?.categoryId) {
    query += ' AND category_id = ?'
    params.push(filters.categoryId)
  }

  if (filters?.isAvailable !== undefined) {
    query += ' AND is_available = ?'
    params.push(filters.isAvailable ? 1 : 0)
  }

  query += ' ORDER BY display_order ASC, name ASC'

  return execute<MenuItem>(query, params)
}

/**
 * Get menu item by ID
 */
export async function getMenuItemById(id: string): Promise<MenuItem | null> {
  return executeOne<MenuItem>('SELECT * FROM menu_items WHERE id = ?', [id])
}

/**
 * Create a menu item
 */
export async function createMenuItem(input: {
  tenant_id: string
  category_id: string
  name: string
  description?: string
  price: number
  image_url?: string
  display_order?: number
  prep_time_minutes?: number
  calories?: number
}): Promise<MenuItem> {
  const id = generateId()

  await execute(
    `INSERT INTO menu_items (
      id, tenant_id, category_id, name, description, price,
      image_url, display_order, prep_time_minutes, calories
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.tenant_id,
      input.category_id,
      input.name,
      input.description || null,
      input.price,
      input.image_url || null,
      input.display_order || 0,
      input.prep_time_minutes || 5,
      input.calories || null,
    ]
  )

  const menuItem = await getMenuItemById(id)
  if (!menuItem) throw new Error('Failed to create menu item')

  return menuItem
}

/**
 * Update a menu item
 */
export async function updateMenuItem(
  id: string,
  input: Partial<Omit<MenuItem, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>
): Promise<MenuItem> {
  const updates: string[] = []
  const params: any[] = []

  if (input.category_id !== undefined) {
    updates.push('category_id = ?')
    params.push(input.category_id)
  }
  if (input.name !== undefined) {
    updates.push('name = ?')
    params.push(input.name)
  }
  if (input.description !== undefined) {
    updates.push('description = ?')
    params.push(input.description)
  }
  if (input.price !== undefined) {
    updates.push('price = ?')
    params.push(input.price)
  }
  if (input.image_url !== undefined) {
    updates.push('image_url = ?')
    params.push(input.image_url)
  }
  if (input.is_available !== undefined) {
    updates.push('is_available = ?')
    params.push(input.is_available ? 1 : 0)
  }
  if (input.display_order !== undefined) {
    updates.push('display_order = ?')
    params.push(input.display_order)
  }
  if (input.prep_time_minutes !== undefined) {
    updates.push('prep_time_minutes = ?')
    params.push(input.prep_time_minutes)
  }
  if (input.calories !== undefined) {
    updates.push('calories = ?')
    params.push(input.calories)
  }

  if (updates.length === 0) {
    throw new Error('No fields to update')
  }

  updates.push('updated_at = datetime("now")')
  params.push(id)

  await execute(`UPDATE menu_items SET ${updates.join(', ')} WHERE id = ?`, params)

  const menuItem = await getMenuItemById(id)
  if (!menuItem) throw new Error('Menu item not found')

  return menuItem
}

/**
 * Delete a menu item
 */
export async function deleteMenuItem(id: string): Promise<void> {
  await execute('DELETE FROM menu_items WHERE id = ?', [id])
}

/**
 * Get menu items with categories
 */
export async function getMenuWithCategories(tenantId: string): Promise<
  Array<{
    category: Category
    items: MenuItem[]
  }>
> {
  const categories = await getCategoriesByTenant(tenantId)

  const result = await Promise.all(
    categories.map(async category => {
      const items = await execute<MenuItem>(
        `SELECT * FROM menu_items
         WHERE category_id = ? AND is_available = 1
         ORDER BY display_order ASC, name ASC`,
        [category.id]
      )

      return {
        category,
        items,
      }
    })
  )

  return result.filter(r => r.items.length > 0)
}

// ==================== Helpers ====================

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '')
}
