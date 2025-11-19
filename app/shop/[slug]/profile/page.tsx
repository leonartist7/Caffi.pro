'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { User, Mail, Phone, Star, ShoppingBag, Gift, Edit2, Save, X, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getTenantBySlug } from '@/lib/get-tenant'
import { toast } from 'sonner'

interface UserProfile {
  full_name: string
  email: string
  phone: string | null
}

interface UserStats {
  total_orders: number
  total_spent: number
  points_balance: number
  rewards_redeemed: number
}

export default function ProfilePage() {
  const router = useRouter()
  const params = useParams()
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<UserProfile>({ full_name: '', email: '', phone: null })
  const [stats, setStats] = useState<UserStats>({
    total_orders: 0,
    total_spent: 0,
    points_balance: 0,
    rewards_redeemed: 0,
  })
  const [currency, setCurrency] = useState('EUR')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editedProfile, setEditedProfile] = useState<UserProfile>({
    full_name: '',
    email: '',
    phone: null,
  })
  const tenantSlug = params.slug as string

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/shop/${tenantSlug}/login`)
    }
  }, [user, authLoading, tenantSlug, router])

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function fetchProfile() {
    try {
      setLoading(true)

      // Get tenant for currency
      const tenant = await getTenantBySlug(tenantSlug)
      if (tenant) {
        setCurrency(tenant.currency || 'EUR')
      }

      const { createClient } = await import('@/utils/supabase/client')
      const supabase = createClient()

      // Get user profile from auth metadata
      const userProfile: UserProfile = {
        full_name: user!.user_metadata?.full_name || '',
        email: user!.email || '',
        phone: user!.user_metadata?.phone || null,
      }
      setProfile(userProfile)
      setEditedProfile(userProfile)

      if (!tenant) return

      // Get user stats - orders
      const { data: orders } = await supabase
        .from('orders')
        .select('total, status')
        .eq('user_id', user!.id)
        .eq('tenant_id', tenant.tenant_id)

      const completedOrders = orders?.filter(o => o.status === 'completed') || []
      const totalSpent = completedOrders.reduce((sum, o) => sum + o.total, 0)

      // Get points balance
      const { data: transactions } = await supabase
        .from('loyalty_transactions')
        .select('points, transaction_type')
        .eq('user_id', user!.id)
        .eq('tenant_id', tenant.tenant_id)

      const earned =
        transactions
          ?.filter(t => t.transaction_type === 'earned')
          .reduce((sum, t) => sum + t.points, 0) || 0
      const used =
        transactions
          ?.filter(t => t.transaction_type === 'redeemed')
          .reduce((sum, t) => sum + Math.abs(t.points), 0) || 0

      const rewardsRedeemed =
        transactions?.filter(t => t.transaction_type === 'redeemed').length || 0

      setStats({
        total_orders: completedOrders.length,
        total_spent: totalSpent,
        points_balance: earned - used,
        rewards_redeemed: rewardsRedeemed,
      })
    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveProfile() {
    try {
      setSaving(true)

      const { createClient } = await import('@/utils/supabase/client')
      const supabase = createClient()

      // Update user metadata
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: editedProfile.full_name,
          phone: editedProfile.phone,
        },
      })

      if (error) throw error

      setProfile(editedProfile)
      setEditing(false)
      toast.success('Profile updated successfully!')
    } catch (err: any) {
      console.error('Error updating profile:', err)
      toast.error(`Failed to update profile: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const formatPrice = (price: number) => {
    if (currency === 'EUR') return `€${price.toFixed(2)}`
    if (currency === 'USD') return `$${price.toFixed(2)}`
    return `${price.toFixed(2)} ${currency}`
  }

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-coffee-600 animate-spin mb-4" />
        <p className="text-coffee-600 dark:text-coffee-300">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-coffee-900 dark:text-white mb-2">My Profile</h1>
        <p className="text-coffee-600 dark:text-coffee-300">
          Manage your account and view your stats
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg rounded-xl shadow-md border border-coffee-200/50 dark:border-dark-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-coffee-900 dark:text-white">
            Personal Information
          </h2>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 text-coffee-700 dark:text-coffee-300 hover:bg-coffee-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditedProfile(profile)
                  setEditing(false)
                }}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-coffee-700 hover:bg-coffee-800 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-coffee-700 dark:text-coffee-300 mb-2">
              Full Name
            </label>
            {editing ? (
              <input
                type="text"
                value={editedProfile.full_name}
                onChange={e => setEditedProfile({ ...editedProfile, full_name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-coffee-500"
              />
            ) : (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-coffee-50 dark:bg-dark-900 rounded-lg">
                <User className="w-5 h-5 text-coffee-600 dark:text-coffee-400" />
                <span className="text-coffee-900 dark:text-white">
                  {profile.full_name || 'Not set'}
                </span>
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-coffee-700 dark:text-coffee-300 mb-2">
              Email Address
            </label>
            <div className="flex items-center gap-3 px-4 py-2.5 bg-coffee-50 dark:bg-dark-900 rounded-lg">
              <Mail className="w-5 h-5 text-coffee-600 dark:text-coffee-400" />
              <span className="text-coffee-900 dark:text-white">{profile.email}</span>
            </div>
            <p className="mt-1 text-xs text-coffee-500 dark:text-coffee-400">
              Email cannot be changed here
            </p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-coffee-700 dark:text-coffee-300 mb-2">
              Phone Number
            </label>
            {editing ? (
              <input
                type="tel"
                value={editedProfile.phone || ''}
                onChange={e => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                placeholder="+1 234 567 8900"
                className="w-full px-4 py-2.5 rounded-lg border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-coffee-500"
              />
            ) : (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-coffee-50 dark:bg-dark-900 rounded-lg">
                <Phone className="w-5 h-5 text-coffee-600 dark:text-coffee-400" />
                <span className="text-coffee-900 dark:text-white">
                  {profile.phone || 'Not set'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <ShoppingBag className="w-8 h-8 mb-2 opacity-80" />
          <p className="text-2xl font-bold">{stats.total_orders}</p>
          <p className="text-sm opacity-90">Orders</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <span className="text-3xl font-bold mb-2 block">€</span>
          <p className="text-2xl font-bold">{formatPrice(stats.total_spent)}</p>
          <p className="text-sm opacity-90">Total Spent</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white">
          <Star className="w-8 h-8 mb-2 opacity-80" />
          <p className="text-2xl font-bold">{stats.points_balance}</p>
          <p className="text-sm opacity-90">Points</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <Gift className="w-8 h-8 mb-2 opacity-80" />
          <p className="text-2xl font-bold">{stats.rewards_redeemed}</p>
          <p className="text-sm opacity-90">Rewards</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg rounded-xl shadow-md border border-coffee-200/50 dark:border-dark-700 p-6">
        <h2 className="text-xl font-bold text-coffee-900 dark:text-white mb-4">Quick Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href={`/shop/${tenantSlug}/orders`}
            className="flex items-center gap-3 p-4 rounded-lg border border-coffee-200 dark:border-dark-700 hover:bg-coffee-50 dark:hover:bg-dark-700 transition-colors"
          >
            <ShoppingBag className="w-5 h-5 text-coffee-600 dark:text-coffee-400" />
            <span className="font-medium text-coffee-900 dark:text-white">My Orders</span>
          </Link>

          <Link
            href={`/shop/${tenantSlug}/rewards`}
            className="flex items-center gap-3 p-4 rounded-lg border border-coffee-200 dark:border-dark-700 hover:bg-coffee-50 dark:hover:bg-dark-700 transition-colors"
          >
            <Gift className="w-5 h-5 text-coffee-600 dark:text-coffee-400" />
            <span className="font-medium text-coffee-900 dark:text-white">Rewards</span>
          </Link>

          <Link
            href={`/shop/${tenantSlug}/menu`}
            className="flex items-center gap-3 p-4 rounded-lg border border-coffee-200 dark:border-dark-700 hover:bg-coffee-50 dark:hover:bg-dark-700 transition-colors"
          >
            <ShoppingBag className="w-5 h-5 text-coffee-600 dark:text-coffee-400" />
            <span className="font-medium text-coffee-900 dark:text-white">Browse Menu</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
