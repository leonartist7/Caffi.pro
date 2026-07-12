'use client'

import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import LiveClock from '@/components/LiveClock'
import TenantSelector from '@/components/TenantSelector'
import ThemeToggle from '@/components/ThemeToggle'
import { TenantProvider } from '@/contexts/TenantContext'
import { ThemeProvider } from '@/contexts/ThemeContext'

export default function DashboardShell({
  children,
  isAroAdmin,
}: {
  children: React.ReactNode
  isAroAdmin: boolean
}) {
  return (
    <ThemeProvider>
      <TenantProvider>
        <div className="flex min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 transition-colors duration-200">
          <Sidebar isAroAdmin={isAroAdmin} />
          <MobileNav isAroAdmin={isAroAdmin} />

          <main className="flex-1 ml-0 lg:ml-64 transition-all duration-500">
            {/* Header */}
            <header className="h-16 lg:h-20 px-4 lg:px-8 flex items-center justify-between border-b border-coffee-200/50 dark:border-dark-700 bg-white/80 dark:bg-dark-900/80 backdrop-blur-lg relative overflow-visible shadow-sm">
              <div className="flex items-center gap-3 lg:gap-4 overflow-visible">
                <TenantSelector />
              </div>

              <div className="flex items-center gap-3">
                <ThemeToggle />
                <LiveClock />
              </div>
            </header>

            {/* Content */}
            <div className="p-4 lg:p-8">{children}</div>
          </main>
        </div>
      </TenantProvider>
    </ThemeProvider>
  )
}
