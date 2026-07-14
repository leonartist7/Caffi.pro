'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Coffee, Menu, ShoppingBag } from 'lucide-react'
import type { Tenant } from '@/lib/get-tenant'
import { useOrderingCart } from '@/contexts/OrderingCartContext'
import { CartSheet } from '@/components/storefront/CartSheet'

export default function ShopLayoutClient({
  tenant,
  children,
}: {
  tenant: Tenant
  children: React.ReactNode
}) {
  const cart = useOrderingCart()
  const root = `/shop/${tenant.slug}`
  return (
    <div className="min-h-screen bg-aro-cream text-aro-ink">
      <header className="sticky top-0 z-30 border-b border-aro-hairline bg-aro-cream-warm/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href={root} className="flex min-w-0 items-center gap-3">
            {tenant.logo_url ? (
              <Image
                src={tenant.logo_url}
                alt=""
                width={40}
                height={40}
                unoptimized
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-aro-espresso text-aro-cream">
                <Coffee className="h-5 w-5" />
              </span>
            )}
            <span className="truncate font-display text-lg text-aro-espresso">
              {tenant.app_name || tenant.business_name}
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href={`${root}/orders`}
              className="hidden rounded-full px-3 py-2 text-sm font-semibold hover:bg-aro-sand sm:block"
            >
              Orders
            </Link>
            <Link
              href={`${root}/menu`}
              className="rounded-full px-3 py-2 text-sm font-semibold hover:bg-aro-sand"
            >
              <Menu className="mr-1.5 inline h-4 w-4" /> Menu
            </Link>
            <button
              type="button"
              onClick={cart.openCart}
              className="relative rounded-full bg-aro-espresso p-2.5 text-aro-cream"
              aria-label={`Open cart with ${cart.itemCount} items`}
            >
              <ShoppingBag className="h-4 w-4" />
              {cart.itemCount ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-aro-terra px-1 font-mono text-[10px] text-white">
                  {cart.itemCount}
                </span>
              ) : null}
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24">{children}</main>
      <CartSheet slug={tenant.slug} />
    </div>
  )
}
