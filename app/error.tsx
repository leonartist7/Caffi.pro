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
    <div className="min-h-screen bg-gradient-to-br from-coffee-50 to-cream-100 dark:from-dark-900 dark:to-dark-800 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-coffee-200/50 dark:border-dark-700 p-8 md:p-12">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
            </div>
          </div>

          {/* Error Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-center text-coffee-900 dark:text-white mb-4">
            Oops! Something went wrong
          </h1>

          {/* Error Message */}
          <p className="text-center text-coffee-600 dark:text-coffee-300 mb-8">
            We encountered an unexpected error. Don't worry, this has been logged and we'll look
            into it.
          </p>

          {/* Error Details (Development Only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-8 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm font-mono text-red-800 dark:text-red-200 break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-coffee-700 hover:bg-coffee-800 text-white rounded-lg font-semibold transition-all hover:scale-105 shadow-lg"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-dark-700 hover:bg-coffee-50 dark:hover:bg-dark-600 text-coffee-900 dark:text-white rounded-lg font-semibold transition-all hover:scale-105 shadow-lg border border-coffee-200 dark:border-dark-600"
            >
              <Home className="w-5 h-5" />
              Go Home
            </button>
          </div>

          {/* Help Text */}
          <p className="text-center text-sm text-coffee-500 dark:text-coffee-400 mt-8">
            If this problem persists, please contact support or refresh the page.
          </p>
        </div>
      </div>
    </div>
  )
}
