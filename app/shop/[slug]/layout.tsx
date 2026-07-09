import { getTenantBySlug } from '@/lib/get-tenant'
import { isOrderingEnabled } from '@/lib/flags'
import { CartProvider } from '@/contexts/CartContext'
import { AuthProvider } from '@/contexts/AuthContext'
import ShopLayoutClient from './layout-client'

/**
 * Shop Layout - Customer-facing app layout
 *
 * This layout wraps all customer-facing pages (/shop/[slug]/...)
 * and provides tenant-specific branding and navigation.
 */
export default async function ShopLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { slug: string }
}) {
  // Ordering PWA is parked (Blueprint: direct ordering is a later-phase
  // promise). Flip ORDERING_ENABLED=true to revive.
  if (!isOrderingEnabled()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-coffee-100 to-cream-100">
        <div className="text-center p-8 bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl max-w-md">
          <div className="text-6xl mb-4">☕</div>
          <h1 className="text-2xl font-bold text-coffee-800 mb-2">Ordering is coming soon</h1>
          <p className="text-coffee-600">
            Online ordering isn&apos;t open yet for this café. Visit us at the counter — your
            regular is waiting.
          </p>
          <p className="mt-4 text-xs uppercase tracking-wide text-coffee-400">
            Parked — ORDERING_ENABLED=false
          </p>
        </div>
      </div>
    )
  }

  const tenant = await getTenantBySlug(params.slug)

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-coffee-100 to-cream-100">
        <div className="text-center p-8 bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl max-w-md">
          <div className="text-6xl mb-4">☕</div>
          <h1 className="text-2xl font-bold text-coffee-800 mb-2">Coffee Shop Not Found</h1>
          <p className="text-coffee-600">
            The coffee shop you're looking for doesn't exist or is no longer available.
          </p>
        </div>
      </div>
    )
  }

  return (
    <AuthProvider>
      <CartProvider currency={tenant.currency || 'EUR'} taxRate={0.1}>
        <ShopLayoutClient tenant={tenant}>{children}</ShopLayoutClient>
      </CartProvider>
    </AuthProvider>
  )
}
