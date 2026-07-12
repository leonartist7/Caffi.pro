'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { SkeletonList } from '@/components/SkeletonLoader'

type Status = 'new' | 'regular' | 'fading' | 'lost'
interface Profile {
  memberId: string
  fullName: string | null
  status: Status
  visitCount: number
  balance: number
  whySentence: string
  visits: { ts: string; source: string }[]
  ledger: { createdAt: string; pointsChange: number; reason: string; description: string | null }[]
}
const statusClass: Record<Status, string> = {
  new: 'bg-blue-100 text-blue-700',
  regular: 'bg-green-100 text-green-700',
  fading: 'bg-amber-100 text-amber-700',
  lost: 'bg-red-100 text-red-700',
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [member, setMember] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [adjusting, setAdjusting] = useState(false)
  const [delta, setDelta] = useState('')
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/members/${id}`)
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Failed to load member')
      setMember(body.member)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load member')
    } finally {
      setLoading(false)
    }
  }, [id])
  useEffect(() => {
    void load()
  }, [load])

  const submitAdjustment = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      const pointsDelta = Number(delta)
      const response = await fetch(`/api/members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points_delta: pointsDelta, note }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(body.error || 'Failed to adjust points')
        return
      }
      toast.success(`Balance updated to ${body.balance} points`)
      setAdjusting(false)
      setDelta('')
      setNote('')
      await load()
    } catch {
      toast.error('Failed to adjust points')
    }
  }

  if (loading) return <SkeletonList items={5} />
  if (!member) return <div className="py-12 text-center text-gray-500">Member not found.</div>
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/members"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-coffee-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to members
      </Link>
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{member.fullName ?? 'Member'}</h1>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass[member.status]}`}
            >
              {member.status}
            </span>
          </div>
          <p className="mt-2 text-gray-600">{member.whySentence}</p>
        </div>
        <button
          onClick={() => setAdjusting(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-coffee-700 px-4 py-2 text-white hover:bg-coffee-800"
        >
          <Plus className="h-4 w-4" />
          Adjust points
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="font-mono text-3xl font-bold text-coffee-700">{member.balance}</p>
          <p className="text-sm text-gray-500">current points</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="font-mono text-3xl font-bold text-gray-900">{member.visitCount}</p>
          <p className="text-sm text-gray-500">lifetime visits</p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 font-bold text-gray-900">Recent visits</h2>
          {member.visits.slice(0, 20).map(visit => (
            <div
              key={`${visit.ts}-${visit.source}`}
              className="flex justify-between border-b border-gray-100 py-2 text-sm"
            >
              <span>{new Date(visit.ts).toLocaleDateString()}</span>
              <span className="capitalize text-gray-500">{visit.source}</span>
            </div>
          ))}
        </section>
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 font-bold text-gray-900">Points history</h2>
          {member.ledger.map(entry => (
            <div
              key={`${entry.createdAt}-${entry.pointsChange}`}
              className="flex justify-between border-b border-gray-100 py-2 text-sm"
            >
              <div>
                <p className="capitalize">{entry.reason.replaceAll('_', ' ')}</p>
                {entry.description && <p className="text-xs text-gray-500">{entry.description}</p>}
              </div>
              <span
                className={`font-mono font-semibold ${entry.pointsChange >= 0 ? 'text-green-700' : 'text-red-700'}`}
              >
                {entry.pointsChange > 0 ? '+' : ''}
                {entry.pointsChange}
              </span>
            </div>
          ))}
        </section>
      </div>
      {adjusting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={submitAdjustment}
            className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6"
          >
            <h2 className="text-xl font-bold">Adjust points</h2>
            <input
              required
              type="number"
              min="-10000"
              max="10000"
              step="1"
              value={delta}
              onChange={event => setDelta(event.target.value)}
              placeholder="Signed amount, e.g. 50 or -25"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
            <textarea
              value={note}
              maxLength={200}
              onChange={event => setNote(event.target.value)}
              placeholder="Optional note"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAdjusting(false)}
                className="rounded-lg border border-gray-300 px-4 py-2"
              >
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-coffee-700 px-4 py-2 text-white">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
