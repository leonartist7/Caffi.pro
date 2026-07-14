import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/get-tenant'
import { OrderingCartProvider } from '@/contexts/OrderingCartContext'
import ShopLayoutClient from './layout-client'

export default async function ShopLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { slug: string }
}) {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) notFound()
  return (
    <OrderingCartProvider venueId={tenant.tenant_id} currency={tenant.currency || 'CAD'}>
      <ShopLayoutClient tenant={tenant}>{children}</ShopLayoutClient>
    </OrderingCartProvider>
  )
}
