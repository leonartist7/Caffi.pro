'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Gift, Star, Loader2, ShoppingBag, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getTenantBySlug } from '@/lib/get-tenant'

interface Reward {
  reward_id: string
  tenant_id: string
  name: string
  description: string
  points_required: number
  reward_type: 'free_item' | 'discount' | 'coupon'
  reward_value: any
  image_url: string | null
  is_active: boolean
  terms_conditions: string | null
}

interface UserPoints {
  total_points: number
  points_used: number
  available_points: number
}

export default function RewardsPage() {
  const router = useRouter()
  const params = useParams()
  const { user, loading: authLoading } = useAuth()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [userPoints, setUserPoints] = useState<UserPoints>({
    total_points: 0,
    points_used: 0,
    available_points: 0,
  })
  const [loading, setLoading] = useState(true)
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const tenantSlug = params.slug as string

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/shop/${tenantSlug}/login`)
    }
  }, [user, authLoading, tenantSlug, router])

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  async function fetchData() {
    try {
      setLoading(true)

      // Fetch tenant
      const tenant = await getTenantBySlug(tenantSlug)
      if (!tenant) return

      const { createClient } = await import('@/utils/supabase/client')
      const supabase = createClient()

      // Fetch rewards catalog
      const { data: rewardsData } = await supabase
        .from('rewards_catalog')
        .select('*')
        .eq('tenant_id', tenant.tenant_id)
        .eq('is_active', true)
        .order('points_required', { ascending: true })

      setRewards(rewardsData || [])

      // Fetch user points
      const { data: pointsData } = await supabase
        .from('loyalty_transactions')
        .select('points, transaction_type')
        .eq('user_id', user!.id)
        .eq('tenant_id', tenant.tenant_id)

      if (pointsData) {
        const earned = pointsData
          .filter(t => t.transaction_type === 'earned')
          .reduce((sum, t) => sum + t.points, 0)
        const used = pointsData
          .filter(t => t.transaction_type === 'redeemed')
          .reduce((sum, t) => sum + Math.abs(t.points), 0)

        setUserPoints({
          total_points: earned,
          points_used: used,
          available_points: earned - used,
        })
      }
    } catch (err) {
      console.error('Error fetching rewards:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRedeem(reward: Reward) {
    if (userPoints.available_points < reward.points_required) {
      alert('Not enough points to redeem this reward!')
      return
    }

    if (!confirm(`Redeem ${reward.name} for ${reward.points_required} points?`)) {
      return
    }

    try {
      setRedeeming(reward.reward_id)

      const tenant = await getTenantBySlug(tenantSlug)
      if (!tenant) return

      const { createClient } = await import('@/utils/supabase/client')
      const supabase = createClient()

      // Create redemption transaction
      const { error } = await supabase.from('loyalty_transactions').insert({
        user_id: user!.id,
        tenant_id: tenant.tenant_id,
        reward_id: reward.reward_id,
        points: -reward.points_required,
        transaction_type: 'redeemed',
        description: `Redeemed: ${reward.name}`,
      })

      if (error) throw error

      alert(`✅ Successfully redeemed ${reward.name}!\n\nShow this to staff when ordering.`)
      await fetchData() // Refresh points
    } catch (err: any) {
      console.error('Error redeeming reward:', err)
      alert(`Failed to redeem reward: ${err.message}`)
    } finally {
      setRedeeming(null)
    }
  }

  const canAfford = (pointsRequired: number) => {
    return userPoints.available_points >= pointsRequired
  }

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-coffee-600 animate-spin mb-4" />
        <p className="text-coffee-600 dark:text-coffee-300">Loading rewards...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-8">
      {/* Header with Points Balance */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-coffee-900 dark:text-white mb-2">Rewards</h1>
        <p className="text-coffee-600 dark:text-coffee-300">
          Redeem your points for free items and exclusive rewards
        </p>
      </div>

      {/* Points Balance Card */}
      <div className="bg-gradient-to-r from-coffee-700 to-coffee-800 rounded-xl shadow-lg p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90 mb-1">Your Points</p>
            <p className="text-4xl font-bold mb-1">{userPoints.available_points}</p>
            <p className="text-sm opacity-75">
              {userPoints.total_points} earned • {userPoints.points_used} used
            </p>
          </div>
          <div className="bg-white/20 rounded-full p-4">
            <Star className="w-12 h-12" />
          </div>
        </div>
      </div>

      {/* Rewards Grid */}
      {rewards.length === 0 ? (
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg rounded-xl shadow-md border border-coffee-200/50 dark:border-dark-700 p-12 text-center">
          <Gift className="w-16 h-16 text-coffee-300 dark:text-dark-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-coffee-900 dark:text-white mb-2">
            No rewards available yet
          </h2>
          <p className="text-coffee-600 dark:text-coffee-300 mb-6">
            Keep earning points with your orders - rewards coming soon!
          </p>
          <Link
            href={`/shop/${tenantSlug}/menu`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-coffee-700 hover:bg-coffee-800 text-white rounded-lg font-bold transition-colors"
          >
            <ShoppingBag className="w-5 h-5" />
            Browse Menu
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rewards.map(reward => {
            const affordable = canAfford(reward.points_required)
            const isRedeeming = redeeming === reward.reward_id

            return (
              <div
                key={reward.reward_id}
                className={`bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg rounded-xl shadow-md border transition-all ${
                  affordable
                    ? 'border-coffee-200/50 dark:border-dark-700 hover:shadow-lg hover:border-coffee-300 dark:hover:border-dark-600'
                    : 'border-gray-200/50 dark:border-gray-700 opacity-60'
                }`}
              >
                {/* Reward Image */}
                {reward.image_url && (
                  <div className="h-48 overflow-hidden rounded-t-xl">
                    <img
                      src={reward.image_url}
                      alt={reward.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-6">
                  {/* Reward Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-coffee-900 dark:text-white mb-1">
                        {reward.name}
                      </h3>
                      <p className="text-sm text-coffee-600 dark:text-coffee-400">
                        {reward.description}
                      </p>
                    </div>
                  </div>

                  {/* Points Required */}
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <span className="text-xl font-bold text-coffee-900 dark:text-white">
                      {reward.points_required}
                    </span>
                    <span className="text-sm text-coffee-600 dark:text-coffee-400">points</span>
                  </div>

                  {/* Terms */}
                  {reward.terms_conditions && (
                    <p className="text-xs text-coffee-500 dark:text-coffee-400 mb-4 italic">
                      {reward.terms_conditions}
                    </p>
                  )}

                  {/* Redeem Button */}
                  <button
                    onClick={() => handleRedeem(reward)}
                    disabled={!affordable || isRedeeming}
                    className={`w-full py-3 px-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                      affordable
                        ? 'bg-coffee-700 hover:bg-coffee-800 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isRedeeming ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Redeeming...
                      </>
                    ) : affordable ? (
                      <>
                        <Gift className="w-5 h-5" />
                        Redeem Now
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5" />
                        Need {reward.points_required - userPoints.available_points} more points
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              How to earn points
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Earn 10 points for every €1 spent on orders. Points are automatically added to your
              account when you place an order. Redeem your points here for exclusive rewards!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
