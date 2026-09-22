import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { handled, json, resource, userId, uuid, DeliveryHttpError } from '@/lib/delivery/http'
import { guestDelivery, driverDelivery } from '@/lib/delivery/projections'
import { simulationEnabled } from '@/lib/delivery/provider'
import type { DeliveryJob } from '@/lib/delivery/contracts'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const tracking = new URL(request.url).searchParams.get('tracking')
    const admin = getSupabaseAdmin()
    if (tracking) {
      uuid(params.id)
      uuid(tracking)
      const { data: job } = await admin
        .from('delivery_jobs')
        .select('*')
        .eq('id', params.id)
        .maybeSingle()
      if (!job || !simulationEnabled(job.venue_id)) throw new DeliveryHttpError('NOT_FOUND', 404)
      const { data: order } = await admin
        .from('orders')
        .select('placed_at')
        .eq('order_id', job.order_id)
        .eq('venue_id', job.venue_id)
        .eq('guest_tracking_token', tracking)
        .maybeSingle()
      if (!order || Date.parse(order.placed_at) < Date.now() - 7 * 86400_000)
        throw new DeliveryHttpError('NOT_FOUND', 404)
      const { data: c } = await admin
        .from('delivery_connections')
        .select('provider')
        .eq('id', job.connection_id)
        .eq('venue_id', job.venue_id)
        .single()
      return json(guestDelivery(job as DeliveryJob, c?.provider ?? 'simulator'))
    }
    const user = await userId()
    const { row, role } = await resource('delivery_jobs', params.id, user)
    const { data: order } = await admin
      .from('orders')
      .select('status')
      .eq('order_id', row.order_id)
      .eq('venue_id', row.venue_id)
      .single()
    if (role === 'staff') {
      const { data: context } = await admin
        .from('delivery_order_context')
        .select('address')
        .eq('order_id', row.order_id)
        .eq('venue_id', row.venue_id)
        .single()
      return json(driverDelivery(row as DeliveryJob, order?.status ?? 'unknown', context?.address))
    }
    return json({
      id: row.id,
      order_id: row.order_id,
      state: row.state,
      version: row.version,
      exception: row.exception,
      driver_user_id: row.driver_user_id,
      preparation_status: order?.status,
      approved_cost_minor: row.approved_cost_minor,
      actual_cost_minor: row.actual_cost_minor,
      currency: row.currency,
    })
  })
}
