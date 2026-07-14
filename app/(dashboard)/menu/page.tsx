'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Coffee,
  Edit3,
  EyeOff,
  FolderPlus,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { CategoryDialog, type CategoryDraft } from '@/components/menu/CategoryDialog'
import { ItemDialog, type ItemDraft, type ModifierGroupDraft } from '@/components/menu/ItemDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useTenant } from '@/contexts/TenantContext'
import { useConfirm } from '@/hooks/useConfirm'
import type { MenuCategory, MenuItem } from '@/lib/menu/types'
import { formatCents } from '@/lib/money'

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`)
  return body as T
}

async function syncModifierGroups(
  itemId: string,
  previous: MenuItem | null,
  drafts: ModifierGroupDraft[]
) {
  const previousGroups = previous?.modifier_groups ?? []
  const keptGroupIds = new Set(drafts.flatMap(group => (group.group_id ? [group.group_id] : [])))

  await Promise.all(
    previousGroups
      .filter(group => !keptGroupIds.has(group.group_id))
      .map(group => api(`/api/menu/modifier-groups/${group.group_id}`, { method: 'DELETE' }))
  )

  for (const draft of drafts) {
    const groupPayload = {
      name: draft.name,
      min_select: draft.min_select,
      max_select: draft.max_select,
    }
    let groupId = draft.group_id
    if (groupId) {
      await api(`/api/menu/modifier-groups/${groupId}`, {
        method: 'PATCH',
        body: JSON.stringify(groupPayload),
      })
    } else {
      const result = await api<{ group: { group_id: string } }>(
        `/api/menu/items/${itemId}/modifier-groups`,
        { method: 'POST', body: JSON.stringify(groupPayload) }
      )
      groupId = result.group.group_id
    }

    const oldGroup = previousGroups.find(group => group.group_id === draft.group_id)
    const keptModifierIds = new Set(
      draft.modifiers.flatMap(modifier => (modifier.modifier_id ? [modifier.modifier_id] : []))
    )
    await Promise.all(
      (oldGroup?.modifiers ?? [])
        .filter(modifier => !keptModifierIds.has(modifier.modifier_id))
        .map(modifier => api(`/api/menu/modifiers/${modifier.modifier_id}`, { method: 'DELETE' }))
    )

    for (const modifier of draft.modifiers) {
      const modifierPayload = {
        name: modifier.name,
        price_delta_cents: modifier.price_delta_cents,
        is_active: modifier.is_active,
        sort_order: modifier.sort_order,
      }
      if (modifier.modifier_id) {
        await api(`/api/menu/modifiers/${modifier.modifier_id}`, {
          method: 'PATCH',
          body: JSON.stringify(modifierPayload),
        })
      } else {
        await api('/api/menu/modifiers', {
          method: 'POST',
          body: JSON.stringify({ ...modifierPayload, group_id: groupId }),
        })
      }
    }
  }
}

export default function MenuPage() {
  const { selectedTenant, isLoading: tenantLoading } = useTenant()
  const { confirm, confirmState, closeConfirm } = useConfirm()
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [categoryDialog, setCategoryDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null)
  const [itemDialog, setItemDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)

  const loadMenu = useCallback(async () => {
    if (!selectedTenant) {
      setCategories([])
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const venue = encodeURIComponent(selectedTenant.tenant_id)
      const [categoryResult, itemResult] = await Promise.all([
        api<{ categories: MenuCategory[] }>(`/api/menu/categories?venue_id=${venue}`),
        api<{ items: MenuItem[] }>(`/api/menu/items?venue_id=${venue}`),
      ])
      setCategories(categoryResult.categories)
      setItems(itemResult.items)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load menu')
    } finally {
      setLoading(false)
    }
  }, [selectedTenant])

  useEffect(() => {
    if (!tenantLoading) void loadMenu()
  }, [loadMenu, tenantLoading])

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    return items.filter(item => {
      const inCategory =
        categoryFilter === 'all' ||
        (categoryFilter === 'uncategorised'
          ? !item.category_id
          : item.category_id === categoryFilter)
      const matches =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.dietary_tags.some(tag => tag.includes(query))
      return inCategory && matches
    })
  }, [categoryFilter, items, search])

  async function saveCategory(draft: CategoryDraft) {
    if (!selectedTenant) return
    setSaving(true)
    try {
      await api(
        editingCategory
          ? `/api/menu/categories/${editingCategory.category_id}`
          : '/api/menu/categories',
        {
          method: editingCategory ? 'PATCH' : 'POST',
          body: JSON.stringify(
            editingCategory ? draft : { ...draft, venue_id: selectedTenant.tenant_id }
          ),
        }
      )
      toast.success(editingCategory ? 'Category updated' : 'Category created')
      setCategoryDialog(false)
      setEditingCategory(null)
      await loadMenu()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  async function deleteCategory(category: MenuCategory) {
    const accepted = await confirm({
      title: `Delete ${category.name}?`,
      message: 'Items in this category will remain available but become uncategorised.',
      confirmText: 'Delete category',
      variant: 'danger',
    })
    if (!accepted) return
    try {
      await api(`/api/menu/categories/${category.category_id}`, { method: 'DELETE' })
      if (categoryFilter === category.category_id) setCategoryFilter('all')
      toast.success('Category deleted')
      await loadMenu()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete category')
    }
  }

  async function saveItem(draft: ItemDraft) {
    if (!selectedTenant) return
    setSaving(true)
    try {
      const { modifier_groups: groups, ...itemPayload } = draft
      const result = editingItem
        ? await api<{ item: MenuItem }>(`/api/menu/items/${editingItem.item_id}`, {
            method: 'PATCH',
            body: JSON.stringify(itemPayload),
          })
        : await api<{ item: MenuItem }>('/api/menu/items', {
            method: 'POST',
            body: JSON.stringify({ ...itemPayload, venue_id: selectedTenant.tenant_id }),
          })
      await syncModifierGroups(result.item.item_id, editingItem, groups)
      toast.success(editingItem ? 'Menu item updated' : 'Menu item created')
      setItemDialog(false)
      setEditingItem(null)
      await loadMenu()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save item')
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem(item: MenuItem) {
    const accepted = await confirm({
      title: `Delete ${item.name}?`,
      message:
        'This removes the item and all of its modifier choices. This action cannot be undone.',
      confirmText: 'Delete item',
      variant: 'danger',
    })
    if (!accepted) return
    try {
      await api(`/api/menu/items/${item.item_id}`, { method: 'DELETE' })
      toast.success('Menu item deleted')
      await loadMenu()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete item')
    }
  }

  if (!tenantLoading && !selectedTenant) {
    return (
      <main className="min-h-full bg-aro-cream p-6 text-aro-ink">
        <div className="mx-auto max-w-3xl rounded-[30px] border border-aro-hairline bg-aro-cream-warm p-10 text-center">
          <Coffee className="mx-auto h-10 w-10 text-aro-terra" />
          <h1 className="mt-4 font-display text-3xl text-aro-espresso">Choose a client first</h1>
          <p className="mt-2 text-aro-muted">
            Select a venue from the client switcher to manage its menu.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-full bg-aro-cream px-4 py-6 text-aro-ink sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="overflow-hidden rounded-[32px] bg-aro-espresso px-6 py-7 text-aro-cream shadow-xl sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-aro-terracotta">
                Commerce / Menu
              </p>
              <h1 className="mt-2 font-display text-4xl sm:text-5xl">Your counter, organised.</h1>
              <p className="mt-3 max-w-2xl text-sm text-aro-cream/70 sm:text-base">
                Build categories, publish products, and shape every choice a guest can make.
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
              <Plus className="mr-2 inline h-4 w-4" /> New item
            </button>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="h-fit rounded-[28px] border border-aro-hairline bg-aro-cream-warm p-4 shadow-sm lg:sticky lg:top-6">
            <div className="flex items-center justify-between px-2 pb-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-aro-muted">
                  Structure
                </p>
                <h2 className="font-display text-xl text-aro-espresso">Categories</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingCategory(null)
                  setCategoryDialog(true)
                }}
                aria-label="Add category"
                className="rounded-full bg-aro-sand p-2 text-aro-terra hover:bg-aro-clay"
              >
                <FolderPlus className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`mb-1 flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm font-semibold ${
                categoryFilter === 'all' ? 'bg-aro-espresso text-aro-cream' : 'hover:bg-aro-sand/70'
              }`}
            >
              All items <span className="font-mono text-xs opacity-70">{items.length}</span>
            </button>
            <div className="space-y-1">
              {categories.map(category => (
                <div key={category.category_id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter(category.category_id)}
                    className={`min-w-0 flex-1 rounded-2xl px-3 py-2.5 text-left text-sm ${
                      categoryFilter === category.category_id
                        ? 'bg-aro-terra font-semibold text-white'
                        : 'hover:bg-aro-sand/70'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate">{category.name}</span>
                      {!category.is_active ? (
                        <EyeOff className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      ) : null}
                    </span>
                  </button>
                  <div className="hidden shrink-0 items-center group-hover:flex group-focus-within:flex">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(category)
                        setCategoryDialog(true)
                      }}
                      aria-label={`Edit ${category.name}`}
                      className="rounded-full p-1.5 text-aro-muted hover:bg-aro-sand"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteCategory(category)}
                      aria-label={`Delete ${category.name}`}
                      className="rounded-full p-1.5 text-aro-muted hover:bg-aro-rose/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-lg flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-aro-muted" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search items or dietary tags"
                  className="w-full rounded-full border border-aro-hairline bg-aro-cream-warm py-3 pl-11 pr-4 text-sm outline-none focus:border-aro-terra focus:ring-2 focus:ring-aro-terra/20"
                />
              </div>
              <p className="font-mono text-xs text-aro-muted">
                {visibleItems.length} {visibleItems.length === 1 ? 'item' : 'items'}
              </p>
            </div>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map(value => (
                  <div key={value} className="h-72 animate-pulse rounded-[26px] bg-aro-sand" />
                ))}
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="rounded-[30px] border border-dashed border-aro-clay bg-aro-cream-warm px-6 py-16 text-center">
                <Coffee className="mx-auto h-10 w-10 text-aro-terra" />
                <h2 className="mt-4 font-display text-2xl text-aro-espresso">
                  Nothing on this shelf yet
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-aro-muted">
                  Create the first item or change the category and search filters.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleItems.map(item => (
                  <article
                    key={item.item_id}
                    className="group overflow-hidden rounded-[26px] border border-aro-hairline bg-aro-cream-warm shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="relative h-36 overflow-hidden bg-aro-sand">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt=""
                          fill
                          unoptimized
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          className="object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Coffee className="h-9 w-9 text-aro-terracotta" />
                        </div>
                      )}
                      {!item.is_active ? (
                        <span className="absolute left-3 top-3 rounded-full bg-aro-espresso/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-aro-cream">
                          Hidden
                        </span>
                      ) : null}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-display text-xl text-aro-espresso">
                            {item.name}
                          </h3>
                          <p className="mt-1 line-clamp-2 min-h-[40px] text-sm text-aro-muted">
                            {item.description || 'No description yet.'}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-sm font-bold text-aro-terra">
                          {formatCents(item.price_cents)}
                        </span>
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-3 border-t border-aro-hairline pt-3">
                        <div className="flex min-w-0 flex-wrap gap-1.5">
                          {item.modifier_groups.length ? (
                            <span className="rounded-full bg-aro-sand px-2.5 py-1 text-[10px] font-semibold text-aro-muted">
                              <SlidersHorizontal className="mr-1 inline h-3 w-3" />
                              {item.modifier_groups.length} option{' '}
                              {item.modifier_groups.length === 1 ? 'group' : 'groups'}
                            </span>
                          ) : null}
                          {item.dietary_tags.slice(0, 2).map(tag => (
                            <span
                              key={tag}
                              className="rounded-full bg-aro-sage/25 px-2.5 py-1 text-[10px] font-semibold text-aro-ink-soft"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(item)
                              setItemDialog(true)
                            }}
                            aria-label={`Edit ${item.name}`}
                            className="rounded-full p-2 text-aro-muted hover:bg-aro-sand hover:text-aro-espresso"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteItem(item)}
                            aria-label={`Delete ${item.name}`}
                            className="rounded-full p-2 text-aro-muted hover:bg-aro-rose/20 hover:text-aro-espresso"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <CategoryDialog
        open={categoryDialog}
        category={editingCategory}
        saving={saving}
        onClose={() => {
          setCategoryDialog(false)
          setEditingCategory(null)
        }}
        onSave={saveCategory}
      />
      <ItemDialog
        open={itemDialog}
        item={editingItem}
        categories={categories}
        saving={saving}
        onClose={() => {
          setItemDialog(false)
          setEditingItem(null)
        }}
        onSave={saveItem}
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
