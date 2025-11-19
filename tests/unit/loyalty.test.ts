/**
 * Unit Tests for Loyalty Business Logic
 */

import {
  calculatePointsEarned,
  applyBonusPoints,
  calculateTier,
  getPointsToNextTier,
  calculateTierProgress,
  canRedeemReward,
  getAvailableRewards,
  calculateNetPoints,
  getExpiringPoints,
  calculateAchievements,
  calculateStreakBonus,
  checkStreak,
  type LoyaltyTier,
  type Reward,
  type PointsTransaction,
} from '@/lib/business-logic/loyalty'

describe('Loyalty Business Logic', () => {
  const tiers: LoyaltyTier[] = [
    { id: '1', name: 'Bronze', min_points: 0, points_multiplier: 1, display_order: 0 },
    { id: '2', name: 'Silver', min_points: 100, points_multiplier: 1.25, display_order: 1 },
    { id: '3', name: 'Gold', min_points: 500, points_multiplier: 1.5, display_order: 2 },
    { id: '4', name: 'Platinum', min_points: 1000, points_multiplier: 2, display_order: 3 },
  ]

  describe('calculatePointsEarned', () => {
    it('should calculate base points', () => {
      expect(calculatePointsEarned(25, 1, 1)).toBe(25)
    })

    it('should apply multiplier', () => {
      expect(calculatePointsEarned(25, 1.5, 1)).toBe(37)
    })

    it('should use custom points per dollar', () => {
      expect(calculatePointsEarned(25, 1, 2)).toBe(50)
    })

    it('should floor the result', () => {
      expect(calculatePointsEarned(25.99, 1, 1)).toBe(25)
    })
  })

  describe('applyBonusPoints', () => {
    it('should calculate 10% bonus', () => {
      expect(applyBonusPoints(100, 10)).toBe(110)
    })

    it('should calculate 50% bonus', () => {
      expect(applyBonusPoints(200, 50)).toBe(300)
    })

    it('should floor bonus points', () => {
      expect(applyBonusPoints(99, 10)).toBe(108) // 99 + 9
    })
  })

  describe('calculateTier', () => {
    it('should return Bronze for 0 points', () => {
      const tier = calculateTier(0, tiers)
      expect(tier?.name).toBe('Bronze')
    })

    it('should return Silver for 100 points', () => {
      const tier = calculateTier(100, tiers)
      expect(tier?.name).toBe('Silver')
    })

    it('should return Gold for 500 points', () => {
      const tier = calculateTier(500, tiers)
      expect(tier?.name).toBe('Gold')
    })

    it('should return Platinum for 1000+ points', () => {
      const tier = calculateTier(1500, tiers)
      expect(tier?.name).toBe('Platinum')
    })

    it('should return highest qualifying tier', () => {
      const tier = calculateTier(250, tiers)
      expect(tier?.name).toBe('Silver')
    })
  })

  describe('getPointsToNextTier', () => {
    it('should calculate points needed from Bronze to Silver', () => {
      const result = getPointsToNextTier(50, tiers)
      expect(result.nextTier?.name).toBe('Silver')
      expect(result.pointsNeeded).toBe(50) // 100 - 50
    })

    it('should calculate points needed from Silver to Gold', () => {
      const result = getPointsToNextTier(250, tiers)
      expect(result.nextTier?.name).toBe('Gold')
      expect(result.pointsNeeded).toBe(250) // 500 - 250
    })

    it('should return null at max tier', () => {
      const result = getPointsToNextTier(1500, tiers)
      expect(result.nextTier).toBeNull()
      expect(result.pointsNeeded).toBe(0)
    })
  })

  describe('calculateTierProgress', () => {
    it('should calculate progress in Bronze tier', () => {
      const progress = calculateTierProgress(50, tiers)
      // 50 points into 100-point tier = 50%
      expect(progress).toBe(50)
    })

    it('should calculate progress in Silver tier', () => {
      const progress = calculateTierProgress(300, tiers)
      // 200 points into 400-point tier = 50%
      expect(progress).toBe(50)
    })

    it('should return 100 at max tier', () => {
      const progress = calculateTierProgress(1500, tiers)
      expect(progress).toBe(100)
    })
  })

  describe('canRedeemReward', () => {
    const reward: Reward = {
      id: '1',
      name: 'Free Coffee',
      points_cost: 100,
      is_active: true,
    }

    it('should allow redemption with sufficient points', () => {
      const result = canRedeemReward(reward, 150)
      expect(result.canRedeem).toBe(true)
    })

    it('should reject with insufficient points', () => {
      const result = canRedeemReward(reward, 50)
      expect(result.canRedeem).toBe(false)
      expect(result.reason).toContain('50 more points')
    })

    it('should reject inactive reward', () => {
      const inactiveReward = { ...reward, is_active: false }
      const result = canRedeemReward(inactiveReward, 150)
      expect(result.canRedeem).toBe(false)
      expect(result.reason).toContain('no longer available')
    })

    it('should reject expired reward', () => {
      const expiredReward = {
        ...reward,
        expires_at: new Date('2020-01-01'),
      }
      const result = canRedeemReward(expiredReward, 150)
      expect(result.canRedeem).toBe(false)
      expect(result.reason).toContain('expired')
    })
  })

  describe('getAvailableRewards', () => {
    const rewards: Reward[] = [
      { id: '1', name: 'Small Coffee', points_cost: 50, is_active: true },
      { id: '2', name: 'Large Coffee', points_cost: 100, is_active: true },
      { id: '3', name: 'Pastry', points_cost: 150, is_active: true },
    ]

    it('should return all rewards user can afford', () => {
      const available = getAvailableRewards(rewards, 120)
      expect(available.length).toBe(2)
      expect(available[0].name).toBe('Small Coffee')
      expect(available[1].name).toBe('Large Coffee')
    })

    it('should return empty array with no points', () => {
      const available = getAvailableRewards(rewards, 0)
      expect(available.length).toBe(0)
    })

    it('should return all rewards with enough points', () => {
      const available = getAvailableRewards(rewards, 200)
      expect(available.length).toBe(3)
    })
  })

  describe('calculateNetPoints', () => {
    const transactions: PointsTransaction[] = [
      {
        amount: 100,
        type: 'earned',
        description: 'Order',
        created_at: new Date('2025-01-01'),
      },
      {
        amount: 50,
        type: 'earned',
        description: 'Order',
        created_at: new Date('2025-01-02'),
      },
      {
        amount: -30,
        type: 'redeemed',
        description: 'Reward',
        created_at: new Date('2025-01-03'),
      },
      {
        amount: -20,
        type: 'expired',
        description: 'Expired',
        created_at: new Date('2025-01-04'),
      },
    ]

    it('should calculate net points correctly', () => {
      const result = calculateNetPoints(transactions)
      expect(result.totalEarned).toBe(150)
      expect(result.totalRedeemed).toBe(30)
      expect(result.totalExpired).toBe(20)
      expect(result.netPoints).toBe(100) // 150 - 30 - 20
    })

    it('should handle empty transactions', () => {
      const result = calculateNetPoints([])
      expect(result.totalEarned).toBe(0)
      expect(result.netPoints).toBe(0)
    })
  })

  describe('calculateAchievements', () => {
    it('should return no achievements for low points', () => {
      expect(calculateAchievements(50)).toEqual([])
    })

    it('should return first achievement at 100 points', () => {
      expect(calculateAchievements(100)).toContain('First 100 Points')
    })

    it('should return multiple achievements', () => {
      const achievements = calculateAchievements(1500)
      expect(achievements).toContain('First 100 Points')
      expect(achievements).toContain('Points Collector')
      expect(achievements).toContain('Loyalty Master')
    })

    it('should return all achievements at max points', () => {
      const achievements = calculateAchievements(10000)
      expect(achievements.length).toBe(5)
      expect(achievements).toContain('Legend')
    })
  })

  describe('calculateStreakBonus', () => {
    it('should return 0 for short streaks', () => {
      expect(calculateStreakBonus(1)).toBe(0)
      expect(calculateStreakBonus(2)).toBe(0)
    })

    it('should return 5% for 3-day streak', () => {
      expect(calculateStreakBonus(3)).toBe(5)
    })

    it('should return 10% for 7-day streak', () => {
      expect(calculateStreakBonus(7)).toBe(10)
    })

    it('should return 25% for 14-day streak', () => {
      expect(calculateStreakBonus(14)).toBe(25)
    })

    it('should return 50% for 30-day streak', () => {
      expect(calculateStreakBonus(30)).toBe(50)
      expect(calculateStreakBonus(60)).toBe(50)
    })
  })

  describe('checkStreak', () => {
    it('should return 0 for empty orders', () => {
      const result = checkStreak([])
      expect(result.currentStreak).toBe(0)
      expect(result.longestStreak).toBe(0)
    })

    it('should calculate current streak', () => {
      const now = new Date()
      const dates = [
        new Date(now.getTime()),
        new Date(now.getTime() - 24 * 60 * 60 * 1000),
        new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      ]
      const result = checkStreak(dates)
      expect(result.currentStreak).toBeGreaterThanOrEqual(1)
      expect(result.longestStreak).toBeGreaterThanOrEqual(1)
    })

    it('should break streak on gap', () => {
      const dates = [
        new Date('2025-01-05'),
        new Date('2025-01-04'),
        new Date('2025-01-02'), // Gap at Jan 3
        new Date('2025-01-01'),
      ]
      const result = checkStreak(dates)
      expect(result.currentStreak).toBe(2) // Jan 4-5
      expect(result.longestStreak).toBe(2)
    })

    it('should find longest streak in history', () => {
      const dates = [
        new Date('2025-01-10'),
        new Date('2025-01-05'),
        new Date('2025-01-04'),
        new Date('2025-01-03'),
        new Date('2025-01-02'),
      ]
      const result = checkStreak(dates)
      expect(result.currentStreak).toBe(1) // Only Jan 10
      expect(result.longestStreak).toBe(4) // Jan 2-5
    })
  })
})
