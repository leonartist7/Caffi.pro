import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'

const south = '13000000-0000-4000-8000-000000000003'

test('owner POS queue is tenant scoped and keyboard refresh works', async ({ page }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const password = process.env.CAFFI_LOCAL_FIXTURE_PASSWORD
  if (!url || !key || !password || !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname)
      || process.env.CAFFI_SYNTHETIC_FIXTURES !== '1' || process.env.VERCEL)
    throw new Error('POS browser test requires disposable loopback fixtures')
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const southInsert = await admin.from('pos_connections').upsert({
    venue_id: south, provider: 'simulator', environment: 'simulation',
    enabled: false, health: 'attention', menu_version: 'browser-south',
  }, { onConflict: 'venue_id,provider,environment' })
  expect(southInsert.error).toBeNull()

  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill('spec01-owner@test.local')
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/home(?:\/|$|\?)/)
  await page.goto('/pos')
  await expect(page.getByRole('heading', { name: 'POS connection' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Order submissions' })).toBeVisible()
  await expect(page.getByText('browser-south')).toHaveCount(0)

  const refresh = page.getByRole('button', { name: 'Refresh POS queue' })
  await refresh.focus()
  await expect(refresh).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Order submissions' })).toBeVisible()
  const foreign = await page.request.get('/api/pos?venue_id=' + south)
  expect(foreign.status()).toBe(403)
})


