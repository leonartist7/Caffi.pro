/** Public-safe types. Implementations and credentials live behind provider.ts. */
export type DeliveryState =
  | 'dispatch_pending'
  | 'booked'
  | 'assigned'
  | 'picked_up'
  | 'delivered'
  | 'reconciliation_required'
  | 'cancellation_pending'
  | 'cancelled'
  | 'failed'
  | 'returned'
export interface DeliveryAddress {
  countryCode: string
  postalCode: string
  city: string
  line1: string
  line2?: string
}
export interface DeliveryCapabilities {
  tracking: 'milestones' | 'provider_estimate'
  cancellation: boolean
  idempotentCancellation: boolean
  scheduled: boolean
  proofOfDelivery: boolean
}
export interface DeliveryEvent {
  provider_event_id: string
  external_ref: string
  state: DeliveryState
  occurred_at: string
}
export type DeliveryResult =
  | { kind: 'confirmed'; external_ref: string; state: DeliveryState; cost_minor?: number }
  | { kind: 'unknown' | 'rejected' | 'authoritative_absent'; code: string }
export interface DeliveryConnection {
  id: string
  venue_id: string
  provider: 'simulator' | 'own_driver' | 'uber_direct'
  environment: 'simulation' | 'sandbox' | 'live'
  enabled: boolean
  capabilities: Record<string, unknown>
}
export interface DeliveryJob {
  id: string
  venue_id: string
  order_id: string
  connection_id: string
  operation_key: string
  state: DeliveryState
  version: number
  external_ref: string | null
  approved_cost_minor: number
  currency: string
  driver_user_id: string | null
  exception: string | null
  safe_tracking: Record<string, unknown>
  created_at: string
}
export interface DeliveryWork {
  outbox: { id: string; action: 'create' | 'lookup' | 'cancel'; effect_key: string }
  job: DeliveryJob
  connection: DeliveryConnection
  context: Record<string, unknown>
  lease_token: string
}
