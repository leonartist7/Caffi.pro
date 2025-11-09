'use client'

import { useRouter } from 'next/navigation'
import StatCard from '@/components/StatCard'

export default function DashboardHome() {
  const router = useRouter()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's what's happening with your cafés.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Active Cafés"
          value="12"
          icon="☕"
          iconBgColor="bg-primary/10"
          trend={{ value: '+2 this month', positive: true }}
        />

        <StatCard
          title="Monthly Revenue"
          value="€2,400"
          icon="💰"
          iconBgColor="bg-accent/10"
          valueClassName="font-mono"
          trend={{ value: '+12%', positive: true }}
        />

        <StatCard
          title="Pending Orders"
          value="24"
          icon="📦"
          iconBgColor="bg-orange-100"
          trend={{ value: '3 urgent', positive: false }}
        />

        <StatCard
          title="Active Users"
          value="1,234"
          icon="👥"
          iconBgColor="bg-blue-100"
          trend={{ value: '+156 today', positive: true }}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/cafes')}
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 transition-all"
          >
            <span className="text-2xl">➕</span>
            <span className="font-medium text-gray-700">Add New Café</span>
          </button>
          <button
            onClick={() => router.push('/notifications')}
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-accent hover:bg-accent/5 transition-all"
          >
            <span className="text-2xl">📢</span>
            <span className="font-medium text-gray-700">Send Notification</span>
          </button>
          <button
            onClick={() => alert('Reports feature coming soon!')}
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <span className="text-2xl">📊</span>
            <span className="font-medium text-gray-700">View Reports</span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-surface-alt">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">✅</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">New café onboarded</p>
              <p className="text-sm text-gray-600">Blue Bottle Coffee Paris is now live</p>
              <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl bg-surface-alt">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">📝</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Menu updated</p>
              <p className="text-sm text-gray-600">Sunrise Coffee Lyon added 3 new items</p>
              <p className="text-xs text-gray-500 mt-1">4 hours ago</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl bg-surface-alt">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">📢</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Notification sent</p>
              <p className="text-sm text-gray-600">Happy Hour campaign sent to 456 users</p>
              <p className="text-xs text-gray-500 mt-1">Yesterday</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
