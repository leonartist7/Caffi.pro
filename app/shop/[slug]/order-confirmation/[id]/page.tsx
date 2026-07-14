import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/get-tenant'
import { OrderStatus } from '@/components/storefront/OrderStatus'

export default async function ConfirmationPage({
  params,
}: {
  params: { slug: string; id: string }
}) {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) notFound()
  return <OrderStatus orderId={params.id} slug={params.slug} currency={tenant.currency || 'CAD'} />
}
