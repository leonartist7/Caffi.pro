/**
 * Unit Tests for Orders Business Logic
 */

import {
  canTransitionTo,
  getNextStatuses,
  getStatusInfo,
  calculateEstimatedCompletion,
  isScheduledOrder,
  isOrderOverdue,
  getOrderAgeMinutes,
  canModifyOrder,
  canCancelOrder,
  validateScheduledTime,
  groupOrdersByStatus,
  getActiveOrders,
  sortOrdersByPriority,
  calculateAverageOrderValue,
  calculateCompletionRate,
  calculateAveragePrepTime,
  generateDisplayOrderNumber,
  generateTodayOrderNumber,
  type Order,
  type OrderStatus,
} from '@/lib/business-logic/orders'

describe('Orders Business Logic', () => {
  describe('canTransitionTo', () => {
    it('should allow pending → confirmed', () => {
      const result = canTransitionTo('pending', 'confirmed')
      expect(result.valid).toBe(true)
    })

    it('should allow confirmed → preparing', () => {
      const result = canTransitionTo('confirmed', 'preparing')
      expect(result.valid).toBe(true)
    })

    it('should reject invalid transitions', () => {
      const result = canTransitionTo('pending', 'ready')
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('Cannot transition')
    })

    it('should reject same status', () => {
      const result = canTransitionTo('pending', 'pending')
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('already')
    })

    it('should reject transitions from completed', () => {
      const result = canTransitionTo('completed', 'preparing')
      expect(result.valid).toBe(false)
    })

    it('should allow cancellation from any active status', () => {
      expect(canTransitionTo('pending', 'cancelled').valid).toBe(true)
      expect(canTransitionTo('confirmed', 'cancelled').valid).toBe(true)
      expect(canTransitionTo('preparing', 'cancelled').valid).toBe(true)
      expect(canTransitionTo('ready', 'cancelled').valid).toBe(true)
    })
  })

  describe('getNextStatuses', () => {
    it('should return valid next statuses for pending', () => {
      const statuses = getNextStatuses('pending')
      expect(statuses).toContain('confirmed')
      expect(statuses).toContain('cancelled')
    })

    it('should return empty array for completed', () => {
      const statuses = getNextStatuses('completed')
      expect(statuses).toEqual([])
    })
  })

  describe('getStatusInfo', () => {
    it('should return info for each status', () => {
      const statuses: OrderStatus[] = [
        'pending',
        'confirmed',
        'preparing',
        'ready',
        'completed',
        'cancelled',
      ]

      statuses.forEach(status => {
        const info = getStatusInfo(status)
        expect(info.label).toBeTruthy()
        expect(info.color).toBeTruthy()
        expect(info.icon).toBeTruthy()
      })
    })
  })

  describe('calculateEstimatedCompletion', () => {
    it('should estimate pickup time', () => {
      const start = Date.now()
      const estimated = calculateEstimatedCompletion('pickup', 3, 5)

      // 3 items * 5 min + 5 min buffer = 20 min
      expect(estimated.getTime()).toBeGreaterThan(start)
      expect(estimated.getTime()).toBeLessThan(start + 25 * 60 * 1000)
    })

    it('should add more buffer for delivery', () => {
      const pickupTime = calculateEstimatedCompletion('pickup', 2, 5)
      const deliveryTime = calculateEstimatedCompletion('delivery', 2, 5)

      expect(deliveryTime.getTime()).toBeGreaterThan(pickupTime.getTime())
    })
  })

  describe('isScheduledOrder', () => {
    it('should return true for future scheduled orders', () => {
      const order: Order = {
        id: '1',
        status: 'pending',
        order_type: 'pickup',
        created_at: new Date(),
        scheduled_for: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      }

      expect(isScheduledOrder(order)).toBe(true)
    })

    it('should return false for past scheduled time', () => {
      const order: Order = {
        id: '1',
        status: 'pending',
        order_type: 'pickup',
        created_at: new Date(),
        scheduled_for: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      }

      expect(isScheduledOrder(order)).toBe(false)
    })

    it('should return false for non-scheduled orders', () => {
      const order: Order = {
        id: '1',
        status: 'pending',
        order_type: 'pickup',
        created_at: new Date(),
      }

      expect(isScheduledOrder(order)).toBe(false)
    })
  })

  describe('isOrderOverdue', () => {
    it('should return true when past estimated time', () => {
      const order: Order = {
        id: '1',
        status: 'preparing',
        order_type: 'pickup',
        created_at: new Date(),
      }

      const estimatedTime = new Date(Date.now() - 10 * 60 * 1000) // 10 min ago

      expect(isOrderOverdue(order, estimatedTime)).toBe(true)
    })

    it('should return false when before estimated time', () => {
      const order: Order = {
        id: '1',
        status: 'preparing',
        order_type: 'pickup',
        created_at: new Date(),
      }

      const estimatedTime = new Date(Date.now() + 10 * 60 * 1000) // 10 min from now

      expect(isOrderOverdue(order, estimatedTime)).toBe(false)
    })

    it('should return false for completed orders', () => {
      const order: Order = {
        id: '1',
        status: 'completed',
        order_type: 'pickup',
        created_at: new Date(),
      }

      const estimatedTime = new Date(Date.now() - 60 * 60 * 1000)

      expect(isOrderOverdue(order, estimatedTime)).toBe(false)
    })
  })

  describe('getOrderAgeMinutes', () => {
    it('should calculate age in minutes', () => {
      const order: Order = {
        id: '1',
        status: 'pending',
        order_type: 'pickup',
        created_at: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
      }

      const age = getOrderAgeMinutes(order)
      expect(age).toBeGreaterThanOrEqual(14)
      expect(age).toBeLessThanOrEqual(16)
    })
  })

  describe('canModifyOrder', () => {
    it('should allow modifying pending orders', () => {
      const order: Order = {
        id: '1',
        status: 'pending',
        order_type: 'pickup',
        created_at: new Date(),
      }

      const result = canModifyOrder(order)
      expect(result.canModify).toBe(true)
    })

    it('should reject modifying completed orders', () => {
      const order: Order = {
        id: '1',
        status: 'completed',
        order_type: 'pickup',
        created_at: new Date(),
      }

      const result = canModifyOrder(order)
      expect(result.canModify).toBe(false)
      expect(result.reason).toContain('completed')
    })

    it('should reject modifying cancelled orders', () => {
      const order: Order = {
        id: '1',
        status: 'cancelled',
        order_type: 'pickup',
        created_at: new Date(),
      }

      const result = canModifyOrder(order)
      expect(result.canModify).toBe(false)
    })
  })

  describe('canCancelOrder', () => {
    it('should allow cancelling recent orders', () => {
      const order: Order = {
        id: '1',
        status: 'confirmed',
        order_type: 'pickup',
        created_at: new Date(),
      }

      const result = canCancelOrder(order)
      expect(result.canCancel).toBe(true)
    })

    it('should reject cancelling completed orders', () => {
      const order: Order = {
        id: '1',
        status: 'completed',
        order_type: 'pickup',
        created_at: new Date(),
      }

      const result = canCancelOrder(order)
      expect(result.canCancel).toBe(false)
    })

    it('should reject cancelling old preparing orders', () => {
      const order: Order = {
        id: '1',
        status: 'preparing',
        order_type: 'pickup',
        created_at: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago
      }

      const result = canCancelOrder(order)
      expect(result.canCancel).toBe(false)
      expect(result.reason).toContain('too far along')
    })
  })

  describe('validateScheduledTime', () => {
    it('should accept valid future time', () => {
      const scheduledFor = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours

      const result = validateScheduledTime(scheduledFor)
      expect(result.valid).toBe(true)
    })

    it('should reject time too soon', () => {
      const scheduledFor = new Date(Date.now() + 10 * 60 * 1000) // 10 min

      const result = validateScheduledTime(scheduledFor)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('30 minutes')
    })

    it('should reject time too far in future', () => {
      const scheduledFor = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 days

      const result = validateScheduledTime(scheduledFor)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('7 days')
    })
  })

  describe('groupOrdersByStatus', () => {
    it('should group orders by status', () => {
      const orders: Order[] = [
        { id: '1', status: 'pending', order_type: 'pickup', created_at: new Date() },
        { id: '2', status: 'confirmed', order_type: 'pickup', created_at: new Date() },
        { id: '3', status: 'pending', order_type: 'pickup', created_at: new Date() },
      ]

      const grouped = groupOrdersByStatus(orders)

      expect(grouped.pending.length).toBe(2)
      expect(grouped.confirmed.length).toBe(1)
      expect(grouped.preparing.length).toBe(0)
    })
  })

  describe('getActiveOrders', () => {
    it('should filter out completed and cancelled orders', () => {
      const orders: Order[] = [
        { id: '1', status: 'pending', order_type: 'pickup', created_at: new Date() },
        { id: '2', status: 'completed', order_type: 'pickup', created_at: new Date() },
        { id: '3', status: 'preparing', order_type: 'pickup', created_at: new Date() },
        { id: '4', status: 'cancelled', order_type: 'pickup', created_at: new Date() },
      ]

      const active = getActiveOrders(orders)

      expect(active.length).toBe(2)
      expect(active.map(o => o.id)).toEqual(['1', '3'])
    })
  })

  describe('sortOrdersByPriority', () => {
    it('should sort by status priority', () => {
      const orders: Order[] = [
        { id: '1', status: 'pending', order_type: 'pickup', created_at: new Date() },
        { id: '2', status: 'ready', order_type: 'pickup', created_at: new Date() },
        { id: '3', status: 'preparing', order_type: 'pickup', created_at: new Date() },
      ]

      const sorted = sortOrdersByPriority(orders)

      expect(sorted[0].status).toBe('ready')
      expect(sorted[1].status).toBe('preparing')
      expect(sorted[2].status).toBe('pending')
    })

    it('should sort by creation time within same status', () => {
      const orders: Order[] = [
        {
          id: '1',
          status: 'pending',
          order_type: 'pickup',
          created_at: new Date('2025-01-01T12:00:00Z'),
        },
        {
          id: '2',
          status: 'pending',
          order_type: 'pickup',
          created_at: new Date('2025-01-01T11:00:00Z'),
        },
      ]

      const sorted = sortOrdersByPriority(orders)

      expect(sorted[0].id).toBe('2') // Older order first
      expect(sorted[1].id).toBe('1')
    })
  })

  describe('calculateAverageOrderValue', () => {
    it('should calculate average', () => {
      const totals = [10, 20, 30]
      expect(calculateAverageOrderValue(totals)).toBe(20)
    })

    it('should return 0 for empty array', () => {
      expect(calculateAverageOrderValue([])).toBe(0)
    })

    it('should round to 2 decimals', () => {
      const totals = [10.99, 20.99, 30.99]
      expect(calculateAverageOrderValue(totals)).toBe(20.99)
    })
  })

  describe('calculateCompletionRate', () => {
    it('should calculate completion percentage', () => {
      const orders: Order[] = [
        { id: '1', status: 'completed', order_type: 'pickup', created_at: new Date() },
        { id: '2', status: 'completed', order_type: 'pickup', created_at: new Date() },
        { id: '3', status: 'cancelled', order_type: 'pickup', created_at: new Date() },
        { id: '4', status: 'pending', order_type: 'pickup', created_at: new Date() },
      ]

      const rate = calculateCompletionRate(orders)
      expect(rate).toBe(50) // 2 out of 4 completed
    })

    it('should return 0 for empty array', () => {
      expect(calculateCompletionRate([])).toBe(0)
    })
  })

  describe('generateDisplayOrderNumber', () => {
    it('should pad sequence number', () => {
      expect(generateDisplayOrderNumber(1)).toBe('0001')
      expect(generateDisplayOrderNumber(42)).toBe('0042')
      expect(generateDisplayOrderNumber(1234)).toBe('1234')
    })

    it('should add prefix', () => {
      expect(generateDisplayOrderNumber(1, 'ORD-')).toBe('ORD-0001')
    })
  })

  describe('generateTodayOrderNumber', () => {
    it('should generate order number with date', () => {
      const orderNumber = generateTodayOrderNumber(5)

      // Format: YYMMDD-NNN
      expect(orderNumber).toMatch(/^\d{6}-\d{3}$/)
      expect(orderNumber).toContain('-006') // ordersToday + 1
    })
  })
})
