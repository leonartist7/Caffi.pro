import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware Supabase session handling (Edge Runtime compatible).
 * Refreshes the auth cookie session and exposes the user to the caller.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // No env — nothing to refresh; downstream pages render their own
    // explicit "STUBBED — needs live Supabase" states.
    return { response: supabaseResponse, user: null, supabase: null }
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  let user = null
  try {
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser()
    user = sessionUser
  } catch {
    user = null
  }

  return { response: supabaseResponse, user, supabase }
}
