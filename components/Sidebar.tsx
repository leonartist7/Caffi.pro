'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import { Coffee, ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react'
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

export default function Sidebar({ isAroAdmin }: { isAroAdmin: boolean }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const pathname = usePathname()
  const navItems = buildNavItems(isAroAdmin)

  return (
    <aside
      className={`
        hidden lg:fixed left-0 top-0 h-screen z-40
        lg:block
        transition-all duration-500 ease-in-out
        ${isCollapsed ? 'w-20' : 'w-64'}
        bg-aro-cream-warm
        border-r border-aro-hairline
        backdrop-blur-xl
        shadow-2xl shadow-aro-ink/5
      `}
    >
      {/* Header with Logo */}
      <div className="h-20 flex items-center justify-between px-4 border-b border-aro-hairline">
        <div
          className={`flex items-center space-x-3 transition-all duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}
        >
          <div className="w-10 h-10 rounded-xl bg-aro-terra flex items-center justify-center shadow-lg animate-float">
            <Coffee className="w-6 h-6 text-white" />
          </div>
          <div className="font-display font-bold text-xl text-aro-ink">Caffi Pro</div>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-aro-sand/60 transition-all duration-300 hover:scale-110"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 text-aro-ink-soft" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-aro-ink-soft" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems.map(item => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group relative flex items-center space-x-3 px-3 py-3 rounded-xl
                transition-all duration-300 ease-out
                ${
                  isActive
                    ? 'bg-aro-terra text-white shadow-lg shadow-aro-terra/30'
                    : 'text-aro-ink-soft hover:bg-aro-sand/40'
                }
                ${isCollapsed ? 'justify-center' : ''}
              `}
            >
              <Icon
                className={`
                  w-5 h-5 transition-all duration-300
                  ${isActive ? 'text-white' : 'text-aro-muted group-hover:text-aro-ink-soft'}
                  ${isActive ? 'animate-pulse-slow' : 'group-hover:scale-110'}
                `}
              />

              <span
                className={`
                  flex-1 font-medium transition-all duration-300
                  ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}
                `}
              >
                {item.name}
              </span>

              {item.soon && !isCollapsed && (
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-aro-sand text-aro-ink-soft'
                  }`}
                >
                  Soon
                </span>
              )}

              {/* Active indicator */}
              {isActive && !item.soon && (
                <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              )}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-aro-ink text-white rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {item.name}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-aro-ink" />
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer with Theme Toggle */}
      <div className="p-4 border-t border-aro-hairline">
        <button
          onClick={toggleTheme}
          className={`
            w-full flex items-center space-x-3 px-3 py-3 rounded-xl
            bg-aro-sand/40
            hover:bg-aro-sand/70
            transition-all duration-300 group
            ${isCollapsed ? 'justify-center' : ''}
          `}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-aro-saffron group-hover:rotate-180 transition-transform duration-500" />
          ) : (
            <Moon className="w-5 h-5 text-aro-plum group-hover:-rotate-12 transition-transform duration-300" />
          )}

          <span
            className={`
              font-medium text-aro-ink-soft transition-all duration-300
              ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}
            `}
          >
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(42, 31, 24, 0.15);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(42, 31, 24, 0.25);
        }
      `}</style>
    </aside>
  )
}
