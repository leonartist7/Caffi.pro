'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { Check, Coffee, Minus, Plus, Search, X } from 'lucide-react'
import type { MenuCategory, MenuItem, MenuModifier } from '@/lib/menu/types'
import { useOrderingCart } from '@/contexts/OrderingCartContext'
import { formatCents } from '@/lib/money'

export function MenuBrowser({
  categories,
  items,
  currency,
}: {
  categories: MenuCategory[]
  items: MenuItem[]
  currency: string
}) {
  const cart = useOrderingCart()
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<MenuItem | null>(null)
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return items.filter(
      item =>
        (category === 'all' || item.category_id === category) &&
        (!needle ||
          item.name.toLowerCase().includes(needle) ||
          item.description?.toLowerCase().includes(needle) ||
          item.dietary_tags.some(tag => tag.includes(needle)))
    )
  }, [category, items, query])

  return (
    <>
      <div className="sticky top-20 z-20 rounded-[24px] border border-aro-hairline bg-aro-cream-warm/95 p-3 shadow-sm backdrop-blur">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-aro-muted" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="What are you craving?"
            className="w-full rounded-full border border-aro-hairline bg-white/70 py-3 pl-10 pr-4 text-sm outline-none focus:border-aro-terra"
          />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <Filter active={category === 'all'} onClick={() => setCategory('all')}>
            All
          </Filter>
          {categories.map(row => (
            <Filter
              key={row.category_id}
              active={category === row.category_id}
              onClick={() => setCategory(row.category_id)}
            >
              {row.name}
            </Filter>
          ))}
        </div>
      </div>

      {shown.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map(item => (
            <button
              type="button"
              key={item.item_id}
              onClick={() => setSelected(item)}
              className="overflow-hidden rounded-[26px] border border-aro-hairline bg-aro-cream-warm text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative h-44 bg-aro-sand">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                ) : (
                  <Coffee className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-aro-terracotta" />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-xl text-aro-espresso">{item.name}</h2>
                  <span className="shrink-0 font-mono text-sm font-bold text-aro-terra">
                    {formatCents(item.price_cents, currency)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 min-h-[40px] text-sm text-aro-muted">
                  {item.description || 'Made fresh to order.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.modifier_groups.length ? (
                    <span className="rounded-full bg-aro-sand px-2 py-1 text-[10px] font-semibold">
                      Customisable
                    </span>
                  ) : null}
                  {item.dietary_tags.slice(0, 2).map(tag => (
                    <span key={tag} className="rounded-full bg-aro-sage/25 px-2 py-1 text-[10px]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-aro-muted">No menu items match those filters.</div>
      )}

      {selected ? (
        <ItemPicker
          item={selected}
          currency={currency}
          onClose={() => setSelected(null)}
          onAdd={(modifiers, quantity, notes) => {
            cart.addItem({
              item_id: selected.item_id,
              name: selected.name,
              image_url: selected.image_url,
              base_price_cents: selected.price_cents,
              modifiers,
              quantity,
              notes,
            })
            setSelected(null)
          }}
        />
      ) : null}
    </>
  )
}

function Filter({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${active ? 'bg-aro-espresso text-aro-cream' : 'bg-aro-sand text-aro-ink'}`}
    >
      {children}
    </button>
  )
}

function ItemPicker({
  item,
  currency,
  onClose,
  onAdd,
}: {
  item: MenuItem
  currency: string
  onClose: () => void
  onAdd: (modifiers: MenuModifier[], quantity: number, notes: string) => void
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const selectedModifiers = item.modifier_groups
    .flatMap(group => group.modifiers)
    .filter(modifier => selectedIds.includes(modifier.modifier_id))
  const unitCents =
    item.price_cents +
    selectedModifiers.reduce((sum, modifier) => sum + modifier.price_delta_cents, 0)

  function toggle(groupId: string, modifierId: string, max: number) {
    const group = item.modifier_groups.find(row => row.group_id === groupId)
    if (!group) return
    const groupIds = group.modifiers.map(modifier => modifier.modifier_id)
    setSelectedIds(current => {
      if (current.includes(modifierId)) return current.filter(id => id !== modifierId)
      const selectedInGroup = current.filter(id => groupIds.includes(id))
      if (max === 1) return [...current.filter(id => !groupIds.includes(id)), modifierId]
      if (selectedInGroup.length >= max) return current
      return [...current, modifierId]
    })
    setError('')
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-aro-espresso/70 p-3 backdrop-blur-sm sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        className="mx-auto max-w-xl overflow-hidden rounded-[30px] bg-aro-cream-warm shadow-2xl"
      >
        <div className="relative h-52 bg-aro-sand">
          {item.image_url ? (
            <Image src={item.image_url} alt="" fill unoptimized className="object-cover" />
          ) : (
            <Coffee className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-aro-terracotta" />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full bg-aro-cream-warm p-2 shadow"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl text-aro-espresso">{item.name}</h2>
              <p className="mt-2 text-sm text-aro-muted">{item.description}</p>
            </div>
            <span className="font-mono font-bold text-aro-terra">
              {formatCents(item.price_cents, currency)}
            </span>
          </div>
          <div className="mt-6 space-y-5">
            {item.modifier_groups.map(group => {
              const count = group.modifiers.filter(modifier =>
                selectedIds.includes(modifier.modifier_id)
              ).length
              return (
                <section key={group.group_id}>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold">{group.name}</h3>
                    <span className="text-xs text-aro-muted">
                      Choose{' '}
                      {group.min_select === group.max_select
                        ? group.max_select
                        : `${group.min_select}-${group.max_select}`}{' '}
                      · {count} selected
                    </span>
                  </div>
                  <div className="space-y-2">
                    {group.modifiers.map(modifier => {
                      const active = selectedIds.includes(modifier.modifier_id)
                      return (
                        <button
                          key={modifier.modifier_id}
                          type="button"
                          onClick={() =>
                            toggle(group.group_id, modifier.modifier_id, group.max_select)
                          }
                          className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left ${active ? 'border-aro-terra bg-aro-terra/10' : 'border-aro-hairline bg-white/50'}`}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? 'border-aro-terra bg-aro-terra text-white' : 'border-aro-clay'}`}
                            >
                              {active ? <Check className="h-3 w-3" /> : null}
                            </span>
                            {modifier.name}
                          </span>
                          <span className="font-mono text-xs">
                            {modifier.price_delta_cents
                              ? `${modifier.price_delta_cents > 0 ? '+' : ''}${formatCents(modifier.price_delta_cents, currency)}`
                              : 'Included'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-semibold">Notes</span>
            <textarea
              value={notes}
              onChange={event => setNotes(event.target.value)}
              rows={2}
              placeholder="Extra hot, sauce on the side..."
              className="w-full resize-none rounded-2xl border border-aro-hairline bg-white/60 px-4 py-3 outline-none"
            />
          </label>
          {error ? <p className="mt-3 text-sm font-semibold text-aro-rose">{error}</p> : null}
          <div className="mt-5 flex items-center gap-3">
            <div className="flex items-center rounded-full bg-aro-sand">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-3"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center font-mono">{quantity}</span>
              <button type="button" onClick={() => setQuantity(quantity + 1)} className="p-3">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                const invalid = item.modifier_groups.find(group => {
                  const count = group.modifiers.filter(modifier =>
                    selectedIds.includes(modifier.modifier_id)
                  ).length
                  return count < group.min_select || count > group.max_select
                })
                if (invalid) {
                  setError(`Choose the required options for ${invalid.name}`)
                  return
                }
                onAdd(selectedModifiers, quantity, notes)
              }}
              className="flex-1 rounded-full bg-aro-terra px-5 py-4 text-sm font-bold text-white"
            >
              Add to order ·{' '}
              <span className="font-mono">{formatCents(unitCents * quantity, currency)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
