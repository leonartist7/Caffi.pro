import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { handled, json, scope, userId, uuid, DeliveryHttpError } from '@/lib/delivery/http'
import { driverDelivery } from '@/lib/delivery/projections'
import type { DeliveryJob } from '@/lib/delivery/contracts'

export async function GET(request: Request) {
  return handled(async () => {
    const user = await userId()
    const venue = uuid(new URL(request.url).searchParams.get('venue_id'))
    const role = await scope(venue, user)
    const admin = getSupabaseAdmin()
    let query = admin
      .from('delivery_jobs')
      .select('*')
      .eq('venue_id', venue)
      .order('created_at', { ascending: false })
      .limit(100)
    if (role === 'staff') query = query.eq('driver_user_id', user)
    const result = await query
    if (result.error) throw new DeliveryHttpError('DELIVERY_QUEUE_UNAVAILABLE', 503)
    const jobs = (result.data ?? []) as DeliveryJob[]
    const orderIds = jobs.map(j => j.order_id)
    const [orders, connections, contexts] = await Promise.all([
      orderIds.length
        ? admin
            .from('orders')
            .select('order_id,status')
            .eq('venue_id', venue)
            .in('order_id', orderIds)
        : { data: [], error: null },
      admin.from('delivery_connections').select('id,provider').eq('venue_id', venue),
      admin
        .from('delivery_order_context')
        .select('order_id,address,current_quote_id')
        .eq('venue_id', venue),
    ])
    if (orders.error || connections.error || contexts.error)
      throw new DeliveryHttpError('DELIVERY_QUEUE_UNAVAILABLE', 503)
    if (role === 'staff')
      return json({
        jobs: jobs.map(j =>
          driverDelivery(
            j,
            orders.data?.find(o => o.order_id === j.order_id)?.status ?? 'unknown',
            contexts.data?.find(c => c.order_id === j.order_id)?.address ?? null
          )
        ),
      })
    const quoteIds = (contexts.data ?? []).map(c => c.current_quote_id)
    const [pending, quotes, access, members] = await Promise.all([
      admin
        .from('orders')
        .select('order_id,status')
        .eq('venue_id', venue)
        .eq('order_type', 'delivery')
        .in('status', ['accepted', 'preparing', 'ready'])
        .order('placed_at', { ascending: false })
        .limit(100),
      quoteIds.length
        ? admin
            .from('delivery_quotes')
            .select('id,provider_cost_minor,currency')
            .eq('venue_id', venue)
            .in('id', quoteIds)
        : { data: [], error: null },
      admin
        .from('delivery_driver_access')
        .select('user_id')
        .eq('venue_id', venue)
        .eq('enabled', true),
      admin
        .from('memberships')
        .select('user_id,full_name,venue_id,org_id')
        .eq('is_active', true)
        .eq('role', 'staff'),
    ])
    if (pending.error || quotes.error || access.error || members.error)
      throw new DeliveryHttpError('DELIVERY_QUEUE_UNAVAILABLE', 503)
    const { data: venueRow } = await admin
      .from('venues')
      .select('org_id')
      .eq('venue_id', venue)
      .single()
    return json({
      jobs: jobs.map(j => ({
        id: j.id,
        order_id: j.order_id,
        state: j.state,
        version: j.version,
        provider: connections.data?.find(c => c.id === j.connection_id)?.provider,
        exception: j.exception,
        approved_cost_minor: j.approved_cost_minor,
        currency: j.currency,
        driver_user_id: j.driver_user_id,
        preparation_status: orders.data?.find(o => o.order_id === j.order_id)?.status,
      })),
      orders: (pending.data ?? [])
        .filter(o => !jobs.some(j => j.order_id === o.order_id))
        .flatMap(o => {
          const context = contexts.data?.find(c => c.order_id === o.order_id)
          const quote = quotes.data?.find(q => q.id === context?.current_quote_id)
          return quote
            ? [
                {
                  ...o,
                  quote_id: quote.id,
                  provider_cost_minor: quote.provider_cost_minor,
                  currency: quote.currency,
                },
              ]
            : []
        }),
      drivers: (access.data ?? []).flatMap(a => {
        const m = members.data?.find(
          m =>
            m.user_id === a.user_id &&
            (m.venue_id === venue || (m.venue_id === null && m.org_id === venueRow?.org_id))
        )
        return m ? [{ user_id: a.user_id, full_name: m.full_name }] : []
      }),
    })
  })
}
