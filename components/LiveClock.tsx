'use client'

import { useState, useEffect } from 'react'

export default function LiveClock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="flex flex-col items-start space-y-1">
      <div className="font-mono text-2xl font-bold text-coffee-700 dark:text-cream-200 tracking-wider">
        {formatTime(time)}
      </div>
      <div className="text-xs text-coffee-500 dark:text-cream-400 font-medium uppercase tracking-wide">
        {formatDate(time)}
      </div>
      <div className="flex items-center space-x-1 text-xs text-coffee-400 dark:text-cream-500">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        <span>Live</span>
      </div>
    </div>
  )
}
