import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { normalizedEvent } from './validation'
import type {
  DeliveryCapabilities,
  DeliveryConnection,
  DeliveryEvent,
  DeliveryResult,
  DeliveryWork,
} from './contracts'

export interface DeliveryProvider {
  capabilities(): DeliveryCapabilities
  quote(input: { currency: string; cost_minor: number; expires_at: string }): Promise<{
    serviceable: boolean
    currency: string
    cost_minor: number
    expires_at: string
  }>
  create(input: DeliveryWork, operationKey: string): Promise<DeliveryResult>
  lookup(input: DeliveryWork): Promise<DeliveryResult>
  cancel(input: DeliveryWork): Promise<DeliveryResult>
  authenticateAndNormalizeEvent(rawBody: string, headers: Headers): Promise<DeliveryEvent>
}

/** Never enable fixtures by NODE_ENV alone or in a hosted preview. */
export function simulationEnabled(venueId?: string): boolean {
  let loopback = false
  try {
    loopback = ['localhost', '127.0.0.1', '[::1]'].includes(
      new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname
    )
  } catch {
    /* fail closed */
  }
  return (
    !process.env.VERCEL &&
    process.env.NODE_ENV !== 'production' &&
    loopback &&
    process.env.CAFFI_DELIVERY_MODE === 'simulation' &&
    process.env.CAFFI_SYNTHETIC_FIXTURES === '1' &&
    venueId === '13000000-0000-4000-8000-000000000001' &&
    venueId === process.env.CAFFI_SYNTHETIC_VENUE_ID
  )
}

export class SimulatorProvider implements DeliveryProvider {
  constructor(private readonly connection: DeliveryConnection) {}
  capabilities(): DeliveryCapabilities {
    return {
      tracking: 'milestones',
      cancellation: true,
      idempotentCancellation: true,
      scheduled: false,
      proofOfDelivery: false,
    }
  }
  async quote(input: { currency: string; cost_minor: number; expires_at: string }) {
    if (
      !/^[A-Z]{3}$/.test(input.currency) ||
      !Number.isSafeInteger(input.cost_minor) ||
      input.cost_minor < 0 ||
      !Number.isFinite(Date.parse(input.expires_at))
    )
      throw new Error('INVALID_QUOTE')
    return { serviceable: true, ...input }
  }
  private async effect(work: DeliveryWork, action: string): Promise<DeliveryResult> {
    if (
      !simulationEnabled(this.connection.venue_id) ||
      this.connection.environment !== 'simulation'
    )
      throw new Error('NOT_CONFIGURED')
    const { data, error } = await getSupabaseAdmin().rpc('delivery_simulator_effect', {
      p_connection_id: this.connection.id,
      p_operation_key: work.job.operation_key,
      p_action: action,
      p_input: { cost_minor: work.job.approved_cost_minor },
    })
    if (error) throw new Error('SIMULATOR_STORAGE_UNAVAILABLE')
    if (!data || !['confirmed', 'unknown', 'rejected', 'authoritative_absent'].includes(data.kind))
      throw new Error('INVALID_PROVIDER_RESULT')
    return data as DeliveryResult
  }
  async create(work: DeliveryWork, operationKey: string) {
    if (operationKey !== work.job.operation_key) throw new Error('OPERATION_MISMATCH')
    return this.effect(work, 'create')
  }
  async lookup(work: DeliveryWork) {
    return this.effect(work, 'lookup')
  }
  async cancel(work: DeliveryWork) {
    return this.effect(work, 'cancel')
  }
  async authenticateAndNormalizeEvent(rawBody: string, headers: Headers) {
    const secret = process.env.CAFFI_DELIVERY_WEBHOOK_SECRET
    const signature = headers.get('x-simulator-signature') ?? ''
    if (
      !simulationEnabled(this.connection.venue_id) ||
      !secret ||
      secret.length < 32 ||
      !/^[a-f0-9]{64}$/i.test(signature)
    )
      throw new Error('INVALID_SIGNATURE')
    const expected = createHmac('sha256', secret).update(rawBody).digest()
    if (!timingSafeEqual(expected, Buffer.from(signature, 'hex')))
      throw new Error('INVALID_SIGNATURE')
    return normalizedEvent(JSON.parse(rawBody))
  }
}

export function getDeliveryProvider(connection: DeliveryConnection): DeliveryProvider {
  if (
    !simulationEnabled(connection.venue_id) ||
    connection.environment !== 'simulation' ||
    !['simulator', 'own_driver'].includes(connection.provider)
  )
    throw new Error('NOT_CONFIGURED')
  return new SimulatorProvider(connection)
}
