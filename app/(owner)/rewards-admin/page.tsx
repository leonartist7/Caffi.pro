import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { resolveEffectiveOwnerVenueId } from '@/lib/impersonation'
import { RewardsAdminClient } from './rewards-admin-client'

/**
 * Owner-facing rewards catalog management — real CRUD against the same
 * `rewards` table and `/api/rewards` routes the HQ dashboard's `/rewards`
 * page already uses, just scoped to the signed-in owner's own venue instead
 * of an admin-selected tenant.
 */
export const dynamic = 'force-dynamic'

export default async function RewardsAdminPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const venueId = await resolveEffectiveOwnerVenueId(user.id)
  if (!venueId) redirect('/counter')

  return <RewardsAdminClient venueId={venueId} />
}
