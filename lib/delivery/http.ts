import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { simulationEnabled } from './provider'
import { boundedBody, UUID } from './validation'

export class DeliveryHttpError extends Error {
  constructor(
    message: string,
    readonly status = 409
  ) {
    super(message)
  }
}
export function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } })
}
export async function body(request: Request): Promise<Record<string, unknown>> {
  try {
    const result = JSON.parse(await boundedBody(request))
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error()
    return result
  } catch {
    throw new DeliveryHttpError('INVALID_BODY', 400)
  }
}
export function uuid(value: unknown): string {
  if (typeof value !== 'string' || !UUID.test(value))
    throw new DeliveryHttpError('INVALID_IDENTIFIER', 400)
  return value
}
export async function rpc(name: string, input: Record<string, unknown>) {
  const { data, error } = await getSupabaseAdmin().rpc(name, input)
  if (error) {
    const code = error.message.match(
      /\b(?:DELIVERY_[A-Z_]+|QUOTE_[A-Z_]+|PAYMENT_[A-Z_]+|FORBIDDEN|NOT_FOUND|INVALID_[A-Z_]+|OUTSIDE_DELIVERY_ZONE|CHECKOUT_CART_CHANGED|POLICY_NOT_APPROVED|RATE_LIMITED|ITEM_UNAVAILABLE)\b/
    )?.[0]
    throw new DeliveryHttpError(
      code ?? 'DELIVERY_ACTION_UNAVAILABLE',
      code?.endsWith('FORBIDDEN')
        ? 403
        : code?.endsWith('NOT_FOUND')
          ? 404
          : ['RATE_LIMITED', 'QUOTE_RATE_LIMIT'].includes(code ?? '')
            ? 429
            : 409
    )
  }
  return data
}
export async function userId(): Promise<string> {
  try {
    const { data, error } = await createClient().auth.getUser()
    if (!error && data.user) return data.user.id
  } catch {
    /* explicit unauthorized */
  }
  throw new DeliveryHttpError('NOT_AUTHENTICATED', 401)
}
export async function scope(
  venueId: string,
  user: string,
  manager = false
): Promise<'owner' | 'manager' | 'staff'> {
  if (!simulationEnabled(venueId)) throw new DeliveryHttpError('DELIVERY_NOT_CONFIGURED', 404)
  return rpc('delivery_authorize', { p_venue_id: venueId, p_user_id: user, p_manager: manager })
}
export async function resource(
  table: 'orders' | 'delivery_jobs',
  id: string,
  user: string,
  manager = false
) {
  uuid(id)
  const { data, error } = await getSupabaseAdmin()
    .from(table)
    .select('*')
    .eq(table === 'orders' ? 'order_id' : 'id', id)
    .maybeSingle()
  if (error || !data) throw new DeliveryHttpError('NOT_FOUND', 404)
  const role = await scope(data.venue_id, user, manager)
  if (role === 'staff' && (table !== 'delivery_jobs' || data.driver_user_id !== user))
    throw new DeliveryHttpError('NOT_FOUND', 404)
  return { row: data, role }
}
export async function handled(action: () => Promise<Response>) {
  try {
    return await action()
  } catch (error) {
    if (error instanceof DeliveryHttpError) return json({ error: error.message }, error.status)
    return json({ error: 'DELIVERY_ACTION_UNAVAILABLE' }, 503)
  }
}
