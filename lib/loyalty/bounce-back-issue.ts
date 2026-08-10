import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { issueMemberOffer } from './issue'
import { parseBounceBackConfig, computeBounceBackWindow } from './bounce-back'
import { emitEvent } from '@/lib/events'

/**
 * PLAN-13 — called once from the Stripe webhook after a payment is
 * newly applied (`record_order_payment_success`'s `applied: true`, never
 * on a webhook replay). Issues at most one bounce-back offer per active
 * bounce_back program for the order's member — zero when the program is
 * paused/draft/archived, proven by the `.eq('status', 'active')` filter
 * below rather than checked in application logic per-program.
 *
 * `period_key = 'bounce_back:' || order_id` scopes the DB-level dedup to
 * this order: a retried webhook calling this twice for the same order
 * hits `duplicate_period` on the second call and issues nothing, on top
 * of (not instead of) `record_order_payment_success`'s own
 * `applied: false` short-circuit for the same replay.
 */
export async function issueBounceBackOffersForOrder(
  admin: SupabaseClient,
  venueId: string,
  orderId: string
): Promise<void> {
  const { data: order } = await admin
    .from('orders')
    .select('member_id')
    .eq('order_id', orderId)
    .eq('venue_id', venueId)
    .maybeSingle()

  // Guest orders have no member/pass to hold an offer — nothing to issue.
  const memberId = (order as { member_id: string | null } | null)?.member_id
  if (!memberId) return

  const { data: programs, error } = await admin
    .from('loyalty_programs')
    .select('program_id, config')
    .eq('venue_id', venueId)
    .eq('type', 'bounce_back')
    .eq('status', 'active')

  if (error) {
    console.error('[bounce-back] program lookup failed:', error.message)
    return
  }
  if (!programs || programs.length === 0) return

  const paidAt = new Date()

  for (const program of programs as { program_id: string; config: Record<string, unknown> }[]) {
    const config = parseBounceBackConfig(program.config)
    const { validFrom, expiresAt } = computeBounceBackWindow(paidAt, config)
    const valueCents =
      typeof program.config?.default_value_cents === 'number'
        ? program.config.default_value_cents
        : null
    const pointsValue =
      typeof program.config?.default_points_value === 'number'
        ? program.config.default_points_value
        : null
    if (valueCents == null && pointsValue == null) {
      // Program configured with no reward value at all — nothing to
      // issue; not an error, the owner just hasn't finished setting it up.
      continue
    }

    const result = await issueMemberOffer(admin, {
      venueId,
      memberId,
      programId: program.program_id,
      valueCents,
      pointsValue,
      validFrom,
      expiresAt,
      periodKey: `bounce_back:${orderId}`,
    })

    if (result.issued) {
      void emitEvent({
        type: 'offer.issued',
        actor: 'system:bounce_back',
        venueId,
        payload: {
          offer_id: result.offer.offerId,
          member_id: memberId,
          program_id: program.program_id,
          order_id: orderId,
        },
      })
    } else if (result.reason === 'error') {
      console.error('[bounce-back] issue failed:', result.message)
    }
    // 'duplicate_period' is expected on a webhook replay — silent no-op.
  }
}
