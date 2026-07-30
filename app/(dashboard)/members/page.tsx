'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useTenant } from '@/contexts/TenantContext'
import { SkeletonList } from '@/components/SkeletonLoader'

type Status = 'new' | 'regular' | 'fading' | 'lost'
type SortKey = 'recency_desc' | 'recency_asc' | 'name_asc'
interface MemberRow {
  memberId: string
  fullName: string | null
  status: Status
  visitCount: number
  daysSinceLast: number | null
  balance: number
}
const FILTERS = ['all', 'new', 'regular', 'fading', 'lost'] as const
const SORTS: { value: SortKey; label: string }[] = [
  { value: 'recency_desc', label: 'Most overdue first' },
  { value: 'recency_asc', label: 'Recently active first' },
  { value: 'name_asc', label: 'Name A–Z' },
]
const PAGE_SIZE = 24
const statusClass: Record<Status, string> = {
  new: 'bg-aro-sand text-aro-ink',
  regular: 'bg-aro-sage/30 text-aro-ink',
  fading: 'bg-aro-saffron/30 text-aro-ink',
  lost: 'bg-aro-muted/20 text-aro-muted',
}

export default function MembersPage() {
  const router = useRouter()
  const { selectedTenant } = useTenant()
  const [members, setMembers] = useState<MemberRow[]>([])
  const [status, setStatus] = useState<(typeof FILTERS)[number]>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('recency_desc')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [matchedCount, setMatchedCount] = useState(0)
  const [statusCounts, setStatusCounts] = useState<Record<Status, number>>({
    new: 0,
    regular: 0,
    fading: 0,
    lost: 0,
  })
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)

  // Reset to page 1 whenever the filter/search/sort criteria change.
  useEffect(() => {
    setPage(1)
  }, [status, search, sort])

  useEffect(() => {
    if (!selectedTenant) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      const query = new URLSearchParams({
        venue_id: selectedTenant.tenant_id,
        sort,
        page: String(page),
        page_size: String(PAGE_SIZE),
      })
      if (status !== 'all') query.set('status', status)
      if (search.trim()) query.set('search', search.trim())
      try {
        const response = await fetch(`/api/members?${query}`, { signal: controller.signal })
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body.error || 'Failed to load members')
        setMembers(body.members ?? [])
        setTotal(body.total ?? 0)
        setMatchedCount(body.matchedCount ?? 0)
        setStatusCounts(body.statusCounts ?? { new: 0, regular: 0, fading: 0, lost: 0 })
        setHasMore(Boolean(body.hasMore))
      } catch (error) {
        if (!controller.signal.aborted)
          toast.error(error instanceof Error ? error.message : 'Failed to load members')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [selectedTenant, search, status, sort, page])

  if (!selectedTenant)
    return (
      <div className="py-16 text-center">
        <Users className="mx-auto mb-3 h-12 w-12 text-aro-muted" />
        <h2 className="font-display text-xl font-bold text-aro-ink">No client selected</h2>
        <p className="text-aro-ink-soft">Select a client to view its members.</p>
      </div>
    )

  const filterCount = (f: (typeof FILTERS)[number]) =>
    f === 'all' ? total : statusCounts[f as Status]
  const pageCount = Math.max(1, Math.ceil(matchedCount / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-aro-ink">Members</h1>
        <p className="mt-1 text-aro-ink-soft">
          {total} member{total === 1 ? '' : 's'} · {statusCounts.fading} fading —{' '}
          {selectedTenant.business_name}
        </p>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-aro-muted" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search name, phone, or email"
            className="w-full rounded-lg border border-aro-hairline bg-white py-2 pl-10 pr-3 text-aro-ink focus:border-aro-terra focus:outline-none focus:ring-2 focus:ring-aro-terra/40"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(filter => (
              <button
                key={filter}
                onClick={() => setStatus(filter)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize ${
                  status === filter
                    ? 'bg-aro-terra text-white'
                    : 'border border-aro-hairline bg-white text-aro-ink-soft'
                }`}
              >
                {filter} · {filterCount(filter)}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={event => setSort(event.target.value as SortKey)}
            className="rounded-lg border border-aro-hairline bg-white px-3 py-1.5 text-sm text-aro-ink-soft focus:border-aro-terra focus:outline-none"
          >
            {SORTS.map(s => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {loading ? (
        <SkeletonList items={6} />
      ) : members.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-aro-hairline py-16 text-center text-aro-muted">
          {search.trim() || status !== 'all'
            ? 'No members match — try a different search or filter.'
            : 'Your circle starts with the first scan.'}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {members.map(member => (
              <button
                key={member.memberId}
                onClick={() => router.push(`/members/${member.memberId}`)}
                className="rounded-xl border border-aro-hairline bg-white p-4 text-left shadow-sm transition hover:border-aro-terra hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-aro-sand font-bold text-aro-ink">
                      {(member.fullName ?? 'M').charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <h2 className="font-bold text-aro-ink">{member.fullName ?? 'Member'}</h2>
                      <p className="text-sm text-aro-muted">{member.visitCount} visits</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass[member.status]}`}
                  >
                    {member.status}
                  </span>
                </div>
                <div className="mt-4 flex items-end justify-between border-t border-aro-hairline pt-3">
                  <span className="font-mono font-semibold text-aro-terra">
                    {member.balance} pts
                  </span>
                  <span className="text-xs text-aro-muted">
                    last seen{' '}
                    {member.daysSinceLast == null
                      ? '—'
                      : `${Math.round(member.daysSinceLast)}d ago`}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <div className="flex flex-col items-center justify-between gap-3 border-t border-aro-hairline pt-4 sm:flex-row">
            <p className="text-sm text-aro-muted">
              Page {page} of {pageCount} · {matchedCount} match
              {matchedCount === 1 ? '' : 'es'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-aro-hairline bg-white px-3 py-1.5 text-sm text-aro-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!hasMore}
                className="inline-flex items-center gap-1 rounded-lg border border-aro-hairline bg-white px-3 py-1.5 text-sm text-aro-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
