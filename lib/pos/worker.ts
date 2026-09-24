import 'server-only'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { PosOrderInput, PosOutcome } from './contracts'

export function posSimulationEnabled(venueId: string): boolean {
  let local = false
  try {
    local = ['localhost', '127.0.0.1', '[::1]'].includes(
      new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname
    )
  } catch { /* fail closed */ }
  return !process.env.VERCEL && process.env.NODE_ENV !== 'production' && local
    && process.env.CAFFI_POS_MODE === 'simulation'
    && process.env.CAFFI_SYNTHETIC_FIXTURES === '1'
    && venueId === '13000000-0000-4000-8000-000000000001'
    && venueId === process.env.CAFFI_SYNTHETIC_VENUE_ID
}

type Work = {
  outbox_id: string
  lease_token: string
  action: 'create' | 'lookup'
  submission_id: string
  operation_key: string
  connection_id: string
  venue_id: string
  provider: string
  environment: string
  order_id: string
  currency: string
  total_minor: number
  lines: PosOrderInput['lines']
}

async function simulatorEffect(work: Work): Promise<PosOutcome> {
  if (work.provider !== 'simulator' || work.environment !== 'simulation'
      || !posSimulationEnabled(work.venue_id)) throw new Error('POS_PROVIDER_NOT_CONFIGURED')
  const { data, error } = await getSupabaseAdmin().rpc('pos_simulator_effect', {
    p_connection_id: work.connection_id,
    p_operation_key: work.operation_key,
    p_action: work.action,
  })
  if (error || !data || !['acknowledged','rejected','unknown','absent'].includes(data.kind))
    throw new Error('POS_PROVIDER_RESULT_UNAVAILABLE')
  return data as PosOutcome
}

/** One leased effect per call; a resumed lease always looks up first. */
export async function processPosWork() {
  if (!posSimulationEnabled(process.env.CAFFI_SYNTHETIC_VENUE_ID ?? ''))
    throw new Error('POS_SIMULATION_DISABLED')
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.rpc('pos_claim_work')
  if (error) throw new Error('POS_CLAIM_FAILED')
  if (!data) return { processed: 0 }
  const work = data as Work
  let result: PosOutcome
  try {
    result = await simulatorEffect(work)
  } catch {
    // An exception may follow a successful external effect; lookup is required.
    result = { kind: 'unknown', code: 'PROVIDER_OUTCOME_UNKNOWN' }
  }
  const finished = await admin.rpc('pos_finish_work', {
    p_outbox_id: work.outbox_id,
    p_lease_token: work.lease_token,
    p_result: result,
  })
  if (finished.error) throw new Error('POS_FINISH_FAILED')
  return { processed: 1, submission_id: work.submission_id, outcome: result.kind }
}
