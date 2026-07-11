'use client'

import { useState } from 'react'

export interface AiDraft {
  draft_id: string
  kind: string
  output: string | null
}

/**
 * Approvals inbox: reads ai_drafts where status='draft' (passed in from the
 * server component). Empty until a later AI-drafting phase writes rows —
 * the empty state is deliberately warm, not a blank box.
 */
export function ApprovalsInbox({ initialDrafts }: { initialDrafts: AiDraft[] }) {
  const [drafts, setDrafts] = useState(initialDrafts)
  const [busy, setBusy] = useState<string | null>(null)

  async function act(id: string, status: 'approved' | 'skipped') {
    setBusy(id)
    try {
      const res = await fetch(`/api/ai-drafts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) setDrafts(d => d.filter(x => x.draft_id !== id))
    } finally {
      setBusy(null)
    }
  }

  if (drafts.length === 0) {
    return (
      <div className="rounded-2xl bg-aro-cream-warm border border-dashed border-aro-hairline px-6 py-8 text-center">
        <p className="text-sm text-aro-ink-soft">aro&apos;s suggestions will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {drafts.map(d => (
        <div key={d.draft_id} className="rounded-xl bg-white border border-aro-hairline p-4">
          <p className="text-xs uppercase tracking-wide text-aro-muted mb-1">{d.kind}</p>
          <p className="text-sm text-aro-ink mb-3">{d.output}</p>
          <div className="flex gap-2">
            <button
              onClick={() => act(d.draft_id, 'approved')}
              disabled={busy === d.draft_id}
              className="rounded-lg bg-aro-terra text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => act(d.draft_id, 'skipped')}
              disabled={busy === d.draft_id}
              className="rounded-lg border border-aro-hairline text-aro-ink-soft text-xs font-medium px-3 py-1.5 disabled:opacity-50"
            >
              Skip
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
