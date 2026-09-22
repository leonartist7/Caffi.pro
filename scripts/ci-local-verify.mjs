import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { stripVTControlCharacters } from 'node:util'

// No environment files or hosted credentials may influence this disposable job.
const envFiles = readdirSync('.').filter(name => name.startsWith('.env') && name !== '.env.example')
if (envFiles.length) throw new Error('Isolated verification requires a checkout without .env files.')
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
  !/SUPABASE|STRIPE|UBER|DELIVERY|ORDERING|DEMO_MODE|PLAYWRIGHT_BASE_URL/.test(name)))
env.DO_NOT_TRACK = '1'
env.NEXT_TELEMETRY_DISABLED = '1'
env.CI = 'true'

const diagnosticSecrets = new Set(Object.entries(process.env)
  .filter(([name, value]) => /KEY|TOKEN|SECRET|PASSWORD|DATABASE_URL/i.test(name) && value?.length >= 8)
  .map(([, value]) => value))

function sanitizeDiagnostic(value) {
  let output = stripVTControlCharacters(String(value ?? ''))
  for (const secret of diagnosticSecrets) output = output.split(secret).join('[REDACTED]')
  return output
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g, '[REDACTED PRIVATE KEY]')
    .replace(/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED JWT]')
    .replace(/\bsb_(?:publishable|secret)_[A-Za-z0-9_-]+\b|\bsbp_[A-Za-z0-9]+\b/g, '[REDACTED KEY]')
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, '$1 [REDACTED]')
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+@/gi, '$1[REDACTED]@')
    .replace(/((?:[A-Za-z0-9_ -]*(?:anon[ _-]?key|service[ _-]?role(?:[ _-]?key)?|api[ _-]?key|access[ _-]?key(?:[ _-]?id)?|secret(?:[ _-]?key)?|jwt[ _-]?secret|password|token|authorization))["']?\s*[:=|]\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,}\r\n]+)/gi, '$1[REDACTED]')
}

function reportFailure(command, args, result) {
  const outcome = `exit=${result.status ?? 'none'} signal=${result.signal ?? 'none'} error=${result.error?.code ?? 'none'}`
  console.error(`[local-infra] ${command} ${args.join(' ')} failed (${outcome}).`)
  // Redact before bounding output, so truncation cannot turn a credential into
  // an unrecognizable fragment. Prefix lines to prevent workflow commands.
  const diagnostic = sanitizeDiagnostic([result.stdout, result.stderr, result.error?.message]
    .filter(Boolean).join('\n'))
  const limit = 24_000
  if (diagnostic.length > limit) console.error('[local-infra] Earlier diagnostic output omitted.')
  for (const line of diagnostic.slice(-limit).split(/\r?\n/)) {
    if (line) console.error(`[local-infra] ${line}`)
  }
}

function run(command, args, capture = false) {
  const result = spawnSync(command, args, {
    env, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit',
    shell: process.platform === 'win32',
    // Docker image pulls can exceed spawnSync's default 1 MiB output buffer.
    maxBuffer: 16 * 1024 * 1024,
  })
  if (result.error || result.status !== 0) {
    reportFailure(command, args, result)
    throw new Error(`${command} ${args[0]} failed; required local infrastructure or fixtures unavailable.`)
  }
  return result.stdout
}

run('supabase', ['start'], true)
run('supabase', ['db', 'reset', '--local', '--yes'], true)
let status
try {
  status = JSON.parse(run('supabase', ['status', '-o', 'json'], true))
} catch {
  // JSON.parse errors can contain part of the input, including local keys.
  throw new Error('Supabase status failed or did not return valid JSON.')
}
for (const [name, value] of Object.entries(status)) {
  if (/KEY|TOKEN|SECRET|PASSWORD|DB_URL/i.test(name) && typeof value === 'string' && value) {
    diagnosticSecrets.add(value)
  }
}
for (const key of ['API_URL', 'DB_URL', 'ANON_KEY', 'SERVICE_ROLE_KEY']) {
  if (!status[key]) throw new Error(`Supabase status is missing ${key}.`)
}
for (const key of ['API_URL', 'DB_URL']) {
  let hostname
  try {
    hostname = new URL(status[key]).hostname
  } catch {
    throw new Error(`Supabase status returned an invalid ${key}.`)
  }
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(hostname)) {
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
  CAFFI_SYNTHETIC_FIXTURES: '1',
  CAFFI_PAYMENT_MODE: 'test',
  CAFFI_DELIVERY_WEBHOOK_SECRET: randomBytes(32).toString('hex'),
  CAFFI_DELIVERY_WORKER_SECRET: randomBytes(32).toString('hex'),
  CAFFI_SYNTHETIC_VENUE_ID: '13000000-0000-4000-8000-000000000001',
  CAFFI_LOCAL_FIXTURE_PASSWORD: randomBytes(24).toString('base64url'),
})
// Mask ephemeral local keys as defense in depth; no hosted/provider keys enter the job.
if (process.env.GITHUB_ACTIONS === 'true') {
  for (const secret of diagnosticSecrets) {
    const escaped = secret.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
    console.log(`::add-mask::${escaped}`)
  }
  console.log(`::add-mask::${env.CAFFI_LOCAL_FIXTURE_PASSWORD}`)
  console.log(`::add-mask::${env.CAFFI_DELIVERY_WORKER_SECRET}`)
}
run('node', ['scripts/test-local-db.mjs'])
run('node', ['scripts/ci-local-auth-fixtures.mjs'])
// Playwright exits nonzero if no tests exist. Never use --pass-with-no-tests.
run('npm', ['run', 'test:browser', '--', '--workers=1'])
console.log('Disposable local SQL/RLS and browser checks passed. No provider sandbox or live evidence.')
