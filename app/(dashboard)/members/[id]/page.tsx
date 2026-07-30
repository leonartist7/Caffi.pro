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
  new: 'bg-aro-sand text-aro-ink',
  regular: 'bg-aro-sage/30 text-aro-ink',
  fading: 'bg-aro-saffron/30 text-aro-ink',
  lost: 'bg-aro-muted/20 text-aro-muted',
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
  if (!member) return <div className="py-12 text-center text-aro-muted">Member not found.</div>
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/members"
        className="inline-flex items-center gap-2 text-sm text-aro-ink-soft hover:text-aro-terra"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to members
      </Link>
      <div className="flex flex-col gap-4 rounded-xl border border-aro-hairline bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold text-aro-ink">
              {member.fullName ?? 'Member'}
            </h1>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass[member.status]}`}
            >
              {member.status}
            </span>
          </div>
          <p className="mt-2 text-aro-ink-soft">{member.whySentence}</p>
        </div>
        <button
          onClick={() => setAdjusting(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-aro-terra px-4 py-2 text-white hover:bg-aro-terracotta"
        >
          <Plus className="h-4 w-4" />
          Adjust points
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-aro-hairline bg-white p-5">
          <p className="font-mono text-3xl font-bold text-aro-terra">{member.balance}</p>
          <p className="text-sm text-aro-muted">current points</p>
        </div>
        <div className="rounded-xl border border-aro-hairline bg-white p-5">
          <p className="font-mono text-3xl font-bold text-aro-ink">{member.visitCount}</p>
          <p className="text-sm text-aro-muted">lifetime visits</p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-aro-hairline bg-white p-5">
          <h2 className="mb-3 font-display font-bold text-aro-ink">Recent visits</h2>
          {member.visits.length === 0 ? (
            <p className="text-sm text-aro-muted">No visits recorded yet.</p>
          ) : (
            member.visits.slice(0, 20).map(visit => (
              <div
                key={`${visit.ts}-${visit.source}`}
                className="flex justify-between border-b border-aro-hairline py-2 text-sm"
              >
                <span className="text-aro-ink-soft">{new Date(visit.ts).toLocaleDateString()}</span>
                <span className="capitalize text-aro-muted">{visit.source}</span>
              </div>
            ))
          )}
        </section>
        <section className="rounded-xl border border-aro-hairline bg-white p-5">
          <h2 className="mb-3 font-display font-bold text-aro-ink">Points history</h2>
          {member.ledger.length === 0 ? (
            <p className="text-sm text-aro-muted">No ledger entries yet.</p>
          ) : (
            member.ledger.map(entry => (
              <div
                key={`${entry.createdAt}-${entry.pointsChange}`}
                className="flex justify-between border-b border-aro-hairline py-2 text-sm"
              >
                <div>
                  <p className="capitalize text-aro-ink-soft">
                    {entry.reason.replaceAll('_', ' ')}
                  </p>
                  {entry.description && (
                    <p className="text-xs text-aro-muted">{entry.description}</p>
                  )}
                </div>
                <span
                  className={`font-mono font-semibold ${entry.pointsChange >= 0 ? 'text-aro-sage' : 'text-aro-rose'}`}
                >
                  {entry.pointsChange > 0 ? '+' : ''}
                  {entry.pointsChange}
                </span>
              </div>
            ))
          )}
        </section>
      </div>
      {adjusting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-aro-ink/50 p-4">
          <form
            onSubmit={submitAdjustment}
            className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6"
          >
            <h2 className="font-display text-xl font-bold text-aro-ink">Adjust points</h2>
            <input
              required
              type="number"
              min="-10000"
              max="10000"
              step="1"
              value={delta}
              onChange={event => setDelta(event.target.value)}
              placeholder="Signed amount, e.g. 50 or -25"
              className="w-full rounded-lg border border-aro-hairline px-3 py-2 text-aro-ink focus:border-aro-terra focus:outline-none"
            />
            <textarea
              value={note}
              maxLength={200}
              onChange={event => setNote(event.target.value)}
              placeholder="Optional note"
              className="w-full rounded-lg border border-aro-hairline px-3 py-2 text-aro-ink focus:border-aro-terra focus:outline-none"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAdjusting(false)}
                className="rounded-lg border border-aro-hairline px-4 py-2 text-aro-ink-soft"
              >
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-aro-terra px-4 py-2 text-white">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
