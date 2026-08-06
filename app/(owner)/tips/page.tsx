import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { resolveOwnerVenueId } from '@/lib/owner-stats'
import { getImpersonatedVenueId } from '@/lib/impersonation'
import { TipsReportClient } from '@/components/tips/TipsReportClient'

/**
 * The owner's own path to the tip allocation report — added post-review:
 * the original PLAN-36 page lived only under (dashboard), whose venue
 * selector (`useTenant()`/`/api/clients`) is aro_admin-only, so a real
 * solo venue owner had no way to reach a working report at all (the
 * page rendered "No client selected" and stayed that way, permanently,
 * for anyone who isn't platform staff). This mirrors the (owner) layout's
 * own venueId resolution (impersonation first, then the owner/manager
 * membership) rather than depending on the layout to pass it down, since
 * layouts don't hand props to the pages they wrap.
 */
export const dynamic = 'force-dynamic'

export default async function OwnerTipsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const impersonatedVenueId = await getImpersonatedVenueId(user.id)
  const venueId = impersonatedVenueId ?? (await resolveOwnerVenueId(user.id))
  if (!venueId) redirect('/counter')

  return <TipsReportClient venueId={venueId} />
}
