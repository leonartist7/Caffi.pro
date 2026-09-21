import { spawnSync } from 'node:child_process'

const lookup = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', ['supabase'], {
  encoding: 'utf8',
})
if (lookup.status !== 0) {
  console.error('Blocked: Supabase CLI is not installed. Install it and start the local Docker stack; never point this command at a hosted project.')
  process.exit(1)
}

const result = spawnSync('supabase', ['db', 'reset', '--local'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)
