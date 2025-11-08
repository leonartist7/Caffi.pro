export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
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
          features_enabled: Json
          loyalty_config: Json
          subscription_status: 'trial' | 'active' | 'cancelled' | 'suspended'
          subscription_plan: 'starter' | 'pro' | 'enterprise'
          trial_ends_at: string | null
          timezone: string
          currency: string
          language: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['tenants']['Row'], 'tenant_id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>
      }
      tenant_manifests: {
        Row: {
          manifest_id: string
          tenant_id: string
          design_tokens: Json
          logo_url: string | null
          app_icon_url: string | null
          splash_screen_url: string | null
          figma_file_key: string | null
          figma_last_synced: string | null
          skin_version: string
          slot_mappings: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['tenant_manifests']['Row'], 'manifest_id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['tenant_manifests']['Insert']>
      }
      categories: {
        Row: {
          category_id: string
          tenant_id: string
          name: string
          description: string | null
          image_url: string | null
          icon_name: string | null
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'category_id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
      }
      menu_items: {
        Row: {
          item_id: string
          tenant_id: string
          category_id: string
          name: string
          description: string | null
          price: number
          image_url: string | null
          modifiers: Json
          tags: string[]
          calories: number | null
          allergens: string[]
          is_available: boolean
          is_featured: boolean
          available_at_locations: string[]
          is_active: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['menu_items']['Row'], 'item_id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['menu_items']['Insert']>
      }
      coupons: {
        Row: {
          coupon_id: string
          tenant_id: string
          code: string
          discount_type: 'percentage' | 'fixed_amount' | 'free_item'
          discount_value: number
          min_order_amount: number
          max_uses: number | null
          current_uses: number
          valid_from: string
          valid_until: string | null
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['coupons']['Row'], 'coupon_id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['coupons']['Insert']>
      }
      push_campaigns: {
        Row: {
          campaign_id: string
          tenant_id: string
          title: string
          message: string
          image_url: string | null
          deep_link: string | null
          audience: 'all' | 'tier_based' | 'location_based' | 'inactive_users' | 'custom'
          audience_filter: Json
          scheduled_for: string | null
          sent_at: string | null
          total_sent: number
          total_delivered: number
          total_opened: number
          total_clicked: number
          status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled'
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['push_campaigns']['Row'], 'campaign_id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['push_campaigns']['Insert']>
      }
      locations: {
        Row: {
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
          hours: Json
          special_hours: Json
          accepts_mobile_orders: boolean
          accepts_dine_in_orders: boolean
          estimated_prep_time: number
          is_active: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['locations']['Row'], 'location_id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['locations']['Insert']>
      }
      rewards_catalog: {
        Row: {
          reward_id: string
          tenant_id: string
          name: string
          description: string | null
          points_required: number
          image_url: string | null
          reward_type: 'coupon' | 'free_item' | 'discount'
          reward_value: Json | null
          is_active: boolean
          stock_limit: number | null
          stock_remaining: number | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['rewards_catalog']['Row'], 'reward_id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['rewards_catalog']['Insert']>
      }
    }
  }
}

