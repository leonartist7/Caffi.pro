import { body, handled, json, resource, rpc, userId, DeliveryHttpError } from '@/lib/delivery/http'
import { driverDelivery } from '@/lib/delivery/projections'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(
  request: Request,
  { params }: { params: { id: string; action: string } }
) {
  return handled(async () => {
    const user = await userId()
    if (
      !['cancel', 'reconcile', 'assignment', 'milestones', 'refund', 'redispatch'].includes(
        params.action
      )
    )
      throw new DeliveryHttpError('NOT_FOUND', 404)
    const { role } = await resource(
      'delivery_jobs',
      params.id,
      user,
      params.action !== 'milestones'
    )
    const input = await body(request)
    if (
      params.action !== 'milestones' &&
      (typeof input.reason !== 'string' || !input.reason.trim() || input.reason.length > 300)
    )
      throw new DeliveryHttpError('INVALID_REASON', 400)
    if (params.action === 'milestones' && !['picked_up', 'delivered'].includes(String(input.state)))
      throw new DeliveryHttpError('INVALID_MILESTONE', 400)
    const action =
      params.action === 'milestones'
        ? input.state === 'picked_up'
          ? 'pickup'
          : 'delivered'
        : params.action
    const data = await rpc('delivery_action', {
      p_job_id: params.id,
      p_user_id: user,
      p_action: action,
      p_input: input,
    })
    if (role === 'staff') {
      const { data: order } = await getSupabaseAdmin()
        .from('orders')
        .select('status')
        .eq('order_id', data.order_id)
        .eq('venue_id', data.venue_id)
        .single()
      return json(driverDelivery(data, order?.status ?? 'unknown', undefined))
    }
    return json(data, ['cancel', 'reconcile'].includes(params.action) ? 202 : 200)
  })
}
