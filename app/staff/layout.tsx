'use client'

import React from 'react'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { StaffAuthProvider, useStaffAuth } from '@/contexts/StaffAuthContext'
import {
  Coffee,
  ClipboardList,
  Package,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
  Bell,
} from 'lucide-react'
import { useState } from 'react'

function StaffLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, staffUser, loading, signOut } = useStaffAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user && pathname !== '/staff/login') {
      router.push('/staff/login')
    }
  }, [user, loading, pathname, router])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-900">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gray-200 dark:bg-dark-700 rounded-full animate-pulse mx-auto"></div>
          <div className="h-4 w-32 bg-gray-200 dark:bg-dark-700 rounded animate-pulse mx-auto"></div>
        </div>
      </div>
    )
  }

  // If on login page, render without layout
  if (pathname === '/staff/login') {
    return <>{children}</>
  }

  // If not authenticated, show nothing (will redirect)
  if (!user || !staffUser) {
    return null
  }

  const navigation = [
    { name: 'Kitchen Queue', href: '/staff/dashboard', icon: ClipboardList },
    { name: 'Orders', href: '/staff/orders', icon: Coffee },
    {
      name: 'Inventory',
      href: '/staff/inventory',
      icon: Package,
      permission: 'can_manage_inventory',
    },
    { name: 'Team', href: '/staff/team', icon: Users, permission: 'can_manage_staff' },
    { name: 'Reports', href: '/staff/reports', icon: BarChart3, permission: 'can_view_reports' },
  ]

  const filteredNavigation = navigation.filter(item => {
    if (!item.permission) return true
    return staffUser[item.permission as keyof typeof staffUser]
  })

  const handleSignOut = async () => {
    await signOut()
    router.push('/staff/login')
  }

  const isActive = (href: string) => pathname === href

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Coffee className="w-8 h-8 text-coffee-700" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">Caffi.pro Staff</h1>
              <p className="text-xs text-gray-500">{staffUser.full_name}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Notifications */}
            <button className="p-2 rounded-lg hover:bg-gray-100 relative">
              <Bell className="w-6 h-6 text-gray-600" />
              {/* Notification badge */}
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden border-t border-gray-200 bg-white">
            {filteredNavigation.map(item => {
              const Icon = item.icon
              return (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 ${
                    isActive(item.href)
                      ? 'bg-coffee-50 text-coffee-700 border-l-4 border-coffee-700'
                      : 'text-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </a>
              )
            })}
          </nav>
        )}
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-64px)]">
          <nav className="flex-1 p-4 space-y-1">
            {filteredNavigation.map(item => {
              const Icon = item.icon
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-coffee-100 text-coffee-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </a>
              )
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-coffee-700 text-white flex items-center justify-center font-semibold">
                {staffUser.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{staffUser.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{staffUser.role}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffAuthProvider>
      <StaffLayoutContent>{children}</StaffLayoutContent>
    </StaffAuthProvider>
  )
}
