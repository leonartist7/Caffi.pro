import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { resolveOwnerVenueId } from '@/lib/owner-stats'
import { OwnerShell } from './owner-shell'

/**
 * (owner) route group — server-gated like (dashboard), plus a role check:
 * owner/manager only. Staff who wander here (e.g. bookmark) get sent to
 * /counter, not a 403 wall — the wrong door, not a locked one.
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

  // resolveOwnerVenueId only matches owner/manager memberships — staff-only
  // (or aro_admin, who belongs in the HQ (dashboard) group) resolves to
  // null here, same as no membership at all.
  const venueId = await resolveOwnerVenueId(userId)
  if (!venueId) redirect('/counter')

  return <OwnerShell venueId={venueId}>{children}</OwnerShell>
}
