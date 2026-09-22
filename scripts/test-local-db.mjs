import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const databaseUrl = process.env.SUPABASE_TEST_DATABASE_URL
if (!databaseUrl) {
  console.error('Blocked: SUPABASE_TEST_DATABASE_URL must name a local disposable database (for example postgresql://postgres:postgres@127.0.0.1:54322/postgres).')
  process.exit(1)
}

const host = new URL(databaseUrl).hostname
if (!['127.0.0.1', '::1', 'localhost'].includes(host)) {
  console.error(`Refusing to run SQL tests against non-local host ${host}.`)
  process.exit(1)
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const suites = [
  'rls_tests.sql',
  'ordering_core_tests.sql',
  'reservations_core_tests.sql',
  'depletion_tests.sql',
  'food_costing_tests.sql',
  'eighty_six_tests.sql',
  'spec02_connected_journey_tests.sql',
  'spec03_delivery_tests.sql',
]

const failures = []
for (const suite of suites) {
  const file = path.join(root, 'supabase', 'tests', suite)
  if (!existsSync(file)) {
    console.error(`FAIL: Missing required SQL suite: ${file}`)
    failures.push(suite)
    continue
  }
  console.log(`Running required SQL suite: ${suite}`)
  // Each suite has its own connection and rollback transaction. ON_ERROR_STOP
  // terminates a failed session, rolling its writes back before the next suite.
  const result = spawnSync('psql', ['-v', 'ON_ERROR_STOP=1', databaseUrl, '-f', file], { stdio: 'inherit' })
  if (result.error?.code === 'ENOENT') {
    console.error('Blocked: psql is not installed. Install PostgreSQL client tools for the local fixture check.')
    process.exit(1)
  }
  if (result.error || result.status !== 0) {
    console.error(`FAIL: ${suite}${result.error ? ` (${result.error.message})` : ''}`)
    failures.push(suite)
  }
}
if (failures.length) {
  console.error(`Required SQL verification failed in ${failures.length}/${suites.length} suites: ${failures.join(', ')}`)
  process.exit(1)
}
console.log(`All ${suites.length} required SQL suites passed.`)
