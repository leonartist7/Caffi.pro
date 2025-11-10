import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Create Supabase client for middleware (Edge Runtime compatible)
 * Note: Middleware runs in Edge Runtime, so it can't use all Node.js APIs
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
