import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware for tenant detection and routing
 *
 * Routes:
 * - /dashboard, /clients, /menu, etc. → Admin dashboard (no tenant detection)
 * - /shop/[slug]/... → Customer-facing shop (tenant detected by slug)
 *
 * For shop routes, we extract the tenant slug from the URL path
 * and pass it to the request via headers for server-side rendering.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // Skip middleware for static files, API routes, and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // static files like images, fonts, etc.
  ) {
    return NextResponse.next()
  }

  // Admin routes - no tenant detection needed
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/clients') ||
    pathname.startsWith('/menu') ||
    pathname.startsWith('/orders') ||
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/coupons') ||
    pathname.startsWith('/rewards') ||
    pathname.startsWith('/cafes') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/activity') ||
    pathname.startsWith('/login') ||
    pathname === '/'
  ) {
    return NextResponse.next()
  }

  // Shop routes - detect tenant from URL path: /shop/[slug]/...
  if (pathname.startsWith('/shop/')) {
    const segments = pathname.split('/').filter(Boolean)
    // segments: ['shop', 'joesbeans', 'menu', ...]
    const tenantSlug = segments[1] // 'joesbeans'

    if (tenantSlug) {
      // Pass tenant slug to the request via headers
      // This allows server components to access it via headers()
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-tenant-slug', tenantSlug)

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    } else {
      // No tenant slug provided - redirect to a "shop not found" page
      return NextResponse.redirect(new URL('/shop-not-found', request.url))
    }
  }

  return NextResponse.next()
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
