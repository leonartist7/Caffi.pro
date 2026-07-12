'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * (owner) shell: warm, minimal, aro tokens. Sidebar: Home, Regulars,
 * Rewards, Campaigns, Settings. Rewards/Campaigns/Settings are placeholder
 * links for now (visible stub — they 404 gracefully to /home rather than
 * pretend to work); Home and Regulars are the real Plan 4 surfaces.
 */
const NAV = [
  { href: '/home', label: 'Home' },
  { href: '/regulars', label: 'Regulars' },
  { href: '/rewards-admin', label: 'Rewards' },
  { href: '/campaigns', label: 'Campaigns' },
  { href: '/settings', label: 'Settings' },
]

export function OwnerShell({ children, venueId }: { children: React.ReactNode; venueId: string }) {
  const pathname = usePathname()
  return (
    <div className="min-h-screen bg-aro-cream flex" data-venue-id={venueId}>
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-aro-hairline bg-aro-cream-warm p-5">
        <p className="font-display text-xl font-bold text-aro-ink mb-8">aro</p>
        <nav className="space-y-1">
          {NAV.map(item => {
            const active = pathname?.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? 'bg-aro-terra text-white' : 'text-aro-ink-soft hover:bg-aro-sand/60'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
