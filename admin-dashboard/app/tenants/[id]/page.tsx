import { createAdminClient } from '@/utils/supabase/admin'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Building2, MapPin, Users, ShoppingCart, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import TenantActions from '../TenantActions'

async function getTenantDetails(id: string) {
  const supabase = createAdminClient()

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('*')
    .eq('tenant_id', id)
    .single()

  if (tenantError || !tenant) {
    return null
  }

  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .eq('tenant_id', id)
    .order('created_at', { ascending: false })

  const { data: menuItems } = await supabase
    .from('menu_items')
    .select(`
      *,
      category:categories(name, category_id)
    `)
    .eq('tenant_id', id)
    .order('category_id', { ascending: true })

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('tenant_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('tenant_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  return {
    tenant,
    locations: locations || [],
    menuItems: menuItems || [],
    users: users || [],
    orders: orders || [],
  }
}

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getTenantDetails(id)

  if (!data) {
    notFound()
  }

  const { tenant, locations, menuItems, users, orders } = data

  const menuByCategory = menuItems.reduce((acc: Record<string, typeof menuItems>, item) => {
    const categoryName = (item as any).category?.name || 'Uncategorized'
    if (!acc[categoryName]) {
      acc[categoryName] = []
    }
    acc[categoryName].push(item)
    return acc
  }, {} as Record<string, typeof menuItems>)

  const statusColors = {
    trial: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    suspended: 'bg-yellow-100 text-yellow-800',
  }

  const planColors = {
    starter: 'bg-gray-100 text-gray-800',
    pro: 'bg-purple-100 text-purple-800',
    enterprise: 'bg-orange-100 text-orange-800',
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link 
            href="/tenants"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to App Profiles
          </Link>
          
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
                <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{tenant.business_name}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">@{tenant.slug}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[tenant.subscription_status as keyof typeof statusColors]}`}>
                    {tenant.subscription_status}
                  </span>
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${planColors[tenant.subscription_plan as keyof typeof planColors]}`}>
                    {tenant.subscription_plan}
                  </span>
                </div>
              </div>
            </div>
            <TenantActions tenant={tenant} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Locations</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{locations.length}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-2">
              <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Menu Items</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{menuItems.length}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Customers</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{users.length}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-2">
              <ShoppingCart className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Orders</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{orders.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">App Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Business Name</label>
              <p className="text-gray-900 dark:text-white mt-1">{tenant.business_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">App Name</label>
              <p className="text-gray-900 dark:text-white mt-1">{tenant.app_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Owner Email</label>
              <p className="text-gray-900 dark:text-white mt-1">{tenant.owner_email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Owner Phone</label>
              <p className="text-gray-900 dark:text-white mt-1">{tenant.owner_phone || 'Not provided'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Bundle ID</label>
              <p className="text-gray-900 dark:text-white mt-1 font-mono text-sm">{tenant.bundle_id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</label>
              <p className="text-gray-900 dark:text-white mt-1">{formatDate(tenant.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Locations ({locations.length})</h2>
          {locations.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No locations yet</p>
          ) : (
            <div className="space-y-4">
              {locations.map((location: any) => (
                <div key={location.location_id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{location.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{location.address}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{location.city}, {location.postal_code}</p>
                      {location.phone && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">📞 {location.phone}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${location.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {location.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Menu Items ({menuItems.length})</h2>
          {menuItems.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No menu items yet</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(menuByCategory).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{category}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item: any) => (
                      <div key={item.item_id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">{item.name}</h4>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.is_available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {item.is_available ? 'Available' : 'Unavailable'}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{item.description}</p>
                        )}
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-300">{formatCurrency(item.price)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recent Customers ({users.length})</h2>
          {users.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No customers yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Loyalty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Orders</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((user: any) => (
                    <tr key={user.user_id}>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{user.full_name || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{user.email || user.phone || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">{user.loyalty_points} pts</span>
                        <span className="text-gray-500 dark:text-gray-400 ml-2">({user.loyalty_tier})</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{user.total_orders}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(user.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

