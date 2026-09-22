import { handled, json, resource, rpc, userId } from '@/lib/delivery/http'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const user = await userId()
    await resource('orders', params.id, user, true)
    const quote = await rpc('delivery_refresh_quote', { p_order_id: params.id, p_user_id: user })
    return json({
      quote_id: quote.id ?? quote.quote_id,
      provider_cost_minor: quote.provider_cost_minor,
      currency: quote.currency,
      expires_at: quote.expires_at,
    })
  })
}
