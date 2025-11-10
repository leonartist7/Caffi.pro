'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Users, Search, Filter, TrendingUp, Award, ShoppingBag, Mail, Phone } from 'lucide-react'

interface Client {
  user_id: string
  full_name: string
  email: string
  phone: string
  loyalty_points: number
  loyalty_tier: string
  total_orders: number
  total_spent: number
  last_order_at: string
  created_at: string
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTier, setFilterTier] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter(client => {
    const matchesSearch =
      client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone?.includes(searchQuery)

    const matchesTier = filterTier === 'all' || client.loyalty_tier === filterTier

    return matchesSearch && matchesTier
  })

  const stats = {
    total: clients.length,
    activeThisMonth: clients.filter(
      c =>
        c.last_order_at &&
        new Date(c.last_order_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length,
    averageOrders: clients.length
      ? (clients.reduce((acc, c) => acc + c.total_orders, 0) / clients.length).toFixed(1)
      : 0,
    totalRevenue: clients.reduce((acc, c) => acc + c.total_spent, 0).toFixed(2),
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
      case 'gold':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
      case 'silver':
        return 'bg-gray-100 dark:bg-gray-700/30 text-gray-700 dark:text-gray-400'
      default:
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-coffee-700 to-mocha bg-clip-text text-transparent">
          Clients Management
        </h1>
        <p className="text-coffee-600 dark:text-cream-400 mt-1 lg:mt-2 text-sm lg:text-lg">
          Manage your customer base and loyalty program
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                Total Clients
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mt-1">
                {stats.total}
              </p>
            </div>
            <Users className="w-8 h-8 lg:w-10 lg:h-10 text-coffee-600 dark:text-cream-300" />
          </div>
        </div>

        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                Active This Month
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mt-1">
                {stats.activeThisMonth}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 lg:w-10 lg:h-10 text-green-600" />
          </div>
        </div>

        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                Avg. Orders
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mt-1">
                {stats.averageOrders}
              </p>
            </div>
            <ShoppingBag className="w-8 h-8 lg:w-10 lg:h-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                Total Revenue
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mt-1">
                €{stats.totalRevenue}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 lg:w-10 lg:h-10 text-green-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700 mb-6 lg:mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-coffee-400 dark:text-cream-500" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 placeholder:text-coffee-400 dark:placeholder:text-cream-500 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-coffee-600 dark:text-cream-300" />
            <select
              value={filterTier}
              onChange={e => setFilterTier(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600"
            >
              <option value="all">All Tiers</option>
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
            </select>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-coffee-200/50 dark:border-dark-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-coffee-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-coffee-600 dark:text-cream-400 mt-4">Loading clients...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-coffee-300 dark:text-dark-600 mx-auto mb-4" />
            <p className="text-coffee-600 dark:text-cream-400">No clients found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-coffee-50 dark:bg-dark-900 border-b border-coffee-200 dark:border-dark-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-coffee-700 dark:text-cream-300 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-coffee-700 dark:text-cream-300 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-coffee-700 dark:text-cream-300 uppercase tracking-wider">
                    Loyalty
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-coffee-700 dark:text-cream-300 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-coffee-700 dark:text-cream-300 uppercase tracking-wider">
                    Spent
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-coffee-700 dark:text-cream-300 uppercase tracking-wider">
                    Last Order
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100 dark:divide-dark-700">
                {filteredClients.map(client => (
                  <tr
                    key={client.user_id}
                    className="hover:bg-coffee-50/50 dark:hover:bg-dark-700/30 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-coffee flex items-center justify-center text-cream-100 font-semibold">
                          {client.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-coffee-900 dark:text-cream-100">
                            {client.full_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-coffee-500 dark:text-cream-500">
                            Since {formatDate(client.created_at)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {client.email && (
                          <div className="flex items-center gap-2 text-sm text-coffee-600 dark:text-cream-400">
                            <Mail className="w-4 h-4" />
                            {client.email}
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-2 text-sm text-coffee-600 dark:text-cream-400">
                            <Phone className="w-4 h-4" />
                            {client.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${getTierColor(client.loyalty_tier)}`}
                        >
                          <Award className="w-3 h-3" />
                          {client.loyalty_tier?.toUpperCase()}
                        </span>
                        <p className="text-sm text-coffee-600 dark:text-cream-400">
                          {client.loyalty_points} points
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-coffee-900 dark:text-cream-100">
                        {client.total_orders}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-coffee-900 dark:text-cream-100">
                        €{client.total_spent?.toFixed(2)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-coffee-600 dark:text-cream-400">
                        {formatDate(client.last_order_at)}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
