import { getTenantBySlug } from '@/lib/get-tenant'
import { CartProvider } from '@/contexts/CartContext'
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
    <CartProvider>
      <ShopLayoutClient tenant={tenant}>{children}</ShopLayoutClient>
    </CartProvider>
  )
}
