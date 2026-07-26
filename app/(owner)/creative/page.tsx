import { createClient } from '@/utils/supabase/server'
import { getVenueAiContext } from '@/lib/ai/context'
import { resolveOwnerVenueId } from '@/lib/owner-stats'
import { findCurrentWeekDigest, listStudioDrafts } from '@/lib/ai/drafts'
import { CreativeStudio } from '@/components/owner/CreativeStudio'

/**
 * Creative Studio — the (owner) surface resolved by MASTER-PLAN-v2 §R4 D-3.
 * Server-side it does the two reads the client would otherwise have to wait
 * for: pending drafts, and whether this venue-local week already has a
 * digest. If it does, the client renders it without spending a generation
 * call; if it does not, the client asks for one on mount.
 */
export const dynamic = 'force-dynamic'

export default async function CreativePage() {
  // venueId is re-derived rather than passed down, matching /home — the
  // (owner) layout already did the real auth gate before this renders.
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const venueId = await resolveOwnerVenueId(user.id)
  if (!venueId) return null

  const context = await getVenueAiContext(venueId)
  if (!context) return null

  const [drafts, digest] = await Promise.all([
    listStudioDrafts(venueId),
    findCurrentWeekDigest(venueId, context.timezone),
  ])

  return <CreativeStudio venueId={venueId} initialDrafts={drafts} initialDigest={digest} />
}
