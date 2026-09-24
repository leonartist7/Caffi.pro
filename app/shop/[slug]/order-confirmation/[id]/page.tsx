import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/get-tenant'
import { getReviewConfig } from '@/lib/storefront'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { OrderStatus } from '@/components/storefront/OrderStatus'

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: { slug: string; id: string }
  searchParams: { tracking?: string }
}) {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) notFound()

  // Prove both the order's venue and the separate guest tracking capability
  // before returning the venue's review destination or confirmation shell.
  if (!searchParams.tracking) notFound()
  const { data: order } = await getSupabaseAdmin()
    .from('orders')
    .select('venue_id')
    .eq('order_id', params.id)
    .eq('guest_tracking_token', searchParams.tracking)
    .maybeSingle()
  if (!order || order.venue_id !== tenant.tenant_id) notFound()

  const reviewConfig = await getReviewConfig(params.slug)
  return (
    <OrderStatus
      key={params.id}
      orderId={params.id}
      slug={params.slug}
      currency={tenant.currency || 'CAD'}
      trackingToken={searchParams.tracking}
      reviewUrl={reviewConfig.url}
    />
  )
}
