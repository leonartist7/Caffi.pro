import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/middleware'

/**
 * Middleware for request handling
 *
 * Routes:
 * - /dashboard, /clients, /menu, etc. → Admin dashboard
 * - /shop/[slug]/... → Customer-facing shop (slug-based routing)
 * - Custom domains → Rewrite to /shop/[slug] internally
 *
 * Custom Domain Support:
 * - If request comes from a custom domain (not the main app domain)
 * - Look up tenant by domain
 * - Rewrite URL to use /shop/[slug] internally
 * - Example: www.mycoffeeshop.com/menu → /shop/my-coffee-shop/menu
 */
export async function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl

  // Skip middleware for static files, API routes, and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname.startsWith('/sw.js') ||
    pathname.startsWith('/manifest.json')
  ) {
    return NextResponse.next()
  }

  // Main app domains (localhost, Vercel preview, production)
  const isMainDomain =
    hostname === 'localhost' ||
    hostname.startsWith('localhost:') ||
    hostname.endsWith('.vercel.app') ||
    hostname === 'caffi.pro' ||
    hostname === 'www.caffi.pro' ||
    hostname.endsWith('.caffi.pro')

  // If not on main domain, this is a custom domain
  if (!isMainDomain && !pathname.startsWith('/shop/')) {
    try {
      // Look up tenant by custom domain
      const supabase = createClient()
      const { data: tenant } = await supabase
        .from('tenants')
        .select('slug')
        .eq('custom_domain', hostname)
        .single()

      if (tenant?.slug) {
        // Rewrite URL to use slug-based routing
        // www.mycoffeeshop.com/menu → /shop/my-coffee-shop/menu
        const url = request.nextUrl.clone()
        url.pathname = `/shop/${tenant.slug}${pathname}`
        return NextResponse.rewrite(url)
      } else {
        // Custom domain not found, show 404
        return NextResponse.rewrite(new URL('/404', request.url))
      }
    } catch (error) {
      console.error('Error in custom domain middleware:', error)
      return NextResponse.next()
    }
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
