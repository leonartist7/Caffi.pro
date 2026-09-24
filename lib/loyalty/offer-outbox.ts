import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { issueBounceBackOffersForOrder } from './bounce-back-issue'

type OfferWork = { order_id: string; venue_id: string; lease_token: string }

/** One leased paid-order follow-up. Retry is safe through period-key dedup. */
export async function processPaidOfferFollowup(admin: SupabaseClient): Promise<boolean> {
  const claimed = await admin.rpc('claim_paid_offer_followup')
  if (claimed.error) throw new Error('OFFER_OUTBOX_CLAIM_FAILED')
  if (!claimed.data) return false
  const work = claimed.data as OfferWork
  let success = false
  try {
    await issueBounceBackOffersForOrder(admin, work.venue_id, work.order_id)
    success = true
  } catch {
    // Keep work durable and retry after the lease; never log guest details.
  }
  const finished = await admin.rpc('finish_paid_offer_followup', {
    p_order_id: work.order_id,
    p_lease_token: work.lease_token,
    p_success: success,
    p_safe_error: success ? null : 'ISSUANCE_FAILED',
  })
  if (finished.error) throw new Error('OFFER_OUTBOX_FINISH_FAILED')
  return true
}
