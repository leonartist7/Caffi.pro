import { expect, test } from '@playwright/test'

test('synthetic owner signs in through the local Auth service', async ({ page }) => {
  const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const password = process.env.CAFFI_LOCAL_FIXTURE_PASSWORD
  expect(apiUrl, 'Run scripts/ci-local-verify.mjs with disposable Supabase').toBeTruthy()
  expect(
    password,
    'Synthetic Auth fixtures must be prepared; do not skip missing fixtures'
  ).toBeTruthy()
  expect(['localhost', '127.0.0.1', '[::1]']).toContain(new URL(apiUrl!).hostname)
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill('spec01-owner@test.local')
  await page.locator('#password').fill(password!)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/home(?:\/|$|\?)/)
  await expect(page.getByText('SPEC-01 North One', { exact: true }).first()).toBeVisible()
})
