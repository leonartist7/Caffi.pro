import { createClient } from '@/utils/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getVenueWeekStats, resolveOwnerVenueId } from '@/lib/owner-stats'
import { StatTile } from '@/components/owner/StatTile'
import { ApprovalsInbox, type AiDraft } from '@/components/owner/ApprovalsInbox'

/**
 * Owner home (Plan 4): the one number + three tiles, in 30 seconds. ONE
 * server function call for the stats (venue_week_stats RPC) — not N
 * client-side queries. Empty venue gets a warm onboarding state, never
 * a "0 / 0 / 0" that reads as broken.
 */
export const dynamic = 'force-dynamic'

async function getDraftAiDrafts(venueId: string): Promise<AiDraft[]> {
  const admin = getSupabaseAdmin()
  const { data } = await admin
    .from('ai_drafts')
    .select('draft_id, kind, output')
    .eq('venue_id', venueId)
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(10)
  return data ?? []
}

export default async function OwnerHomePage() {
  // venueId is re-derived here (not passed as a prop) so this page also
  // works if ever rendered outside the (owner) layout's tree; the layout
  // already did the real auth gate before this renders.
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const venueId = await resolveOwnerVenueId(user.id)
  if (!venueId) return null

  const admin = getSupabaseAdmin()
  const { data: venue } = await admin
    .from('venues')
    .select('business_name, slug, timezone')
    .eq('venue_id', venueId)
    .single()
  const timezone = venue?.timezone ?? 'America/Edmonton'

  // ONE RPC round trip for every number on this page.
  const [stats, drafts] = await Promise.all([
    getVenueWeekStats(venueId, timezone),
    getDraftAiDrafts(venueId),
  ])

  if (!stats.hasAnyData) {
    return (
      <div className="p-8 max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-wide text-aro-muted mb-2">
          {venue?.business_name ?? 'Your café'}
        </p>
        <h1 className="font-display text-3xl font-bold text-aro-ink mb-3">
          Your circle starts with the first scan
        </h1>
        <p className="text-aro-ink-soft mb-6">
          Print your join QR and put it on the counter — the moment someone scans it, this page
          comes alive.
        </p>
        {venue?.slug && (
          <a
            href={`/join/${venue.slug}`}
            className="inline-block rounded-xl bg-aro-terra text-white font-medium px-5 py-3"
          >
            View your join page
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <p className="font-mono text-xs uppercase tracking-wide text-aro-muted mb-2">
        {venue?.business_name ?? 'Your café'}
      </p>
      <h1 className="font-display text-2xl font-bold text-aro-ink mb-1">
        Regulars returned this week
      </h1>
      <p className="font-display text-6xl font-bold text-aro-terra mb-8">
        {stats.regularsReturned}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
        <StatTile label="Members" value={stats.membersThisWeek} previous={stats.membersLastWeek} />
        <StatTile label="Visits" value={stats.visitsThisWeek} previous={stats.visitsLastWeek} />
        <StatTile label="At-risk" value={stats.fadingNow} previous={stats.fading7dAgo} invert />
      </div>

      <h2 className="font-display text-lg font-bold text-aro-ink mb-3">Approvals</h2>
      <ApprovalsInbox initialDrafts={drafts ?? []} />
    </div>
  )
}
