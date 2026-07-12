import 'server-only'

import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client — SERVER ONLY.
 *
 * The `server-only` import makes any attempt to pull this file into a
 * client component a hard build error. Never export this from anything
 * reachable by the browser bundle.
 *
 * No placeholder fallbacks: missing env throws loudly at first use.
 */
let adminClient: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase admin client misconfigured: ' +
        `NEXT_PUBLIC_SUPABASE_URL ${url ? 'set' : 'MISSING'}, ` +
        `SUPABASE_SERVICE_ROLE_KEY ${serviceRoleKey ? 'set' : 'MISSING'}. ` +
        'Refusing to start with placeholder credentials.'
    )
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  return adminClient
}
