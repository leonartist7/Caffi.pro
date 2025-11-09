'use client'

import Sidebar from '@/components/Sidebar'
import LiveClock from '@/components/LiveClock'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-foam via-cream-100 to-coffee-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800">
      <Sidebar />

      <main className="flex-1 ml-0 lg:ml-64 transition-all duration-500">
        {/* Header */}
        <header className="h-16 lg:h-20 px-4 lg:px-8 flex items-center justify-between border-b border-coffee-200/50 dark:border-dark-700 bg-white/50 dark:bg-dark-900/50 backdrop-blur-lg">
          <LiveClock />

          <div className="hidden sm:flex items-center space-x-4">
            <div className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400">
              Welcome back,{' '}
              <span className="font-semibold text-coffee-700 dark:text-cream-200">Admin</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
