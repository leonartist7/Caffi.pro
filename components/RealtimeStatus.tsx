'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'

interface RealtimeStatusProps {
  isConnected: boolean
  className?: string
}

/**
 * RealtimeStatus - Visual indicator for real-time connection status
 *
 * Shows a small badge in the UI to indicate if Supabase Realtime is connected
 * Helps users and admins know if live updates are working
 */
export default function RealtimeStatus({ isConnected, className = '' }: RealtimeStatusProps) {
  const [show, setShow] = useState(false)

  // Only show for 5 seconds after mounting, then hide unless disconnected
  useEffect(() => {
    setShow(true)
    const timer = setTimeout(() => {
      if (isConnected) {
        setShow(false)
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [isConnected])

  // Always show if disconnected
  useEffect(() => {
    if (!isConnected) {
      setShow(true)
    }
  }, [isConnected])

  if (!show) return null

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        isConnected
          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700'
          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700 animate-pulse'
      } ${className}`}
      title={isConnected ? 'Real-time sync active' : 'Reconnecting...'}
    >
      {isConnected ? (
        <>
          <Wifi className="w-3.5 h-3.5" />
          <span>Live</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          <span>Reconnecting...</span>
        </>
      )}
    </div>
  )
}
