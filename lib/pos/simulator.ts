import 'server-only'
import { createHash } from 'node:crypto'
import type { PosMenuSnapshot, PosOrderInput, PosOutcome, PosProvider } from './contracts'

export type SimulationScenario = 'acknowledge' | 'reject' | 'timeout_after_accept' | 'unavailable'

/**
 * Offline fixture. Persist the operation key in the production outbox before
 * calling any provider; this class models provider behavior, not that outbox.
 */
export class DeterministicPosSimulator implements PosProvider {
  private readonly orders = new Map<string, PosOutcome>()
  constructor(
    private readonly menu: PosMenuSnapshot,
    private readonly scenario: SimulationScenario = 'acknowledge',
    private readonly clock: () => string = () => '2026-09-24T00:00:00.000Z'
  ) {
    validateMenu(menu)
  }
  async importMenu() {
    return structuredClone(this.menu)
  }
  async getAvailability(ids: string[]) {
    const items = new Map(this.menu.items.map(item => [item.externalId, item.available]))
    return Object.fromEntries(ids.map(id => [id, items.get(id) === true]))
  }
  async submitOrder(input: PosOrderInput): Promise<PosOutcome> {
    const existing = this.orders.get(input.operationKey)
    if (existing) return existing
    if (!input.operationKey || input.lines.length === 0 || input.lines.some(x => x.quantity < 1))
      throw new Error('INVALID_ORDER')
    if (input.currency !== this.menu.currency) throw new Error('CURRENCY_MISMATCH')
    const itemMap = new Map(this.menu.items.map(item => [item.externalId, item]))
    for (const line of input.lines) {
      const item = itemMap.get(line.externalItemId)
      if (!item) throw new Error('MISSING_MAPPING')
      if (!item.available || this.scenario === 'unavailable') {
        const rejected: PosOutcome = { kind: 'rejected', code: 'ITEM_UNAVAILABLE', occurredAt: this.clock() }
        this.orders.set(input.operationKey, rejected)
        return rejected
      }
      for (const id of line.modifiers) {
        if (!item.modifiers.some(modifier => modifier.externalId === id))
          throw new Error('MISSING_MODIFIER_MAPPING')
      }
    }
    if (this.scenario === 'reject') {
      const rejected: PosOutcome = { kind: 'rejected', code: 'POS_REJECTED', occurredAt: this.clock() }
      this.orders.set(input.operationKey, rejected)
      return rejected
    }
    const externalOrderId =
      'sim-pos-' + createHash('sha256').update(input.connectionId + ':' + input.operationKey).digest('hex').slice(0, 20)
    const accepted: PosOutcome = { kind: 'acknowledged', externalOrderId, occurredAt: this.clock() }
    this.orders.set(input.operationKey, accepted)
    return this.scenario === 'timeout_after_accept'
      ? { kind: 'unknown', code: 'TIMEOUT_AFTER_SEND' }
      : accepted
  }
  async lookupOrder(operationKey: string): Promise<PosOutcome> {
    return this.orders.get(operationKey) ?? { kind: 'absent', checkedAt: this.clock() }
  }
  async authenticateAndNormalizeEvent(): Promise<never> {
    throw new Error('SIMULATOR_HAS_NO_WEBHOOK')
  }
}

export function validateMenu(menu: PosMenuSnapshot): void {
  if (menu.complete !== true || !/^[A-Z]{3}$/.test(menu.currency) || !menu.version) throw new Error('INVALID_MENU')
  const categoryIds = new Set(menu.categories.map(x => x.externalId))
  if (categoryIds.size !== menu.categories.length) throw new Error('DUPLICATE_CATEGORY')
  const itemIds = new Set<string>()
  for (const item of menu.items) {
    if (!item.externalId || !item.name || !Number.isSafeInteger(item.priceMinor) || item.priceMinor < 0)
      throw new Error('INVALID_ITEM')
    if (itemIds.has(item.externalId)) throw new Error('DUPLICATE_ITEM')
    itemIds.add(item.externalId)
    if (item.externalCategoryId && !categoryIds.has(item.externalCategoryId))
      throw new Error('MISSING_CATEGORY')
    const modifierIds = new Set(item.modifiers.map(x => x.externalId))
    if (modifierIds.size !== item.modifiers.length || item.modifiers.some(x => !x.externalId || !Number.isSafeInteger(x.priceMinor)))
      throw new Error('INVALID_MODIFIERS')
  }
}
