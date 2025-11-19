/**
 * Loyalty Program Business Logic
 *
 * Pure functions for calculating loyalty points, tiers, and rewards.
 * Backend-agnostic - no database dependencies.
 */

export interface LoyaltyTier {
  id: string
  name: string
  min_points: number
  points_multiplier: number
  display_order: number
}

export interface LoyaltyPoints {
  total_points: number
  available_points: number
  tier_id?: string
}

export interface Reward {
  id: string
  name: string
  points_cost: number
  is_active: boolean
  expires_at?: Date
}

// ==================== Points Calculations ====================

/**
 * Calculate points earned from order amount
 */
export function calculatePointsEarned(
  orderAmount: number,
  multiplier: number = 1,
  pointsPerDollar: number = 1
): number {
  const basePoints = Math.floor(orderAmount * pointsPerDollar)
  return Math.floor(basePoints * multiplier)
}

/**
 * Calculate points after applying bonus
 */
export function applyBonusPoints(points: number, bonusPercentage: number): number {
  const bonus = Math.floor(points * (bonusPercentage / 100))
  return points + bonus
}

// ==================== Tier Calculations ====================

/**
 * Determine user's current tier based on points
 */
export function calculateTier(totalPoints: number, tiers: LoyaltyTier[]): LoyaltyTier | null {
  // Sort tiers by min_points descending
  const sortedTiers = [...tiers].sort((a, b) => b.min_points - a.min_points)

  // Find the highest tier the user qualifies for
  for (const tier of sortedTiers) {
    if (totalPoints >= tier.min_points) {
      return tier
    }
  }

  return null
}

/**
 * Calculate points needed for next tier
 */
export function getPointsToNextTier(
  currentPoints: number,
  tiers: LoyaltyTier[]
): {
  nextTier: LoyaltyTier | null
  pointsNeeded: number
} {
  // Sort tiers by min_points ascending
  const sortedTiers = [...tiers].sort((a, b) => a.min_points - b.min_points)

  // Find the next tier above current points
  for (const tier of sortedTiers) {
    if (currentPoints < tier.min_points) {
      return {
        nextTier: tier,
        pointsNeeded: tier.min_points - currentPoints,
      }
    }
  }

  return {
    nextTier: null,
    pointsNeeded: 0,
  }
}

/**
 * Calculate progress to next tier as percentage
 */
export function calculateTierProgress(currentPoints: number, tiers: LoyaltyTier[]): number {
  const currentTier = calculateTier(currentPoints, tiers)
  const nextTierInfo = getPointsToNextTier(currentPoints, tiers)

  if (!nextTierInfo.nextTier) {
    return 100 // At max tier
  }

  const currentTierMin = currentTier?.min_points ?? 0
  const nextTierMin = nextTierInfo.nextTier.min_points
  const pointsInTier = nextTierMin - currentTierMin
  const pointsEarned = currentPoints - currentTierMin

  return Math.floor((pointsEarned / pointsInTier) * 100)
}

// ==================== Reward Validation ====================

/**
 * Check if user can redeem a reward
 */
export function canRedeemReward(
  reward: Reward,
  userPoints: number
): { canRedeem: boolean; reason?: string } {
  if (!reward.is_active) {
    return { canRedeem: false, reason: 'This reward is no longer available' }
  }

  if (reward.expires_at && new Date() > reward.expires_at) {
    return { canRedeem: false, reason: 'This reward has expired' }
  }

  if (userPoints < reward.points_cost) {
    return {
      canRedeem: false,
      reason: `You need ${reward.points_cost - userPoints} more points to redeem this reward`,
    }
  }

  return { canRedeem: true }
}

/**
 * Get available rewards for user based on points
 */
export function getAvailableRewards(rewards: Reward[], userPoints: number): Reward[] {
  return rewards.filter(reward => {
    const check = canRedeemReward(reward, userPoints)
    return check.canRedeem
  })
}

// ==================== Points History ====================

export interface PointsTransaction {
  amount: number
  type: 'earned' | 'redeemed' | 'expired' | 'adjusted'
  description: string
  created_at: Date
}

/**
 * Calculate net points from transaction history
 */
export function calculateNetPoints(transactions: PointsTransaction[]): {
  totalEarned: number
  totalRedeemed: number
  totalExpired: number
  netPoints: number
} {
  let totalEarned = 0
  let totalRedeemed = 0
  let totalExpired = 0

  for (const transaction of transactions) {
    if (transaction.type === 'earned') {
      totalEarned += transaction.amount
    } else if (transaction.type === 'redeemed') {
      totalRedeemed += Math.abs(transaction.amount)
    } else if (transaction.type === 'expired') {
      totalExpired += Math.abs(transaction.amount)
    }
  }

  const netPoints = totalEarned - totalRedeemed - totalExpired

  return {
    totalEarned,
    totalRedeemed,
    totalExpired,
    netPoints,
  }
}

// ==================== Points Expiration ====================

/**
 * Calculate expiring points
 */
export function getExpiringPoints(
  transactions: PointsTransaction[],
  expirationMonths: number = 12
): {
  expiringPoints: number
  expirationDate: Date
} {
  const now = new Date()
  const expirationDate = new Date()
  expirationDate.setMonth(expirationDate.getMonth() + expirationMonths)

  // Find earned points that will expire
  let expiringPoints = 0

  for (const transaction of transactions) {
    if (transaction.type === 'earned') {
      const earnedDate = new Date(transaction.created_at)
      const expiresAt = new Date(earnedDate)
      expiresAt.setMonth(expiresAt.getMonth() + expirationMonths)

      if (expiresAt <= expirationDate && expiresAt > now) {
        expiringPoints += transaction.amount
      }
    }
  }

  return {
    expiringPoints,
    expirationDate,
  }
}

// ==================== Gamification ====================

/**
 * Generate achievement badges based on points
 */
export function calculateAchievements(totalPoints: number): string[] {
  const achievements: string[] = []

  if (totalPoints >= 100) achievements.push('First 100 Points')
  if (totalPoints >= 500) achievements.push('Points Collector')
  if (totalPoints >= 1000) achievements.push('Loyalty Master')
  if (totalPoints >= 5000) achievements.push('VIP Member')
  if (totalPoints >= 10000) achievements.push('Legend')

  return achievements
}

/**
 * Calculate streak bonus for consecutive orders
 */
export function calculateStreakBonus(consecutiveDays: number): number {
  if (consecutiveDays >= 30) return 50 // 50% bonus for 30-day streak
  if (consecutiveDays >= 14) return 25 // 25% bonus for 14-day streak
  if (consecutiveDays >= 7) return 10 // 10% bonus for 7-day streak
  if (consecutiveDays >= 3) return 5 // 5% bonus for 3-day streak
  return 0
}

/**
 * Check if user maintains ordering streak
 */
export function checkStreak(orderDates: Date[]): {
  currentStreak: number
  longestStreak: number
} {
  if (orderDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 }
  }

  // Sort dates descending (most recent first)
  const sorted = [...orderDates].sort((a, b) => b.getTime() - a.getTime())

  let currentStreak = 1
  let longestStreak = 1
  let tempStreak = 1

  for (let i = 1; i < sorted.length; i++) {
    const current = new Date(sorted[i])
    const previous = new Date(sorted[i - 1])

    // Check if dates are consecutive days
    const diffTime = previous.getTime() - current.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      tempStreak++
      if (i === 1) currentStreak++
    } else {
      if (i === 1) currentStreak = 1
      if (tempStreak > longestStreak) longestStreak = tempStreak
      tempStreak = 1
    }
  }

  if (tempStreak > longestStreak) longestStreak = tempStreak

  return { currentStreak, longestStreak }
}
