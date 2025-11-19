/**
 * Pricing Business Logic
 *
 * Pure functions for calculating prices, taxes, discounts, etc.
 * Backend-agnostic - no database dependencies.
 */

export interface OrderItem {
  quantity: number
  unit_price: number
  modifiers?: Array<{
    price_adjustment: number
  }>
}

export interface CouponDiscount {
  type: 'percentage' | 'fixed'
  value: number
  min_order_amount?: number
  max_discount?: number
}

export interface PricingCalculation {
  subtotal: number
  discount: number
  tax: number
  tip: number
  total: number
}

// ==================== Item Calculations ====================

/**
 * Calculate price for a single order item including modifiers
 */
export function calculateItemPrice(item: OrderItem): number {
  const modifiersTotal = item.modifiers?.reduce((sum, mod) => sum + mod.price_adjustment, 0) ?? 0

  return (item.unit_price + modifiersTotal) * item.quantity
}

/**
 * Calculate subtotal for all items in an order
 */
export function calculateSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + calculateItemPrice(item), 0)
}

// ==================== Discount Calculations ====================

/**
 * Calculate discount amount from coupon
 */
export function calculateDiscount(subtotal: number, coupon?: CouponDiscount): number {
  if (!coupon) return 0

  // Check minimum order amount
  if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
    return 0
  }

  let discount = 0

  if (coupon.type === 'percentage') {
    discount = subtotal * (coupon.value / 100)
  } else {
    discount = coupon.value
  }

  // Apply max discount cap
  if (coupon.max_discount && discount > coupon.max_discount) {
    discount = coupon.max_discount
  }

  // Discount cannot exceed subtotal
  if (discount > subtotal) {
    discount = subtotal
  }

  return Math.round(discount * 100) / 100
}

/**
 * Check if coupon is valid
 */
export function isCouponValid(coupon: {
  is_active: boolean
  valid_from: Date
  valid_until: Date
  max_uses?: number
  current_uses?: number
  max_uses_per_user?: number
  user_uses?: number
}): { valid: boolean; reason?: string } {
  const now = new Date()

  if (!coupon.is_active) {
    return { valid: false, reason: 'Coupon is not active' }
  }

  if (now < coupon.valid_from) {
    return { valid: false, reason: 'Coupon is not yet valid' }
  }

  if (now > coupon.valid_until) {
    return { valid: false, reason: 'Coupon has expired' }
  }

  if (coupon.max_uses && coupon.current_uses && coupon.current_uses >= coupon.max_uses) {
    return { valid: false, reason: 'Coupon usage limit reached' }
  }

  if (
    coupon.max_uses_per_user &&
    coupon.user_uses &&
    coupon.user_uses >= coupon.max_uses_per_user
  ) {
    return { valid: false, reason: 'You have already used this coupon the maximum number of times' }
  }

  return { valid: true }
}

// ==================== Tax Calculations ====================

/**
 * Calculate tax amount
 */
export function calculateTax(
  subtotal: number,
  discount: number,
  taxRate: number = 0.0825 // Default 8.25% (Texas rate)
): number {
  const taxableAmount = subtotal - discount
  const tax = taxableAmount * taxRate
  return Math.round(tax * 100) / 100
}

// ==================== Tip Calculations ====================

/**
 * Calculate tip amount from percentage
 */
export function calculateTipFromPercentage(subtotal: number, tipPercentage: number): number {
  const tip = subtotal * (tipPercentage / 100)
  return Math.round(tip * 100) / 100
}

/**
 * Get suggested tip amounts
 */
export function getSuggestedTips(subtotal: number): {
  low: number
  medium: number
  high: number
} {
  return {
    low: calculateTipFromPercentage(subtotal, 15),
    medium: calculateTipFromPercentage(subtotal, 18),
    high: calculateTipFromPercentage(subtotal, 20),
  }
}

// ==================== Total Calculation ====================

/**
 * Calculate complete order pricing
 */
export function calculateOrderTotal(
  items: OrderItem[],
  options: {
    coupon?: CouponDiscount
    taxRate?: number
    tipAmount?: number
    tipPercentage?: number
  } = {}
): PricingCalculation {
  const subtotal = calculateSubtotal(items)
  const discount = calculateDiscount(subtotal, options.coupon)
  const tax = calculateTax(subtotal, discount, options.taxRate)

  let tip = 0
  if (options.tipAmount !== undefined) {
    tip = options.tipAmount
  } else if (options.tipPercentage !== undefined) {
    tip = calculateTipFromPercentage(subtotal, options.tipPercentage)
  }

  const total = subtotal - discount + tax + tip

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    tip: Math.round(tip * 100) / 100,
    total: Math.round(total * 100) / 100,
  }
}

// ==================== Formatting ====================

/**
 * Format price as currency string
 */
export function formatPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Parse price string to number
 */
export function parsePrice(priceString: string): number {
  const cleaned = priceString.replace(/[^0-9.]/g, '')
  return parseFloat(cleaned) || 0
}
