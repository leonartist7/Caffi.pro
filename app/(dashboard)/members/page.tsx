'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useTenant } from '@/contexts/TenantContext'
import { SkeletonList } from '@/components/SkeletonLoader'

type Status = 'new' | 'regular' | 'fading' | 'lost'
interface MemberRow {
  memberId: string
  fullName: string | null
  status: Status
  visitCount: number
  daysSinceLast: number | null
  balance: number
}
const FILTERS = ['all', 'new', 'regular', 'fading', 'lost'] as const
const statusClass: Record<Status, string> = {
  new: 'bg-blue-100 text-blue-700',
  regular: 'bg-green-100 text-green-700',
  fading: 'bg-amber-100 text-amber-700',
  lost: 'bg-red-100 text-red-700',
}

export default function MembersPage() {
  const router = useRouter()
  const { selectedTenant } = useTenant()
  const [members, setMembers] = useState<MemberRow[]>([])
  const [status, setStatus] = useState<(typeof FILTERS)[number]>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedTenant) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      const query = new URLSearchParams({ venue_id: selectedTenant.tenant_id })
      if (status !== 'all') query.set('status', status)
      if (search.trim()) query.set('search', search.trim())
      try {
        const response = await fetch(`/api/members?${query}`, { signal: controller.signal })
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body.error || 'Failed to load members')
        setMembers(body.members ?? [])
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
  }, [selectedTenant, search, status])

  if (!selectedTenant)
    return (
      <div className="py-16 text-center">
        <Users className="mx-auto mb-3 h-12 w-12 text-gray-400" />
        <h2 className="text-xl font-bold">No client selected</h2>
        <p className="text-gray-600">Select a client to view its members.</p>
      </div>
    )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Members</h1>
        <p className="mt-1 text-gray-600">
          Loyalty relationships for {selectedTenant.business_name}
        </p>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search members"
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:border-coffee-500 focus:ring-2 focus:ring-coffee-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(filter => (
            <button
              key={filter}
              onClick={() => setStatus(filter)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize ${status === filter ? 'bg-coffee-700 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <SkeletonList items={6} />
      ) : members.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 py-16 text-center text-gray-500">
          Your circle starts with the first scan.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {members.map(member => (
            <button
              key={member.memberId}
              onClick={() => router.push(`/members/${member.memberId}`)}
              className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-coffee-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-coffee-100 font-bold text-coffee-700">
                    {(member.fullName ?? 'M').charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <h2 className="font-bold text-gray-900">{member.fullName ?? 'Member'}</h2>
                    <p className="text-sm text-gray-500">{member.visitCount} visits</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass[member.status]}`}
                >
                  {member.status}
                </span>
              </div>
              <div className="mt-4 flex items-end justify-between border-t border-gray-100 pt-3">
                <span className="font-mono font-semibold text-coffee-700">
                  {member.balance} pts
                </span>
                <span className="text-xs text-gray-500">
                  last seen{' '}
                  {member.daysSinceLast == null ? '—' : `${Math.round(member.daysSinceLast)}d ago`}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
