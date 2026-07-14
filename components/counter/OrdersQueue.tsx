'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Clock3, RefreshCw } from 'lucide-react'

interface QueueOrder {
  order_id: string
  status: string
  order_type: string
  guest_name: string
  placed_at: string
  items: Array<{
    order_item_id: string
    name_snapshot: string
    quantity: number
    modifiers: Array<{ id: string; name_snapshot: string }>
  }>
}
const NEXT: Record<string, string> = {
  paid: 'accepted',
  accepted: 'preparing',
  preparing: 'ready',
  ready: 'completed',
  out_for_delivery: 'completed',
}

export function OrdersQueue({
  onBack,
  onSessionExpired,
}: {
  onBack: () => void
  onSessionExpired: () => void
}) {
  const [orders, setOrders] = useState<QueueOrder[]>([])
  const [busy, setBusy] = useState('')
  const load = useCallback(async () => {
    const res = await fetch('/api/counter/orders')
    if (res.status === 401) return onSessionExpired()
    if (res.ok) setOrders((await res.json()).orders ?? [])
  }, [onSessionExpired])
  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(), 15000)
    return () => clearInterval(timer)
  }, [load])
  async function advance(order: QueueOrder, status: string) {
    setBusy(order.order_id)
    const res = await fetch(`/api/counter/orders/${order.order_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.status === 401) onSessionExpired()
    await load()
    setBusy('')
  }
  return (
    <div className="min-h-screen bg-aro-cream p-4">
      <header className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="rounded-full bg-white p-3">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-2xl font-bold">Orders</h1>
        <button onClick={() => void load()} className="rounded-full bg-white p-3">
          <RefreshCw className="h-5 w-5" />
        </button>
      </header>
      {orders.length === 0 ? (
        <div className="py-20 text-center text-aro-muted">No active paid orders.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {orders.map(order => {
            const next =
              order.status === 'ready' && order.order_type === 'delivery'
                ? 'out_for_delivery'
                : NEXT[order.status]
            return (
              <article
                key={order.order_id}
                className="rounded-2xl border border-aro-hairline bg-white p-5"
              >
                <div className="flex justify-between">
                  <div>
                    <p className="font-display text-xl font-bold">{order.guest_name || 'Guest'}</p>
                    <p className="text-xs uppercase text-aro-muted">
                      {order.order_type.replace('_', ' ')} · {order.status}
                    </p>
                  </div>
                  <span className="flex gap-1 text-xs text-aro-muted">
                    <Clock3 className="h-3.5 w-3.5" />
                    {Math.max(
                      0,
                      Math.floor((Date.now() - new Date(order.placed_at).getTime()) / 60000)
                    )}
                    m
                  </span>
                </div>
                <div className="my-4 space-y-2">
                  {order.items.map(item => (
                    <div key={item.order_item_id}>
                      <p className="font-semibold">
                        {item.quantity} × {item.name_snapshot}
                      </p>
                      {item.modifiers.length ? (
                        <p className="text-xs text-aro-muted">
                          {item.modifiers.map(m => m.name_snapshot).join(' · ')}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  {next ? (
                    <button
                      disabled={busy === order.order_id}
                      onClick={() => void advance(order, next)}
                      className="rounded-xl bg-aro-terra py-4 font-bold text-white"
                    >
                      {next.replace('_', ' ')}
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    disabled={busy === order.order_id}
                    onClick={() => void advance(order, 'canceled')}
                    className="rounded-xl border border-aro-rose px-4 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
