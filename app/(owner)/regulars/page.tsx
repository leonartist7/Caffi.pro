import { createClient } from '@/utils/supabase/server'
import { resolveOwnerVenueId } from '@/lib/owner-stats'
import { RegularsList } from './regulars-list'

export const dynamic = 'force-dynamic'

export default async function RegularsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const venueId = await resolveOwnerVenueId(user.id)
  if (!venueId) return null

  return <RegularsList venueId={venueId} />
}
