import { spawnSync } from 'node:child_process'

const result = spawnSync('npm', ['exec', 'next', 'build'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'isolated-test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'isolated-test-service-role-key',
    NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3000',
    DEMO_MODE: 'true',
    ORDERING_ENABLED: 'false',
  },
})

if (result.error) throw result.error
process.exit(result.status ?? 1)
