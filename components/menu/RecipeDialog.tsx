'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { MenuItemIngredient } from '@/lib/inventory/types'

const STRINGS = {
  eyebrow: 'Recipe',
  empty: 'No ingredients linked yet. Add one below to power costing and auto-depletion.',
  ingredientLabel: 'Inventory item',
  qtyLabel: 'Quantity per unit sold',
  add: 'Add ingredient',
  noItems: 'No active inventory items yet — add some on the Inventory page first.',
}

interface AvailableItem {
  item_id: string
  name: string
  unit: string
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

export function RecipeDialog({
  open,
  itemId,
  itemName,
  onClose,
}: {
  open: boolean
  itemId: string | null
  itemName: string
  onClose: () => void
}) {
  const [ingredients, setIngredients] = useState<MenuItemIngredient[]>([])
  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedInventoryId, setSelectedInventoryId] = useState('')
  const [qty, setQty] = useState('')

  const load = useCallback(async () => {
    if (!itemId) return
    setLoading(true)
    try {
      const result = await api<{
        ingredients: MenuItemIngredient[]
        available_inventory_items: AvailableItem[]
      }>(`/api/menu/items/${itemId}/ingredients`)
      setIngredients(result.ingredients)
      setAvailableItems(result.available_inventory_items)
      const linked = new Set(result.ingredients.map(i => i.inventory_item_id))
      const firstPickable = result.available_inventory_items.find(i => !linked.has(i.item_id))
      setSelectedInventoryId(firstPickable?.item_id ?? '')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load recipe')
    } finally {
      setLoading(false)
    }
  }, [itemId])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  if (!open || !itemId) return null

  const linkedIds = new Set(ingredients.map(i => i.inventory_item_id))
  const pickableItems = availableItems.filter(i => !linkedIds.has(i.item_id))

  async function addIngredient() {
    if (!itemId || !selectedInventoryId) return
    const parsedQty = Number(qty)
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      toast.error('Quantity must be a positive number')
      return
    }
    setSaving(true)
    try {
      await api(`/api/menu/items/${itemId}/ingredients`, {
        method: 'POST',
        body: JSON.stringify({ inventory_item_id: selectedInventoryId, qty_per_unit: parsedQty }),
      })
      setQty('')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add ingredient')
    } finally {
      setSaving(false)
    }
  }

  async function removeIngredient(ingredient: MenuItemIngredient) {
    setSaving(true)
    try {
      await api(`/api/menu/ingredients/${ingredient.id}`, { method: 'DELETE' })
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove ingredient')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-aro-espresso/70 px-4 py-8 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recipe-dialog-title"
        className="mx-auto w-full max-w-lg overflow-hidden rounded-[28px] border border-white/40 bg-aro-cream-warm shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-aro-hairline px-6 py-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aro-muted">
              {STRINGS.eyebrow}
            </p>
            <h2 id="recipe-dialog-title" className="mt-1 font-display text-2xl text-aro-espresso">
              {itemName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close recipe dialog"
            className="rounded-full border border-aro-hairline p-2 text-aro-muted transition hover:bg-aro-sand"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {loading ? (
            <div className="h-24 animate-pulse rounded-2xl bg-aro-sand" />
          ) : ingredients.length === 0 ? (
            <p className="rounded-2xl bg-aro-sand/50 px-4 py-3 text-sm text-aro-muted">
              {STRINGS.empty}
            </p>
          ) : (
            <div className="space-y-2">
              {ingredients.map(ingredient => (
                <div
                  key={ingredient.id}
                  className="flex min-h-[44px] items-center justify-between rounded-2xl border border-aro-hairline bg-white/70 px-4 py-3"
                >
                  <span className="text-sm font-semibold text-aro-ink">
                    {ingredient.qty_per_unit} {ingredient.inventory_item_unit} —{' '}
                    {ingredient.inventory_item_name}
                  </span>
                  <button
                    type="button"
                    onClick={() => void removeIngredient(ingredient)}
                    disabled={saving}
                    aria-label={`Remove ${ingredient.inventory_item_name}`}
                    className="rounded-full p-1.5 text-aro-muted hover:bg-aro-rose/20 hover:text-aro-espresso"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!loading && availableItems.length === 0 ? (
            <p className="text-sm text-aro-rose">{STRINGS.noItems}</p>
          ) : !loading && pickableItems.length > 0 ? (
            <div className="grid gap-3 border-t border-aro-hairline pt-4 sm:grid-cols-[1fr_140px_auto]">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-aro-muted">
                  {STRINGS.ingredientLabel}
                </span>
                <select
                  value={selectedInventoryId}
                  onChange={event => setSelectedInventoryId(event.target.value)}
                  className="min-h-[44px] w-full rounded-2xl border border-aro-hairline bg-white/70 px-3 py-2 text-sm outline-none focus:border-aro-terra"
                >
                  {pickableItems.map(item => (
                    <option key={item.item_id} value={item.item_id}>
                      {item.name} ({item.unit})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-aro-muted">
                  {STRINGS.qtyLabel}
                </span>
                <input
                  inputMode="decimal"
                  value={qty}
                  onChange={event => setQty(event.target.value)}
                  placeholder="e.g. 200"
                  className="min-h-[44px] w-full rounded-2xl border border-aro-hairline bg-white/70 px-3 py-2 font-mono text-sm outline-none focus:border-aro-terra"
                />
              </label>
              <button
                type="button"
                onClick={() => void addIngredient()}
                disabled={saving || !qty.trim()}
                className="min-h-[44px] rounded-full bg-aro-terra px-4 text-sm font-bold text-white disabled:opacity-50"
              >
                <Plus className="mr-1 inline h-4 w-4" /> {STRINGS.add}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
