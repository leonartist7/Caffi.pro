import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { resolveEffectiveOwnerVenueId } from '@/lib/impersonation'
import { LoyaltyClient } from './loyalty-client'

/**
 * PLAN-12 — the offer engine's owner surface: create/activate/pause/
 * archive programs, issue offers to members. Same resolve-venue pattern
 * as /rewards-admin and /tips (impersonation-aware).
 */
export const dynamic = 'force-dynamic'

export default async function LoyaltyPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const venueId = await resolveEffectiveOwnerVenueId(user.id)
  if (!venueId) redirect('/counter')

  return <LoyaltyClient venueId={venueId} />
}
