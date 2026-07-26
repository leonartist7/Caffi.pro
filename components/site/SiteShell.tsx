'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Coffee, Instagram, Facebook } from 'lucide-react'
import type { Tenant } from '@/lib/get-tenant'

const NAV = [
  { path: '', label: 'Home' },
  { path: '/menu', label: 'Menu' },
  { path: '/hours', label: 'Hours' },
  { path: '/contact', label: 'Contact' },
]

/**
 * The public site's chrome — header, footer, nav. Not shared with
 * `/shop`'s ShopLayoutClient on purpose: that shell carries a cart button
 * and order-flow nav, this one is a plain marketing site (§Non-goals — no
 * page builder, no per-venue theme beyond brand_kit tokens already applied
 * platform-wide).
 */
export function SiteShell({ tenant, children }: { tenant: Tenant; children: React.ReactNode }) {
  const pathname = usePathname()
  const root = `/site/${tenant.slug}`
  const { site_profile } = tenant

  return (
    <div className="flex min-h-screen flex-col bg-aro-cream text-aro-ink">
      <header className="sticky top-0 z-30 border-b border-aro-hairline bg-aro-cream-warm/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href={root} className="flex min-w-0 items-center gap-3">
            {tenant.logo_url ? (
              <Image
                src={tenant.logo_url}
                alt=""
                width={36}
                height={36}
                unoptimized
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-aro-espresso text-aro-cream">
                <Coffee className="h-4 w-4" />
              </span>
            )}
            <span className="truncate font-display text-lg text-aro-espresso">
              {tenant.app_name || tenant.business_name}
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map(item => {
              const href = `${root}${item.path}`
              const active = pathname === href
              return (
                <Link
                  key={item.path}
                  href={href}
                  className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? 'bg-aro-espresso text-aro-cream'
                      : 'text-aro-ink-soft hover:bg-aro-sand'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t border-aro-hairline bg-aro-cream-warm px-4 py-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 text-sm text-aro-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{tenant.business_name}</p>
          <div className="flex flex-wrap items-center gap-4">
            {site_profile.address && <span>{site_profile.address}</span>}
            {site_profile.phone_display && <span>{site_profile.phone_display}</span>}
            {site_profile.instagram_url && (
              <a
                href={site_profile.instagram_url}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="text-aro-ink-soft hover:text-aro-terra"
              >
                <Instagram className="h-4 w-4" />
              </a>
            )}
            {site_profile.facebook_url && (
              <a
                href={site_profile.facebook_url}
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="text-aro-ink-soft hover:text-aro-terra"
              >
                <Facebook className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
