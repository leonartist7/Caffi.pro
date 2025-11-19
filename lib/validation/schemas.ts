/**
 * Validation Schemas
 *
 * Centralized validation using Zod.
 * Backend-agnostic - validates data before it reaches any backend.
 */

import { z } from 'zod'

// ==================== Common Schemas ====================

export const uuidSchema = z.string().uuid('Invalid UUID format')

export const emailSchema = z.string().email('Invalid email address')

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
  .optional()

export const urlSchema = z.string().url('Invalid URL')

export const slugSchema = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(50, 'Slug must be less than 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

export const priceSchema = z
  .number()
  .min(0, 'Price cannot be negative')
  .max(999999.99, 'Price is too high')

export const quantitySchema = z
  .number()
  .int('Quantity must be a whole number')
  .min(1, 'Quantity must be at least 1')
  .max(1000, 'Quantity is too high')

// ==================== Tenant Schemas ====================

export const tenantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  slug: slugSchema,
  email: emailSchema,
  phone: phoneSchema,
  logo_url: urlSchema.optional(),
  primary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format (use #RRGGBB)')
    .optional(),
  accent_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format (use #RRGGBB)')
    .optional(),
})

export const createTenantSchema = tenantSchema

export const updateTenantSchema = tenantSchema.partial()

// ==================== Location Schemas ====================

export const locationSchema = z.object({
  tenant_id: uuidSchema,
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  address: z.string().min(1, 'Address is required').max(200, 'Address is too long'),
  city: z.string().min(1, 'City is required').max(50, 'City is too long'),
  state: z.string().min(2, 'State is required').max(2, 'State must be 2 characters'),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  phone: phoneSchema,
  is_active: z.boolean().default(true),
  hours_json: z.record(z.string(), z.string()).optional(),
})

export const createLocationSchema = locationSchema

export const updateLocationSchema = locationSchema.partial().omit({ tenant_id: true })

// ==================== Menu Schemas ====================

export const categorySchema = z.object({
  tenant_id: uuidSchema,
  name: z.string().min(1, 'Name is required').max(50, 'Name is too long'),
  description: z.string().max(200, 'Description is too long').optional(),
  display_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
})

export const createCategorySchema = categorySchema

export const updateCategorySchema = categorySchema.partial().omit({ tenant_id: true })

export const menuItemSchema = z.object({
  tenant_id: uuidSchema,
  category_id: uuidSchema,
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  price: priceSchema,
  image_url: urlSchema.optional(),
  is_available: z.boolean().default(true),
  display_order: z.number().int().min(0).default(0),
  prep_time_minutes: z.number().int().min(0).max(120).optional(),
  calories: z.number().int().min(0).optional(),
})

export const createMenuItemSchema = menuItemSchema

export const updateMenuItemSchema = menuItemSchema.partial().omit({ tenant_id: true })

export const modifierSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name is too long'),
  price_adjustment: z.number().min(-100).max(100),
})

export const modifierGroupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name is too long'),
  is_required: z.boolean().default(false),
  min_selections: z.number().int().min(0).default(0),
  max_selections: z.number().int().min(0).default(1),
  modifiers: z.array(modifierSchema).min(1, 'At least one modifier is required'),
})

// ==================== Order Schemas ====================

export const orderItemModifierSchema = z.object({
  modifier_id: uuidSchema,
  name: z.string(),
  price_adjustment: z.number(),
})

export const orderItemSchema = z.object({
  menu_item_id: uuidSchema,
  quantity: quantitySchema,
  unit_price: priceSchema,
  modifiers: z.array(orderItemModifierSchema).default([]),
  special_instructions: z.string().max(200, 'Special instructions are too long').optional(),
})

export const createOrderSchema = z.object({
  tenant_id: uuidSchema,
  location_id: uuidSchema,
  customer_id: uuidSchema.optional(),
  items: z.array(orderItemSchema).min(1, 'Order must have at least one item'),
  customer_name: z.string().min(1, 'Customer name is required').max(100),
  customer_phone: phoneSchema,
  customer_email: emailSchema.optional(),
  order_type: z.enum(['pickup', 'dine_in', 'delivery']),
  scheduled_for: z.date().optional(),
  special_instructions: z.string().max(500, 'Special instructions are too long').optional(),
  coupon_code: z.string().max(50).optional(),
})

export const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']),
  notes: z.string().max(500).optional(),
})

// ==================== User Schemas ====================

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  full_name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  phone: phoneSchema,
})

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  phone: phoneSchema,
  email: emailSchema.optional(),
})

// ==================== Loyalty Schemas ====================

export const loyaltyTierSchema = z.object({
  tenant_id: uuidSchema,
  name: z.string().min(1, 'Name is required').max(50, 'Name is too long'),
  min_points: z.number().int().min(0),
  points_multiplier: z.number().min(1).max(10),
  display_order: z.number().int().min(0).default(0),
})

export const createLoyaltyTierSchema = loyaltyTierSchema

export const updateLoyaltyTierSchema = loyaltyTierSchema.partial().omit({ tenant_id: true })

export const redeemRewardSchema = z.object({
  reward_id: uuidSchema,
  user_id: uuidSchema,
})

// ==================== Coupon Schemas ====================

export const couponSchema = z.object({
  tenant_id: uuidSchema,
  code: z
    .string()
    .min(3, 'Code must be at least 3 characters')
    .max(20, 'Code is too long')
    .regex(/^[A-Z0-9-]+$/, 'Code can only contain uppercase letters, numbers, and hyphens'),
  description: z.string().max(200, 'Description is too long').optional(),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().min(0),
  min_order_amount: priceSchema.optional(),
  max_uses: z.number().int().min(1).optional(),
  max_uses_per_user: z.number().int().min(1).optional(),
  valid_from: z.date(),
  valid_until: z.date(),
  is_active: z.boolean().default(true),
})

export const createCouponSchema = couponSchema.refine(data => data.valid_until > data.valid_from, {
  message: 'Valid until date must be after valid from date',
  path: ['valid_until'],
})

export const updateCouponSchema = couponSchema.partial().omit({ tenant_id: true })

export const applyCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  order_total: priceSchema,
})

// ==================== Staff Schemas ====================

export const staffRoleSchema = z.enum(['owner', 'manager', 'barista', 'kitchen', 'cashier'])

export const staffMemberSchema = z.object({
  tenant_id: uuidSchema,
  email: emailSchema,
  full_name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  phone: phoneSchema,
  role: staffRoleSchema,
  assigned_location_id: uuidSchema.optional(),
  can_manage_orders: z.boolean().default(false),
  can_manage_inventory: z.boolean().default(false),
  can_manage_staff: z.boolean().default(false),
  can_view_reports: z.boolean().default(false),
})

export const createStaffMemberSchema = staffMemberSchema

export const updateStaffMemberSchema = staffMemberSchema.partial().omit({ tenant_id: true })

// ==================== Inventory Schemas ====================

export const inventoryItemSchema = z.object({
  tenant_id: uuidSchema,
  location_id: uuidSchema,
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  unit: z.string().min(1, 'Unit is required').max(20),
  current_quantity: z.number().min(0),
  min_quantity: z.number().min(0),
  unit_cost: priceSchema.optional(),
})

export const createInventoryItemSchema = inventoryItemSchema

export const updateInventoryItemSchema = inventoryItemSchema.partial().omit({
  tenant_id: true,
  location_id: true,
})

export const inventoryAdjustmentSchema = z.object({
  quantity_change: z.number().int(),
  reason: z.string().max(200, 'Reason is too long').optional(),
})

// ==================== Helper Functions ====================

/**
 * Validates data against a schema and returns typed result
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): {
  success: boolean
  data?: T
  errors?: Record<string, string>
} {
  const result = schema.safeParse(data)

  if (result.success) {
    return {
      success: true,
      data: result.data,
    }
  }

  const errors: Record<string, string> = {}
  result.error.issues.forEach(err => {
    const path = err.path.join('.')
    errors[path] = err.message
  })

  return {
    success: false,
    errors,
  }
}

/**
 * Validates and throws on error
 */
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data)
}

/**
 * Type-safe form validator for React Hook Form
 */
export function createFormValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown) => {
    const result = validate(schema, data)
    if (!result.success) {
      throw new Error(Object.values(result.errors!).join(', '))
    }
    return result.data!
  }
}
