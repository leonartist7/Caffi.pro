import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: {
    value: string
    positive?: boolean
  }
  iconBgColor?: string
  valueClassName?: string
  onClick?: () => void
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  iconBgColor = 'bg-gradient-to-br from-coffee-500/20 to-coffee-600/10',
  valueClassName = '',
  onClick,
}) => {
  const isClickable = !!onClick

  return (
    <div
      className={`
        group relative overflow-hidden
        bg-white/80 dark:bg-dark-800/80
        backdrop-blur-xl
        rounded-2xl p-6
        border border-coffee-200/50 dark:border-dark-700
        shadow-lg shadow-coffee-900/5 dark:shadow-black/20
        transition-all duration-300 ease-out
        ${isClickable ? 'cursor-pointer hover:shadow-2xl hover:shadow-coffee-500/20 hover:scale-[1.02] hover:border-coffee-400/50 dark:hover:border-coffee-600/50' : 'hover:shadow-xl'}
      `
        .trim()
        .replace(/\s+/g, ' ')}
      onClick={onClick}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-coffee-500/5 via-transparent to-cream-500/5 dark:from-coffee-700/10 dark:to-cream-700/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Content */}
      <div className="relative z-10">
        {/* Icon and Trend */}
        <div className="flex items-center justify-between mb-4">
          <div
            className={`w-14 h-14 rounded-xl ${iconBgColor} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}
          >
            <div className="text-coffee-700 dark:text-cream-200">{icon}</div>
          </div>
          {trend && (
            <div
              className={`
                flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold
                ${
                  trend.positive === false
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                }
              `}
            >
              {trend.positive === false ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <TrendingUp className="w-3 h-3" />
              )}
              <span>{trend.value}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-coffee-600 dark:text-cream-400 text-sm font-medium uppercase tracking-wide mb-2">
          {title}
        </h3>

        {/* Value */}
        <p
          className={`text-3xl font-bold text-coffee-900 dark:text-cream-100 ${valueClassName}`.trim()}
        >
          {value}
        </p>

        {/* Shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
      </div>
    </div>
  )
}

export default StatCard
