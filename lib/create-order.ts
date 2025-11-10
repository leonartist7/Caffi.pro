import { createClient } from '@/utils/supabase/client'
import type { CartItem } from '@/contexts/CartContext'

export interface OrderData {
  tenant_id: string
  user_id: string
  location_id: string
  order_type: 'pickup' | 'dine_in' | 'delivery'
  items: CartItem[]
  subtotal: number
  tax: number
  total: number
  special_instructions?: string
  coupon_code?: string
  discount?: number
}

export interface Order {
  order_id: string
  order_number: string
  tenant_id: string
  user_id: string
  location_id: string
  status: string
  subtotal: number
  tax: number
  discount: number
  total: number
  order_type: string
  special_instructions: string | null
  coupon_code_used: string | null
  points_earned: number
  created_at: string
}

/**
 * Generate a unique order number
 */
function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `#${timestamp}${random}`
}

/**
 * Calculate loyalty points earned for an order
 */
function calculatePointsEarned(total: number, pointsPerEuro: number = 10): number {
  return Math.floor(total * pointsPerEuro)
}

/**
 * Create a new order in the database
 */
export async function createOrder(orderData: OrderData): Promise<{
  order: Order | null
  error: any
}> {
  const supabase = createClient()

  try {
    // Generate order number
    const orderNumber = generateOrderNumber()

    // Calculate points earned (10 points per euro by default)
    const pointsEarned = calculatePointsEarned(orderData.total)

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        tenant_id: orderData.tenant_id,
        user_id: orderData.user_id,
        location_id: orderData.location_id,
        order_number: orderNumber,
        status: 'pending',
        order_type: orderData.order_type,
        subtotal: orderData.subtotal,
        tax: orderData.tax,
        discount: orderData.discount || 0,
        total: orderData.total,
        special_instructions: orderData.special_instructions || null,
        coupon_code_used: orderData.coupon_code || null,
        points_earned: pointsEarned,
        payment_status: 'pending',
        payment_method: 'cash', // Default to cash, can be updated later
        source: 'pwa',
      })
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      return { order: null, error: orderError }
    }

    // Create order items
    const orderItems = orderData.items.map(item => ({
      order_id: order.order_id,
      item_id: item.item_id,
      item_name: item.name,
      item_image_url: item.image_url,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      modifiers: item.modifiers,
      special_instructions: item.special_instructions || null,
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)

    if (itemsError) {
      console.error('Error creating order items:', itemsError)
      // TODO: Rollback order creation if items fail
      return { order: null, error: itemsError }
    }

    // Create loyalty transaction (points earned)
    if (pointsEarned > 0) {
      await supabase.from('loyalty_transactions').insert({
        user_id: orderData.user_id,
        tenant_id: orderData.tenant_id,
        order_id: order.order_id,
        points: pointsEarned,
        transaction_type: 'earned',
        description: `Points earned from order ${orderNumber}`,
      })
    }

    return { order, error: null }
  } catch (err: any) {
    console.error('Unexpected error creating order:', err)
    return { order: null, error: err }
  }
}

/**
 * Get order by ID
 */
export async function getOrder(orderId: string): Promise<{
  order: any | null
  error: any
}> {
  const supabase = createClient()

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select(
        `
        *,
        locations(name, address, city, postal_code),
        order_items(*)
      `
      )
      .eq('order_id', orderId)
      .single()

    if (error) {
      console.error('Error fetching order:', error)
      return { order: null, error }
    }

    return { order, error: null }
  } catch (err: any) {
    console.error('Unexpected error fetching order:', err)
    return { order: null, error: err }
  }
}

/**
 * Get user's orders
 */
export async function getUserOrders(
  userId: string,
  tenantId: string
): Promise<{
  orders: any[]
  error: any
}> {
  const supabase = createClient()

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(
        `
        *,
        locations(name, address),
        order_items(*)
      `
      )
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching orders:', error)
      return { orders: [], error }
    }

    return { orders: orders || [], error: null }
  } catch (err: any) {
    console.error('Unexpected error fetching orders:', err)
    return { orders: [], error: err }
  }
}

/**
 * Validate coupon code
 */
export async function validateCoupon(
  couponCode: string,
  tenantId: string
): Promise<{
  coupon: any | null
  error: any
}> {
  const supabase = createClient()

  try {
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single()

    if (error) {
      return { coupon: null, error: 'Invalid coupon code' }
    }

    // Check if coupon is expired
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return { coupon: null, error: 'Coupon has expired' }
    }

    // Check usage limit
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return { coupon: null, error: 'Coupon has reached maximum uses' }
    }

    return { coupon, error: null }
  } catch (err: any) {
    return { coupon: null, error: 'Error validating coupon' }
  }
}

/**
 * Calculate discount from coupon
 */
export function calculateDiscount(subtotal: number, coupon: any): number {
  if (!coupon) return 0

  if (coupon.discount_type === 'percentage') {
    return (subtotal * coupon.discount_value) / 100
  } else if (coupon.discount_type === 'fixed_amount') {
    return Math.min(coupon.discount_value, subtotal)
  }

  return 0
}
