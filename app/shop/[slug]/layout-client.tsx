'use client'

import Link from 'next/link'
import { Home, ShoppingBag, Gift, User, Menu, LogOut, LogIn } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import CartSidebar from '@/components/shop/CartSidebar'
import type { Tenant } from '@/lib/get-tenant'
import { useState } from 'react'

interface ShopLayoutClientProps {
  tenant: Tenant
  children: React.ReactNode
}

export default function ShopLayoutClient({ tenant, children }: ShopLayoutClientProps) {
  const { itemCount, toggleCart } = useCart()
  const { user, loading: authLoading, signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const shopUrl = `/shop/${tenant.slug}`
  const primaryColor = tenant.primary_color || '#6b3410'

  const handleSignOut = async () => {
    await signOut()
    setShowUserMenu(false)
  }

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
            {user && (
              <NavLink href={`${shopUrl}/orders`} icon={<ShoppingBag size={18} />}>
                Orders
              </NavLink>
            )}
            {user && tenant.features_enabled?.rewards && (
              <NavLink href={`${shopUrl}/rewards`} icon={<Gift size={18} />}>
                Rewards
              </NavLink>
            )}

            {/* Cart Button - Desktop */}
            <button
              onClick={toggleCart}
              className="relative flex items-center gap-2 px-4 py-2 rounded-lg text-coffee-700 dark:text-coffee-200 hover:bg-coffee-100/50 dark:hover:bg-dark-800/50 transition-colors"
            >
              <ShoppingBag size={18} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-coffee-700 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>

            {/* User Menu - Desktop */}
            {!authLoading && (
              <>
                {user ? (
                  <div className="relative ml-2">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-coffee-700 dark:text-coffee-200 hover:bg-coffee-100/50 dark:hover:bg-dark-800/50 transition-colors"
                    >
                      <User size={18} />
                      <span className="font-medium">
                        {user.user_metadata?.full_name || user.email?.split('@')[0]}
                      </span>
                    </button>

                    {/* Dropdown Menu */}
                    {showUserMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowUserMenu(false)}
                        />
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-800 rounded-lg shadow-xl border border-coffee-200 dark:border-dark-700 py-2 z-20">
                          <Link
                            href={`${shopUrl}/profile`}
                            className="block px-4 py-2 text-coffee-700 dark:text-coffee-200 hover:bg-coffee-100 dark:hover:bg-dark-700 transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            Profile
                          </Link>
                          <Link
                            href={`${shopUrl}/orders`}
                            className="block px-4 py-2 text-coffee-700 dark:text-coffee-200 hover:bg-coffee-100 dark:hover:bg-dark-700 transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            My Orders
                          </Link>
                          <button
                            onClick={handleSignOut}
                            className="w-full text-left px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                          >
                            <LogOut size={16} />
                            Sign Out
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 ml-2">
                    <Link
                      href={`${shopUrl}/login`}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-coffee-700 dark:text-coffee-200 hover:bg-coffee-100/50 dark:hover:bg-dark-800/50 transition-colors"
                    >
                      <LogIn size={18} />
                      <span className="font-medium">Sign In</span>
                    </Link>
                  </div>
                )}
              </>
            )}
          </nav>

          {/* Mobile: Cart Icon */}
          <button
            onClick={toggleCart}
            className="md:hidden relative p-2 rounded-lg hover:bg-coffee-100/50"
          >
            <ShoppingBag className="text-coffee-700" size={24} />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-coffee-700 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl border-t border-coffee-200/50 dark:border-dark-700 safe-bottom z-40">
        <div className="flex items-center justify-around h-16 px-2">
          <MobileNavItem href={shopUrl} icon={<Home size={22} />} label="Home" />
          <MobileNavItem href={`${shopUrl}/menu`} icon={<Menu size={22} />} label="Menu" />
          <MobileNavItem
            href={`${shopUrl}/orders`}
            icon={<ShoppingBag size={22} />}
            label="Orders"
          />
          {tenant.features_enabled?.rewards ? (
            <MobileNavItem href={`${shopUrl}/rewards`} icon={<Gift size={22} />} label="Rewards" />
          ) : (
            <MobileNavItem href={`${shopUrl}/profile`} icon={<User size={22} />} label="Profile" />
          )}
        </div>
      </nav>

      {/* Bottom padding for mobile nav */}
      <div className="md:hidden h-16" />

      {/* Cart Sidebar */}
      <CartSidebar tenantSlug={tenant.slug} currency={tenant.currency || 'EUR'} />
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
