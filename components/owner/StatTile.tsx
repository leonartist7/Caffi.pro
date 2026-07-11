interface StatTileProps {
  label: string
  value: number
  previous: number | null
  /** true = down is good (e.g. at-risk count) */
  invert?: boolean
}

/**
 * One comparison tile. Guards the "previous = 0" case explicitly — a naive
 * percent-change calc would show "+Infinity%", which reads as broken.
 */
export function StatTile({ label, value, previous, invert = false }: StatTileProps) {
  let trend: string | null = null
  let trendGood = true

  if (previous === null) {
    trend = 'first week!'
  } else if (previous === 0) {
    trend = value > 0 ? 'new this week' : null
  } else {
    const delta = value - previous
    if (delta !== 0) {
      const pct = Math.round((Math.abs(delta) / previous) * 100)
      const arrow = delta > 0 ? '↑' : '↓'
      trend = `${arrow} ${pct}%`
      const rose = delta > 0
      trendGood = invert ? !rose : rose
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-aro-hairline px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-aro-muted mb-1">{label}</p>
      <p className="font-display text-3xl font-bold text-aro-ink">{value}</p>
      {trend && (
        <p className={`text-xs mt-1 ${trendGood ? 'text-aro-sage' : 'text-aro-rose'}`}>{trend}</p>
      )}
    </div>
  )
}
