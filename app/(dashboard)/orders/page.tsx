'use client'

import { useCallback, useEffect, useState } from 'react'
import { Clock3, RefreshCw, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { useTenant } from '@/contexts/TenantContext'
import { formatCents } from '@/lib/money'
import { FulfilmentSettings } from '@/components/orders/FulfilmentSettings'

interface OrderRow {
  order_id: string
  order_type: string
  status: string
  guest_name: string | null
  total_cents: number
  placed_at: string
}
const STATUSES = [
  'all',
  'pending',
  'paid',
  'accepted',
  'preparing',
  'ready',
  'out_for_delivery',
  'completed',
  'canceled',
  'refunded',
]

export default function OrdersPage() {
  const { selectedTenant } = useTenant()
  const [status, setStatus] = useState('all')
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    if (!selectedTenant) return
    setLoading(true)
    const response = await fetch(
      `/api/orders?venue_id=${selectedTenant.tenant_id}&status=${status}`
    )
    if (response.ok) setOrders((await response.json()).orders ?? [])
    else toast.error('Failed to load orders')
    setLoading(false)
  }, [selectedTenant, status])
  useEffect(() => {
    void load()
  }, [load])
  return (
    <main className="min-h-full bg-aro-cream p-4 text-aro-ink sm:p-7">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[30px] bg-aro-espresso p-7 text-aro-cream">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aro-terracotta">
            Commerce / Operations
          </p>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <h1 className="font-display text-4xl">Orders</h1>
              <p className="mt-2 text-aro-cream/60">Every direct order, from paid to complete.</p>
            </div>
            <button onClick={() => void load()} className="rounded-full bg-aro-cream/10 p-3">
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </header>
        <div className="my-5 flex gap-2 overflow-x-auto">
          {STATUSES.map(value => (
            <button
              key={value}
              onClick={() => setStatus(value)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold capitalize ${status === value ? 'bg-aro-terra text-white' : 'bg-aro-cream-warm'}`}
            >
              {value.replace('_', ' ')}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="py-20 text-center text-aro-muted">Loading orders...</div>
        ) : orders.length ? (
          <div className="overflow-hidden rounded-[26px] border border-aro-hairline bg-aro-cream-warm">
            <div className="divide-y divide-aro-hairline">
              {orders.map(order => (
                <article
                  key={order.order_id}
                  className="grid gap-3 p-5 sm:grid-cols-[1fr_160px_150px_120px] sm:items-center"
                >
                  <div>
                    <p className="font-display text-lg text-aro-espresso">
                      {order.guest_name || 'Guest'}{' '}
                      <span className="font-mono text-xs text-aro-muted">
                        #{order.order_id.slice(0, 8)}
                      </span>
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-aro-muted">
                      <Clock3 className="h-3 w-3" />
                      {new Date(order.placed_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-sm capitalize">{order.order_type.replace('_', ' ')}</span>
                  <span className="w-fit rounded-full bg-aro-sand px-3 py-1 text-xs font-semibold capitalize">
                    {order.status.replace('_', ' ')}
                  </span>
                  <span className="font-mono font-bold text-aro-terra">
                    {formatCents(order.total_cents)}
                  </span>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[26px] border border-dashed border-aro-clay bg-aro-cream-warm py-20 text-center">
            <ShoppingBag className="mx-auto h-9 w-9 text-aro-terra" />
            <p className="mt-3 text-aro-muted">No orders in this view.</p>
          </div>
        )}
        {selectedTenant ? <FulfilmentSettings venueId={selectedTenant.tenant_id} /> : null}
      </div>
    </main>
  )
}
