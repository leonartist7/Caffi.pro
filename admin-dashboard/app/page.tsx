import { createAdminClient } from '@/utils/supabase/admin'
import { dashboardOwner, integrationLinks } from '@/lib/dashboardConfig'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface RecentTenant {
  tenant_id: string
  business_name: string
  created_at: string
  subscription_status: string
  subscription_plan: string
}

interface DashboardOverview {
  total_tenants: number
  active_tenants: number
  trial_tenants: number
  total_users: number
  total_orders: number
  total_revenue: number
  revenue_this_month: number
  orders_this_month: number
  recentTenants: RecentTenant[]
}

async function getDashboardData(): Promise<DashboardOverview> {
  const supabase = createAdminClient()

  const [
    totalTenantsRes,
    activeTenantsRes,
    trialTenantsRes,
    totalUsersRes,
    ordersRes,
    recentTenantsRes,
  ] = await Promise.all([
    supabase.from('tenants').select('tenant_id', { count: 'exact', head: true }),
    supabase
      .from('tenants')
      .select('tenant_id', { count: 'exact', head: true })
      .eq('subscription_status', 'active'),
    supabase
      .from('tenants')
      .select('tenant_id', { count: 'exact', head: true })
      .eq('subscription_status', 'trial'),
    supabase.from('users').select('user_id', { count: 'exact', head: true }),
    supabase
      .from('orders')
      .select('total, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('tenants')
      .select('tenant_id, business_name, created_at, subscription_status, subscription_plan')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const totalTenants = totalTenantsRes.count ?? 0
  const activeTenants = activeTenantsRes.count ?? 0
  const trialTenants = trialTenantsRes.count ?? 0
  const totalUsers = totalUsersRes.count ?? 0

  if (ordersRes.error) {
    console.error('Error loading orders summary:', ordersRes.error.message)
  }
  if (recentTenantsRes.error) {
    console.error('Error loading recent tenants:', recentTenantsRes.error.message)
  }

  const orders = ordersRes.data ?? []
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  let totalRevenue = 0
  let revenueThisMonth = 0
  let ordersThisMonth = 0

  orders.forEach((order) => {
    const orderTotal = Number(order.total) || 0
    totalRevenue += orderTotal

    const createdAt = new Date(order.created_at)
    if (createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear) {
      ordersThisMonth += 1
      revenueThisMonth += orderTotal
    }
  })

  return {
    total_tenants: totalTenants,
    active_tenants: activeTenants,
    trial_tenants: trialTenants,
    total_users: totalUsers,
    total_orders: orders.length,
    total_revenue: totalRevenue,
    revenue_this_month: revenueThisMonth,
    orders_this_month: ordersThisMonth,
    recentTenants: recentTenantsRes.data ?? [],
  }
}

export default async function Home() {
  const stats = await getDashboardData()
  const ownerFirstName = dashboardOwner.name.split(' ')[0] || 'Admin'
  const currency = dashboardOwner.primaryCurrency

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {ownerFirstName}.
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
            This control center gives you a consolidated view of every app you run on FlutterFlow and Supabase.
            Monitor tenant progress, launch updates, and keep all experiences in sync from one place.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Active App Profiles
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.total_tenants}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-blue-600 dark:text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className="text-green-600 dark:text-green-400 font-medium">
                {stats.active_tenants} live
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                {stats.trial_tenants} in build
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Total Users
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.total_users}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                {stats.orders_this_month} orders placed this month
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Lifetime Revenue
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(stats.total_revenue, currency)}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-purple-600 dark:text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                {formatCurrency(stats.revenue_this_month, currency)} generated this month
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Total Orders
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.total_orders}
                </p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-yellow-600 dark:text-yellow-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                {stats.orders_this_month} processed this month
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Recent App Activity
            </h2>
            {stats.recentTenants.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  No tenant activity yet. Add your first app profile to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentTenants.map((tenant) => (
                  <div
                    key={tenant.tenant_id}
                    className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500/60 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {tenant.business_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Intl.DateTimeFormat('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(new Date(tenant.created_at))}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {tenant.subscription_plan}
                        </span>
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {tenant.subscription_status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Launch Checklist
            </h2>
            <div className="space-y-3">
              <Link
                href="/tenants"
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <span className="font-medium">Create or Update App Profile</span>
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>

              <a
                href={integrationLinks[0]?.href || 'https://app.supabase.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
              >
                <span className="font-medium">Open Supabase Studio</span>
                <svg
                  className="h-5 w-5 text-gray-500 dark:text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </a>

              <a
                href={integrationLinks[1]?.href || 'https://app.flutterflow.io'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
              >
                <span className="font-medium">Open FlutterFlow Builder</span>
                <svg
                  className="h-5 w-5 text-gray-500 dark:text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </a>

              <a
                href={integrationLinks[2]?.href || 'https://docs.google.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
              >
                <span className="font-medium">Review Internal Documentation</span>
                <svg
                  className="h-5 w-5 text-gray-500 dark:text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                Integration Status
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                All connected services are healthy. Supabase, FlutterFlow, and internal tooling are synced.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Online
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
