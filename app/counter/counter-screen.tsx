'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  enqueueVisit,
  peekQueue,
  replayQueue,
  isStorageDegraded,
  type QueuedVisit,
} from './offline-queue'

interface SearchResult {
  id: string
  first_name: string
  points: number
  masked_contact: string | null
}

interface Reward {
  reward_id: string
  name: string
  points_required: number
}

type Phase = 'search' | 'panel' | 'redeem-list' | 'success'

/**
 * The two-tap counter screen (Plan 3). One screen, no nav: search → member
 * panel → +Visit or Redeem → success flash → back to empty search.
 */
export function CounterScreen({ onSessionExpired }: { onSessionExpired: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [phase, setPhase] = useState<Phase>('search')
  const [rewards, setRewards] = useState<Reward[]>([])
  const [busy, setBusy] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [insufficientMsg, setInsufficientMsg] = useState<string | null>(null)
  const [queueCount, setQueueCount] = useState(0)
  const [online, setOnline] = useState(true)
  const [storageWarning, setStorageWarning] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Rewards: fetch once per session, small + rarely changes.
  useEffect(() => {
    fetch('/api/counter/rewards')
      .then(r => (r.ok ? r.json() : { rewards: [] }))
      .then(d => setRewards(d.rewards ?? []))
      .catch(() => setRewards([]))
  }, [])

  useEffect(() => {
    setQueueCount(peekQueue().length)
    setOnline(navigator.onLine)

    const goOnline = () => {
      setOnline(true)
      void doReplay()
    }
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    const interval = setInterval(() => {
      if (navigator.onLine) void doReplay()
    }, 30_000)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- doReplay is stable enough for this interval
  }, [])

  const doReplay = useCallback(async () => {
    await replayQueue(remaining => setQueueCount(remaining))
    setQueueCount(peekQueue().length)
    setStorageWarning(isStorageDegraded())
  }, [])

  const focusSearch = useCallback(() => {
    setPhase('search')
    setSelected(null)
    setQuery('')
    setResults([])
    setInsufficientMsg(null)
    setTimeout(() => searchInputRef.current?.focus(), 50)
  }, [])

  async function runSearch(q: string) {
    setQuery(q)
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    const res = await fetch(`/api/counter/search?q=${encodeURIComponent(q.trim())}`)
    if (res.status === 401) return onSessionExpired()
    if (!res.ok) return
    const data = await res.json()
    setResults(data.results ?? [])
  }

  function pickMember(m: SearchResult) {
    setSelected(m)
    setPhase('panel')
  }

  async function recordVisit() {
    if (!selected || busy) return
    setBusy(true)
    const visit_uuid = crypto.randomUUID()
    const ts = new Date().toISOString()

    if (!navigator.onLine) {
      const queued: QueuedVisit = {
        visit_uuid,
        member_id: selected.id,
        member_name: selected.first_name,
        ts,
      }
      const { evicted } = enqueueVisit(queued)
      setQueueCount(peekQueue().length)
      setStorageWarning(isStorageDegraded())
      setSuccessMsg(
        evicted
          ? `${selected.first_name}'s visit queued (oldest queued visit dropped — queue full)`
          : `${selected.first_name}'s visit queued — will sync`
      )
      setPhase('success')
      setBusy(false)
      setTimeout(focusSearch, 1500)
      return
    }

    try {
      const res = await fetch('/api/counter/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: selected.id, visit_uuid, ts }),
      })
      if (res.status === 401) return onSessionExpired()
      if (!res.ok) throw new Error('visit failed')
      setSuccessMsg(`+1 visit for ${selected.first_name}`)
      setPhase('success')
      setTimeout(focusSearch, 1500)
    } catch {
      // Network dropped mid-request — queue it rather than lose it.
      enqueueVisit({ visit_uuid, member_id: selected.id, member_name: selected.first_name, ts })
      setQueueCount(peekQueue().length)
      setSuccessMsg(`${selected.first_name}'s visit queued — will sync`)
      setPhase('success')
      setTimeout(focusSearch, 1500)
    } finally {
      setBusy(false)
    }
  }

  async function redeem(reward: Reward) {
    if (!selected || busy) return
    setBusy(true)
    setInsufficientMsg(null)
    try {
      const res = await fetch('/api/counter/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: selected.id, reward_id: reward.reward_id }),
      })
      if (res.status === 401) return onSessionExpired()
      const data = await res.json()
      if (res.status === 409) {
        setInsufficientMsg(`Not enough points yet — ${data.points_short} more to go`)
        setBusy(false)
        return
      }
      if (!res.ok) throw new Error('redeem failed')
      setSuccessMsg(
        `${reward.name} redeemed for ${selected.first_name} — ${data.new_balance} pts left`
      )
      setPhase('success')
      setTimeout(focusSearch, 1500)
    } catch {
      setInsufficientMsg('Something went wrong — try again')
    } finally {
      setBusy(false)
    }
  }

  const affordableRewards = selected
    ? rewards.filter(r => r.points_required <= selected.points)
    : []

  return (
    <div className="min-h-screen bg-aro-cream flex flex-col p-4">
      {queueCount > 0 && (
        <div className="mb-3 rounded-xl bg-aro-saffron/20 border border-aro-saffron/40 px-4 py-2 text-sm text-aro-ink flex items-center justify-between">
          <span>
            {queueCount} visit{queueCount === 1 ? '' : 's'} waiting — will sync
          </span>
          {online && (
            <button onClick={() => void doReplay()} className="underline text-xs font-medium">
              sync now
            </button>
          )}
        </div>
      )}
      {!online && (
        <div className="mb-3 rounded-xl bg-aro-rose/20 border border-aro-rose/40 px-4 py-2 text-sm text-aro-ink">
          Offline — visits will queue, Redeem needs a connection
        </div>
      )}
      {storageWarning && (
        <div className="mb-3 rounded-xl bg-aro-rose/20 border border-aro-rose/40 px-4 py-2 text-sm text-aro-ink">
          Private browsing detected — queued visits won&apos;t survive a page reload
        </div>
      )}

      {phase === 'search' && (
        <div className="flex-1 flex flex-col">
          <input
            ref={searchInputRef}
            autoFocus
            enterKeyHint="search"
            value={query}
            onChange={e => void runSearch(e.target.value)}
            placeholder="Name or phone…"
            className="w-full rounded-2xl border border-aro-hairline bg-white px-6 py-5 text-2xl text-aro-ink placeholder:text-aro-muted focus:outline-none focus:ring-2 focus:ring-aro-terra"
          />
          <div className="mt-3 space-y-2">
            {results.map(m => (
              <button
                key={m.id}
                onClick={() => pickMember(m)}
                className="w-full text-left rounded-xl bg-white border border-aro-hairline px-5 py-4 min-h-[64px] flex items-center justify-between active:bg-aro-sand/40"
              >
                <span className="font-display text-lg font-bold text-aro-ink">
                  {m.first_name}{' '}
                  {m.masked_contact && (
                    <span className="text-aro-muted font-normal text-sm">{m.masked_contact}</span>
                  )}
                </span>
                <span className="font-mono text-sm text-aro-terra">{m.points} pts</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'panel' && selected && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <h2 className="font-display text-4xl font-bold text-aro-ink mb-1">
            {selected.first_name}
          </h2>
          <p className="font-mono text-lg text-aro-terra mb-8">{selected.points} points</p>
          <div className="w-full max-w-sm space-y-3">
            <button
              onClick={recordVisit}
              disabled={busy}
              className="w-full rounded-2xl bg-aro-terra text-white font-display font-bold text-xl py-5 disabled:opacity-60 active:scale-[0.99]"
            >
              + Visit
            </button>
            <button
              onClick={() => setPhase('redeem-list')}
              disabled={busy || !online}
              className="w-full rounded-2xl bg-aro-saffron text-aro-ink font-display font-bold text-xl py-5 disabled:opacity-60 active:scale-[0.99]"
              title={!online ? 'Redeem needs a connection' : undefined}
            >
              Redeem
            </button>
            {!online && <p className="text-xs text-aro-muted">Redeem needs a connection</p>}
          </div>
          <button onClick={focusSearch} className="mt-8 text-sm text-aro-muted underline">
            back to search
          </button>
        </div>
      )}

      {phase === 'redeem-list' && selected && (
        <div className="flex-1 flex flex-col">
          <h2 className="font-display text-2xl font-bold text-aro-ink mb-1">
            Redeem for {selected.first_name}
          </h2>
          <p className="text-sm text-aro-muted mb-4">{selected.points} points available</p>
          {insufficientMsg && (
            <div className="mb-3 rounded-xl bg-aro-rose/20 border border-aro-rose/40 px-4 py-3 text-sm text-aro-ink">
              {insufficientMsg}
            </div>
          )}
          {affordableRewards.length === 0 ? (
            <p className="text-aro-muted text-sm py-8 text-center">
              No rewards affordable yet at {selected.points} points.
            </p>
          ) : (
            <div className="space-y-2">
              {affordableRewards.map(r => (
                <button
                  key={r.reward_id}
                  onClick={() => void redeem(r)}
                  disabled={busy}
                  className="w-full text-left rounded-xl bg-white border border-aro-hairline px-5 py-4 min-h-[64px] flex items-center justify-between active:bg-aro-sand/40 disabled:opacity-60"
                >
                  <span className="font-medium text-aro-ink">{r.name}</span>
                  <span className="font-mono text-sm text-aro-terra">{r.points_required} pts</span>
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setPhase('panel')}
            className="mt-6 text-sm text-aro-muted underline"
          >
            back
          </button>
        </div>
      )}

      {phase === 'success' && (
        <div className="flex-1 flex items-center justify-center text-center">
          <p className="font-display text-2xl font-bold text-aro-ink">{successMsg}</p>
        </div>
      )}
    </div>
  )
}
