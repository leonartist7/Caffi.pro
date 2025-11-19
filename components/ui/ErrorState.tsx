/**
 * Error State Component
 *
 * Reusable error displays with retry functionality.
 */

import React from 'react'
import { AlertTriangle, XCircle, WifiOff, RefreshCw } from 'lucide-react'
import { AppError, ErrorCode } from '@/lib/errors'

export interface ErrorStateProps {
  error?: Error | AppError | string
  title?: string
  message?: string
  onRetry?: () => void
  retryText?: string
  fullScreen?: boolean
  className?: string
}

export function ErrorState({
  error,
  title,
  message,
  onRetry,
  retryText = 'Try Again',
  fullScreen = false,
  className = '',
}: ErrorStateProps) {
  // Determine error details
  const errorDetails = getErrorDetails(error, title, message)

  const content = (
    <div className="flex flex-col items-center justify-center text-center p-8">
      {/* Icon */}
      <div className={`mb-4 ${errorDetails.iconColor}`}>{errorDetails.icon}</div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{errorDetails.title}</h3>

      {/* Message */}
      <p className="text-sm text-gray-600 mb-6 max-w-md">{errorDetails.message}</p>

      {/* Retry Button */}
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          {retryText}
        </button>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className={`fixed inset-0 flex items-center justify-center bg-white z-50 ${className}`}>
        {content}
      </div>
    )
  }

  return <div className={`flex items-center justify-center ${className}`}>{content}</div>
}

/**
 * Inline error message (for forms, etc.)
 */
export function InlineError({ message, className = '' }: { message: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm text-red-600 ${className}`}>
      <XCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}

/**
 * Error banner (for page-level errors)
 */
export function ErrorBanner({
  message,
  onDismiss,
  className = '',
}: {
  message: string
  onDismiss?: () => void
  className?: string
}) {
  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-red-800">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-600 hover:text-red-800 transition-colors"
            aria-label="Dismiss"
          >
            <XCircle className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Error toast notification
 */
export function ErrorToast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-red-600 text-white rounded-lg shadow-lg p-4 animate-slide-up z-50">
      <div className="flex items-start gap-3">
        <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <p className="flex-1 text-sm">{message}</p>
        <button
          onClick={onClose}
          className="text-white hover:text-red-100 transition-colors"
          aria-label="Close"
        >
          <XCircle className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

// ==================== Helpers ====================

function getErrorDetails(
  error?: Error | AppError | string,
  title?: string,
  message?: string
): {
  title: string
  message: string
  icon: React.ReactNode
  iconColor: string
} {
  // Default values
  let errorTitle = title || 'Something went wrong'
  let errorMessage = message || 'An unexpected error occurred. Please try again.'
  let icon: React.ReactNode = <AlertTriangle className="h-12 w-12" />
  let iconColor = 'text-red-600'

  // Extract details from AppError
  if (error instanceof AppError) {
    errorMessage = error.message

    // Customize based on error code
    switch (error.code) {
      case ErrorCode.UNAUTHORIZED:
      case ErrorCode.SESSION_EXPIRED:
        errorTitle = 'Authentication Required'
        icon = <XCircle className="h-12 w-12" />
        break

      case ErrorCode.FORBIDDEN:
        errorTitle = 'Access Denied'
        icon = <XCircle className="h-12 w-12" />
        break

      case ErrorCode.NOT_FOUND:
        errorTitle = 'Not Found'
        icon = <AlertTriangle className="h-12 w-12" />
        iconColor = 'text-yellow-600'
        break

      case ErrorCode.NETWORK_ERROR:
      case ErrorCode.TIMEOUT:
        errorTitle = 'Connection Error'
        icon = <WifiOff className="h-12 w-12" />
        iconColor = 'text-gray-600'
        break

      case ErrorCode.VALIDATION_ERROR:
      case ErrorCode.INVALID_INPUT:
        errorTitle = 'Invalid Input'
        icon = <AlertTriangle className="h-12 w-12" />
        iconColor = 'text-yellow-600'
        break

      default:
        errorTitle = 'Error'
    }
  } else if (error instanceof Error) {
    errorMessage = error.message
  } else if (typeof error === 'string') {
    errorMessage = error
  }

  return {
    title: errorTitle,
    message: errorMessage,
    icon,
    iconColor,
  }
}
