import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'

const venueId = '13000000-0000-4000-8000-000000000001'

test('review analytics require guest capability and deduplicate retries', async ({ page }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname)
      || process.env.CAFFI_SYNTHETIC_FIXTURES !== '1' || process.env.VERCEL)
    throw new Error('Review-prompt test requires disposable loopback fixtures')
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const orderId = randomUUID()
  const tracking = randomUUID()
  const pendingId = randomUUID()
  const pendingTracking = randomUUID()
  const inserted = await admin.from('orders').insert([
    { order_id: orderId, venue_id: venueId, client_uuid: randomUUID(),
      guest_tracking_token: tracking, order_type: 'pickup', status: 'paid',
      subtotal_cents: 100, total_cents: 100 },
    { order_id: pendingId, venue_id: venueId, client_uuid: randomUUID(),
      guest_tracking_token: pendingTracking, order_type: 'pickup', status: 'pending',
      subtotal_cents: 100, total_cents: 100 },
  ])
  expect(inserted.error).toBeNull()

  const endpoint = `/api/orders/${orderId}/review-event`
  expect((await page.request.post(endpoint, { data: { type: 'prompted' } })).status()).toBe(404)
  expect((await page.request.post(endpoint, {
    data: { type: 'prompted', tracking: randomUUID() },
  })).status()).toBe(404)
  expect((await page.request.post(endpoint, {
    data: { type: 'prompted', tracking: pendingTracking },
  })).status()).toBe(404)
  expect((await page.request.post(`/api/orders/${pendingId}/review-event`, {
    data: { type: 'prompted', tracking: pendingTracking },
  })).status()).toBe(409)
  const invalidPage = await page.goto(`/shop/spec01-north-one/order-confirmation/${orderId}?tracking=${randomUUID()}`)
  expect(invalidPage?.status()).toBe(404)
  const foreignSlug = await page.goto(`/shop/spec01-south/order-confirmation/${orderId}?tracking=${tracking}`)
  expect(foreignSlug?.status()).toBe(404)
  const deniedEvents = await admin.from('events').select('event_id')
    .in('type', ['review.prompted', 'review.clicked'])
    .contains('payload', { order_id: orderId })
  expect(deniedEvents.error).toBeNull()
  expect(deniedEvents.data).toHaveLength(0)

  for (const type of ['prompted', 'prompted', 'clicked'] as const) {
    expect((await page.request.post(endpoint, { data: { type, tracking } })).status()).toBe(200)
  }
  const events = await admin.from('events').select('type')
    .in('type', ['review.prompted', 'review.clicked'])
    .contains('payload', { order_id: orderId })
  expect(events.error).toBeNull()
  expect(events.data?.map(event => event.type).sort()).toEqual(['review.clicked', 'review.prompted'])

  const venue = await admin.from('venues').select('brand_kit').eq('venue_id', venueId).single()
  expect(venue.error).toBeNull()
  const brandKit = venue.data?.brand_kit as Record<string, unknown> | null
  const configured = await admin.from('venues').update({
    brand_kit: { ...brandKit, review_profile: { url: 'https://reviews.example.test/venue' } },
  }).eq('venue_id', venueId)
  expect(configured.error).toBeNull()
  const browserEvents: { type: string; tracking: string }[] = []
  await page.route('**/api/orders/**/review-event', async route => {
    browserEvents.push(route.request().postDataJSON())
    await route.continue()
  })
  await page.context().route('https://reviews.example.test/**', route => route.fulfill({
    status: 200, body: 'synthetic review destination',
  }))
  try {
    await page.goto(`/shop/spec01-north-one/order-confirmation/${orderId}?tracking=${tracking}`)
    await expect(page.getByRole('heading', { name: 'Payment received' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Enjoyed your visit?' })).toBeVisible()
    await expect.poll(() => browserEvents.map(event => event.type)).toContain('prompted')
    await page.getByRole('link', { name: 'Leave a review' }).click()
    await expect.poll(() => browserEvents.map(event => event.type)).toContain('clicked')
    expect(browserEvents.every(event => event.tracking === tracking)).toBe(true)
  } finally {
    await admin.from('venues').update({ brand_kit: brandKit }).eq('venue_id', venueId)
  }
})
