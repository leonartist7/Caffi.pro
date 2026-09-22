import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { handled, json, rpc, uuid, DeliveryHttpError } from '@/lib/delivery/http'
import { boundedBody } from '@/lib/delivery/validation'
import { getDeliveryProvider } from '@/lib/delivery/provider'
import type { DeliveryConnection } from '@/lib/delivery/contracts'

export async function POST(
  request: Request,
  { params }: { params: { provider: string; connectionId: string } }
) {
  return handled(async () => {
    const { data, error } = await getSupabaseAdmin()
      .from('delivery_connections')
      .select('*')
      .eq('id', uuid(params.connectionId))
      .eq('provider', params.provider)
      .maybeSingle()
    if (error || !data) throw new DeliveryHttpError('NOT_FOUND', 404)
    let event
    try {
      event = await getDeliveryProvider(data as DeliveryConnection).authenticateAndNormalizeEvent(
        await boundedBody(request),
        request.headers
      )
    } catch {
      throw new DeliveryHttpError('INVALID_SIGNATURE_OR_EVENT', 401)
    }
    // Successful response follows durable inbox/application commit, including quarantined events.
    await rpc('delivery_receive_event', { p_connection_id: data.id, p_event: event })
    return json({ received: true })
  })
}
