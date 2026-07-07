import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

/**
 * Middleware: Supabase cookie-session refresh + host-based routing.
 *
 * - Refreshes the auth session cookie on every matched request so
 *   server components / route handlers always see a fresh session.
 * - Custom domains (and later join.aro.club) are rewritten to their
 *   slug-based internal routes.
 *
 * AUTH GATING happens server-side in the route-group layouts
 * (app/(dashboard)/layout.tsx etc.), not here — middleware only
 * keeps the session fresh.
 */
export async function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl

  // Skip static files, API routes, and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname.startsWith('/sw.js') ||
    pathname.startsWith('/manifest.json')
  ) {
    return NextResponse.next()
  }

  const { response, supabase } = await updateSession(request)

  // Main app domains (localhost, Vercel preview, production)
  const isMainDomain =
    hostname === 'localhost' ||
    hostname.startsWith('localhost:') ||
    hostname.endsWith('.vercel.app') ||
    hostname === 'caffi.pro' ||
    hostname === 'www.caffi.pro' ||
    hostname.endsWith('.caffi.pro') ||
    hostname === 'app.aro.club'

  // Custom domain → rewrite to slug-based shop routes
  if (!isMainDomain && !pathname.startsWith('/shop/') && supabase) {
    try {
      const { data: venue } = await supabase
        .from('venues')
        .select('slug')
        .eq('custom_domain', hostname)
        .single()

      if (venue?.slug) {
        const url = request.nextUrl.clone()
        url.pathname = `/shop/${venue.slug}${pathname}`
        return NextResponse.rewrite(url)
      }
      return NextResponse.rewrite(new URL('/404', request.url))
    } catch (error) {
      console.error('Error in custom domain middleware:', error)
      return response
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
}
