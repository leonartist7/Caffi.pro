import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { issueMemberOffer } from './issue'
import { emitEvent } from '@/lib/events'

const DEFAULT_REFERRAL_POINTS = 5

/**
 * PLAN-15 — referral reward on a referred member's first visit only.
 * Called from `app/api/counter/visit/route.ts` exactly when that route's
 * own idempotent insert reports both `wasNew` and a post-insert count of
 * 1 — "first visit" is defined there, once, not re-derived here.
 *
 * No credit fires unless the venue has an **active** `referral` program —
 * consistent with every other Lane A program type since PLAN-12: nothing
 * in this library fires without configuration on the engine. v2 §N5's
 * original text (`loyalty_config.referral_points`) predates that engine;
 * this reads `loyalty_programs.config` instead, the same table every
 * later program type reads from.
 *
 * Reward shape mirrors PLAN-13's own delta on v2 §N5: a `points_value` in
 * config credits `points_ledger` directly (once-only via
 * `uq_points_ledger_referral_award`, a structural partial unique index —
 * not an application check); a `value_cents` config instead issues a
 * PLAN-12 offer to the referrer, once-only via the SAME `period_key`
 * mechanism PLAN-13 already proved (`referral:<referredMemberId>`,
 * scoped by `program_id, member_id`). Two DB-level guarantees, not two
 * designs — same "the credit lands once, proven by replay, in the
 * database" doctrine v2 §7 requires for this exact code path.
 */
export async function creditReferralOnFirstVisit(
  admin: SupabaseClient,
  venueId: string,
  referredMemberId: string,
  staffMembershipId: string
): Promise<void> {
  const { data: referred } = await admin
    .from('members')
    .select('referred_by_member_id')
    .eq('member_id', referredMemberId)
    .eq('tenant_id', venueId)
    .maybeSingle()

  const referrerId = referred?.referred_by_member_id
  if (!referrerId) return

  const { data: program } = await admin
    .from('loyalty_programs')
    .select('program_id, config')
    .eq('venue_id', venueId)
    .eq('type', 'referral')
    .eq('status', 'active')
    .maybeSingle()
  if (!program) return

  const config = (program.config ?? {}) as {
    referral_points?: number
    referral_value_cents?: number
  }
  const valueCents =
    typeof config.referral_value_cents === 'number' ? config.referral_value_cents : null

  if (valueCents != null) {
    const result = await issueMemberOffer(admin, {
      venueId,
      memberId: referrerId,
      programId: program.program_id,
      valueCents,
      periodKey: `referral:${referredMemberId}`,
    })
    if (result.issued) {
      void emitEvent({
        type: 'referral.rewarded',
        actor: `membership:${staffMembershipId}`,
        venueId,
        payload: {
          referrer_member_id: referrerId,
          referred_member_id: referredMemberId,
          offer_id: result.offer.offerId,
        },
      })
    } else if (result.reason === 'error') {
      console.error('[referral-credit] offer issue failed:', result.message)
    }
    return
  }

  const points =
    typeof config.referral_points === 'number' && config.referral_points > 0
      ? config.referral_points
      : DEFAULT_REFERRAL_POINTS

  const { error } = await admin.from('points_ledger').insert({
    tenant_id: venueId,
    member_id: referrerId,
    points_change: points,
    reason: 'referral',
    description: 'Referral reward — a friend you brought visited for the first time',
    staff_membership_id: staffMembershipId,
    referred_member_id: referredMemberId,
  })

  if (!error) {
    void emitEvent({
      type: 'referral.rewarded',
      actor: `membership:${staffMembershipId}`,
      venueId,
      payload: { referrer_member_id: referrerId, referred_member_id: referredMemberId, points },
    })
  } else if (error.code !== '23505') {
    // 23505 on uq_points_ledger_referral_award = already credited
    // (a replayed visit insert, or two near-simultaneous first-visit
    // calls) — the same "treat the unique-violation as idempotent
    // success" pattern /api/counter/visit itself already uses.
    console.error('[referral-credit] points insert failed:', error.message)
  }
}
