'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import { Menu as MenuIcon, X, Sun, Moon, Coffee } from 'lucide-react'
import { hqModules, HQ_ITEMS } from '@/lib/modules'

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  soon?: boolean
}

function buildNavItems(isAroAdmin: boolean): NavItem[] {
  const hq: NavItem[] = isAroAdmin
    ? HQ_ITEMS.map(i => ({ name: i.label, href: i.href, icon: i.icon }))
    : []
  const modules: NavItem[] = hqModules().map(m => ({
    name: m.label,
    href: m.href,
    icon: m.icon,
    soon: m.status === 'coming_soon',
  }))
  return [...hq, ...modules]
}

export default function MobileNav({ isAroAdmin }: { isAroAdmin: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const pathname = usePathname()
  const navItems = buildNavItems(isAroAdmin)

  return (
    <>
      {/* Mobile Menu Button - Fixed Bottom Right */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-aro-terra shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform duration-300"
        aria-label="Open menu"
      >
        <MenuIcon className="w-6 h-6" />
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fadeIn"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Menu Sidebar */}
      <div
        className={`
          lg:hidden fixed top-0 right-0 h-screen w-80 max-w-[85vw] z-50
          bg-aro-cream-warm
          border-l border-aro-hairline
          backdrop-blur-xl shadow-2xl
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-aro-hairline">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-aro-terra flex items-center justify-center shadow-lg">
              <Coffee className="w-6 h-6 text-white" />
            </div>
            <div className="font-display font-bold text-xl text-aro-ink">Caffi Pro</div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-aro-sand/60 transition-all"
          >
            <X className="w-6 h-6 text-aro-ink-soft" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto max-h-[calc(100vh-180px)]">
          {navItems.map(item => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`
                  group relative flex items-center space-x-3 px-4 py-3 rounded-xl
                  transition-all duration-300 ease-out
                  ${
                    isActive
                      ? 'bg-aro-terra text-white shadow-lg'
                      : 'text-aro-ink-soft hover:bg-aro-sand/40'
                  }
                `}
              >
                <Icon
                  className={`
                    w-5 h-5 transition-all duration-300
                    ${isActive ? 'text-white' : 'text-aro-muted group-hover:scale-110'}
                  `}
                />
                <span className="flex-1 font-medium">{item.name}</span>
                {item.soon ? (
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-aro-sand text-aro-ink-soft'
                    }`}
                  >
                    Soon
                  </span>
                ) : (
                  isActive && (
                    <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )
                )}
              </Link>
            )
          })}
        </nav>

        {/* Theme Toggle */}
        <div className="p-4 border-t border-aro-hairline">
          <button
            onClick={() => {
              toggleTheme()
              setIsOpen(false)
            }}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl bg-aro-sand/40 hover:bg-aro-sand/70 transition-all group"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-aro-saffron group-hover:rotate-180 transition-transform duration-500" />
            ) : (
              <Moon className="w-5 h-5 text-aro-plum group-hover:-rotate-12 transition-transform duration-300" />
            )}
            <span className="font-medium text-aro-ink-soft">
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
        </div>
      </div>
    </>
  )
}
