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
  iconBgColor = 'bg-aro-terracotta/15',
  valueClassName = '',
  onClick,
}) => {
  const isClickable = !!onClick

  return (
    <div
      className={`
        group relative overflow-hidden
        bg-white/80
        backdrop-blur-xl
        rounded-2xl p-6
        border border-aro-hairline
        shadow-lg shadow-aro-ink/5
        transition-all duration-300 ease-out
        ${isClickable ? 'cursor-pointer hover:shadow-2xl hover:shadow-aro-terra/20 hover:scale-[1.02] hover:border-aro-terracotta/50' : 'hover:shadow-xl'}
      `
        .trim()
        .replace(/\s+/g, ' ')}
      onClick={onClick}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-aro-terracotta/5 via-transparent to-aro-sand/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Content */}
      <div className="relative z-10">
        {/* Icon and Trend */}
        <div className="flex items-center justify-between mb-4">
          <div
            className={`w-14 h-14 rounded-xl ${iconBgColor} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}
          >
            <div className="text-aro-ink-soft">{icon}</div>
          </div>
          {trend && (
            <div
              className={`
                flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold
                ${trend.positive === false ? 'bg-aro-rose text-aro-ink' : 'bg-aro-sage text-aro-ink'}
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
        <h3 className="text-aro-muted text-sm font-medium uppercase tracking-wide mb-2">{title}</h3>

        {/* Value */}
        <p className={`text-3xl font-bold text-aro-ink ${valueClassName}`.trim()}>{value}</p>

        {/* Shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
      </div>
    </div>
  )
}

export default StatCard
