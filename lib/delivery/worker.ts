import 'server-only'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getDeliveryProvider, simulationEnabled } from './provider'
import type { DeliveryResult, DeliveryWork } from './contracts'

/** Run explicitly or from an authenticated scheduler; never background an HTTP promise. */
export async function processDeliveryWork(limit = 10) {
  if (!simulationEnabled(process.env.CAFFI_SYNTHETIC_VENUE_ID)) throw new Error('NOT_CONFIGURED')
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.rpc('delivery_claim_work', {
    p_limit: Math.max(1, Math.min(20, limit)),
  })
  if (error) throw new Error('WORKER_STORAGE_UNAVAILABLE')
  const outcomes: Array<{ id: string; outcome: string }> = []
  for (const work of (data ?? []) as DeliveryWork[]) {
    let result: DeliveryResult
    try {
      const provider = getDeliveryProvider(work.connection)
      result =
        work.outbox.action === 'create'
          ? await provider.create(work, work.job.operation_key)
          : work.outbox.action === 'cancel'
            ? await provider.cancel(work)
            : await provider.lookup(work)
    } catch {
      // Throwing after a possible send never proves that the effect did not occur.
      result = { kind: 'unknown', code: 'PROVIDER_OUTCOME_UNKNOWN' }
    }
    const finished = await admin.rpc('delivery_finish_work', {
      p_outbox_id: work.outbox.id,
      p_lease_token: work.lease_token,
      p_result: result,
    })
    if (finished.error) throw new Error('WORKER_COMPLETION_UNAVAILABLE')
    outcomes.push({ id: work.outbox.id, outcome: result.kind })
  }
  return { processed: outcomes.length, outcomes }
}
