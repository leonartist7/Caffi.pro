'use client'

import { useState } from 'react'

export interface Draft {
  draft_id: string
  kind: string
  output: string | null
  status: string
  created_at: string
}

const STRINGS = {
  approve: 'Use this',
  skip: 'Not this one',
  edit: 'Edit',
  save: 'Save changes',
  cancel: 'Cancel',
  copy: 'Copy',
  copied: 'Copied',
  approved: 'Ready to post',
  failed: "That didn't save — try again.",
  editLabel: 'Edit this draft',
}

const KIND_LABELS: Record<string, string> = {
  social_caption: 'Caption',
  digest: 'Weekly summary',
  site_copy: 'Site copy',
  winback: 'Win-back',
  slowday: 'Slow day',
}

/**
 * One draft, three post-approval fates (strategic doc §3.3). A caption that
 * has been approved does not disappear the way it does in ApprovalsInbox —
 * approval for a caption means "this is good, copy it out", so the card stays
 * and grows a copy button. Skipping is what removes it.
 */
export function DraftCard({
  draft,
  onResolved,
}: {
  draft: Draft
  onResolved: (draftId: string, next: Draft | null) => void
}) {
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(draft.output ?? '')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const settled = draft.status === 'approved' || draft.status === 'edited'

  async function patch(status: 'approved' | 'edited' | 'skipped', output?: string) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/ai-drafts/${draft.draft_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(output === undefined ? { status } : { status, output }),
      })
      if (!res.ok) {
        setError(STRINGS.failed)
        return
      }
      if (status === 'skipped') {
        onResolved(draft.draft_id, null)
        return
      }
      onResolved(draft.draft_id, {
        ...draft,
        status,
        output: output ?? draft.output,
      })
      setEditing(false)
    } catch {
      setError(STRINGS.failed)
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    const value = draft.output ?? ''
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked by permissions or an insecure origin. Say
      // nothing rather than throwing — the text is visible and selectable.
      setError('Copy it manually — your browser blocked the clipboard.')
    }
  }

  return (
    <article className="flex flex-col rounded-2xl border border-aro-hairline bg-white p-5 transition hover:border-aro-clay">
      <header className="mb-3 flex items-center justify-between gap-3">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-aro-muted">
          {KIND_LABELS[draft.kind] ?? draft.kind}
        </span>
        {settled && (
          <span className="rounded-full bg-aro-sage/30 px-2.5 py-0.5 text-xs font-medium text-aro-ink">
            {STRINGS.approved}
          </span>
        )}
      </header>

      {editing ? (
        <label className="block">
          <span className="sr-only">{STRINGS.editLabel}</span>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={5}
            className="w-full resize-y rounded-xl border border-aro-hairline bg-aro-cream-warm p-3 text-[0.95rem] leading-relaxed text-aro-ink outline-none focus:border-aro-terra"
          />
        </label>
      ) : (
        <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-aro-ink">
          {draft.output}
        </p>
      )}

      {error && <p className="mt-3 text-xs text-aro-rose">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2 pt-1">
        {editing ? (
          <>
            <button
              onClick={() => patch('edited', text.trim())}
              disabled={busy || !text.trim()}
              className="rounded-lg bg-aro-terra px-3.5 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {STRINGS.save}
            </button>
            <button
              onClick={() => {
                setEditing(false)
                setText(draft.output ?? '')
              }}
              disabled={busy}
              className="rounded-lg border border-aro-hairline px-3.5 py-2 text-xs font-medium text-aro-ink-soft transition hover:bg-aro-sand/50 disabled:opacity-50"
            >
              {STRINGS.cancel}
            </button>
          </>
        ) : settled ? (
          <button
            onClick={copy}
            className="rounded-lg bg-aro-terra px-3.5 py-2 text-xs font-medium text-white transition hover:opacity-90"
          >
            {copied ? STRINGS.copied : STRINGS.copy}
          </button>
        ) : (
          <>
            <button
              onClick={() => patch('approved')}
              disabled={busy}
              className="rounded-lg bg-aro-terra px-3.5 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {STRINGS.approve}
            </button>
            <button
              onClick={() => patch('skipped')}
              disabled={busy}
              className="rounded-lg border border-aro-hairline px-3.5 py-2 text-xs font-medium text-aro-ink-soft transition hover:bg-aro-sand/50 disabled:opacity-50"
            >
              {STRINGS.skip}
            </button>
            <button
              onClick={() => setEditing(true)}
              disabled={busy}
              className="rounded-lg px-3.5 py-2 text-xs font-medium text-aro-muted transition hover:text-aro-ink disabled:opacity-50"
            >
              {STRINGS.edit}
            </button>
          </>
        )}
      </div>
    </article>
  )
}
