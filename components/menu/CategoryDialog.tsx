'use client'

import { useEffect, useState } from 'react'
import { Clock3, X } from 'lucide-react'
import type { MenuCategory } from '@/lib/menu/types'

export interface CategoryDraft {
  name: string
  display_order: number
  is_active: boolean
  available_from: string | null
  available_until: string | null
}

interface CategoryDialogProps {
  open: boolean
  category: MenuCategory | null
  saving: boolean
  onClose: () => void
  onSave: (draft: CategoryDraft) => Promise<void>
}

function inputTime(value: string | null): string {
  return value?.slice(0, 5) ?? ''
}

export function CategoryDialog({ open, category, saving, onClose, onSave }: CategoryDialogProps) {
  const [name, setName] = useState('')
  const [displayOrder, setDisplayOrder] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [availableFrom, setAvailableFrom] = useState('')
  const [availableUntil, setAvailableUntil] = useState('')

  useEffect(() => {
    if (!open) return
    setName(category?.name ?? '')
    setDisplayOrder(String(category?.display_order ?? 0))
    setIsActive(category?.is_active ?? true)
    setAvailableFrom(inputTime(category?.available_from ?? null))
    setAvailableUntil(inputTime(category?.available_until ?? null))
  }, [category, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-aro-espresso/70 px-4 py-8 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-dialog-title"
        className="mx-auto w-full max-w-lg overflow-hidden rounded-[28px] border border-white/40 bg-aro-cream-warm shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-aro-hairline px-6 py-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aro-muted">
              Menu structure
            </p>
            <h2 id="category-dialog-title" className="mt-1 font-display text-2xl text-aro-espresso">
              {category ? 'Edit category' : 'New category'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close category dialog"
            className="rounded-full border border-aro-hairline p-2 text-aro-muted transition hover:bg-aro-sand"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          className="space-y-5 p-6"
          onSubmit={async event => {
            event.preventDefault()
            await onSave({
              name: name.trim(),
              display_order: Number(displayOrder),
              is_active: isActive,
              available_from: availableFrom || null,
              available_until: availableUntil || null,
            })
          }}
        >
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-aro-ink">Category name</span>
            <input
              required
              autoFocus
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="Coffee, breakfast, pastries..."
              className="w-full rounded-2xl border border-aro-hairline bg-white/70 px-4 py-3 text-aro-ink outline-none transition placeholder:text-aro-muted/60 focus:border-aro-terra focus:ring-2 focus:ring-aro-terra/20"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-aro-ink">Display order</span>
              <input
                type="number"
                step="1"
                value={displayOrder}
                onChange={event => setDisplayOrder(event.target.value)}
                className="w-full rounded-2xl border border-aro-hairline bg-white/70 px-4 py-3 font-mono text-aro-ink outline-none focus:border-aro-terra focus:ring-2 focus:ring-aro-terra/20"
              />
            </label>
            <label className="flex items-end">
              <span className="flex w-full items-center justify-between rounded-2xl border border-aro-hairline bg-white/70 px-4 py-3">
                <span>
                  <span className="block text-sm font-semibold text-aro-ink">Visible</span>
                  <span className="text-xs text-aro-muted">Show in the storefront</span>
                </span>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={event => setIsActive(event.target.checked)}
                  className="h-5 w-5 accent-aro-terra"
                />
              </span>
            </label>
          </div>

          <div className="rounded-2xl border border-aro-hairline bg-aro-sand/55 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-aro-ink">
              <Clock3 className="h-4 w-4 text-aro-terra" /> Optional daily window
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="mb-1 block text-xs uppercase tracking-wide text-aro-muted">
                  From
                </span>
                <input
                  type="time"
                  value={availableFrom}
                  onChange={event => setAvailableFrom(event.target.value)}
                  className="w-full rounded-xl border border-aro-hairline bg-white/80 px-3 py-2 font-mono text-sm text-aro-ink"
                />
              </label>
              <label>
                <span className="mb-1 block text-xs uppercase tracking-wide text-aro-muted">
                  Until
                </span>
                <input
                  type="time"
                  value={availableUntil}
                  onChange={event => setAvailableUntil(event.target.value)}
                  className="w-full rounded-xl border border-aro-hairline bg-white/80 px-3 py-2 font-mono text-sm text-aro-ink"
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-aro-hairline pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-full border border-aro-hairline px-5 py-2.5 text-sm font-semibold text-aro-ink transition hover:bg-aro-sand"
            >
              Cancel
            </button>
            <button
              disabled={saving || !name.trim()}
              className="rounded-full bg-aro-terra px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-aro-terra/20 transition hover:-translate-y-0.5 hover:bg-[#c86e3e] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : category ? 'Save category' : 'Create category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
