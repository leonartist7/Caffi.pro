/**
 * Unit Tests for Pricing Business Logic
 */

import {
  calculateItemPrice,
  calculateSubtotal,
  calculateDiscount,
  isCouponValid,
  calculateTax,
  calculateTipFromPercentage,
  getSuggestedTips,
  calculateOrderTotal,
  formatPrice,
  parsePrice,
} from '@/lib/business-logic/pricing'

describe('Pricing Business Logic', () => {
  describe('calculateItemPrice', () => {
    it('should calculate price without modifiers', () => {
      const item = {
        quantity: 2,
        unit_price: 5.0,
      }

      expect(calculateItemPrice(item)).toBe(10.0)
    })

    it('should calculate price with modifiers', () => {
      const item = {
        quantity: 2,
        unit_price: 5.0,
        modifiers: [{ price_adjustment: 0.5 }, { price_adjustment: 1.0 }],
      }

      // (5.00 + 0.50 + 1.00) * 2 = 13.00
      expect(calculateItemPrice(item)).toBe(13.0)
    })

    it('should handle negative modifier adjustments', () => {
      const item = {
        quantity: 1,
        unit_price: 5.0,
        modifiers: [{ price_adjustment: -1.0 }],
      }

      expect(calculateItemPrice(item)).toBe(4.0)
    })
  })

  describe('calculateSubtotal', () => {
    it('should calculate subtotal for multiple items', () => {
      const items = [
        { quantity: 2, unit_price: 5.0 },
        { quantity: 1, unit_price: 3.0 },
      ]

      // (2 * 5.00) + (1 * 3.00) = 13.00
      expect(calculateSubtotal(items)).toBe(13.0)
    })

    it('should return 0 for empty items', () => {
      expect(calculateSubtotal([])).toBe(0)
    })
  })

  describe('calculateDiscount', () => {
    it('should calculate percentage discount', () => {
      const coupon = {
        type: 'percentage' as const,
        value: 10,
      }

      // 10% of 100 = 10
      expect(calculateDiscount(100, coupon)).toBe(10)
    })

    it('should calculate fixed discount', () => {
      const coupon = {
        type: 'fixed' as const,
        value: 15,
      }

      expect(calculateDiscount(100, coupon)).toBe(15)
    })

    it('should apply minimum order amount', () => {
      const coupon = {
        type: 'fixed' as const,
        value: 10,
        min_order_amount: 50,
      }

      expect(calculateDiscount(30, coupon)).toBe(0)
      expect(calculateDiscount(60, coupon)).toBe(10)
    })

    it('should not exceed subtotal', () => {
      const coupon = {
        type: 'fixed' as const,
        value: 100,
      }

      expect(calculateDiscount(50, coupon)).toBe(50)
    })

    it('should apply max discount cap', () => {
      const coupon = {
        type: 'percentage' as const,
        value: 50,
        max_discount: 20,
      }

      // 50% of 100 = 50, but capped at 20
      expect(calculateDiscount(100, coupon)).toBe(20)
    })

    it('should return 0 when no coupon', () => {
      expect(calculateDiscount(100)).toBe(0)
    })
  })

  describe('isCouponValid', () => {
    it('should validate active coupon within valid dates', () => {
      const now = new Date()
      const coupon = {
        is_active: true,
        valid_from: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Yesterday
        valid_until: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      }

      const result = isCouponValid(coupon)
      expect(result.valid).toBe(true)
    })

    it('should reject inactive coupon', () => {
      const coupon = {
        is_active: false,
        valid_from: new Date('2025-06-01'),
        valid_until: new Date('2025-06-30'),
      }

      const result = isCouponValid(coupon)
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Coupon is not active')
    })

    it('should reject expired coupon', () => {
      const coupon = {
        is_active: true,
        valid_from: new Date('2025-01-01'),
        valid_until: new Date('2025-01-31'),
      }

      const result = isCouponValid(coupon)
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Coupon has expired')
    })

    it('should reject coupon at usage limit', () => {
      const coupon = {
        is_active: true,
        valid_from: new Date('2025-01-01'),
        valid_until: new Date('2025-12-31'),
        max_uses: 100,
        current_uses: 100,
      }

      const result = isCouponValid(coupon)
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Coupon usage limit reached')
    })

    it('should reject coupon at user usage limit', () => {
      const coupon = {
        is_active: true,
        valid_from: new Date('2025-01-01'),
        valid_until: new Date('2025-12-31'),
        max_uses_per_user: 3,
        user_uses: 3,
      }

      const result = isCouponValid(coupon)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('already used')
    })
  })

  describe('calculateTax', () => {
    it('should calculate tax on taxable amount', () => {
      const tax = calculateTax(100, 10, 0.0825)
      // (100 - 10) * 0.0825 = 7.425 = 7.43
      expect(tax).toBe(7.43)
    })

    it('should use default tax rate', () => {
      const tax = calculateTax(100, 0)
      expect(tax).toBeGreaterThan(0)
    })
  })

  describe('calculateTipFromPercentage', () => {
    it('should calculate 15% tip', () => {
      expect(calculateTipFromPercentage(100, 15)).toBe(15)
    })

    it('should calculate 20% tip', () => {
      expect(calculateTipFromPercentage(50, 20)).toBe(10)
    })

    it('should round to 2 decimals', () => {
      expect(calculateTipFromPercentage(33.33, 15)).toBe(5)
    })
  })

  describe('getSuggestedTips', () => {
    it('should provide three tip suggestions', () => {
      const tips = getSuggestedTips(100)

      expect(tips.low).toBe(15)
      expect(tips.medium).toBe(18)
      expect(tips.high).toBe(20)
    })
  })

  describe('calculateOrderTotal', () => {
    it('should calculate complete order total', () => {
      const items = [
        { quantity: 2, unit_price: 10.0 },
        { quantity: 1, unit_price: 5.0 },
      ]

      const result = calculateOrderTotal(items, {
        taxRate: 0.1,
        tipPercentage: 15,
      })

      expect(result.subtotal).toBe(25)
      expect(result.discount).toBe(0)
      expect(result.tax).toBe(2.5) // 10% of 25
      expect(result.tip).toBe(3.75) // 15% of 25
      expect(result.total).toBe(31.25)
    })

    it('should apply coupon discount', () => {
      const items = [{ quantity: 1, unit_price: 100 }]
      const coupon = { type: 'fixed' as const, value: 20 }

      const result = calculateOrderTotal(items, {
        coupon,
        taxRate: 0.1,
      })

      expect(result.subtotal).toBe(100)
      expect(result.discount).toBe(20)
      expect(result.tax).toBe(8) // 10% of (100 - 20)
      expect(result.total).toBe(88)
    })

    it('should use tip amount over percentage', () => {
      const items = [{ quantity: 1, unit_price: 100 }]

      const result = calculateOrderTotal(items, {
        tipAmount: 10,
        tipPercentage: 20,
      })

      expect(result.tip).toBe(10)
    })
  })

  describe('formatPrice', () => {
    it('should format price as USD currency', () => {
      expect(formatPrice(12.5)).toBe('$12.50')
      expect(formatPrice(1000)).toBe('$1,000.00')
    })
  })

  describe('parsePrice', () => {
    it('should parse price string to number', () => {
      expect(parsePrice('$12.50')).toBe(12.5)
      expect(parsePrice('1,000.00')).toBe(1000)
      expect(parsePrice('$1,234.56')).toBe(1234.56)
    })

    it('should return 0 for invalid input', () => {
      expect(parsePrice('invalid')).toBe(0)
      expect(parsePrice('')).toBe(0)
    })
  })
})
