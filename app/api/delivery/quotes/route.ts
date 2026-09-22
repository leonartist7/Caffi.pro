import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { body, handled, json, rpc, uuid, DeliveryHttpError } from '@/lib/delivery/http'
import { address } from '@/lib/delivery/validation'
import { simulationEnabled } from '@/lib/delivery/provider'
import { isVenueOpenForOrdering, parseOrderingHours } from '@/lib/orders/opening-hours'

export async function POST(request: Request) {
  return handled(async () => {
    const input = await body(request)
    if (
      typeof input.venue_slug !== 'string' ||
      input.venue_slug.length > 100 ||
      !['simulator', 'own_driver'].includes(String(input.mode)) ||
      !Array.isArray(input.items) ||
      !input.items.length ||
      input.items.length > 50
    )
      throw new DeliveryHttpError('INVALID_QUOTE', 400)
    let destination
    try {
      destination = address(input.address)
    } catch {
      throw new DeliveryHttpError('INVALID_ADDRESS', 400)
    }
    const { data: venue } = await getSupabaseAdmin()
      .from('venues')
      .select('venue_id,timezone,reservation_config')
      .eq('slug', input.venue_slug)
      .maybeSingle()
    if (!venue || !simulationEnabled(venue.venue_id))
      throw new DeliveryHttpError('DELIVERY_NOT_CONFIGURED', 404)
    if (
      !isVenueOpenForOrdering(parseOrderingHours(venue.reservation_config?.hours), venue.timezone)
    )
      throw new DeliveryHttpError('VENUE_CLOSED')
    const quote = await rpc('delivery_create_quote', {
      p_venue_slug: input.venue_slug,
      p_items: input.items,
      p_zone_id: uuid(input.zone_id),
      p_address: destination,
      p_mode: input.mode,
    })
    return json(
      {
        quote_id: quote.id ?? quote.quote_id,
        expires_at: quote.expires_at,
        guest_charge_minor: quote.guest_charge_minor,
        currency: quote.currency,
      },
      201
    )
  })
}
