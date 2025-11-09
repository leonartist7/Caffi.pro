import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl) {
  console.warn('Supabase URL not found. Please set NEXT_PUBLIC_SUPABASE_URL environment variable.')
}

// Server-side client with service role key (for admin operations)
export const supabaseAdmin = supabaseServiceRoleKey
  ? createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null

// Client-side function to create Supabase client (for authentication)
export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey)
}

// Legacy export for backward compatibility
export const supabase = supabaseAdmin
