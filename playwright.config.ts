import { defineConfig } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: { baseURL, trace: 'retain-on-failure' },
  // The local database is intentionally opt-in. This command does not create
  // a server against a production project; see docs/product-os/local-test-environment.md.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev:local',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
      },
})
