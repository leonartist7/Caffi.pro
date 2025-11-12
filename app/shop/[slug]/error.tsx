'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AlertCircle, RefreshCw, Coffee } from 'lucide-react'

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const params = useParams()
  const slug = params?.slug as string

  useEffect(() => {
    console.error('Shop error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-coffee-50 to-cream-100 dark:from-dark-900 dark:to-dark-800 flex items-center justify-center p-4">
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
            Oops! Something Went Wrong
          </h2>

          {/* Error Message */}
          <p className="text-center text-coffee-600 dark:text-coffee-300 mb-6">
            We're having trouble loading this page. Don't worry, we're working on it!
          </p>

          {/* Error Details (Development Only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-xs font-mono text-red-800 dark:text-red-200 break-all">
                {error.message}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-coffee-700 hover:bg-coffee-800 text-white rounded-lg font-semibold transition-all hover:scale-105"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>
            {slug && (
              <button
                onClick={() => router.push(`/shop/${slug}`)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-dark-700 hover:bg-coffee-50 dark:hover:bg-dark-600 text-coffee-900 dark:text-white rounded-lg font-semibold transition-all hover:scale-105 border border-coffee-200 dark:border-dark-600"
              >
                <Coffee className="w-5 h-5" />
                Back to Shop
              </button>
            )}
          </div>

          {/* Help Text */}
          <p className="text-center text-sm text-coffee-500 dark:text-coffee-400 mt-6">
            Still having issues? Try refreshing the page or contact our support team.
          </p>
        </div>
      </div>
    </div>
  )
}
