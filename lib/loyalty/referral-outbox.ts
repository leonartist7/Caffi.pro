import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { issueMemberOffer } from './issue'
import { emitEvent } from '@/lib/events'

type ReferralWork = {
  referred_member_id: string
  referrer_member_id: string
  venue_id: string
  program_id: string
  program_config: { referral_points?: unknown; referral_value_cents?: unknown }
  staff_membership_id: string | null
  lease_token: string
}

async function awardReferral(admin: SupabaseClient, work: ReferralWork): Promise<void> {
  const config = work.program_config ?? {}
  const valueCents = config.referral_value_cents
  if (typeof valueCents === 'number') {
    const result = await issueMemberOffer(admin, {
      venueId: work.venue_id,
      memberId: work.referrer_member_id,
      programId: work.program_id,
      valueCents,
      periodKey: `referral:${work.referred_member_id}`,
    })
    if (!result.issued && result.reason === 'error') throw new Error('REFERRAL_OFFER_FAILED')
    if (result.issued) {
      void emitEvent({
        type: 'referral.rewarded',
        actor: work.staff_membership_id ? `membership:${work.staff_membership_id}` : 'system:referral',
        venueId: work.venue_id,
        payload: { referrer_member_id: work.referrer_member_id,
          referred_member_id: work.referred_member_id, offer_id: result.offer.offerId },
      })
    }
    return
  }
  const configuredPoints = config.referral_points
  const points = typeof configuredPoints === 'number' && configuredPoints > 0
    ? configuredPoints : 5
  const { error } = await admin.from('points_ledger').insert({
    tenant_id: work.venue_id,
    member_id: work.referrer_member_id,
    points_change: points,
    reason: 'referral',
    description: 'Referral reward — a friend you brought visited for the first time',
    staff_membership_id: work.staff_membership_id,
    referred_member_id: work.referred_member_id,
  })
  if (error && error.code !== '23505') throw new Error('REFERRAL_POINTS_FAILED')
  if (!error) {
    void emitEvent({
      type: 'referral.rewarded',
      actor: work.staff_membership_id ? `membership:${work.staff_membership_id}` : 'system:referral',
      venueId: work.venue_id,
      payload: { referrer_member_id: work.referrer_member_id,
        referred_member_id: work.referred_member_id, points },
    })
  }
}

/** One fenced, retryable first-visit award. The ledger/offer key deduplicates
 * an interruption after the award but before the outbox is marked done. */
export async function processReferralFollowup(admin: SupabaseClient): Promise<boolean> {
  const claimed = await admin.rpc('claim_referral_followup')
  if (claimed.error) throw new Error('REFERRAL_OUTBOX_CLAIM_FAILED')
  if (!claimed.data) return false
  const work = claimed.data as ReferralWork
  let success = false
  try {
    await awardReferral(admin, work)
    success = true
  } catch {
    // The durable work remains retryable; never log guest or reward details.
  }
  const finished = await admin.rpc('finish_referral_followup', {
    p_referred_member_id: work.referred_member_id,
    p_lease_token: work.lease_token,
    p_success: success,
    p_safe_error: success ? null : 'REFERRAL_AWARD_FAILED',
  })
  if (finished.error) throw new Error('REFERRAL_OUTBOX_FINISH_FAILED')
  return true
}
