'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusChip } from '@/components/owner/StatusChip'
import type { RegularRow } from '@/lib/owner-stats'

const STATUS_FILTERS = ['all', 'new', 'regular', 'fading', 'lost'] as const

export function RegularsList({ initialRegulars }: { initialRegulars: RegularRow[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('all')

  const filtered = initialRegulars.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (search && !r.fullName?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-aro-ink mb-4">Regulars</h1>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="flex-1 rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white"
        />
        <div className="flex gap-1">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-2 text-xs font-medium capitalize ${
                statusFilter === s
                  ? 'bg-aro-terra text-white'
                  : 'bg-white border border-aro-hairline text-aro-ink-soft'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-aro-muted py-8 text-center">No members match.</p>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(r => (
            <button
              key={r.memberId}
              onClick={() => router.push(`/regulars/${r.memberId}`)}
              className="w-full text-left rounded-xl bg-white border border-aro-hairline px-4 py-3 flex items-center justify-between hover:bg-aro-sand/30"
            >
              <span className="font-medium text-aro-ink">{r.fullName ?? 'Member'}</span>
              <span className="flex items-center gap-3">
                <span className="font-mono text-xs text-aro-terra">{r.balance} pts</span>
                <StatusChip status={r.status} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
