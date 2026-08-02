'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Menu, X, ShieldAlert } from 'lucide-react'
import { OWNER_ITEMS, ownerModules } from '@/lib/modules'

/**
 * (owner) shell: warm, minimal, aro tokens.
 *
 * The sidebar was `hidden md:flex` with no mobile counterpart, which left
 * every owner surface unreachable on a phone — the device a café owner
 * actually has on them during service. Below `md` the same nav now renders
 * as a sticky top bar plus a slide-down panel, so nothing is lost on small
 * screens rather than merely shrinking.
 *
 * Nav is derived from `lib/modules.ts` (PLAN-30) rather than hand-maintained
 * here — `OWNER_ITEMS` for the two fixed, non-toggleable entries (Home,
 * Regulars), `ownerModules()` for everything registered with
 * `surface: 'owner'`. A lane adding a new owner surface appends a row to
 * `lib/modules.ts`; this file never needs another edit for that.
 */
const navItems = [
  ...OWNER_ITEMS.map(item => ({ ...item, soon: false })),
  ...ownerModules().map(m => ({
    href: m.href,
    label: m.label,
    icon: m.icon,
    soon: m.status === 'coming_soon',
  })),
]

const STRINGS = {
  brand: 'aro',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  primaryNav: 'Owner navigation',
  impersonatingPrefix: 'Operating as',
  impersonatingSuffix: '— aro_admin',
  exitImpersonation: 'Exit',
  soon: 'Soon',
}

export function OwnerShell({
  children,
  venueId,
  impersonating,
}: {
  children: React.ReactNode
  venueId: string
  impersonating?: { venueName: string } | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [exiting, setExiting] = useState(false)

  async function handleExitImpersonation() {
    setExiting(true)
    try {
      await fetch('/api/admin/impersonate', { method: 'DELETE' })
    } finally {
      router.push('/dashboard')
      router.refresh()
    }
  }

  // A tap that navigates should also dismiss the panel; closing on pathname
  // change covers back/forward too, which an onClick handler alone misses.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const isActive = (href: string) => pathname?.startsWith(href) ?? false

  return (
    <div className="flex min-h-screen flex-col bg-aro-cream" data-venue-id={venueId}>
      {impersonating && (
        <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-aro-plum px-4 py-2 text-center text-sm font-semibold text-white">
          <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {STRINGS.impersonatingPrefix} <strong>{impersonating.venueName}</strong>{' '}
            {STRINGS.impersonatingSuffix}
          </span>
          <button
            onClick={handleExitImpersonation}
            disabled={exiting}
            className="ml-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide transition hover:bg-white/30 disabled:opacity-60"
          >
            {STRINGS.exitImpersonation}
          </button>
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-aro-hairline bg-aro-cream-warm p-5 md:flex">
          <p className="mb-8 font-display text-xl font-bold text-aro-ink">{STRINGS.brand}</p>
          <nav aria-label={STRINGS.primaryNav} className="space-y-1">
            {navItems.map(item => (
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
                {item.soon && (
                  <span className="ml-auto rounded-full bg-aro-sand px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-aro-muted">
                    {STRINGS.soon}
                  </span>
                )}
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
              {navItems.map(item => (
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
                  {item.soon && (
                    <span className="ml-auto rounded-full bg-aro-sand px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-aro-muted">
                      {STRINGS.soon}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          )}

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  )
}
