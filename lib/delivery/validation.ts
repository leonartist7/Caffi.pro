import type { DeliveryAddress, DeliveryEvent, DeliveryState } from './contracts'

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const states: DeliveryState[] = [
  'dispatch_pending',
  'booked',
  'assigned',
  'picked_up',
  'delivered',
  'reconciliation_required',
  'cancellation_pending',
  'cancelled',
  'failed',
  'returned',
]

export function address(value: unknown): DeliveryAddress {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('INVALID_ADDRESS')
  const input = value as Record<string, unknown>
  const result: Record<string, string> = {}
  for (const key of ['countryCode', 'postalCode', 'city', 'line1', 'line2']) {
    const field = input[key]
    if ((field === undefined || field === '') && key === 'line2') continue
    if (typeof field !== 'string' || !field.trim() || field.length > 200)
      throw new Error('INVALID_ADDRESS')
    result[key] = field.trim()
  }
  result.countryCode = result.countryCode.toUpperCase()
  result.postalCode = result.postalCode.toUpperCase()
  if (!/^[A-Z]{2}$/.test(result.countryCode)) throw new Error('INVALID_ADDRESS')
  return result as unknown as DeliveryAddress
}

export function normalizedEvent(value: unknown): DeliveryEvent {
  if (!value || typeof value !== 'object') throw new Error('INVALID_EVENT')
  const e = value as Record<string, unknown>
  if (
    typeof e.provider_event_id !== 'string' ||
    !e.provider_event_id ||
    e.provider_event_id.length > 200 ||
    typeof e.external_ref !== 'string' ||
    !e.external_ref ||
    e.external_ref.length > 200 ||
    !states.includes(e.state as DeliveryState) ||
    typeof e.occurred_at !== 'string' ||
    !Number.isFinite(Date.parse(e.occurred_at))
  )
    throw new Error('INVALID_EVENT')
  return {
    provider_event_id: e.provider_event_id,
    external_ref: e.external_ref,
    state: e.state as DeliveryState,
    occurred_at: new Date(e.occurred_at).toISOString(),
  }
}

/** Read bounded bytes even when Content-Length is missing or dishonest. */
export async function boundedBody(request: Request, limit = 32_768): Promise<string> {
  if (!request.body) throw new Error('INVALID_BODY')
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let bytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > limit) {
        await reader.cancel()
        throw new Error('BODY_TOO_LARGE')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const joined = new Uint8Array(bytes)
  let offset = 0
  for (const chunk of chunks) {
    joined.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(joined)
}
