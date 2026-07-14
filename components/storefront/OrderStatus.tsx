'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Clock3, Coffee, Loader2 } from 'lucide-react'
import { formatCents } from '@/lib/money'

interface StatusData {
  order_id: string
  status: string
  order_type: string
  first_name: string
  total_cents: number
  placed_at: string
}

const LABELS: Record<string, string> = {
  pending: 'Waiting for payment',
  paid: 'Payment received',
  accepted: 'Accepted by the café',
  preparing: 'Being prepared',
  ready: 'Ready for you',
  out_for_delivery: 'Out for delivery',
  completed: 'Completed',
  canceled: 'Canceled',
  refunded: 'Refunded',
}

export function OrderStatus({
  orderId,
  slug,
  currency,
}: {
  orderId: string
  slug: string
  currency: string
}) {
  const [order, setOrder] = useState<StatusData | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let active = true
    async function poll() {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`, {
        cache: 'no-store',
      })
      if (!active) return
      if (!response.ok) {
        setMissing(true)
        return
      }
      setOrder(await response.json())
    }
    void poll()
    const timer = window.setInterval(() => void poll(), 5000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [orderId])

  if (missing)
    return <div className="py-20 text-center text-aro-muted">This order link is not available.</div>
  if (!order)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-aro-terra" />
      </div>
    )
  const settled = [
    'paid',
    'accepted',
    'preparing',
    'ready',
    'out_for_delivery',
    'completed',
  ].includes(order.status)
  return (
    <div className="mx-auto max-w-xl rounded-[32px] border border-aro-hairline bg-aro-cream-warm p-6 text-center shadow-xl sm:p-10">
      <span
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${settled ? 'bg-aro-sage/25 text-aro-sage' : 'bg-aro-sand text-aro-terra'}`}
      >
        {settled ? <CheckCircle2 className="h-8 w-8" /> : <Clock3 className="h-8 w-8" />}
      </span>
      <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.22em] text-aro-muted">
        Order {order.order_id.slice(0, 8)}
      </p>
      <h1 className="mt-2 font-display text-4xl text-aro-espresso">
        {LABELS[order.status] || order.status}
      </h1>
      <p className="mt-3 text-aro-muted">
        Thanks, {order.first_name}. This page updates automatically as your order moves.
      </p>
      <div className="mt-6 flex items-center justify-between rounded-2xl bg-aro-sand/60 px-4 py-3">
        <span className="text-sm capitalize">{order.order_type.replace('_', ' ')}</span>
        <span className="font-mono font-bold">{formatCents(order.total_cents, currency)}</span>
      </div>
      <Link
        href={`/shop/${slug}/menu`}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-aro-espresso px-5 py-3 text-sm font-bold text-aro-cream"
      >
        <Coffee className="h-4 w-4" /> Back to menu
      </Link>
    </div>
  )
}
