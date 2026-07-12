'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Browser Supabase client — ANON key only, sessions in cookies so the
 * server (layouts, API routes, middleware) can see them. All access is
 * governed by RLS. The service-role client lives in `lib/supabase-admin.ts`
 * and can never be imported from client code.
 */
let browserClient: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  if (browserClient) return browserClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables: ' +
        `NEXT_PUBLIC_SUPABASE_URL ${supabaseUrl ? 'set' : 'MISSING'}, ` +
        `NEXT_PUBLIC_SUPABASE_ANON_KEY ${supabaseAnonKey ? 'set' : 'MISSING'}. ` +
        'Add them to your environment (see .env.example).'
    )
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return browserClient
}

/** True when the public Supabase env pair is present (client-safe check). */
export function hasSupabaseEnv(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
