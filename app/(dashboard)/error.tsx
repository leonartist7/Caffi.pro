'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, RefreshCw, LayoutDashboard } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-aro-cream flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-aro-hairline p-8">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-aro-rose/15 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-aro-rose" />
            </div>
          </div>

          {/* Error Title */}
          <h2 className="text-2xl font-bold text-center text-aro-ink mb-3">Dashboard Error</h2>

          {/* Error Message */}
          <p className="text-center text-aro-ink-soft mb-6">
            We encountered an issue loading the dashboard. Please try again.
          </p>

          {/* Error Details (Development Only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-3 rounded-lg bg-aro-rose/10 border border-aro-rose/30">
              <p className="text-xs font-mono text-aro-ink break-all">{error.message}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={reset}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-aro-terra hover:brightness-95 text-white rounded-lg font-medium transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-aro-sand/40 text-aro-ink rounded-lg font-medium transition-all border border-aro-hairline"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard Home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
