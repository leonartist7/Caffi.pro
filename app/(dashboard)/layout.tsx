'use client'

import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import LiveClock from '@/components/LiveClock'
import TenantSelector from '@/components/TenantSelector'
import { TenantProvider } from '@/contexts/TenantContext'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantProvider>
      <div className="flex min-h-screen bg-gradient-to-br from-foam via-cream-100 to-coffee-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800">
        <Sidebar />
        <MobileNav />

        <main className="flex-1 ml-0 lg:ml-64 transition-all duration-500">
          {/* Header */}
          <header className="h-16 lg:h-20 px-4 lg:px-8 flex items-center justify-between border-b border-coffee-200/50 dark:border-dark-700 bg-white/50 dark:bg-dark-900/50 backdrop-blur-lg relative overflow-visible">
            <LiveClock />

            <div className="flex items-center gap-3 lg:gap-4 overflow-visible">
              <TenantSelector />
            </div>
          </header>

          {/* Content */}
          <div className="p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </TenantProvider>
  )
}
