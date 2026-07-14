'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { cartLineUnitCents, useOrderingCart } from '@/contexts/OrderingCartContext'
import { formatCents } from '@/lib/money'

export function CartSheet({ slug }: { slug: string }) {
  const cart = useOrderingCart()
  const tableToken = useSearchParams().get('table')
  if (!cart.isOpen) return null
  return (
    <>
      <button
        type="button"
        aria-label="Close cart"
        onClick={cart.closeCart}
        className="fixed inset-0 z-40 bg-aro-espresso/65 backdrop-blur-sm"
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-aro-cream-warm shadow-2xl">
        <header className="flex items-center justify-between border-b border-aro-hairline px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-aro-sand p-2.5 text-aro-terra">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-xl text-aro-espresso">Your order</h2>
              <p className="font-mono text-xs text-aro-muted">{cart.itemCount} items</p>
            </div>
          </div>
          <button
            type="button"
            onClick={cart.closeCart}
            className="rounded-full p-2 hover:bg-aro-sand"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {cart.items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ShoppingBag className="h-12 w-12 text-aro-terracotta" />
              <h3 className="mt-4 font-display text-xl text-aro-espresso">Your bag is empty</h3>
              <p className="mt-1 text-sm text-aro-muted">Choose something lovely from the menu.</p>
            </div>
          ) : null}
          {cart.items.map(item => (
            <article
              key={item.line_id}
              className="rounded-2xl border border-aro-hairline bg-white/55 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-aro-espresso">{item.name}</h3>
                  {item.modifiers.length ? (
                    <p className="mt-1 text-xs text-aro-muted">
                      {item.modifiers.map(modifier => modifier.name).join(' · ')}
                    </p>
                  ) : null}
                  {item.notes ? (
                    <p className="mt-1 text-xs italic text-aro-muted">{item.notes}</p>
                  ) : null}
                </div>
                <span className="font-mono text-sm font-bold text-aro-terra">
                  {formatCents(cartLineUnitCents(item) * item.quantity, cart.currency)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center rounded-full bg-aro-sand">
                  <button
                    type="button"
                    aria-label={`Decrease ${item.name}`}
                    onClick={() => cart.updateQuantity(item.line_id, item.quantity - 1)}
                    className="p-2"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center font-mono text-sm">{item.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Increase ${item.name}`}
                    onClick={() => cart.updateQuantity(item.line_id, item.quantity + 1)}
                    className="p-2"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => cart.removeItem(item.line_id)}
                  aria-label={`Remove ${item.name}`}
                  className="rounded-full p-2 text-aro-muted hover:bg-aro-rose/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
        {cart.items.length ? (
          <footer className="border-t border-aro-hairline p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold text-aro-ink">Estimated subtotal</span>
              <span className="font-mono text-lg font-bold text-aro-espresso">
                {formatCents(cart.subtotalCents, cart.currency)}
              </span>
            </div>
            <Link
              href={`/shop/${slug}/checkout${tableToken ? `?table=${encodeURIComponent(tableToken)}` : ''}`}
              onClick={cart.closeCart}
              className="block w-full rounded-full bg-aro-terra px-5 py-4 text-center text-sm font-bold text-white shadow-lg"
            >
              Continue to checkout
            </Link>
            <p className="mt-3 text-center text-xs text-aro-muted">
              Final totals are calculated securely at checkout.
            </p>
          </footer>
        ) : null}
      </aside>
    </>
  )
}
