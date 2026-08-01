'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Boxes, Edit3, Minus, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTenant } from '@/contexts/TenantContext'
import { useConfirm } from '@/hooks/useConfirm'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  InventoryItemDialog,
  type InventoryItemDraft,
} from '@/components/inventory/InventoryItemDialog'
import { MovementDialog, type ManualMovementReason } from '@/components/inventory/MovementDialog'
import { formatCents } from '@/lib/money'
import type { InventoryItemWithStock } from '@/lib/inventory/types'

const STRINGS = {
  eyebrow: 'Commerce / Inventory',
  title: 'What you have on hand.',
  subtitle: 'Track stock, receive deliveries, log waste, and reconcile physical counts.',
  newItem: 'New item',
  emptyTitle: 'No inventory items yet',
  emptyBody: 'Add your first ingredient or supply to start tracking stock.',
  colItem: 'Item',
  colOnHand: 'On hand',
  colCost: 'Cost / unit',
  colActions: 'Actions',
  belowPar: 'Below par',
  inactive: 'Inactive',
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`)
  return body as T
}

export default function InventoryPage() {
  const { selectedTenant } = useTenant()
  const { confirm, confirmState, closeConfirm } = useConfirm()
  const [items, setItems] = useState<InventoryItemWithStock[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [itemDialog, setItemDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItemWithStock | null>(null)
  const [movementDialog, setMovementDialog] = useState<{
    item: InventoryItemWithStock
    reason: ManualMovementReason
  } | null>(null)

  const load = useCallback(async () => {
    if (!selectedTenant) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const result = await api<{ items: InventoryItemWithStock[] }>(
        `/api/inventory/items?venue_id=${selectedTenant.tenant_id}`
      )
      setItems(result.items)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [selectedTenant])

  useEffect(() => {
    void load()
  }, [load])

  async function saveItem(draft: InventoryItemDraft) {
    if (!selectedTenant) return
    setSaving(true)
    try {
      await api(
        editingItem ? `/api/inventory/items/${editingItem.item_id}` : '/api/inventory/items',
        {
          method: editingItem ? 'PATCH' : 'POST',
          body: JSON.stringify(
            editingItem ? draft : { ...draft, venue_id: selectedTenant.tenant_id }
          ),
        }
      )
      toast.success(editingItem ? 'Item updated' : 'Item created')
      setItemDialog(false)
      setEditingItem(null)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save item')
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem(item: InventoryItemWithStock) {
    const accepted = await confirm({
      title: `Delete ${item.name}?`,
      message: 'Items with stock history cannot be deleted — mark them inactive instead.',
      confirmText: 'Delete item',
      variant: 'danger',
    })
    if (!accepted) return
    try {
      await api(`/api/inventory/items/${item.item_id}`, { method: 'DELETE' })
      toast.success('Item deleted')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete item')
    }
  }

  async function recordMovement(amount: number) {
    if (!selectedTenant || !movementDialog) return
    setSaving(true)
    try {
      await api('/api/inventory/movements', {
        method: 'POST',
        body: JSON.stringify({
          venue_id: selectedTenant.tenant_id,
          item_id: movementDialog.item.item_id,
          reason: movementDialog.reason,
          amount,
        }),
      })
      toast.success('Movement recorded')
      setMovementDialog(null)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to record movement')
    } finally {
      setSaving(false)
    }
  }

  if (!selectedTenant) {
    return (
      <main className="min-h-full bg-aro-cream p-6 text-aro-ink">
        <div className="mx-auto max-w-3xl rounded-[30px] border border-aro-hairline bg-aro-cream-warm p-10 text-center">
          <Boxes className="mx-auto h-10 w-10 text-aro-terra" />
          <h1 className="mt-4 font-display text-3xl text-aro-espresso">Choose a client first</h1>
          <p className="mt-2 text-aro-muted">
            Select a venue from the client switcher to manage its inventory.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-full bg-aro-cream px-4 py-6 text-aro-ink sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="overflow-hidden rounded-[32px] bg-aro-espresso px-6 py-7 text-aro-cream shadow-xl sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-aro-terracotta">
                {STRINGS.eyebrow}
              </p>
              <h1 className="mt-2 font-display text-4xl sm:text-5xl">{STRINGS.title}</h1>
              <p className="mt-3 max-w-2xl text-sm text-aro-cream/70 sm:text-base">
                {STRINGS.subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingItem(null)
                setItemDialog(true)
              }}
              className="rounded-full bg-aro-terra px-5 py-3 text-sm font-bold text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5"
            >
              <Plus className="mr-2 inline h-4 w-4" /> {STRINGS.newItem}
            </button>
          </div>
        </header>

        {loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map(value => (
              <div key={value} className="h-28 animate-pulse rounded-[26px] bg-aro-sand" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-[30px] border border-dashed border-aro-clay bg-aro-cream-warm px-6 py-16 text-center">
            <Boxes className="mx-auto h-10 w-10 text-aro-terra" />
            <h2 className="mt-4 font-display text-2xl text-aro-espresso">{STRINGS.emptyTitle}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-aro-muted">{STRINGS.emptyBody}</p>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[26px] border border-aro-hairline bg-aro-cream-warm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-aro-hairline bg-aro-sand/40 text-xs uppercase tracking-wide text-aro-muted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">{STRINGS.colItem}</th>
                    <th className="px-5 py-3 font-semibold">{STRINGS.colOnHand}</th>
                    <th className="px-5 py-3 font-semibold">{STRINGS.colCost}</th>
                    <th className="px-5 py-3 font-semibold">{STRINGS.colActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-aro-hairline">
                  {items.map(item => (
                    <tr key={item.item_id} className={item.is_active ? '' : 'opacity-50'}>
                      <td className="px-5 py-4">
                        <p className="font-display text-lg text-aro-espresso">{item.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {item.below_par ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-aro-terra/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-aro-terra">
                              <AlertTriangle className="h-3 w-3" /> {STRINGS.belowPar}
                            </span>
                          ) : null}
                          {!item.is_active ? (
                            <span className="rounded-full bg-aro-sand px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-aro-muted">
                              {STRINGS.inactive}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono">
                        {item.on_hand} {item.unit}
                      </td>
                      <td className="px-5 py-4 font-mono">
                        {item.cost_per_unit_cents != null
                          ? `${formatCents(item.cost_per_unit_cents)} / ${item.unit}`
                          : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => setMovementDialog({ item, reason: 'receive' })}
                            aria-label={`Receive stock for ${item.name}`}
                            title="Receive"
                            className="min-h-[36px] min-w-[36px] rounded-full p-2 text-aro-sage hover:bg-aro-sage/15"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setMovementDialog({ item, reason: 'waste' })}
                            aria-label={`Record waste for ${item.name}`}
                            title="Waste"
                            className="min-h-[36px] min-w-[36px] rounded-full p-2 text-aro-terra hover:bg-aro-terra/15"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setMovementDialog({ item, reason: 'count' })}
                            aria-label={`Physical count for ${item.name}`}
                            title="Physical count"
                            className="min-h-[36px] min-w-[36px] rounded-full p-2 text-aro-ink hover:bg-aro-sand"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(item)
                              setItemDialog(true)
                            }}
                            aria-label={`Edit ${item.name}`}
                            title="Edit"
                            className="min-h-[36px] min-w-[36px] rounded-full p-2 text-aro-muted hover:bg-aro-sand hover:text-aro-espresso"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteItem(item)}
                            aria-label={`Delete ${item.name}`}
                            title="Delete"
                            className="min-h-[36px] min-w-[36px] rounded-full p-2 text-aro-muted hover:bg-aro-rose/20 hover:text-aro-espresso"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <InventoryItemDialog
        open={itemDialog}
        item={editingItem}
        saving={saving}
        onClose={() => {
          setItemDialog(false)
          setEditingItem(null)
        }}
        onSave={saveItem}
      />
      <MovementDialog
        open={Boolean(movementDialog)}
        item={movementDialog?.item ?? null}
        reason={movementDialog?.reason ?? 'receive'}
        saving={saving}
        onClose={() => setMovementDialog(null)}
        onSave={recordMovement}
      />
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        variant={confirmState.variant}
      />
    </main>
  )
}
