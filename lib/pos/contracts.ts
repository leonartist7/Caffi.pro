export type PosEnvironment = 'simulation' | 'sandbox' | 'live'
export type PosOutcome =
  | { kind: 'acknowledged'; externalOrderId: string; occurredAt: string }
  | { kind: 'rejected'; code: string; occurredAt: string }
  | { kind: 'unknown'; code: string }
  | { kind: 'absent'; checkedAt: string }

export interface PosConnection {
  id: string
  venueId: string
  provider: string
  environment: PosEnvironment
  enabled: boolean
}

export interface PosMenuItem {
  externalId: string
  externalCategoryId: string | null
  name: string
  priceMinor: number
  available: boolean
  modifiers: { externalId: string; name: string; priceMinor: number }[]
}

export interface PosMenuSnapshot {
  complete: true
  currency: string
  version: string
  categories: { externalId: string; name: string }[]
  items: PosMenuItem[]
}

export interface PosOrderLine {
  externalItemId: string
  quantity: number
  modifiers: string[]
}

export interface PosOrderInput {
  venueId: string
  connectionId: string
  operationKey: string
  currency: string
  lines: PosOrderLine[]
  totalMinor: number
}

/** All implementations are server-only. Unknown submission is never a rejection. */
export interface PosProvider {
  importMenu(): Promise<PosMenuSnapshot>
  getAvailability(externalItemIds: string[]): Promise<Record<string, boolean>>
  submitOrder(input: PosOrderInput): Promise<PosOutcome>
  lookupOrder(operationKey: string): Promise<PosOutcome>
  authenticateAndNormalizeEvent(rawBody: string, headers: Headers): Promise<{
    eventId: string
    externalOrderId: string
    state: 'acknowledged' | 'rejected' | 'cancelled'
    occurredAt: string
  }>
}
