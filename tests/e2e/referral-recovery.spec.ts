import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'

const north = '13000000-0000-4000-8000-000000000001'
const south = '13000000-0000-4000-8000-000000000003'

test('first-visit referral retries after worker interruption without duplicate credit', async ({ page }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const secret = process.env.CRON_SECRET
  if (!url || !key || !secret || !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname)
      || process.env.CAFFI_SYNTHETIC_FIXTURES !== '1' || process.env.VERCEL)
    throw new Error('Referral recovery test requires disposable loopback fixtures')
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const referrer = randomUUID()
  const referred = randomUUID()
  const foreign = randomUUID()
  const program = randomUUID()
  const members = await admin.from('members').insert([
    { member_id: referrer, tenant_id: north, full_name: 'Synthetic referral source' },
    { member_id: referred, tenant_id: north, full_name: 'Synthetic referred guest',
      referred_by_member_id: referrer },
    { member_id: foreign, tenant_id: south, full_name: 'Synthetic foreign referred guest',
      referred_by_member_id: referrer },
  ])
  expect(members.error).toBeNull()
  const configured = await admin.from('loyalty_programs').insert({
    program_id: program, venue_id: north, type: 'referral',
    name: 'Synthetic referral recovery ' + program.slice(0, 8),
    status: 'active', config: { referral_points: 7 },
  })
  expect(configured.error).toBeNull()
  const visits = await admin.from('visits').insert([
    { visit_id: randomUUID(), venue_id: north, member_id: referred, source: 'manual' },
    { visit_id: randomUUID(), venue_id: south, member_id: foreign, source: 'manual' },
  ])
  expect(visits.error).toBeNull()
  const foreignWork = await admin.from('growth_referral_outbox')
    .select('referred_member_id').eq('referred_member_id', foreign)
  expect(foreignWork.error).toBeNull()
  expect(foreignWork.data).toHaveLength(0)
  const work = await admin.from('growth_referral_outbox')
    .select('program_id,program_config,done').eq('referred_member_id', referred).single()
  expect(work.error).toBeNull()
  expect(work.data?.program_id).toBe(program)
  expect(work.data?.program_config).toEqual({ referral_points: 7 })
  expect(work.data?.done).toBe(false)

  const interrupted = await admin.rpc('claim_referral_followup')
  expect(interrupted.error).toBeNull()
  expect(interrupted.data?.referred_member_id).toBe(referred)
  const expired = await admin.from('growth_referral_outbox')
    .update({ lease_until: new Date(Date.now() - 1000).toISOString() })
    .eq('referred_member_id', referred)
  expect(expired.error).toBeNull()
  const endpoint = '/api/cron/loyalty-daily'
  for (let run = 0; run < 2; run++) {
    const response = await page.request.get(endpoint, {
      headers: { authorization: `Bearer ${secret}` },
    })
    expect(response.status()).toBe(200)
  }
  const ledger = await admin.from('points_ledger').select('points_change')
    .eq('tenant_id', north).eq('member_id', referrer)
    .eq('referred_member_id', referred).eq('reason', 'referral')
  expect(ledger.error).toBeNull()
  expect(ledger.data).toEqual([{ points_change: 7 }])
  const finished = await admin.from('growth_referral_outbox')
    .select('done,attempts').eq('referred_member_id', referred).single()
  expect(finished.error).toBeNull()
  expect(finished.data?.done).toBe(true)
  expect(finished.data?.attempts).toBe(2)
})
