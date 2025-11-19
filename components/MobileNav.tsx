'use client'

import React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import {
  LayoutDashboard,
  MapPin,
  Menu as MenuIcon,
  ShoppingCart,
  Users,
  BarChart3,
  Activity,
  Tag,
  Gift,
  Bell,
  Settings,
  X,
  Sun,
  Moon,
  Coffee,
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

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const pathname = usePathname()

  return (
    <>
      {/* Mobile Menu Button - Fixed Bottom Right */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-coffee shadow-2xl flex items-center justify-center text-cream-100 hover:scale-110 transition-transform duration-300"
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
          bg-gradient-to-b from-coffee-50 to-cream-100
          dark:from-dark-900 dark:to-dark-800
          border-l border-coffee-200/50 dark:border-dark-700
          backdrop-blur-xl shadow-2xl
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-coffee flex items-center justify-center shadow-lg">
              <Coffee className="w-6 h-6 text-cream-100" />
            </div>
            <div className="font-bold text-xl bg-gradient-to-r from-coffee-700 to-mocha bg-clip-text text-transparent">
              Caffi Pro
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-coffee-200/50 dark:hover:bg-dark-700 transition-all"
          >
            <X className="w-6 h-6 text-coffee-600 dark:text-cream-300" />
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
                      ? 'bg-gradient-coffee text-cream-100 shadow-lg'
                      : 'text-coffee-700 dark:text-cream-300 hover:bg-coffee-200/30 dark:hover:bg-dark-700/50'
                  }
                `}
              >
                <Icon
                  className={`
                    w-5 h-5 transition-all duration-300
                    ${
                      isActive
                        ? 'text-cream-100'
                        : 'text-coffee-600 dark:text-cream-400 group-hover:scale-110'
                    }
                  `}
                />
                <span className="font-medium">{item.name}</span>
                {isActive && (
                  <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-cream-100 animate-pulse" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Theme Toggle */}
        <div className="p-4 border-t border-coffee-200/50 dark:border-dark-700">
          <button
            onClick={() => {
              toggleTheme()
              setIsOpen(false)
            }}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl bg-coffee-200/30 dark:bg-dark-700/50 hover:bg-coffee-300/50 dark:hover:bg-dark-600 transition-all group"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-500 group-hover:rotate-180 transition-transform duration-500" />
            ) : (
              <Moon className="w-5 h-5 text-indigo-600 group-hover:-rotate-12 transition-transform duration-300" />
            )}
            <span className="font-medium text-coffee-700 dark:text-cream-300">
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
        </div>
      </div>
    </>
  )
}
