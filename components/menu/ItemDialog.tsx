'use client'

import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus, SlidersHorizontal, Trash2, X } from 'lucide-react'
import type { MenuCategory, MenuItem } from '@/lib/menu/types'
import { dollarsToCents } from '@/lib/money'

export interface ModifierDraft {
  key: string
  modifier_id?: string
  name: string
  price_delta_cents: number
  is_active: boolean
  sort_order: number
}

export interface ModifierGroupDraft {
  key: string
  group_id?: string
  name: string
  min_select: number
  max_select: number
  modifiers: ModifierDraft[]
}

export interface ItemDraft {
  category_id: string | null
  name: string
  description: string | null
  price_cents: number
  image_url: string | null
  is_active: boolean
  sort_order: number
  dietary_tags: string[]
  modifier_groups: ModifierGroupDraft[]
}

interface ItemDialogProps {
  open: boolean
  item: MenuItem | null
  categories: MenuCategory[]
  saving: boolean
  onClose: () => void
  onSave: (draft: ItemDraft) => Promise<void>
}

const fieldClass =
  'w-full rounded-2xl border border-aro-hairline bg-white/80 px-4 py-3 text-aro-ink outline-none focus:border-aro-terra focus:ring-2 focus:ring-aro-terra/20'

function draftKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

function initialGroups(item: MenuItem | null): ModifierGroupDraft[] {
  return (item?.modifier_groups ?? []).map(group => ({
    key: group.group_id,
    group_id: group.group_id,
    name: group.name,
    min_select: group.min_select,
    max_select: group.max_select,
    modifiers: group.modifiers.map(modifier => ({
      key: modifier.modifier_id,
      modifier_id: modifier.modifier_id,
      name: modifier.name,
      price_delta_cents: modifier.price_delta_cents,
      is_active: modifier.is_active,
      sort_order: modifier.sort_order,
    })),
  }))
}

export function ItemDialog({ open, item, categories, saving, onClose, onSave }: ItemDialogProps) {
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [price, setPrice] = useState('0.00')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [dietaryTags, setDietaryTags] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [groups, setGroups] = useState<ModifierGroupDraft[]>([])
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(item?.name ?? '')
    setCategoryId(item?.category_id ?? '')
    setPrice(((item?.price_cents ?? 0) / 100).toFixed(2))
    setDescription(item?.description ?? '')
    setImageUrl(item?.image_url ?? '')
    setDietaryTags(item?.dietary_tags.join(', ') ?? '')
    setSortOrder(String(item?.sort_order ?? 0))
    setIsActive(item?.is_active ?? true)
    setGroups(initialGroups(item))
    setFormError(null)
  }, [item, open])

  const activeCategories = useMemo(
    () => categories.filter(category => category.is_active || category.category_id === categoryId),
    [categories, categoryId]
  )

  if (!open) return null

  const updateGroup = (key: string, patch: Partial<ModifierGroupDraft>) => {
    setGroups(current => current.map(group => (group.key === key ? { ...group, ...patch } : group)))
  }

  const updateModifier = (groupKey: string, modifierKey: string, patch: Partial<ModifierDraft>) => {
    setGroups(current =>
      current.map(group =>
        group.key !== groupKey
          ? group
          : {
              ...group,
              modifiers: group.modifiers.map(modifier =>
                modifier.key === modifierKey ? { ...modifier, ...patch } : modifier
              ),
            }
      )
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-aro-espresso/75 px-3 py-5 backdrop-blur-sm sm:px-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-dialog-title"
        className="mx-auto w-full max-w-5xl overflow-hidden rounded-[30px] border border-white/40 bg-aro-cream-warm shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-aro-hairline bg-aro-cream-warm/95 px-6 py-5 backdrop-blur">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aro-muted">
              Product studio
            </p>
            <h2 id="item-dialog-title" className="mt-1 font-display text-2xl text-aro-espresso">
              {item ? 'Edit menu item' : 'New menu item'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close item dialog"
            className="rounded-full border border-aro-hairline p-2 text-aro-muted hover:bg-aro-sand"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.82fr)]"
          onSubmit={async event => {
            event.preventDefault()
            setFormError(null)
            try {
              for (const group of groups) {
                if (!group.name.trim()) throw new Error('Every modifier group needs a name')
                if (group.min_select < 0 || group.max_select < group.min_select) {
                  throw new Error(`Check the selection limits for ${group.name}`)
                }
                if (group.modifiers.some(modifier => !modifier.name.trim())) {
                  throw new Error(`Every option in ${group.name} needs a name`)
                }
              }
              await onSave({
                category_id: categoryId || null,
                name: name.trim(),
                description: description.trim() || null,
                price_cents: dollarsToCents(price),
                image_url: imageUrl.trim() || null,
                is_active: isActive,
                sort_order: Number(sortOrder),
                dietary_tags: dietaryTags
                  .split(',')
                  .map(tag => tag.trim().toLowerCase())
                  .filter(Boolean),
                modifier_groups: groups,
              })
            } catch (error) {
              setFormError(error instanceof Error ? error.message : 'Check the item details')
            }
          }}
        >
          <section className="rounded-3xl border border-aro-hairline bg-white/55 p-5">
            <h3 className="font-display text-lg text-aro-espresso">Item details</h3>
            <p className="mb-5 text-sm text-aro-muted">What guests see when they order.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-aro-ink">Name</span>
                <input
                  required
                  autoFocus
                  value={name}
                  onChange={event => setName(event.target.value)}
                  placeholder="Oat milk cortado"
                  className={fieldClass}
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-aro-ink">Category</span>
                <select
                  value={categoryId}
                  onChange={event => setCategoryId(event.target.value)}
                  className={fieldClass}
                >
                  <option value="">Uncategorised</option>
                  {activeCategories.map(category => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-aro-ink">Price (CAD)</span>
                <input
                  required
                  inputMode="decimal"
                  value={price}
                  onChange={event => setPrice(event.target.value)}
                  placeholder="4.50"
                  className={`${fieldClass} font-mono`}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-aro-ink">Description</span>
                <textarea
                  rows={3}
                  value={description}
                  onChange={event => setDescription(event.target.value)}
                  placeholder="Ingredients and flavour notes."
                  className={`${fieldClass} resize-none`}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-aro-ink">Image URL</span>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={event => setImageUrl(event.target.value)}
                  placeholder="https://..."
                  className={fieldClass}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-aro-ink">Dietary tags</span>
                <input
                  value={dietaryTags}
                  onChange={event => setDietaryTags(event.target.value)}
                  placeholder="vegan, gluten-free, contains nuts"
                  className={fieldClass}
                />
                <span className="mt-1.5 block text-xs text-aro-muted">
                  Separate tags with commas.
                </span>
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-aro-ink">Display order</span>
                <input
                  type="number"
                  step="1"
                  value={sortOrder}
                  onChange={event => setSortOrder(event.target.value)}
                  className={`${fieldClass} font-mono`}
                />
              </label>
              <label className="flex items-end">
                <span className="flex w-full items-center justify-between rounded-2xl border border-aro-hairline bg-aro-sand/55 px-4 py-3">
                  <span>
                    <span className="block text-sm font-semibold text-aro-ink">Available</span>
                    <span className="text-xs text-aro-muted">Visible to guests</span>
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
          </section>

          <section className="rounded-3xl border border-aro-hairline bg-aro-sand/45 p-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 font-display text-lg text-aro-espresso">
                  <SlidersHorizontal className="h-5 w-5 text-aro-terra" /> Modifiers
                </h3>
                <p className="text-sm text-aro-muted">Sizes, milk choices, extras.</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setGroups(current => [
                    ...current,
                    {
                      key: draftKey('group'),
                      name: '',
                      min_select: 0,
                      max_select: 1,
                      modifiers: [],
                    },
                  ])
                }
                className="rounded-full bg-aro-espresso px-3 py-2 text-xs font-bold text-aro-cream"
              >
                <Plus className="mr-1 inline h-3.5 w-3.5" /> Group
              </button>
            </div>

            <div className="max-h-[62vh] space-y-4 overflow-y-auto pr-1">
              {groups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-aro-clay bg-white/40 px-5 py-8 text-center text-sm text-aro-muted">
                  Add a group for choices such as size or milk.
                </div>
              ) : null}
              {groups.map(group => (
                <div
                  key={group.key}
                  className="rounded-2xl border border-aro-hairline bg-white/70 p-4"
                >
                  <div className="flex items-center gap-2">
                    <input
                      required
                      value={group.name}
                      onChange={event => updateGroup(group.key, { name: event.target.value })}
                      placeholder="Group name"
                      className="min-w-0 flex-1 border-0 border-b border-aro-hairline bg-transparent px-1 py-2 font-semibold text-aro-ink outline-none focus:border-aro-terra"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setGroups(current => current.filter(row => row.key !== group.key))
                      }
                      aria-label={`Remove ${group.name || 'modifier group'}`}
                      className="rounded-full p-2 text-aro-muted hover:bg-aro-rose/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {(['min_select', 'max_select'] as const).map(field => (
                      <label key={field} className="text-xs uppercase tracking-wide text-aro-muted">
                        {field === 'min_select' ? 'Minimum' : 'Maximum'}
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={group[field]}
                          onChange={event =>
                            updateGroup(group.key, { [field]: Number(event.target.value) })
                          }
                          className="mt-1 w-full rounded-xl border border-aro-hairline bg-aro-cream-warm px-3 py-2 font-mono text-aro-ink"
                        />
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2">
                    {group.modifiers.map(modifier => (
                      <div
                        key={modifier.key}
                        className="grid grid-cols-[minmax(0,1fr)_90px_auto] gap-2"
                      >
                        <input
                          required
                          value={modifier.name}
                          onChange={event =>
                            updateModifier(group.key, modifier.key, { name: event.target.value })
                          }
                          placeholder="Option"
                          className="min-w-0 rounded-xl border border-aro-hairline bg-aro-cream-warm px-3 py-2 text-sm text-aro-ink"
                        />
                        <input
                          aria-label={`${modifier.name || 'Option'} price adjustment`}
                          defaultValue={(modifier.price_delta_cents / 100).toFixed(2)}
                          onBlur={event => {
                            try {
                              updateModifier(group.key, modifier.key, {
                                price_delta_cents: dollarsToCents(event.target.value, {
                                  allowNegative: true,
                                }),
                              })
                            } catch {
                              event.target.value = (modifier.price_delta_cents / 100).toFixed(2)
                            }
                          }}
                          className="rounded-xl border border-aro-hairline bg-aro-cream-warm px-2 py-2 font-mono text-sm text-aro-ink"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateGroup(group.key, {
                              modifiers: group.modifiers.filter(row => row.key !== modifier.key),
                            })
                          }
                          aria-label={`Remove ${modifier.name || 'option'}`}
                          className="rounded-full p-2 text-aro-muted hover:bg-aro-rose/20"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        updateGroup(group.key, {
                          modifiers: [
                            ...group.modifiers,
                            {
                              key: draftKey('modifier'),
                              name: '',
                              price_delta_cents: 0,
                              is_active: true,
                              sort_order: group.modifiers.length,
                            },
                          ],
                        })
                      }
                      className="w-full rounded-xl border border-dashed border-aro-clay px-3 py-2 text-xs font-semibold text-aro-muted hover:bg-aro-sand/60"
                    >
                      <Plus className="mr-1 inline h-3.5 w-3.5" /> Add option
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-col gap-3 border-t border-aro-hairline pt-5 sm:flex-row sm:items-center sm:justify-between lg:col-span-2">
            <p role="alert" className="text-sm font-medium text-aro-rose">
              {formError}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-full border border-aro-hairline px-5 py-2.5 text-sm font-semibold text-aro-ink hover:bg-aro-sand"
              >
                Cancel
              </button>
              <button
                disabled={saving || !name.trim()}
                className="rounded-full bg-aro-terra px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-aro-terra/20 disabled:opacity-50"
              >
                {saving ? 'Saving...' : item ? 'Save item' : 'Create item'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
