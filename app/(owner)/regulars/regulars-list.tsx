'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { StatusChip } from '@/components/owner/StatusChip'
import type { RegularRow } from '@/lib/owner-stats'

const STATUS_FILTERS = ['all', 'new', 'regular', 'fading', 'lost'] as const
const PAGE_SIZE = 24

export function RegularsList({ venueId }: { venueId: string }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('all')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<RegularRow[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      const query = new URLSearchParams({
        venue_id: venueId,
        sort: 'recency_desc',
        page: String(page),
        page_size: String(PAGE_SIZE),
      })
      if (statusFilter !== 'all') query.set('status', statusFilter)
      if (search.trim()) query.set('search', search.trim())
      try {
        const response = await fetch(`/api/members?${query}`, { signal: controller.signal })
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body.error || 'Failed to load regulars')
        setRows(body.members ?? [])
        setTotal(body.total ?? 0)
        setHasMore(Boolean(body.hasMore))
      } catch {
        // Owner-facing surface: fail quiet, keep last-known list rather than
        // a jarring error toast on a page checked constantly during service.
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [venueId, search, statusFilter, page])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-aro-ink mb-1">Regulars</h1>
      <p className="text-sm text-aro-muted mb-4">{total} members</p>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, or email…"
          className="flex-1 rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white"
        />
        <div className="flex gap-1 flex-wrap">
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

      {loading ? (
        <p className="text-sm text-aro-muted py-8 text-center">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-aro-muted py-8 text-center">
          {search.trim() || statusFilter !== 'all'
            ? 'No members match.'
            : 'Your circle starts with the first scan.'}
        </p>
      ) : (
        <>
          <div className="space-y-1.5">
            {rows.map(r => (
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
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-aro-hairline">
            <p className="text-xs text-aro-muted">
              Page {page} of {pageCount}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-aro-hairline bg-white px-3 py-1.5 text-xs text-aro-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!hasMore}
                className="inline-flex items-center gap-1 rounded-lg border border-aro-hairline bg-white px-3 py-1.5 text-xs text-aro-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
