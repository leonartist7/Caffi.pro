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

  // join.aro.club/{venue} → /join/{venue} (counter QR host). Public — no
  // auth gating; /join, /pass and /api/join are session-free by design.
  if (hostname === 'join.aro.club' && !pathname.startsWith('/join')) {
    const url = request.nextUrl.clone()
    url.pathname = `/join${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(url)
  }

  // Main app domains (localhost, Vercel preview, production)
  const isMainDomain =
    hostname === 'localhost' ||
    hostname.startsWith('localhost:') ||
    hostname.endsWith('.vercel.app') ||
    hostname === 'caffi.pro' ||
    hostname === 'www.caffi.pro' ||
    hostname.endsWith('.caffi.pro') ||
    hostname === 'app.aro.club'

  // Custom domain → the venue website is the default public surface. Internal
  // slugged routes remain valid; clean website paths are rewritten below.
  if (!isMainDomain && !pathname.startsWith('/join') && !pathname.startsWith('/pass') && supabase) {
    if (
      pathname.startsWith('/shop/') ||
      pathname.startsWith('/reserve/') ||
      pathname.startsWith('/site/')
    ) {
      return response
    }

    try {
      const { data: venue } = await supabase
        .from('venues')
        .select('slug')
        .eq('custom_domain', hostname)
        .single()

      if (venue?.slug) {
        const url = request.nextUrl.clone()
        if (pathname === '/shop') {
          url.pathname = `/shop/${venue.slug}`
          return NextResponse.rewrite(url)
        }
        if (pathname === '/reserve') {
          url.pathname = `/reserve/${venue.slug}`
          return NextResponse.rewrite(url)
        }
        url.pathname = `/site/${venue.slug}${pathname === '/' ? '' : pathname}`
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
