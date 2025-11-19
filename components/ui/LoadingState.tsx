/**
 * Loading State Component
 *
 * Reusable loading indicators for different contexts.
 */

import React from 'react'

export interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullScreen?: boolean
  className?: string
}

export function LoadingState({
  size = 'md',
  text,
  fullScreen = false,
  className = '',
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`animate-spin rounded-full border-2 border-gray-300 border-t-primary ${sizeClasses[size]}`}
        role="status"
        aria-label="Loading"
      />
      {text && <p className="text-sm text-gray-600 animate-pulse">{text}</p>}
    </div>
  )

  if (fullScreen) {
    return (
      <div
        className={`fixed inset-0 flex items-center justify-center bg-white bg-opacity-90 z-50 ${className}`}
      >
        {spinner}
      </div>
    )
  }

  return <div className={`flex items-center justify-center p-8 ${className}`}>{spinner}</div>
}

/**
 * Inline loading spinner (for buttons, etc.)
 */
export function LoadingSpinner({
  size = 'sm',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-3',
  }

  return (
    <div
      className={`animate-spin rounded-full border-gray-300 border-t-current ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}

/**
 * Skeleton loader for content placeholders
 */
export interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rectangular' | 'circular'
  width?: string
  height?: string
  count?: number
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  count = 1,
}: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
  }

  const style = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1rem' : '3rem'),
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-gray-200 ${variantClasses[variant]} ${className}`}
          style={style}
        />
      ))}
    </>
  )
}

/**
 * Table skeleton loader
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Card skeleton loader
 */
export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <Skeleton variant="rectangular" height="12rem" />
          <Skeleton width="60%" />
          <Skeleton count={2} />
          <div className="flex gap-2">
            <Skeleton width="5rem" />
            <Skeleton width="5rem" />
          </div>
        </div>
      ))}
    </>
  )
}
