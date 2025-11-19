/**
 * Data Access Layer: Orders
 *
 * All database operations for orders.
 */

import { execute, executeOne, transaction } from '../db/turso'
import type { OrderStatus, OrderType } from '../business-logic/orders'

export interface Order {
  id: string
  tenant_id: string
  location_id: string
  customer_id?: string
  order_number: string
  status: OrderStatus
  order_type: OrderType
  customer_name: string
  customer_phone: string
  customer_email?: string
  subtotal: number
  discount: number
  tax: number
  tip: number
  total: number
  coupon_code?: string
  special_instructions?: string
  scheduled_for?: string
  completed_at?: string
  cancelled_at?: string
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string
  quantity: number
  unit_price: number
  total_price: number
  special_instructions?: string
  created_at: string
}

export interface OrderItemModifier {
  id: string
  order_item_id: string
  modifier_id: string
  name: string
  price_adjustment: number
  created_at: string
}

export interface CreateOrderInput {
  tenant_id: string
  location_id: string
  customer_id?: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  order_type: OrderType
  items: Array<{
    menu_item_id: string
    quantity: number
    unit_price: number
    special_instructions?: string
    modifiers?: Array<{
      modifier_id: string
      name: string
      price_adjustment: number
    }>
  }>
  subtotal: number
  discount: number
  tax: number
  tip: number
  total: number
  coupon_code?: string
  special_instructions?: string
  scheduled_for?: string
}

/**
 * Get all orders for a tenant
 */
export async function getOrdersByTenant(
  tenantId: string,
  filters?: {
    status?: OrderStatus
    locationId?: string
    limit?: number
    offset?: number
  }
): Promise<Order[]> {
  let query = 'SELECT * FROM orders WHERE tenant_id = ?'
  const params: any[] = [tenantId]

  if (filters?.status) {
    query += ' AND status = ?'
    params.push(filters.status)
  }

  if (filters?.locationId) {
    query += ' AND location_id = ?'
    params.push(filters.locationId)
  }

  query += ' ORDER BY created_at DESC'

  if (filters?.limit) {
    query += ' LIMIT ?'
    params.push(filters.limit)

    if (filters?.offset) {
      query += ' OFFSET ?'
      params.push(filters.offset)
    }
  }

  return execute<Order>(query, params)
}

/**
 * Get order by ID
 */
export async function getOrderById(id: string): Promise<Order | null> {
  return executeOne<Order>('SELECT * FROM orders WHERE id = ?', [id])
}

/**
 * Get order with items and modifiers
 */
export async function getOrderWithItems(id: string): Promise<{
  order: Order
  items: Array<OrderItem & { modifiers: OrderItemModifier[] }>
} | null> {
  const order = await getOrderById(id)
  if (!order) return null

  const items = await execute<OrderItem>('SELECT * FROM order_items WHERE order_id = ?', [id])

  const itemsWithModifiers = await Promise.all(
    items.map(async item => {
      const modifiers = await execute<OrderItemModifier>(
        'SELECT * FROM order_item_modifiers WHERE order_item_id = ?',
        [item.id]
      )
      return { ...item, modifiers }
    })
  )

  return {
    order,
    items: itemsWithModifiers,
  }
}

/**
 * Create a new order
 */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const orderId = generateId()
  const orderNumber = await generateOrderNumber(input.tenant_id)

  // Build queries for transaction
  const queries: Array<{ sql: string; params?: any[] }> = []

  // Insert order
  queries.push({
    sql: `INSERT INTO orders (
      id, tenant_id, location_id, customer_id, order_number,
      status, order_type, customer_name, customer_phone, customer_email,
      subtotal, discount, tax, tip, total,
      coupon_code, special_instructions, scheduled_for
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    params: [
      orderId,
      input.tenant_id,
      input.location_id,
      input.customer_id || null,
      orderNumber,
      'pending',
      input.order_type,
      input.customer_name,
      input.customer_phone,
      input.customer_email || null,
      input.subtotal,
      input.discount,
      input.tax,
      input.tip,
      input.total,
      input.coupon_code || null,
      input.special_instructions || null,
      input.scheduled_for || null,
    ],
  })

  // Insert order items and modifiers
  for (const item of input.items) {
    const itemId = generateId()

    queries.push({
      sql: `INSERT INTO order_items (
        id, order_id, menu_item_id, quantity, unit_price, total_price, special_instructions
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      params: [
        itemId,
        orderId,
        item.menu_item_id,
        item.quantity,
        item.unit_price,
        item.unit_price * item.quantity,
        item.special_instructions || null,
      ],
    })

    // Insert modifiers for this item
    if (item.modifiers) {
      for (const modifier of item.modifiers) {
        queries.push({
          sql: `INSERT INTO order_item_modifiers (
            id, order_item_id, modifier_id, name, price_adjustment
          ) VALUES (?, ?, ?, ?, ?)`,
          params: [
            generateId(),
            itemId,
            modifier.modifier_id,
            modifier.name,
            modifier.price_adjustment,
          ],
        })
      }
    }
  }

  // Execute all queries in a transaction
  await transaction(queries)

  const order = await getOrderById(orderId)
  if (!order) throw new Error('Failed to create order')

  return order
}

/**
 * Update order status
 */
export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  const now = new Date().toISOString()
  const updates = ['status = ?', 'updated_at = ?']
  const params: any[] = [status, now]

  // Set completed_at or cancelled_at based on status
  if (status === 'completed') {
    updates.push('completed_at = ?')
    params.push(now)
  } else if (status === 'cancelled') {
    updates.push('cancelled_at = ?')
    params.push(now)
  }

  params.push(id)

  await execute(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, params)

  const order = await getOrderById(id)
  if (!order) throw new Error('Order not found')

  return order
}

/**
 * Get active orders (not completed or cancelled)
 */
export async function getActiveOrders(tenantId: string, locationId?: string): Promise<Order[]> {
  let query = `
    SELECT * FROM orders
    WHERE tenant_id = ?
    AND status NOT IN ('completed', 'cancelled')
  `
  const params: any[] = [tenantId]

  if (locationId) {
    query += ' AND location_id = ?'
    params.push(locationId)
  }

  query += ' ORDER BY created_at ASC'

  return execute<Order>(query, params)
}

/**
 * Get orders count by status
 */
export async function getOrdersCountByStatus(
  tenantId: string
): Promise<Record<OrderStatus, number>> {
  const result = await execute<{ status: OrderStatus; count: number }>(
    `SELECT status, COUNT(*) as count
     FROM orders
     WHERE tenant_id = ?
     GROUP BY status`,
    [tenantId]
  )

  const counts: Record<string, number> = {
    pending: 0,
    confirmed: 0,
    preparing: 0,
    ready: 0,
    completed: 0,
    cancelled: 0,
  }

  result.forEach(row => {
    counts[row.status] = row.count
  })

  return counts as Record<OrderStatus, number>
}

// ==================== Helpers ====================

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

async function generateOrderNumber(tenantId: string): Promise<string> {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const result = await executeOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM orders
     WHERE tenant_id = ? AND DATE(created_at) = DATE('now')`,
    [tenantId]
  )

  const count = result?.count || 0
  const sequence = (count + 1).toString().padStart(3, '0')

  return `${today}-${sequence}`
}
