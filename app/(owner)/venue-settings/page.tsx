import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { resolveEffectiveOwnerVenueId } from '@/lib/impersonation'
import { VenueSettingsClient } from './venue-settings-client'

/**
 * The owner's own Settings page — lives at `/venue-settings`, not
 * `/settings` (PLAN-30: that path already belongs to the HQ dashboard
 * shell's `page.tsx`; a second page at the same URL in a different route
 * group is a build-time collision, not just a style clash). Minimal, real
 * fields only: identity is read-only, tip prompt + review URL are the two
 * settings that already have a venue-scoped, owner-writable API today.
 */
export const dynamic = 'force-dynamic'

export default async function VenueSettingsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const venueId = await resolveEffectiveOwnerVenueId(user.id)
  if (!venueId) redirect('/counter')

  const admin = getSupabaseAdmin()
  const { data: venue } = await admin
    .from('venues')
    .select('business_name, timezone')
    .eq('venue_id', venueId)
    .maybeSingle()

  return (
    <VenueSettingsClient
      venueId={venueId}
      businessName={venue?.business_name ?? '—'}
      timezone={venue?.timezone ?? '—'}
    />
  )
}
