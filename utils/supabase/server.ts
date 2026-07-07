import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Cookie-session Supabase client for Server Components, Route Handlers
 * and Server Actions. Uses the ANON key — RLS applies. For privileged
 * operations use `lib/supabase-admin.ts` (service role, server-only).
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables: ' +
        `NEXT_PUBLIC_SUPABASE_URL ${supabaseUrl ? 'set' : 'MISSING'}, ` +
        `NEXT_PUBLIC_SUPABASE_ANON_KEY ${supabaseAnonKey ? 'set' : 'MISSING'}.`
    )
  }

  const cookieStore = cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Called from a Server Component — session refresh is handled
          // by the middleware, safe to ignore here.
        }
      },
    },
  })
}
