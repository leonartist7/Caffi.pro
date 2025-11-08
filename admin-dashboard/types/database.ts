// Database types for Caffi.pro

export type SubscriptionStatus = 'trial' | 'active' | 'cancelled' | 'suspended'
export type SubscriptionPlan = 'starter' | 'pro' | 'enterprise'
export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum'
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'

export interface Tenant {
  tenant_id: string
  business_name: string
  slug: string
  owner_email: string
  owner_phone: string | null
  app_name: string
  bundle_id: string
  app_store_url: string | null
  play_store_url: string | null
  pwa_url: string | null
  features_enabled: Record<string, boolean>
  loyalty_config: {
    points_per_euro: number
    signup_bonus: number
    tiers: Array<{
      name: string
      threshold: number
      discount: number
    }>
  }
  subscription_status: SubscriptionStatus
  subscription_plan: SubscriptionPlan
  trial_ends_at: string | null
  timezone: string
  currency: string
  language: string
  created_at: string
  updated_at: string
}

export interface Location {
  location_id: string
  tenant_id: string
  name: string
  address: string
  city: string
  state: string | null
  postal_code: string | null
  country: string
  latitude: number | null
  longitude: number | null
  phone: string | null
  email: string | null
  hours: Record<string, string>
  special_hours: Array<{ date: string; status: string }>
  accepts_mobile_orders: boolean
  accepts_dine_in_orders: boolean
  estimated_prep_time: number
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface User {
  user_id: string
  tenant_id: string
  auth_id: string | null
  phone: string | null
  email: string | null
  full_name: string | null
  profile_image_url: string | null
  loyalty_points: number
  loyalty_tier: LoyaltyTier
  lifetime_points: number
  total_orders: number
  total_spent: number
  last_order_at: string | null
  fcm_token: string | null
  notifications_enabled: boolean
  preferred_location_id: string | null
  favorite_items: string[]
  created_at: string
  updated_at: string
}

export interface Order {
  order_id: string
  tenant_id: string
  user_id: string
  location_id: string
  order_number: string
  status: OrderStatus
  subtotal: number
  tax: number
  discount: number
  tip: number
  total: number
  payment_method: string | null
  payment_status: string
  payment_intent_id: string | null
  order_type: string
  special_instructions: string | null
  scheduled_for: string | null
  estimated_ready_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  points_earned: number
  coupon_code_used: string | null
  source: string
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  total_tenants: number
  active_tenants: number
  trial_tenants: number
  total_users: number
  total_orders: number
  total_revenue: number
  revenue_this_month: number
  orders_this_month: number
}

