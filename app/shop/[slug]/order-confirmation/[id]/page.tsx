import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/get-tenant'
import { getReviewConfig } from '@/lib/storefront'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { OrderStatus } from '@/components/storefront/OrderStatus'

export default async function ConfirmationPage({
  params,
}: {
  params: { slug: string; id: string }
}) {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) notFound()

  // The order UUID is the guest's capability token (see /api/orders/[id]/status),
  // but a crafted or mistyped URL could pair a valid order ID with a
  // *different* venue's slug. Without this check the review link and
  // currency below would be derived from the wrong venue while the order's
  // own data (fetched client-side by <OrderStatus>) still belongs to its
  // real venue — a cross-venue data leak. Reject the mismatch outright;
  // there's no legitimate case where a confirmation link's slug and order
  // belong to different venues.
  const { data: order } = await getSupabaseAdmin()
    .from('orders')
    .select('venue_id')
    .eq('order_id', params.id)
    .maybeSingle()
  if (!order || order.venue_id !== tenant.tenant_id) notFound()

  const reviewConfig = await getReviewConfig(params.slug)
  return (
    <OrderStatus
      key={params.id}
      orderId={params.id}
      slug={params.slug}
      currency={tenant.currency || 'CAD'}
      reviewUrl={reviewConfig.url}
    />
  )
}
