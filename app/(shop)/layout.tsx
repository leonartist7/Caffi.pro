import { getTenantBySlug } from '@/lib/get-tenant'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Home, ShoppingBag, Gift, User, Menu } from 'lucide-react'

/**
 * Shop Layout - Customer-facing app layout
 *
 * This layout wraps all customer-facing pages (/shop/[slug]/...)
 * and provides tenant-specific branding and navigation.
 */
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const headersList = headers()
  const tenantSlug = headersList.get('x-tenant-slug')

  const tenant = await getTenantBySlug(tenantSlug)

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

  const shopUrl = `/shop/${tenant.slug}`
  const primaryColor = tenant.primary_color || '#6b3410'

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-cream-50 via-coffee-50 to-foam"
      style={
        {
          '--primary-color': primaryColor,
          '--primary-rgb': hexToRgb(primaryColor),
        } as any
      }
    >
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-dark-900/90 backdrop-blur-xl border-b border-coffee-200/50 dark:border-dark-700">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo and Name */}
          <Link href={shopUrl} className="flex items-center gap-3">
            {tenant.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={tenant.business_name}
                className="h-10 w-10 object-contain rounded-lg"
              />
            ) : (
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                style={{ backgroundColor: primaryColor }}
              >
                {tenant.business_name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="font-bold text-lg text-coffee-900 dark:text-white">
                {tenant.app_name || tenant.business_name}
              </h1>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink href={shopUrl} icon={<Home size={18} />}>
              Home
            </NavLink>
            <NavLink href={`${shopUrl}/menu`} icon={<Menu size={18} />}>
              Menu
            </NavLink>
            <NavLink href={`${shopUrl}/orders`} icon={<ShoppingBag size={18} />}>
              Orders
            </NavLink>
            {tenant.features_enabled?.rewards && (
              <NavLink href={`${shopUrl}/rewards`} icon={<Gift size={18} />}>
                Rewards
              </NavLink>
            )}
            <NavLink href={`${shopUrl}/profile`} icon={<User size={18} />}>
              Profile
            </NavLink>
          </nav>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 rounded-lg hover:bg-coffee-100/50">
            <Menu className="text-coffee-700" size={24} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl border-t border-coffee-200/50 dark:border-dark-700 safe-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          <MobileNavItem href={shopUrl} icon={<Home size={22} />} label="Home" />
          <MobileNavItem href={`${shopUrl}/menu`} icon={<Menu size={22} />} label="Menu" />
          <MobileNavItem
            href={`${shopUrl}/orders`}
            icon={<ShoppingBag size={22} />}
            label="Orders"
          />
          {tenant.features_enabled?.rewards && (
            <MobileNavItem href={`${shopUrl}/rewards`} icon={<Gift size={22} />} label="Rewards" />
          )}
          <MobileNavItem href={`${shopUrl}/profile`} icon={<User size={22} />} label="Profile" />
        </div>
      </nav>

      {/* Bottom padding for mobile nav */}
      <div className="md:hidden h-16" />
    </div>
  )
}

// Helper Components
function NavLink({
  href,
  icon,
  children,
}: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-coffee-700 dark:text-coffee-200 hover:bg-coffee-100/50 dark:hover:bg-dark-800/50 transition-colors"
    >
      {icon}
      <span className="font-medium">{children}</span>
    </Link>
  )
}

function MobileNavItem({
  href,
  icon,
  label,
}: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-lg text-coffee-700 dark:text-coffee-200 hover:bg-coffee-100/50 dark:hover:bg-dark-800/50 transition-colors min-w-[60px]"
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </Link>
  )
}

// Helper function to convert hex to RGB
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '107, 52, 16' // Default coffee color RGB
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
}
