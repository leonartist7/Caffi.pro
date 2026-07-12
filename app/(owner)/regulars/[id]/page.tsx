import { createClient } from '@/utils/supabase/server'
import { getMemberProfile, resolveOwnerVenueId } from '@/lib/owner-stats'
import { StatusChip } from '@/components/owner/StatusChip'

export const dynamic = 'force-dynamic'

/** Pure SVG visit-dots timeline over the last 90 days — no chart library. */
function VisitDots({ visits }: { visits: { ts: string }[] }) {
  const days = 90
  const now = Date.now()
  const dayMs = 86400_000
  const visitDays = new Set(visits.map(v => Math.floor((now - new Date(v.ts).getTime()) / dayMs)))
  const cell = 8
  const gap = 2
  const cols = 15
  const rows = Math.ceil(days / cols)
  const width = cols * (cell + gap)
  const height = rows * (cell + gap)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label="Visit history, last 90 days"
    >
      {Array.from({ length: days }).map((_, i) => {
        const daysAgo = days - 1 - i
        const col = i % cols
        const row = Math.floor(i / cols)
        const visited = visitDays.has(daysAgo)
        return (
          <rect
            key={i}
            x={col * (cell + gap)}
            y={row * (cell + gap)}
            width={cell}
            height={cell}
            rx={2}
            fill={visited ? '#D67A45' : '#ECE0C6'}
          />
        )
      })}
    </svg>
  )
}

export default async function MemberProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const venueId = await resolveOwnerVenueId(user.id)
  if (!venueId) return null

  const profile = await getMemberProfile(venueId, params.id)
  if (!profile) {
    return (
      <div className="p-8">
        <p className="text-aro-muted">Member not found.</p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="font-display text-3xl font-bold text-aro-ink">
          {profile.fullName ?? 'Member'}
        </h1>
        <StatusChip status={profile.status} />
      </div>
      <p className="text-aro-ink-soft mb-6">{profile.whySentence}</p>

      <div className="flex gap-6 mb-8">
        <div>
          <p className="font-display text-2xl font-bold text-aro-terra">{profile.balance}</p>
          <p className="text-xs text-aro-muted">points</p>
        </div>
        <div>
          <p className="font-display text-2xl font-bold text-aro-ink">{profile.visitCount}</p>
          <p className="text-xs text-aro-muted">visits</p>
        </div>
      </div>

      <h2 className="font-display text-sm font-bold text-aro-ink mb-2 uppercase tracking-wide">
        Last 90 days
      </h2>
      <div className="mb-8">
        <VisitDots visits={profile.visits} />
      </div>

      <h2 className="font-display text-sm font-bold text-aro-ink mb-2 uppercase tracking-wide">
        Points history
      </h2>
      {profile.ledger.length === 0 ? (
        <p className="text-sm text-aro-muted mb-8">No ledger entries yet.</p>
      ) : (
        <div className="space-y-1 mb-8">
          {profile.ledger.map((l, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-sm border-b border-aro-hairline py-1.5"
            >
              <span className="text-aro-ink-soft capitalize">{l.reason.replace('_', ' ')}</span>
              <span
                className={`font-mono ${l.pointsChange >= 0 ? 'text-aro-sage' : 'text-aro-rose'}`}
              >
                {l.pointsChange >= 0 ? '+' : ''}
                {l.pointsChange}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        disabled
        title="campaigns arrive in the next phase"
        className="rounded-xl border border-aro-hairline text-aro-muted text-sm font-medium px-4 py-2.5 cursor-not-allowed"
      >
        Send a nudge
      </button>
    </div>
  )
}
