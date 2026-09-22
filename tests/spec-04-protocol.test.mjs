import assert from 'node:assert/strict'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// Test-only oracle: not imported by production, not an adapter or shared contract.
const fixture = JSON.parse(readFileSync(new URL('./fixtures/uber-direct/protocol.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''))
const key = 'synthetic-public-fixture-key-not-a-credential'
const raw = '{"id":"evt_fixture","kind":"event.delivery_status","customer_id":"cus_fixture","delivery_id":"del_fixture","live_mode":false,"status":"delivered","data":{"id":"del_fixture","status":"delivered","notes":"A\\u0026B"}}'
const sign = body => createHmac('sha256', key).update(body, 'utf8').digest('hex')
const verify = (body, signature) => typeof signature === 'string' && /^[a-f0-9]{64}$/.test(signature) && timingSafeEqual(Buffer.from(sign(body), 'hex'), Buffer.from(signature, 'hex'))

test('SPEC-04-AC-02 raw-byte authentication distinguishes semantic-equivalent JSON', () => {
  const signature = sign(raw)
  assert.equal(verify(raw, signature), true)
  assert.equal(verify(JSON.stringify(JSON.parse(raw)), signature), false)
  assert.equal(verify(raw + '\n', signature), false)
  assert.equal(verify(raw.replace('delivered', 'canceled'), signature), false)
  for (const invalid of [undefined, '', '00', 'x'.repeat(64), '0'.repeat(64)]) assert.equal(verify(raw, invalid), false)
})

test('SPEC-04-AC-02 valid signatures do not themselves prevent replay or establish tenant ownership', () => {
  const signature = sign(raw)
  assert.equal(verify(raw, signature), true)
  assert.equal(verify(raw, signature), true) // Durable inbox must deduplicate; HMAC has no freshness claim.
  const event = JSON.parse(raw)
  assert.equal(event.customer_id, 'cus_fixture')
  assert.notEqual(event.customer_id, 'cus_other_tenant')
  assert.equal(event.delivery_id, event.data.id)
  assert.equal(event.live_mode, false)
})

test('SPEC-04-AC-02 quote fixture has explicit currency, integer cost and a hard expiry boundary', () => {
  const { quote } = fixture
  assert.ok(Number.isSafeInteger(quote.fee) && quote.fee >= 0)
  assert.equal(quote.currency.toUpperCase(), quote.currency_type)
  assert.ok(Date.parse(quote.expires) > Date.parse(quote.created))
  const validAt = now => Date.parse(now) < Date.parse(quote.expires)
  assert.equal(validAt('2026-09-22T12:14:59Z'), true)
  assert.equal(validAt('2026-09-22T12:15:00Z'), false)
})

test('SPEC-04-AC-02 fault corpus retains uncertain booking and exact access limitations', () => {
  assert.equal(fixture.evidence, 'synthetic-offline-only')
  assert.equal(fixture.createConfirmed.live_mode, false)
  assert.deepEqual(fixture.scenarios.map(s => s.name).sort(), ['cancellation-rejected', 'invalid-address', 'quote-unavailable', 'timeout-after-create', 'token-expired'])
  const timeout = fixture.scenarios.find(s => s.name === 'timeout-after-create')
  assert.equal(timeout.expected, 'reconciliation-required')
  assert.equal(timeout.allowNewBooking, false)
  assert.equal(timeout.httpStatus, null)
  assert.equal(fixture.createIntent.external_id, fixture.createConfirmed.external_id)
  assert.ok(fixture.scenarios.every(s => s.providerCode === null))
  assert.ok(fixture.limitations.some(s => s.includes('not captured')))
})
