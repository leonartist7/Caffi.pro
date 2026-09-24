import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'

const venueA = '13000000-0000-4000-8000-000000000001'
const venueB = '13000000-0000-4000-8000-000000000003'

test('owner sees only explicitly linked same-venue activity', async ({ page }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const password = process.env.CAFFI_LOCAL_FIXTURE_PASSWORD
  if (!url || !key || !password || !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname)
      || process.env.CAFFI_SYNTHETIC_FIXTURES !== '1' || process.env.VERCEL)
    throw new Error('Member-history browser test requires disposable loopback fixtures')
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const memberA = randomUUID()
  const memberB = randomUUID()
  const orderA = randomUUID()
  const orderB = randomUUID()
  const reservationA = randomUUID()
  const memberResult = await admin.from('members').insert([
    { member_id: memberA, tenant_id: venueA, full_name: 'Synthetic linked guest' },
    { member_id: memberB, tenant_id: venueB, full_name: 'Synthetic linked guest' },
  ])
  expect(memberResult.error).toBeNull()
  const orderResult = await admin.from('orders').insert([
    { order_id: orderA, venue_id: venueA, member_id: memberA, client_uuid: randomUUID(),
      order_type: 'pickup', status: 'pending', subtotal_cents: 100, total_cents: 100 },
    { order_id: orderB, venue_id: venueB, member_id: memberB, client_uuid: randomUUID(),
      order_type: 'pickup', status: 'pending', subtotal_cents: 100, total_cents: 100 },
  ])
  expect(orderResult.error).toBeNull()
  const reservationResult = await admin.from('reservations').insert({
    reservation_id: reservationA, venue_id: venueA, member_id: memberA,
    client_uuid: randomUUID(), guest_name: 'Synthetic linked guest', guest_phone: '0000000000',
    party_size: 2, starts_at: '2030-01-01T12:00:00Z', duration_minutes: 60,
  })
  expect(reservationResult.error).toBeNull()

  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill('spec01-owner@test.local')
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/home(?:\/|$|\?)/)
  await page.goto('/regulars')
  await expect(page.getByRole('button', { name: /Synthetic linked guest/ }).first()).toBeVisible()
  await page.goto(`/regulars/${memberA}`)
  await expect(page.getByRole('heading', { name: 'Synthetic linked guest' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Orders and reservations' })).toBeVisible()
  await expect(page.getByText('Order · pickup · pending')).toBeVisible()
  await expect(page.getByText('Reservation · confirmed')).toBeVisible()
  await page.goto(`/regulars/${memberB}`)
  await expect(page.getByText('Member not found.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Orders and reservations' })).toHaveCount(0)
})
