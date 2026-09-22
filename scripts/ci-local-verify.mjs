import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

// No environment files or hosted credentials may influence this disposable job.
const envFiles = readdirSync('.').filter(name => name.startsWith('.env') && name !== '.env.example')
if (envFiles.length) throw new Error('Isolated verification requires a checkout without .env files.')
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
  !/SUPABASE|STRIPE|UBER|DELIVERY|ORDERING|DEMO_MODE|PLAYWRIGHT_BASE_URL/.test(name)))
env.DO_NOT_TRACK = '1'
env.NEXT_TELEMETRY_DISABLED = '1'
env.CI = 'true'

function run(command, args, capture = false) {
  const result = spawnSync(command, args, {
    env, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.error || result.status !== 0) {
    // Captured CLI status/start output can contain local service keys: never echo it.
    throw new Error(`${command} ${args[0]} failed; required local infrastructure or fixtures unavailable.`)
  }
  return result.stdout
}

run('supabase', ['start'], true)
run('supabase', ['db', 'reset', '--local', '--yes'], true)
const status = JSON.parse(run('supabase', ['status', '-o', 'json'], true))
for (const key of ['API_URL', 'DB_URL', 'ANON_KEY', 'SERVICE_ROLE_KEY']) {
  if (!status[key]) throw new Error(`Supabase status is missing ${key}.`)
}
for (const key of ['API_URL', 'DB_URL']) {
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(status[key]).hostname)) {
    throw new Error(`Refusing non-loopback ${key}.`)
  }
}
Object.assign(env, {
  SUPABASE_TEST_DATABASE_URL: status.DB_URL,
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
  NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3000',
  DEMO_MODE: 'false', ORDERING_ENABLED: 'true',
  CAFFI_DELIVERY_MODE: 'simulation',
  CAFFI_DELIVERY_WORKER_SECRET: randomBytes(32).toString('hex'),
  CAFFI_SYNTHETIC_VENUE_ID: '13000000-0000-4000-8000-000000000001',
  CAFFI_LOCAL_FIXTURE_PASSWORD: randomBytes(24).toString('base64url'),
})
// Mask ephemeral local keys as defense in depth; no hosted/provider keys enter the job.
if (process.env.GITHUB_ACTIONS === 'true') {
  for (const key of ['ANON_KEY', 'SERVICE_ROLE_KEY']) console.log(`::add-mask::${status[key]}`)
  console.log(`::add-mask::${env.CAFFI_LOCAL_FIXTURE_PASSWORD}`)
  console.log(`::add-mask::${env.CAFFI_DELIVERY_WORKER_SECRET}`)
}
run('node', ['scripts/test-local-db.mjs'])
run('node', ['scripts/ci-local-auth-fixtures.mjs'])
// Playwright exits nonzero if no tests exist. Never use --pass-with-no-tests.
run('npm', ['run', 'test:browser', '--', '--workers=1'])
console.log('Disposable local SQL/RLS and browser checks passed. No provider sandbox or live evidence.')
