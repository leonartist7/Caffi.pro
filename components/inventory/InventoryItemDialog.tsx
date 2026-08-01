'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { INVENTORY_UNITS, type InventoryItem, type InventoryUnit } from '@/lib/inventory/types'
import { dollarsToCents } from '@/lib/money'

export interface InventoryItemDraft {
  name: string
  unit: InventoryUnit
  cost_per_unit_cents: number | null
  par_level: number | null
  is_active: boolean
}

interface InventoryItemDialogProps {
  open: boolean
  item: InventoryItem | null
  saving: boolean
  onClose: () => void
  onSave: (draft: InventoryItemDraft) => Promise<void>
}

export function InventoryItemDialog({
  open,
  item,
  saving,
  onClose,
  onSave,
}: InventoryItemDialogProps) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<InventoryUnit>('each')
  const [costDollars, setCostDollars] = useState('')
  const [parLevel, setParLevel] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setName(item?.name ?? '')
    setUnit(item?.unit ?? 'each')
    setCostDollars(
      item?.cost_per_unit_cents != null ? (item.cost_per_unit_cents / 100).toFixed(2) : ''
    )
    setParLevel(item?.par_level != null ? String(item.par_level) : '')
    setIsActive(item?.is_active ?? true)
    setError('')
  }, [item, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-aro-espresso/70 px-4 py-8 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-item-dialog-title"
        className="mx-auto w-full max-w-lg overflow-hidden rounded-[28px] border border-white/40 bg-aro-cream-warm shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-aro-hairline px-6 py-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aro-muted">
              Inventory
            </p>
            <h2
              id="inventory-item-dialog-title"
              className="mt-1 font-display text-2xl text-aro-espresso"
            >
              {item ? 'Edit item' : 'New item'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close item dialog"
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
            let costCents: number | null = null
            try {
              costCents = costDollars.trim() ? dollarsToCents(costDollars) : null
            } catch {
              setError('Cost must be a valid amount, e.g. 2.50')
              return
            }
            const par = parLevel.trim() ? Number(parLevel) : null
            if (par !== null && (!Number.isFinite(par) || par < 0)) {
              setError('Par level must be a non-negative number')
              return
            }
            await onSave({
              name: name.trim(),
              unit,
              cost_per_unit_cents: costCents,
              par_level: par,
              is_active: isActive,
            })
          }}
        >
          {error ? (
            <div className="rounded-2xl border border-aro-rose/40 bg-aro-rose/15 p-3 text-sm text-aro-ink">
              {error}
            </div>
          ) : null}
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-aro-ink">Item name</span>
            <input
              required
              autoFocus
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="Whole milk, espresso beans..."
              className="min-h-[44px] w-full rounded-2xl border border-aro-hairline bg-white/70 px-4 py-3 text-aro-ink outline-none focus:border-aro-terra focus:ring-2 focus:ring-aro-terra/20"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-aro-ink">Unit</span>
              <select
                value={unit}
                onChange={event => setUnit(event.target.value as InventoryUnit)}
                className="min-h-[44px] w-full rounded-2xl border border-aro-hairline bg-white/70 px-4 py-3 text-aro-ink outline-none focus:border-aro-terra"
              >
                {INVENTORY_UNITS.map(value => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-aro-ink">Cost per unit</span>
              <input
                inputMode="decimal"
                value={costDollars}
                onChange={event => setCostDollars(event.target.value)}
                placeholder="Optional"
                className="min-h-[44px] w-full rounded-2xl border border-aro-hairline bg-white/70 px-4 py-3 font-mono text-aro-ink outline-none focus:border-aro-terra"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-aro-ink">Par level</span>
            <input
              inputMode="decimal"
              value={parLevel}
              onChange={event => setParLevel(event.target.value)}
              placeholder="Optional — flagged low when on-hand drops below this"
              className="min-h-[44px] w-full rounded-2xl border border-aro-hairline bg-white/70 px-4 py-3 font-mono text-aro-ink outline-none focus:border-aro-terra"
            />
          </label>

          <label className="flex min-h-[44px] items-center justify-between rounded-2xl border border-aro-hairline bg-white/70 px-4 py-3">
            <span>
              <span className="block text-sm font-semibold text-aro-ink">Active</span>
              <span className="text-xs text-aro-muted">Tracked in stock counts and reports</span>
            </span>
            <input
              type="checkbox"
              checked={isActive}
              onChange={event => setIsActive(event.target.checked)}
              className="h-5 w-5 accent-aro-terra"
            />
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
              disabled={saving || !name.trim()}
              className="min-h-[44px] rounded-full bg-aro-terra px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-aro-terra/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : item ? 'Save item' : 'Create item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
