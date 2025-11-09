'use client'

import { useRouter } from 'next/navigation'
import StatCard from '@/components/StatCard'
import {
  Coffee,
  DollarSign,
  ShoppingCart,
  Users,
  MapPin,
  Bell,
  BarChart3,
  Plus,
  Send,
  FileText,
  Activity,
} from 'lucide-react'

export default function DashboardHome() {
  const router = useRouter()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-coffee-700 to-mocha bg-clip-text text-transparent">
          Dashboard Overview
        </h1>
        <p className="text-coffee-600 dark:text-cream-400 mt-2 text-lg">
          Welcome back! Here&apos;s what&apos;s happening with your cafés.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Active Locations"
          value="12"
          icon={<MapPin className="w-7 h-7" />}
          iconBgColor="bg-gradient-to-br from-coffee-500/20 to-coffee-600/10"
          trend={{ value: '+2 this month', positive: true }}
        />

        <StatCard
          title="Monthly Revenue"
          value="€2,400"
          icon={<DollarSign className="w-7 h-7" />}
          iconBgColor="bg-gradient-to-br from-green-500/20 to-green-600/10"
          valueClassName="font-mono"
          trend={{ value: '+12%', positive: true }}
        />

        <StatCard
          title="Pending Orders"
          value="24"
          icon={<ShoppingCart className="w-7 h-7" />}
          iconBgColor="bg-gradient-to-br from-orange-500/20 to-orange-600/10"
          trend={{ value: '3 urgent', positive: false }}
        />

        <StatCard
          title="Active Users"
          value="1,234"
          icon={<Users className="w-7 h-7" />}
          iconBgColor="bg-gradient-to-br from-blue-500/20 to-blue-600/10"
          trend={{ value: '+156 today', positive: true }}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700 mb-8">
        <h2 className="text-2xl font-bold text-coffee-800 dark:text-cream-100 mb-6 flex items-center gap-2">
          <Coffee className="w-6 h-6 text-coffee-600 dark:text-cream-300" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/cafes')}
            className="group flex items-center gap-3 p-5 rounded-xl border-2 border-dashed border-coffee-300 dark:border-dark-600 hover:border-coffee-500 dark:hover:border-coffee-600 hover:bg-gradient-to-br hover:from-coffee-500/10 hover:to-coffee-600/5 dark:hover:from-coffee-700/20 dark:hover:to-coffee-800/10 transition-all duration-300 hover:scale-105"
          >
            <div className="w-10 h-10 rounded-lg bg-coffee-500/20 dark:bg-coffee-700/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5 text-coffee-700 dark:text-cream-200" />
            </div>
            <span className="font-semibold text-coffee-700 dark:text-cream-200">
              Add New Location
            </span>
          </button>
          <button
            onClick={() => router.push('/notifications')}
            className="group flex items-center gap-3 p-5 rounded-xl border-2 border-dashed border-coffee-300 dark:border-dark-600 hover:border-blue-500 dark:hover:border-blue-600 hover:bg-gradient-to-br hover:from-blue-500/10 hover:to-blue-600/5 dark:hover:from-blue-700/20 dark:hover:to-blue-800/10 transition-all duration-300 hover:scale-105"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 dark:bg-blue-700/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Send className="w-5 h-5 text-blue-700 dark:text-blue-300" />
            </div>
            <span className="font-semibold text-coffee-700 dark:text-cream-200">
              Send Notification
            </span>
          </button>
          <button
            onClick={() => router.push('/analytics')}
            className="group flex items-center gap-3 p-5 rounded-xl border-2 border-dashed border-coffee-300 dark:border-dark-600 hover:border-green-500 dark:hover:border-green-600 hover:bg-gradient-to-br hover:from-green-500/10 hover:to-green-600/5 dark:hover:from-green-700/20 dark:hover:to-green-800/10 transition-all duration-300 hover:scale-105"
          >
            <div className="w-10 h-10 rounded-lg bg-green-500/20 dark:bg-green-700/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BarChart3 className="w-5 h-5 text-green-700 dark:text-green-300" />
            </div>
            <span className="font-semibold text-coffee-700 dark:text-cream-200">
              View Analytics
            </span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
        <h2 className="text-2xl font-bold text-coffee-800 dark:text-cream-100 mb-6 flex items-center gap-2">
          <Activity className="w-6 h-6 text-coffee-600 dark:text-cream-300" />
          Recent Activity
        </h2>
        <div className="space-y-3">
          <div className="group flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-900/10 dark:to-transparent border border-green-200/30 dark:border-green-800/30 hover:border-green-300 dark:hover:border-green-700 transition-all duration-300 hover:shadow-md">
            <div className="w-10 h-10 rounded-full bg-green-500/20 dark:bg-green-700/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <MapPin className="w-5 h-5 text-green-700 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-coffee-800 dark:text-cream-100">
                New location onboarded
              </p>
              <p className="text-sm text-coffee-600 dark:text-cream-300">
                Blue Bottle Coffee Paris is now live
              </p>
              <p className="text-xs text-coffee-500 dark:text-cream-400 mt-1">2 hours ago</p>
            </div>
          </div>

          <div className="group flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10 dark:to-transparent border border-blue-200/30 dark:border-blue-800/30 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 hover:shadow-md">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 dark:bg-blue-700/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-coffee-800 dark:text-cream-100">
                Menu updated
              </p>
              <p className="text-sm text-coffee-600 dark:text-cream-300">
                Sunrise Coffee Lyon added 3 new items
              </p>
              <p className="text-xs text-coffee-500 dark:text-cream-400 mt-1">4 hours ago</p>
            </div>
          </div>

          <div className="group flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-orange-50/50 to-transparent dark:from-orange-900/10 dark:to-transparent border border-orange-200/30 dark:border-orange-800/30 hover:border-orange-300 dark:hover:border-orange-700 transition-all duration-300 hover:shadow-md">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 dark:bg-orange-700/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <Bell className="w-5 h-5 text-orange-700 dark:text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-coffee-800 dark:text-cream-100">
                Notification sent
              </p>
              <p className="text-sm text-coffee-600 dark:text-cream-300">
                Happy Hour campaign sent to 456 users
              </p>
              <p className="text-xs text-coffee-500 dark:text-cream-400 mt-1">Yesterday</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
