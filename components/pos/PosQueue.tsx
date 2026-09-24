'use client'
import { useCallback, useEffect, useState } from 'react'

type Connection = {
  id: string; provider: string; environment: string; enabled: boolean;
  health: string; menu_version: string | null; last_sync_at: string | null
}
type Submission = {
  id: string; order_id: string; state: string; external_ref: string | null;
  safe_error: string | null; created_at: string
}
type Queue = { connections: Connection[]; submissions: Submission[] }

export function PosQueue({ venueId }: { venueId: string }) {
  const [queue,setQueue] = useState<Queue | null>(null)
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const [busy,setBusy] = useState('')
  const [reasons,setReasons] = useState<Record<string,string>>({})
  const load = useCallback(async () => {
    setError('')
    try {
      const response = await fetch('/api/pos?' + new URLSearchParams({ venue_id: venueId }), { cache:'no-store' })
      if (!response.ok) throw new Error('POS queue could not be loaded.')
      setQueue(await response.json() as Queue)
    } catch {
      setError('POS queue could not be loaded. Try again.')
    }
  },[venueId])
  useEffect(() => { void load() },[load])
  async function reconcile(id: string) {
    setBusy(id); setError(''); setNotice('')
    try {
      const response = await fetch('/api/pos/submissions/' + id + '/reconcile', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({ reason: reasons[id]?.trim() }),
      })
      if (!response.ok) throw new Error('Recovery request was not accepted.')
      const outcome = await response.json() as { action: 'lookup' | 'create' }
      setNotice(outcome.action === 'create'
        ? 'Never-sent POS order queued with its original operation key.'
        : 'POS lookup queued with its original operation key.')
      await load()
    } catch {
      setError('Recovery request was not accepted. Check access and connection health.')
    } finally { setBusy('') }
  }
  return (
    <section className="space-y-6">
      <button type="button" onClick={() => void load()} className="min-h-[44px] rounded-xl border px-4">Refresh POS queue</button>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!queue && !error && <p role="status">Loading POS queue…</p>}
      {queue && <>
        <section aria-labelledby="pos-connections" className="space-y-2">
          <h2 id="pos-connections" className="text-xl font-semibold">Connections</h2>
          {queue.connections.length === 0 && <p>No POS connection is configured.</p>}
          <ul className="space-y-2">
            {queue.connections.map(c => <li key={c.id} className="rounded-xl border p-3">
              <strong>{c.provider}</strong> · {c.environment} · {c.enabled ? c.health : 'disconnected'}
              <span className="block text-sm">Menu version: {c.menu_version ?? 'not imported'}</span>
            </li>)}
          </ul>
        </section>
        <section aria-labelledby="pos-submissions" className="space-y-2">
          <h2 id="pos-submissions" className="text-xl font-semibold">Order submissions</h2>
          {queue.submissions.length === 0 && <p>No POS submissions yet.</p>}
          <ul className="space-y-3">
            {queue.submissions.map(s => <li key={s.id} className="rounded-xl border p-3">
              <p><strong>Order {s.order_id.slice(0,8)}</strong> · {s.state}</p>
              {s.safe_error && <p role="status">Exception: {s.safe_error}</p>}
              {s.external_ref && <p>POS reference: {s.external_ref}</p>}
              {['unknown','attention','rejected'].includes(s.state) && <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <label className="flex-1">Reason for recovery
                  <input className="mt-1 min-h-[44px] w-full rounded-lg border px-3" maxLength={120}
                    value={reasons[s.id] ?? ''} onChange={e => setReasons(v => ({...v,[s.id]:e.target.value}))} />
                </label>
                <button type="button" disabled={!reasons[s.id]?.trim() || busy===s.id}
                  onClick={() => void reconcile(s.id)}
                  className="min-h-[44px] rounded-xl border px-4 disabled:opacity-40">
                  {busy===s.id ? 'Queuing…' : 'Recover POS order'}
                </button>
              </div>}
            </li>)}
          </ul>
        </section>
      </>}
    </section>
  )
}
