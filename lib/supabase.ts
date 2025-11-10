import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn(
    'Supabase credentials not found. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
  )
}

// Use dummy values for build-time if credentials are missing
const url = supabaseUrl || 'https://placeholder.supabase.co'
const key = supabaseServiceRoleKey || 'placeholder-key-for-build'

export const supabase = createSupabaseClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})
