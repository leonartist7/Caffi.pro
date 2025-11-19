/**
 * Order Management Business Logic
 *
 * Pure functions for order state transitions, validation, and calculations.
 * Backend-agnostic - no database dependencies.
 */

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'

export type OrderType = 'pickup' | 'dine_in' | 'delivery'

export interface Order {
  id: string
  status: OrderStatus
  order_type: OrderType
  created_at: Date
  scheduled_for?: Date
  completed_at?: Date
  cancelled_at?: Date
}

// ==================== Status Transitions ====================

/**
 * Valid state transitions for orders
 */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

/**
 * Check if status transition is valid
 */
export function canTransitionTo(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): { valid: boolean; reason?: string } {
  if (currentStatus === newStatus) {
    return { valid: false, reason: `Order is already ${currentStatus}` }
  }

  const validNextStatuses = VALID_TRANSITIONS[currentStatus]

  if (!validNextStatuses.includes(newStatus)) {
    return {
      valid: false,
      reason: `Cannot transition from ${currentStatus} to ${newStatus}`,
    }
  }

  return { valid: true }
}

/**
 * Get next possible statuses
 */
export function getNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
  return VALID_TRANSITIONS[currentStatus]
}

/**
 * Get status display information
 */
export function getStatusInfo(status: OrderStatus): {
  label: string
  color: string
  icon: string
} {
  const statusMap = {
    pending: {
      label: 'Pending',
      color: 'yellow',
      icon: 'clock',
    },
    confirmed: {
      label: 'Confirmed',
      color: 'blue',
      icon: 'check-circle',
    },
    preparing: {
      label: 'Preparing',
      color: 'purple',
      icon: 'coffee',
    },
    ready: {
      label: 'Ready',
      color: 'green',
      icon: 'check',
    },
    completed: {
      label: 'Completed',
      color: 'gray',
      icon: 'archive',
    },
    cancelled: {
      label: 'Cancelled',
      color: 'red',
      icon: 'x-circle',
    },
  }

  return statusMap[status]
}

// ==================== Order Timing ====================

/**
 * Calculate estimated completion time
 */
export function calculateEstimatedCompletion(
  orderType: OrderType,
  itemCount: number,
  averagePrepTimeMinutes: number = 5
): Date {
  const baseTime = itemCount * averagePrepTimeMinutes

  // Add buffer time based on order type
  const bufferTime = {
    pickup: 5,
    dine_in: 10,
    delivery: 20,
  }[orderType]

  const totalMinutes = baseTime + bufferTime
  const estimatedTime = new Date()
  estimatedTime.setMinutes(estimatedTime.getMinutes() + totalMinutes)

  return estimatedTime
}

/**
 * Check if order is scheduled
 */
export function isScheduledOrder(order: Order): boolean {
  if (!order.scheduled_for) return false

  const scheduledTime = new Date(order.scheduled_for)
  const now = new Date()

  return scheduledTime > now
}

/**
 * Check if order is overdue
 */
export function isOrderOverdue(order: Order, estimatedCompletionTime: Date): boolean {
  if (order.status === 'completed' || order.status === 'cancelled') {
    return false
  }

  const now = new Date()
  return now > estimatedCompletionTime
}

/**
 * Calculate order age in minutes
 */
export function getOrderAgeMinutes(order: Order): number {
  const now = new Date()
  const createdAt = new Date(order.created_at)
  const diffMs = now.getTime() - createdAt.getTime()
  return Math.floor(diffMs / (1000 * 60))
}

// ==================== Order Validation ====================

/**
 * Check if order can be modified
 */
export function canModifyOrder(order: Order): { canModify: boolean; reason?: string } {
  if (order.status === 'completed') {
    return { canModify: false, reason: 'Order is already completed' }
  }

  if (order.status === 'cancelled') {
    return { canModify: false, reason: 'Order is cancelled' }
  }

  if (order.status === 'ready') {
    return { canModify: false, reason: 'Order is ready for pickup' }
  }

  return { canModify: true }
}

/**
 * Check if order can be cancelled
 */
export function canCancelOrder(order: Order): { canCancel: boolean; reason?: string } {
  if (order.status === 'completed') {
    return { canCancel: false, reason: 'Order is already completed' }
  }

  if (order.status === 'cancelled') {
    return { canCancel: false, reason: 'Order is already cancelled' }
  }

  // Can't cancel if it's been more than 5 minutes and already preparing
  if (order.status === 'preparing' || order.status === 'ready') {
    const ageMinutes = getOrderAgeMinutes(order)
    if (ageMinutes > 5) {
      return { canCancel: false, reason: 'Order is too far along to cancel' }
    }
  }

  return { canCancel: true }
}

/**
 * Validate scheduled order time
 */
export function validateScheduledTime(scheduledFor: Date): {
  valid: boolean
  reason?: string
} {
  const now = new Date()
  const minScheduleTime = new Date(now.getTime() + 30 * 60 * 1000) // 30 minutes from now
  const maxScheduleTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now

  if (scheduledFor < minScheduleTime) {
    return {
      valid: false,
      reason: 'Scheduled time must be at least 30 minutes in the future',
    }
  }

  if (scheduledFor > maxScheduleTime) {
    return {
      valid: false,
      reason: 'Cannot schedule orders more than 7 days in advance',
    }
  }

  return { valid: true }
}

// ==================== Order Grouping & Filtering ====================

/**
 * Group orders by status
 */
export function groupOrdersByStatus<T extends { status: OrderStatus }>(
  orders: T[]
): Record<OrderStatus, T[]> {
  const grouped: Record<string, T[]> = {
    pending: [],
    confirmed: [],
    preparing: [],
    ready: [],
    completed: [],
    cancelled: [],
  }

  for (const order of orders) {
    grouped[order.status].push(order)
  }

  return grouped as Record<OrderStatus, T[]>
}

/**
 * Filter active orders (not completed or cancelled)
 */
export function getActiveOrders<T extends { status: OrderStatus }>(orders: T[]): T[] {
  return orders.filter(order => order.status !== 'completed' && order.status !== 'cancelled')
}

/**
 * Sort orders by priority
 */
export function sortOrdersByPriority<T extends Order>(orders: T[]): T[] {
  const statusPriority: Record<OrderStatus, number> = {
    ready: 1,
    preparing: 2,
    confirmed: 3,
    pending: 4,
    completed: 5,
    cancelled: 6,
  }

  return [...orders].sort((a, b) => {
    // First sort by status priority
    const statusDiff = statusPriority[a.status] - statusPriority[b.status]
    if (statusDiff !== 0) return statusDiff

    // Then by creation time (oldest first)
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

// ==================== Order Analytics ====================

/**
 * Calculate average order value
 */
export function calculateAverageOrderValue(orderTotals: number[]): number {
  if (orderTotals.length === 0) return 0
  const sum = orderTotals.reduce((acc, total) => acc + total, 0)
  return Math.round((sum / orderTotals.length) * 100) / 100
}

/**
 * Calculate order completion rate
 */
export function calculateCompletionRate(orders: Order[]): number {
  if (orders.length === 0) return 0
  const completed = orders.filter(o => o.status === 'completed').length
  return Math.round((completed / orders.length) * 100)
}

/**
 * Calculate average preparation time
 */
export function calculateAveragePrepTime(orders: Order[]): number {
  const completedOrders = orders.filter(o => o.status === 'completed' && o.completed_at)

  if (completedOrders.length === 0) return 0

  const totalMinutes = completedOrders.reduce((sum, order) => {
    const created = new Date(order.created_at).getTime()
    const completed = new Date(order.completed_at!).getTime()
    const minutes = (completed - created) / (1000 * 60)
    return sum + minutes
  }, 0)

  return Math.round(totalMinutes / completedOrders.length)
}

/**
 * Get peak order hours
 */
export function getPeakOrderHours(orders: Order[]): Record<number, number> {
  const hourCounts: Record<number, number> = {}

  for (let i = 0; i < 24; i++) {
    hourCounts[i] = 0
  }

  for (const order of orders) {
    const hour = new Date(order.created_at).getHours()
    hourCounts[hour]++
  }

  return hourCounts
}

// ==================== Order Number Generation ====================

/**
 * Generate display order number (human-friendly)
 */
export function generateDisplayOrderNumber(sequenceNumber: number, prefix: string = ''): string {
  return `${prefix}${sequenceNumber.toString().padStart(4, '0')}`
}

/**
 * Generate today's order number
 */
export function generateTodayOrderNumber(ordersToday: number): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const sequence = (ordersToday + 1).toString().padStart(3, '0')

  return `${year}${month}${day}-${sequence}`
}
