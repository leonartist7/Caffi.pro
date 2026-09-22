import { createClient } from '@supabase/supabase-js'
import { spawnSync } from 'node:child_process'

const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const dbUrl = process.env.SUPABASE_TEST_DATABASE_URL
const password = process.env.CAFFI_LOCAL_FIXTURE_PASSWORD
if (!apiUrl || !dbUrl || !password || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Local Auth fixture setup requires the isolated runner environment.')
}
for (const value of [apiUrl, dbUrl]) {
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(value).hostname)) {
    throw new Error('Refusing to prepare Auth fixtures outside loopback.')
  }
}
// The SQL seed intentionally creates identities without login credentials. Repair only
// the six fixed synthetic rows; passwords are set through the local Auth admin API.
const ids = Array.from({ length: 6 }, (_, index) => `11000000-0000-4000-8000-00000000000${index + 1}`)
const repair = spawnSync('psql', ['-v', 'ON_ERROR_STOP=1', dbUrl], {
  encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
  input: `UPDATE auth.users SET instance_id = '00000000-0000-0000-0000-000000000000',
    aud = 'authenticated', role = 'authenticated', confirmation_token = '',
    recovery_token = '', email_change_token_new = '', email_change = '',
    email_change_token_current = '', reauthentication_token = '',
    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
    raw_user_meta_data = '{}'::jsonb, created_at = coalesce(created_at, now()), updated_at = now()
    WHERE id IN (${ids.map(id => `'${id}'`).join(',')}) AND email LIKE '%@test.local';`,
})
if (repair.error || repair.status !== 0) throw new Error('Local Auth fixture normalization failed.')
const admin = createClient(apiUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
for (const id of ids) {
  const { data: before, error: lookupError } = await admin.auth.admin.getUserById(id)
  if (lookupError || !before.user?.email?.endsWith('@test.local')) throw new Error(`Missing synthetic Auth fixture ${id}.`)
  const { error } = await admin.auth.admin.updateUserById(id, { password, email_confirm: true })
  if (error) throw new Error(`Could not prepare synthetic Auth fixture ${id}.`)
  const auth = createClient(apiUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error: loginError } = await auth.auth.signInWithPassword({ email: before.user.email, password })
  if (loginError || data.user?.id !== id) throw new Error(`Synthetic Auth fixture ${id} cannot sign in.`)
  await auth.auth.signOut()
}
console.log('Six synthetic local Auth identities can sign in; membership authorization is tested separately.')
