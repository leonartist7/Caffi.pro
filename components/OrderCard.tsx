import React from 'react'

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'

interface OrderCardProps {
  orderNumber: string
  cafeName: string
  customerName: string
  customerPhone?: string | null
  totalAmount: number
  status: OrderStatus
  createdAt: string
  onStatusChange?: (newStatus: OrderStatus) => void
  showStatusDropdown?: boolean
}

const OrderCard: React.FC<OrderCardProps> = ({
  orderNumber,
  cafeName,
  customerName,
  customerPhone,
  totalAmount,
  status,
  createdAt,
  onStatusChange,
  showStatusDropdown = true
}) => {
  const getStatusColor = (status: OrderStatus): string => {
    const colors: Record<OrderStatus, string> = {
      pending: 'border-yellow-500 bg-yellow-50',
      preparing: 'border-blue-500 bg-blue-50',
      ready: 'border-green-500 bg-green-50',
      completed: 'border-gray-500 bg-gray-50',
      cancelled: 'border-red-500 bg-red-50',
    }
    return colors[status] || 'border-gray-300 bg-white'
  }

  return (
    <div
      className={`p-4 rounded-xl border-l-4 bg-white shadow-sm mb-3 ${getStatusColor(status)}`}
    >
      {/* Header: Order Number and Total */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-mono font-bold text-gray-900">{orderNumber}</p>
          <p className="text-sm font-serif italic text-gray-700">
            {cafeName}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono font-bold text-gray-900">
            €{totalAmount.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(createdAt).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="mb-3">
        <p className="text-sm text-gray-600">Customer: {customerName}</p>
        {customerPhone && (
          <p className="text-xs text-gray-500">{customerPhone}</p>
        )}
      </div>

      {/* Status Dropdown */}
      {showStatusDropdown && onStatusChange && (
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value as OrderStatus)}
            className="text-xs px-3 py-1 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          >
            <option value="pending">Pending</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      )}
    </div>
  )
}

export default OrderCard
