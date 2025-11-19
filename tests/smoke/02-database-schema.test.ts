/**
 * Smoke Test 2: Database Schema
 *
 * Verifies that all required database tables exist and are accessible
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

describe('Database Schema', () => {
  const requiredTables = [
    'tenants',
    'locations',
    'categories',
    'menu_items',
    'modifiers',
    'menu_item_modifiers',
    'orders',
    'order_items',
    'order_item_modifiers',
    'users',
    'loyalty_tiers',
    'loyalty_points',
    'loyalty_rewards',
    'loyalty_transactions',
    'coupons',
    'coupon_usages',
    'staff_members',
    'inventory_items',
  ]

  it.each(requiredTables)(
    'should have table: %s',
    async tableName => {
      const { error } = await supabase.from(tableName).select('*').limit(0)

      // Note: error will be null if table exists, or auth error if RLS blocks access
      // Both are acceptable for smoke test - we just want to verify table exists
      expect(error?.message).not.toContain('relation')
      expect(error?.message).not.toContain('does not exist')
    },
    10000 // 10 second timeout per table
  )
})
