'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { InventoryItemWithStock } from '@/lib/inventory/types'

export type ManualMovementReason = 'receive' | 'waste' | 'adjust' | 'count'

const STRINGS: Record<ManualMovementReason, { title: string; label: string; helper: string }> = {
  receive: {
    title: 'Receive stock',
    label: 'Amount received',
    helper: 'Added to on-hand.',
  },
  waste: {
    title: 'Record waste',
    label: 'Amount wasted',
    helper: 'Subtracted from on-hand.',
  },
  adjust: {
    title: 'Manual adjustment',
    label: 'Adjustment amount',
    helper: 'Positive adds, negative subtracts.',
  },
  count: {
    title: 'Physical count',
    label: 'Counted total on hand',
    helper: 'The actual amount you counted — not a change, the real total.',
  },
}

interface MovementDialogProps {
  open: boolean
  item: InventoryItemWithStock | null
  reason: ManualMovementReason
  saving: boolean
  onClose: () => void
  onSave: (amount: number) => Promise<void>
}

export function MovementDialog({
  open,
  item,
  reason,
  saving,
  onClose,
  onSave,
}: MovementDialogProps) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setAmount(reason === 'count' ? String(item?.on_hand ?? 0) : '')
    setError('')
  }, [open, reason, item])

  if (!open || !item) return null
  const copy = STRINGS[reason]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-aro-espresso/70 px-4 py-8 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="movement-dialog-title"
        className="mx-auto w-full max-w-md overflow-hidden rounded-[28px] border border-white/40 bg-aro-cream-warm shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-aro-hairline px-6 py-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aro-muted">
              {item.name}
            </p>
            <h2 id="movement-dialog-title" className="mt-1 font-display text-2xl text-aro-espresso">
              {copy.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close movement dialog"
            className="rounded-full border border-aro-hairline p-2 text-aro-muted transition hover:bg-aro-sand"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          className="space-y-5 p-6"
          onSubmit={async event => {
            event.preventDefault()
            setError('')
            const parsed = Number(amount)
            if (!Number.isFinite(parsed)) {
              setError('Enter a valid amount')
              return
            }
            if (reason !== 'adjust' && parsed < 0) {
              setError('Amount cannot be negative')
              return
            }
            await onSave(parsed)
          }}
        >
          <p className="rounded-2xl bg-aro-sand/60 px-4 py-3 text-sm text-aro-ink">
            Current on hand: <span className="font-mono font-bold">{item.on_hand}</span> {item.unit}
          </p>
          {error ? (
            <div className="rounded-2xl border border-aro-rose/40 bg-aro-rose/15 p-3 text-sm text-aro-ink">
              {error}
            </div>
          ) : null}
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-aro-ink">
              {copy.label} ({item.unit})
            </span>
            <input
              inputMode="decimal"
              autoFocus
              required
              value={amount}
              onChange={event => setAmount(event.target.value)}
              className="min-h-[44px] w-full rounded-2xl border border-aro-hairline bg-white/70 px-4 py-3 font-mono text-lg text-aro-ink outline-none focus:border-aro-terra focus:ring-2 focus:ring-aro-terra/20"
            />
            <span className="mt-2 block text-xs text-aro-muted">{copy.helper}</span>
          </label>

          <div className="flex justify-end gap-3 border-t border-aro-hairline pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="min-h-[44px] rounded-full border border-aro-hairline px-5 py-2.5 text-sm font-semibold text-aro-ink transition hover:bg-aro-sand"
            >
              Cancel
            </button>
            <button
              disabled={saving || !amount.trim()}
              className="min-h-[44px] rounded-full bg-aro-terra px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-aro-terra/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
