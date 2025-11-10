import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware for request handling
 *
 * Routes:
 * - /dashboard, /clients, /menu, etc. → Admin dashboard
 * - /shop/[slug]/... → Customer-facing shop (handled by Next.js dynamic routes)
 *
 * This middleware can be extended for authentication, rate limiting, etc.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files, API routes, and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) {
    return NextResponse.next()
  }

  // Future: Add authentication checks, rate limiting, etc. here

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
