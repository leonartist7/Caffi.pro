'use client'

import { useRouter } from 'next/navigation'
import { Building2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { Tenant } from '@/types/database'
import TenantActions from './TenantActions'

interface TenantRowProps {
  tenant: Tenant & {
    locations?: Array<{ count: number }>
    users?: Array<{ count: number }>
    orders?: Array<{ count: number }>
  }
  statusColors: Record<string, string>
  planColors: Record<string, string>
}

export default function TenantRow({ tenant, statusColors, planColors }: TenantRowProps) {
  const router = useRouter()

  const handleRowClick = () => {
    router.push(`/tenants/${tenant.tenant_id}`)
  }

  return (
    <tr 
      className="hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={handleRowClick}
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {tenant.business_name}
            </div>
            <div className="text-sm text-gray-500">
              {tenant.owner_email}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm text-gray-900 font-mono">
          {tenant.slug}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[tenant.subscription_status as keyof typeof statusColors]}`}>
          {tenant.subscription_status}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${planColors[tenant.subscription_plan as keyof typeof planColors]}`}>
          {tenant.subscription_plan}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {tenant.locations?.[0]?.count || 0}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {tenant.users?.[0]?.count || 0}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {tenant.orders?.[0]?.count || 0}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatDate(tenant.created_at)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <TenantActions tenant={tenant} />
      </td>
    </tr>
  )
}

