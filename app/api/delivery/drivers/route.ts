import {
  body,
  handled,
  json,
  rpc,
  scope,
  userId,
  uuid,
  DeliveryHttpError,
} from '@/lib/delivery/http'

export async function POST(request: Request) {
  return handled(async () => {
    const user = await userId()
    const input = await body(request)
    const venue = uuid(input.venue_id)
    await scope(venue, user, true)
    if (typeof input.enabled !== 'boolean') throw new DeliveryHttpError('INVALID_CAPABILITY', 400)
    return json(
      await rpc('delivery_set_driver_access', {
        p_venue_id: venue,
        p_user_id: user,
        p_driver_user_id: uuid(input.user_id),
        p_enabled: input.enabled,
      })
    )
  })
}
