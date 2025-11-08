'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  BuildingStorefrontIcon,
  ShoppingBagIcon,
  BellIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  CogIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Cafés', href: '/cafes', icon: BuildingStorefrontIcon },
  { name: 'Orders', href: '/orders', icon: ShoppingBagIcon },
  { name: 'Notifications', href: '/notifications', icon: BellIcon },
  { name: 'Activity Log', href: '/activity', icon: ClipboardDocumentListIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
]

export default function Sidebar() {
  const pathname = usePathname()

  const handleLogout = async () => {
    // TODO: Implement logout
    window.location.href = '/login'
  }

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-white/80 backdrop-blur-lg border-r border-gray-200 shadow-xl flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-primary">
          ☕ Caffi<span className="font-serif italic">.pro</span>
        </h1>
        <p className="text-xs text-gray-500 mt-1">Admin Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                ${isActive
                  ? 'bg-primary text-white shadow-md [&::selection]:bg-white/30 [&::selection]:text-white [&_*::selection]:bg-white/30 [&_*::selection]:text-white'
                  : 'text-gray-700 hover:bg-surface-alt'
                }
              `}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-alt mb-2">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">Admin User</p>
            <p className="text-xs text-gray-500 truncate">admin@caffi.pro</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  )
}
