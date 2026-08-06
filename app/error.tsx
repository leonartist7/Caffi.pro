'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // Log error to console in development
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-aro-cream flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-aro-hairline p-8 md:p-12">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-aro-rose/15 flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-aro-rose" />
            </div>
          </div>

          {/* Error Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-center text-aro-ink mb-4">
            Oops! Something went wrong
          </h1>

          {/* Error Message */}
          <p className="text-center text-aro-ink-soft mb-8">
            We encountered an unexpected error. Don't worry, this has been logged and we'll look
            into it.
          </p>

          {/* Error Details (Development Only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-8 p-4 rounded-lg bg-aro-rose/10 border border-aro-rose/30">
              <p className="text-sm font-mono text-aro-ink break-all">{error.message}</p>
              {error.digest && (
                <p className="text-xs text-aro-ink-soft mt-2">Error ID: {error.digest}</p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-aro-terra hover:brightness-95 text-white rounded-lg font-semibold transition-all hover:scale-105 shadow-lg"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-aro-sand/40 text-aro-ink rounded-lg font-semibold transition-all hover:scale-105 shadow-lg border border-aro-hairline"
            >
              <Home className="w-5 h-5" />
              Go Home
            </button>
          </div>

          {/* Help Text */}
          <p className="text-center text-sm text-aro-muted mt-8">
            If this problem persists, please contact support or refresh the page.
          </p>
        </div>
      </div>
    </div>
  )
}
