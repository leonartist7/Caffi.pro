import { describe, expect, it } from 'vitest'
import { DeterministicPosSimulator, validateMenu } from '@/lib/pos/simulator'
import type { PosMenuSnapshot, PosOrderInput } from '@/lib/pos/contracts'

const menu: PosMenuSnapshot = {
  currency: 'CAD',
  version: 'v1',
  categories: [{ externalId: 'cat-1', name: 'Lunch' }],
  items: [{
    externalId: 'item-1', externalCategoryId: 'cat-1', name: 'Sandwich',
    priceMinor: 900, available: true,
    modifiers: [{ externalId: 'mod-1', name: 'Cheese', priceMinor: 100 }],
  }],
}
const order: PosOrderInput = {
  venueId: 'venue-a', connectionId: 'connection-a', operationKey: 'order-1',
  currency: 'CAD', totalMinor: 1000,
  lines: [{ externalItemId: 'item-1', quantity: 1, modifiers: ['mod-1'] }],
}
describe('SPEC-05-AC-02/03/04 deterministic POS contract', () => {
  it('rejects invalid/partial menu imports before exposing a version', () => {
    expect(() => validateMenu({ ...menu, currency: 'usd' })).toThrow('INVALID_MENU')
    expect(() => validateMenu({ ...menu, items: [{ ...menu.items[0], externalCategoryId: 'missing' }] })).toThrow('MISSING_CATEGORY')
    expect(() => validateMenu({ ...menu, items: [menu.items[0], menu.items[0]] })).toThrow('DUPLICATE_ITEM')
  })
  it('maps availability and refuses missing item/modifier identifiers', async () => {
    const provider = new DeterministicPosSimulator(menu)
    expect(await provider.getAvailability(['item-1', 'missing'])).toEqual({ 'item-1': true, missing: false })
    await expect(provider.submitOrder({ ...order, lines: [{ ...order.lines[0], externalItemId: 'missing' }] })).rejects.toThrow('MISSING_MAPPING')
    await expect(provider.submitOrder({ ...order, lines: [{ ...order.lines[0], modifiers: ['missing'] }] })).rejects.toThrow('MISSING_MODIFIER_MAPPING')
  })
  it('replays the same acknowledgement and external reference', async () => {
    const provider = new DeterministicPosSimulator(menu)
    const first = await provider.submitOrder(order)
    expect(first.kind).toBe('acknowledged')
    expect(await provider.submitOrder(order)).toEqual(first)
    expect(await provider.lookupOrder(order.operationKey)).toEqual(first)
  })
  it('reconciles timeout-after-accept by lookup, never by a second booking', async () => {
    const provider = new DeterministicPosSimulator(menu, 'timeout_after_accept')
    expect((await provider.submitOrder(order)).kind).toBe('unknown')
    const found = await provider.lookupOrder(order.operationKey)
    expect(found.kind).toBe('acknowledged')
    expect(await provider.submitOrder(order)).toEqual(found)
  })
  it('keeps rejection separate from absence and preserves currency', async () => {
    const provider = new DeterministicPosSimulator(menu, 'reject')
    expect((await provider.submitOrder(order)).kind).toBe('rejected')
    expect((await provider.lookupOrder('other')).kind).toBe('absent')
    await expect(provider.submitOrder({ ...order, operationKey: 'new', currency: 'USD' })).rejects.toThrow('CURRENCY_MISMATCH')
  })
})
