'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Sparkles, Gift, Megaphone, Settings, Menu, X } from 'lucide-react'

/**
 * (owner) shell: warm, minimal, aro tokens.
 *
 * The sidebar was `hidden md:flex` with no mobile counterpart, which left
 * every owner surface unreachable on a phone — the device a café owner
 * actually has on them during service. Below `md` the same nav now renders
 * as a sticky top bar plus a slide-down panel, so nothing is lost on small
 * screens rather than merely shrinking.
 *
 * Rewards/Campaigns remain placeholder links (they resolve to their own
 * surfaces or fall back gracefully); Home, Regulars, Creative and Settings
 * are real.
 */
const NAV = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/regulars', label: 'Regulars', icon: Users },
  { href: '/creative', label: 'Creative', icon: Sparkles },
  { href: '/rewards-admin', label: 'Rewards', icon: Gift },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const STRINGS = {
  brand: 'aro',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  primaryNav: 'Owner navigation',
}

export function OwnerShell({ children, venueId }: { children: React.ReactNode; venueId: string }) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  // A tap that navigates should also dismiss the panel; closing on pathname
  // change covers back/forward too, which an onClick handler alone misses.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const isActive = (href: string) => pathname?.startsWith(href) ?? false

  return (
    <div className="flex min-h-screen bg-aro-cream" data-venue-id={venueId}>
      <aside className="hidden w-56 shrink-0 flex-col border-r border-aro-hairline bg-aro-cream-warm p-5 md:flex">
        <p className="mb-8 font-display text-xl font-bold text-aro-ink">{STRINGS.brand}</p>
        <nav aria-label={STRINGS.primaryNav} className="space-y-1">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive(item.href)
                  ? 'bg-aro-terra text-white'
                  : 'text-aro-ink-soft hover:bg-aro-sand/60'
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-aro-hairline bg-aro-cream-warm/95 px-5 py-3 backdrop-blur md:hidden">
          <p className="font-display text-lg font-bold text-aro-ink">{STRINGS.brand}</p>
          <button
            onClick={() => setMenuOpen(open => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? STRINGS.closeMenu : STRINGS.openMenu}
            className="-mr-2 rounded-lg p-2 text-aro-ink transition hover:bg-aro-sand/60"
          >
            {menuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </header>

        {menuOpen && (
          <nav
            aria-label={STRINGS.primaryNav}
            className="sticky top-[3.25rem] z-30 border-b border-aro-hairline bg-aro-cream-warm px-4 pb-3 pt-1 md:hidden"
          >
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                  isActive(item.href)
                    ? 'bg-aro-terra text-white'
                    : 'text-aro-ink-soft hover:bg-aro-sand/60'
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
