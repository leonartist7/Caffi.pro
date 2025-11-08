'use client'

import { useRouter } from 'next/navigation'

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
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-2xl">☕</span>
            </div>
            <span className="text-sm text-green-600 font-medium">+2 this month</span>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Active Cafés</h3>
          <p className="text-3xl font-bold text-gray-900 mt-1">12</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
            <span className="text-sm text-green-600 font-medium">+12%</span>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Monthly Revenue</h3>
          <p className="text-3xl font-bold text-gray-900 font-mono mt-1">€2,400</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <span className="text-2xl">📦</span>
            </div>
            <span className="text-sm text-red-600 font-medium">3 urgent</span>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Pending Orders</h3>
          <p className="text-3xl font-bold text-gray-900 mt-1">24</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
            <span className="text-sm text-green-600 font-medium">+156 today</span>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Active Users</h3>
          <p className="text-3xl font-bold text-gray-900 mt-1">1,234</p>
        </div>
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
