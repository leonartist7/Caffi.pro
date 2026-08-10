import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * PLAN-18 — the compliance boundary. `MASTER-PLAN-v2-operating-system.md`
 * §N1's doctrine, applied to push: **one server-side query**, its `WHERE`
 * enforcing venue scope AND an active, unrevoked subscription. No
 * application-layer filtering layered on top of a broader query — this
 * function IS the eligibility decision, not a convenience wrapper around
 * one.
 *
 * `push_subscriptions.revoked_at` (PLAN-10) already covers both an
 * explicit unsubscribe and an automatic 410/404-triggered revoke — one
 * column, one meaning, checked here and nowhere else. A member with a
 * revoked subscription can never appear in this result; there is no
 * second code path that could disagree with it.
 */
export interface EligiblePushSubscription {
  subscriptionId: string
  memberId: string
  endpoint: string
  p256dh: string
  auth: string
}

export async function getEligiblePushSubscriptions(
  admin: SupabaseClient,
  venueId: string
): Promise<EligiblePushSubscription[]> {
  const { data, error } = await admin
    .from('push_subscriptions')
    .select('subscription_id, member_id, endpoint, p256dh, auth')
    .eq('venue_id', venueId)
    .is('revoked_at', null)

  if (error) {
    throw new Error(`eligibility query failed: ${error.message}`)
  }

  return (data ?? [])
    .filter(
      (row): row is typeof row & { p256dh: string; auth: string } =>
        row.p256dh != null && row.auth != null
    )
    .map(row => ({
      subscriptionId: row.subscription_id,
      memberId: row.member_id,
      endpoint: row.endpoint,
      p256dh: row.p256dh,
      auth: row.auth,
    }))
}
