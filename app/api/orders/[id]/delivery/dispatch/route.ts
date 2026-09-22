import {
  body,
  handled,
  json,
  resource,
  rpc,
  userId,
  uuid,
  DeliveryHttpError,
} from '@/lib/delivery/http'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const user = await userId()
    await resource('orders', params.id, user, true)
    const input = await body(request)
    if (
      !Number.isSafeInteger(input.approved_cost_minor) ||
      Number(input.approved_cost_minor) < 0 ||
      (input.expected_version !== undefined && !Number.isSafeInteger(input.expected_version))
    )
      throw new DeliveryHttpError('INVALID_COST_APPROVAL', 400)
    const data = await rpc('delivery_dispatch', {
      p_order_id: params.id,
      p_user_id: user,
      p_quote_id: uuid(input.quote_id),
      p_operation_key: uuid(request.headers.get('Idempotency-Key')),
      p_approved_cost: input.approved_cost_minor,
      p_expected_version: input.expected_version ?? null,
    })
    return json(data, 202)
  })
}
