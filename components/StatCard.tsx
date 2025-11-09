import React from 'react'

interface StatCardProps {
  title: string
  value: string | number
  icon: string
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
  iconBgColor = 'bg-primary/10',
  valueClassName = '',
  onClick
}) => {
  const isClickable = !!onClick

  return (
    <div
      className={`
        bg-white rounded-2xl p-6 shadow-md border border-gray-100
        ${isClickable ? 'cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all' : ''}
      `.trim().replace(/\s+/g, ' ')}
      onClick={onClick}
    >
      {/* Icon and Trend */}
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${iconBgColor} flex items-center justify-center`}>
          <span className="text-2xl">{icon}</span>
        </div>
        {trend && (
          <span
            className={`text-sm font-medium ${
              trend.positive === false ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-gray-600 text-sm font-medium">{title}</h3>

      {/* Value */}
      <p
        className={`text-3xl font-bold text-gray-900 mt-1 ${valueClassName}`.trim()}
      >
        {value}
      </p>
    </div>
  )
}

export default StatCard
