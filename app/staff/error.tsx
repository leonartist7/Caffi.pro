'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, RefreshCw, Users } from 'lucide-react'

export default function StaffError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error('Staff portal error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-coffee-50 dark:bg-dark-900 flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-coffee-200/50 dark:border-dark-700 p-8">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
          </div>

          {/* Error Title */}
          <h2 className="text-2xl font-bold text-center text-coffee-900 dark:text-white mb-3">
            Staff Portal Error
          </h2>

          {/* Error Message */}
          <p className="text-center text-coffee-600 dark:text-coffee-300 mb-6">
            We encountered an issue with the staff portal. Please try again or contact IT support.
          </p>

          {/* Error Details (Development Only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-xs font-mono text-red-800 dark:text-red-200 break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={reset}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-coffee-700 hover:bg-coffee-800 text-white rounded-lg font-medium transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
            <button
              onClick={() => router.push('/staff/dashboard')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-dark-700 hover:bg-coffee-50 dark:hover:bg-dark-600 text-coffee-900 dark:text-white rounded-lg font-medium transition-all border border-coffee-200 dark:border-dark-600"
            >
              <Users className="w-4 h-4" />
              Staff Dashboard
            </button>
          </div>

          {/* Support Info */}
          <div className="mt-6 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200 text-center">
              💡 <strong>Tip:</strong> If errors persist during busy hours, try closing other tabs
              to free up system resources.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
