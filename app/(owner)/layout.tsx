import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { resolveOwnerVenueId } from '@/lib/owner-stats'
import { getImpersonatedVenueId } from '@/lib/impersonation'
import { OwnerShell } from './owner-shell'

/**
 * (owner) route group — server-gated like (dashboard), plus a role check:
 * owner/manager only, OR an aro_admin actively impersonating a venue
 * (PLAN-09). Staff who wander here (e.g. bookmark) get sent to /counter,
 * not a 403 wall — the wrong door, not a locked one.
 *
 * Uses getSession() (cookie-local, no network) rather than getUser() —
 * middleware.ts already did the authoritative getUser() check + cookie
 * refresh for this request. This is a UX gate only; data access below
 * (resolveOwnerVenueId, and every page under this layout) is authorized
 * independently via the DB, not by this check.
 */
export const dynamic = 'force-dynamic'

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  let userId: string | null = null
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    userId = session?.user?.id ?? null
  } catch (err) {
    console.error('[owner layout] auth check failed:', err)
  }
  if (!userId) redirect('/login')

  // Impersonation checked first: it only ever resolves for a request that
  // carries a cookie set by the requireAroAdmin()-gated route, and every
  // read re-verifies the caller is still aro_admin — a stale/forged/expired
  // cookie returns null and falls straight through to the unchanged
  // owner/manager check below.
  const impersonatedVenueId = await getImpersonatedVenueId(userId)

  let venueId: string | null
  let impersonating: { venueName: string } | null = null

  if (impersonatedVenueId) {
    venueId = impersonatedVenueId
    const admin = getSupabaseAdmin()
    const { data: venue } = await admin
      .from('venues')
      .select('business_name')
      .eq('venue_id', impersonatedVenueId)
      .maybeSingle()
    impersonating = { venueName: venue?.business_name ?? 'this venue' }
  } else {
    // resolveOwnerVenueId only matches owner/manager memberships — staff-only
    // (or aro_admin with no active impersonation) resolves to null here,
    // same as no membership at all.
    venueId = await resolveOwnerVenueId(userId)
  }

  if (!venueId) redirect('/counter')

  return (
    <OwnerShell venueId={venueId} impersonating={impersonating}>
      {children}
    </OwnerShell>
  )
}
