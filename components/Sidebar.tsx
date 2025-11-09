'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import {
  LayoutDashboard,
  Coffee,
  MapPin,
  Users,
  ShoppingCart,
  BarChart3,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Tag,
  Gift,
  Activity,
  Menu as MenuIcon,
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Locations', href: '/cafes', icon: MapPin },
  { name: 'Menu', href: '/menu', icon: MenuIcon },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Activity', href: '/activity', icon: Activity },
  { name: 'Coupons', href: '/coupons', icon: Tag },
  { name: 'Rewards', href: '/rewards', icon: Gift },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const pathname = usePathname()

  return (
    <aside
      className={`
        hidden lg:fixed left-0 top-0 h-screen z-40
        lg:block
        transition-all duration-500 ease-in-out
        ${isCollapsed ? 'w-20' : 'w-64'}
        bg-gradient-to-b from-coffee-50 to-cream-100
        dark:from-dark-900 dark:to-dark-800
        border-r border-coffee-200/50 dark:border-dark-700
        backdrop-blur-xl
        shadow-2xl shadow-coffee-900/10 dark:shadow-black/30
      `}
    >
      {/* Header with Logo */}
      <div className="h-20 flex items-center justify-between px-4 border-b border-coffee-200/50 dark:border-dark-700">
        <div
          className={`flex items-center space-x-3 transition-all duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-coffee flex items-center justify-center shadow-lg animate-float">
            <Coffee className="w-6 h-6 text-cream-100" />
          </div>
          <div className="font-bold text-xl bg-gradient-to-r from-coffee-700 to-mocha bg-clip-text text-transparent">
            Caffi Pro
          </div>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-coffee-200/50 dark:hover:bg-dark-700 transition-all duration-300 hover:scale-110"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 text-coffee-600 dark:text-cream-300" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-coffee-600 dark:text-cream-300" />
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
                    ? 'bg-gradient-coffee text-cream-100 shadow-lg shadow-coffee-700/30'
                    : 'text-coffee-700 dark:text-cream-300 hover:bg-coffee-200/30 dark:hover:bg-dark-700/50'
                }
                ${isCollapsed ? 'justify-center' : ''}
              `}
            >
              <Icon
                className={`
                  w-5 h-5 transition-all duration-300
                  ${isActive ? 'text-cream-100' : 'text-coffee-600 dark:text-cream-400 group-hover:text-coffee-700 dark:group-hover:text-cream-200'}
                  ${isActive ? 'animate-pulse-slow' : 'group-hover:scale-110'}
                `}
              />

              <span
                className={`
                  font-medium transition-all duration-300
                  ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}
                `}
              >
                {item.name}
              </span>

              {/* Active indicator */}
              {isActive && (
                <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-cream-100 animate-pulse" />
              )}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-dark-900 dark:bg-dark-800 text-cream-100 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {item.name}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-dark-900 dark:border-r-dark-800" />
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer with Theme Toggle */}
      <div className="p-4 border-t border-coffee-200/50 dark:border-dark-700">
        <button
          onClick={toggleTheme}
          className={`
            w-full flex items-center space-x-3 px-3 py-3 rounded-xl
            bg-coffee-200/30 dark:bg-dark-700/50
            hover:bg-coffee-300/50 dark:hover:bg-dark-600
            transition-all duration-300 group
            ${isCollapsed ? 'justify-center' : ''}
          `}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-500 group-hover:rotate-180 transition-transform duration-500" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-600 group-hover:-rotate-12 transition-transform duration-300" />
          )}

          <span
            className={`
              font-medium text-coffee-700 dark:text-cream-300 transition-all duration-300
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
          background: rgba(139, 69, 19, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 69, 19, 0.5);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(227, 210, 179, 0.2);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(227, 210, 179, 0.3);
        }
      `}</style>
    </aside>
  )
}
